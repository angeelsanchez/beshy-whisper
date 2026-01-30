import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const pushTokenSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = pushTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing required push subscription data' },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth } = parsed.data;
    const userId = session.user.id;
    const userAgent = request.headers.get('user-agent') || '';

    const { error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.error('User verification failed for push token registration');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('push_tokens')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      logger.error('Error saving push token', { detail: error?.message || String(error) });
      return NextResponse.json(
        { error: 'Failed to save push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in push token registration', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
