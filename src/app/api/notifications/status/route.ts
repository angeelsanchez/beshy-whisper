import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's push tokens count
    const { count: tokensCount, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (tokensError) {
      logger.error('Error counting push tokens', { detail: tokensError?.message || String(tokensError) });
      return NextResponse.json(
        { error: 'Failed to count push tokens' },
        { status: 500 }
      );
    }

    // Get user's notifications count (if notifications table exists)
    let notificationsCount = 0;
    try {
      const { count: notifCount, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      if (!notifError) {
        notificationsCount = notifCount || 0;
      }
    } catch (_error) {
      // Notifications table might not exist, that's okay
      logger.info('Notifications table not available');
    }

    // Get user's entries count for context
    const { count: entriesCount, error: entriesError } = await supabaseAdmin
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (entriesError) {
      logger.error('Error counting entries', { detail: entriesError?.message || String(entriesError) });
    }

    // Check if user has recent activity
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const { count: recentEntriesCount, error: recentEntriesError } = await supabaseAdmin
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('fecha', oneWeekAgo.toISOString());

    if (recentEntriesError) {
      logger.error('Error counting recent entries', { detail: recentEntriesError?.message || String(recentEntriesError) });
    }

    // Check VAPID configuration
    const vapidConfig = {
      publicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: !!process.env.VAPID_PRIVATE_KEY,
      email: !!process.env.VAPID_EMAIL
    };

    const vapidConfigured = vapidConfig.publicKey && vapidConfig.privateKey && vapidConfig.email;

    // Overall status assessment
    let status = 'unknown';
    let message = '';
               const recommendations = [];

    if (!tokensCount || tokensCount === 0) {
      status = 'no-tokens';
      message = 'No hay tokens de notificación registrados';
      recommendations.push('Registrar para notificaciones push');
    } else if (tokensCount > 0 && vapidConfigured) {
      status = 'ready';
      message = 'Sistema de notificaciones listo';
      recommendations.push('Probar con una notificación de test');
    } else if (!vapidConfigured) {
      status = 'misconfigured';
      message = 'Configuración VAPID incompleta';
      recommendations.push('Verificar variables de entorno VAPID');
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name || 'Unknown'
      },
      status: {
        overall: status,
        message,
        recommendations
      },
      counts: {
        pushTokens: tokensCount || 0,
        notifications: notificationsCount,
        entries: entriesCount || 0,
        recentEntries: recentEntriesCount || 0
      },
      configuration: {
        vapid: vapidConfigured,
        vapidDetails: vapidConfig
      },
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in notifications status endpoint', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 