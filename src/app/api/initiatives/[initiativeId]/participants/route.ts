import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';
import { getTodayDate } from '@/utils/date-helpers';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const { data: initiative } = await supabaseAdmin
      .from('initiatives')
      .select('id')
      .eq('id', initiativeId)
      .eq('is_active', true)
      .maybeSingle();

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    const { data: participants, error: partError } = await supabaseAdmin
      .from('initiative_participants')
      .select('user_id, joined_at')
      .eq('initiative_id', initiativeId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (partError) {
      logger.error('Error fetching participants', { detail: partError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ participants: [] });
    }

    const userIds = participants.map(p => p.user_id);

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, alias, profile_photo_url')
      .in('id', userIds);

    const userMap = new Map<string, { name: string | null; alias: string | null; profile_photo_url: string | null }>();
    for (const u of users ?? []) {
      userMap.set(u.id, { name: u.name, alias: u.alias, profile_photo_url: u.profile_photo_url });
    }

    const today = getTodayDate();
    const { data: todayLogs } = await supabaseAdmin
      .from('initiative_logs')
      .select('user_id')
      .eq('initiative_id', initiativeId)
      .eq('completed_at', today);

    const todayCompletedSet = new Set((todayLogs ?? []).map(l => l.user_id));

    const { data: allLogs } = await supabaseAdmin
      .from('initiative_logs')
      .select('user_id, completed_at')
      .eq('initiative_id', initiativeId)
      .in('user_id', userIds)
      .order('completed_at', { ascending: false });

    const streakMap = new Map<string, number>();
    for (const userId of userIds) {
      const userLogs = (allLogs ?? [])
        .filter(l => l.user_id === userId)
        .map(l => l.completed_at);

      const uniqueDates = [...new Set(userLogs)].sort().reverse();
      let streak = 0;
      const todayDateObj = new Date(today);

      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = new Date(todayDateObj);
        expectedDate.setDate(todayDateObj.getDate() - i);
        const expectedStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;

        if (uniqueDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
      streakMap.set(userId, streak);
    }

    const result = participants.map(p => {
      const user = userMap.get(p.user_id);
      return {
        user_id: p.user_id,
        name: user?.name ?? null,
        alias: user?.alias ?? null,
        profile_photo_url: user?.profile_photo_url ?? null,
        joined_at: p.joined_at,
        checked_in_today: todayCompletedSet.has(p.user_id),
        personal_streak: streakMap.get(p.user_id) ?? 0,
      };
    });

    return NextResponse.json({ participants: result });
  } catch (error) {
    logger.error('Error in participants GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
