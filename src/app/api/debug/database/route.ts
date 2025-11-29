import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[DEBUG] Starting database diagnostics...');
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      user_id: session.user.id,
      tests: {}
    };

    // Test 1: Check if push_tokens table exists by trying to select from it
    try {
      const { data: tableCheck, error: tableError } = await supabaseAdmin
        .from('push_tokens')
        .select('id')
        .limit(0);
      
      diagnostics.tests.push_tokens_table_exists = {
        success: !tableError || tableError.code === 'PGRST116', // PGRST116 = empty result, table exists
        error: tableError?.message,
        table_accessible: !tableError
      };
    } catch (error: any) {
      diagnostics.tests.push_tokens_table_exists = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Check notifications table exists
    try {
      const { data: notifCheck, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .limit(0);
      
      diagnostics.tests.notifications_table_exists = {
        success: !notifError || notifError.code === 'PGRST116',
        error: notifError?.message,
        table_accessible: !notifError
      };
    } catch (error: any) {
      diagnostics.tests.notifications_table_exists = {
        success: false,
        error: error.message
      };
    }

    // Test 3: Test basic select with regular client (RLS test)
    try {
      const { data: selectTest, error: selectError } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1);
      
      diagnostics.tests.push_tokens_select_regular = {
        success: !selectError,
        error: selectError?.message,
        can_select_own_data: !selectError,
        note: 'Tests RLS permissions for regular client'
      };
    } catch (error: any) {
      diagnostics.tests.push_tokens_select_regular = {
        success: false,
        error: error.message
      };
    }

    // Test 3b: Test basic select with admin client
    try {
      const { data: selectTest, error: selectError } = await supabaseAdmin
        .from('push_tokens')
        .select('id')
        .limit(1);
      
      diagnostics.tests.push_tokens_select_admin = {
        success: !selectError,
        error: selectError?.message,
        can_select_admin: !selectError,
        note: 'Tests admin client access (bypasses RLS)'
      };
    } catch (error: any) {
      diagnostics.tests.push_tokens_select_admin = {
        success: false,
        error: error.message
      };
    }

    // Test 4: Test insert permissions with admin client
    try {
      const testData = {
        user_id: session.user.id,
        endpoint: 'test-endpoint-' + Date.now(),
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        user_agent: 'test-agent'
      };

      const { data: insertTest, error: insertError } = await supabaseAdmin
        .from('push_tokens')
        .upsert(testData, { onConflict: 'user_id' })
        .select();
      
      diagnostics.tests.push_tokens_upsert_admin = {
        success: !insertError,
        error: insertError?.message,
        result: insertTest
      };

      // Clean up test data
      if (!insertError && insertTest && insertTest.length > 0) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('endpoint', testData.endpoint);
      }
    } catch (error: any) {
      diagnostics.tests.push_tokens_upsert_admin = {
        success: false,
        error: error.message
      };
    }

    // Test 4b: Test insert permissions with regular client
    try {
      const testData = {
        user_id: session.user.id,
        endpoint: 'test-endpoint-regular-' + Date.now(),
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        user_agent: 'test-agent'
      };

      const { data: insertTest, error: insertError } = await supabase
        .from('push_tokens')
        .upsert(testData, { onConflict: 'user_id' })
        .select();
      
      diagnostics.tests.push_tokens_upsert_regular = {
        success: !insertError,
        error: insertError?.message,
        result: insertTest ? 'Data inserted' : 'No data'
      };

      // Clean up test data
      if (!insertError && insertTest && insertTest.length > 0) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('endpoint', testData.endpoint);
      }
    } catch (error: any) {
      diagnostics.tests.push_tokens_upsert_regular = {
        success: false,
        error: error.message
      };
    }

    // Test 5: Check RLS policies (compatible version)
    try {
      const { data: policies, error: policiesError } = await supabaseAdmin.rpc('check_table_policies', {
        table_names: ['push_tokens', 'notifications']
      });
      
      if (policiesError) {
        // Fallback: Try direct query with basic info
        const { data: basicPolicies, error: basicError } = await supabaseAdmin
          .from('pg_policies')
          .select('policyname, tablename, cmd')
          .in('tablename', ['push_tokens', 'notifications']);
        
        diagnostics.tests.rls_policies = {
          success: !basicError,
          error: basicError?.message || policiesError.message,
          policies: basicPolicies || [],
          note: 'Using fallback policy check'
        };
      } else {
        diagnostics.tests.rls_policies = {
          success: true,
          policies: policies || [],
          note: 'Using RPC policy check'
        };
      }
    } catch (error: any) {
      diagnostics.tests.rls_policies = {
        success: false,
        error: error.message,
        note: 'Policy check failed - this is normal if RPC function does not exist'
      };
    }

    // Test 6: Check Supabase connection
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();
      
      diagnostics.tests.supabase_connection = {
        success: !connectionError,
        error: connectionError?.message,
        user_exists: !connectionError && !!connectionTest
      };
    } catch (error: any) {
      diagnostics.tests.supabase_connection = {
        success: false,
        error: error.message
      };
    }

    console.log('[DEBUG] Database diagnostics completed:', diagnostics);
    
    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('[DEBUG] Error in database diagnostics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}