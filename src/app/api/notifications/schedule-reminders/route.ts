import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { safeCompare } from '@/utils/crypto-helpers';
import {
  MORNING_REMINDER_START,
  STREAK_WARNING_START, STREAK_WARNING_END,
  NIGHT_REMINDER_START,
} from '@/lib/constants';

function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Deprecated. Use /api/notifications/cron-reminders instead.' },
    { status: 410 }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const status = {
      currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      nextReminders: {
        morning: currentTime < MORNING_REMINDER_START ? '10:00' : 'Tomorrow 10:00',
        afternoon: currentTime < STREAK_WARNING_START ? '15:00' : currentTime > STREAK_WARNING_END ? 'Tomorrow 15:00' : 'Active',
        night: currentTime < NIGHT_REMINDER_START ? '21:30' : 'Tomorrow 21:30'
      },
      systemStatus: 'Active'
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error getting reminder status', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
