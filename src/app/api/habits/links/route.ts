import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: links, error } = await supabaseAdmin
      .from('habit_links')
      .select(`
        id, status, message, created_at, responded_at,
        requester_id, responder_id,
        requester_habit_id, responder_habit_id,
        requester:requester_id ( name, alias, profile_photo_url ),
        responder:responder_id ( name, alias, profile_photo_url ),
        requester_habit:requester_habit_id ( name, icon, color ),
        responder_habit:responder_habit_id ( name, icon, color )
      `)
      .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching habit links', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const acceptedLinks = (links ?? []).filter(l => l.status === 'accepted');
    const partnerHabitIds: string[] = [];
    for (const link of acceptedLinks) {
      const partnerHabitId = link.requester_id === userId
        ? link.responder_habit_id
        : link.requester_habit_id;
      if (partnerHabitId) partnerHabitIds.push(partnerHabitId);
    }

    let todayCompletions = new Map<string, boolean>();
    if (partnerHabitIds.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from('habit_logs')
        .select('habit_id')
        .in('habit_id', partnerHabitIds)
        .eq('completed_at', todayStr);

      if (logs) {
        todayCompletions = new Map(logs.map(l => [l.habit_id, true]));
      }
    }

    const enrichedLinks = (links ?? []).map(link => {
      const partnerHabitId = link.requester_id === userId
        ? link.responder_habit_id
        : link.requester_habit_id;
      return {
        ...link,
        partner_completed_today: partnerHabitId ? (todayCompletions.get(partnerHabitId) ?? false) : false,
      };
    });

    return NextResponse.json({ links: enrichedLinks });
  } catch (error) {
    logger.error('Error in habit links GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
