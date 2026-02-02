import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    // Get the highest existing BSY ID
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('bsy_id')
      .ilike('bsy_id', 'BSY%')
      .order('bsy_id', { ascending: false })
      .limit(1);
    
    if (error) {
      logger.error('Error fetching BSY IDs', { detail: error?.message || String(error) });
      return NextResponse.json(
        { message: 'Failed to fetch BSY IDs' },
        { status: 500 }
      );
    }
    
    // Generate the next available BSY ID
    let nextNumber = 1;
    if (users && users.length > 0) {
      const lastBsyId = users[0].bsy_id;
      const lastNumber = parseInt(lastBsyId.replace('BSY', ''), 10);
      nextNumber = lastNumber + 1;
    }
    
    const nextBsyId = `BSY${nextNumber.toString().padStart(3, '0')}`;
    
    return NextResponse.json({
      nextAvailableBsyId: nextBsyId
    });
  } catch (error) {
    logger.error('BSY ID generation error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 