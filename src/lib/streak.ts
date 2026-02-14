import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export interface TodayPostsResult {
  readonly hasDayPost: boolean;
  readonly hasNightPost: boolean;
}

export async function calculateUserStreak(userId: string): Promise<number> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('fecha, franja')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });

    if (error || !entries || entries.length === 0) {
      return 0;
    }

    let streak = 0;
    const currentDate = new Date(startOfDay);

    while (true) {
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.fecha);
        const entryStartOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        return entryStartOfDay.getTime() === currentDate.getTime();
      });

      if (dayEntries.length === 0) {
        break;
      }

      const hasDayPost = dayEntries.some(entry => entry.franja === 'DIA');
      const hasNightPost = dayEntries.some(entry => entry.franja === 'NOCHE');

      if (hasDayPost && hasNightPost) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('Error calculating user streak', { detail: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

export async function checkUserTodayPosts(userId: string): Promise<TodayPostsResult> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('franja')
      .eq('user_id', userId)
      .gte('fecha', startOfDay.toISOString())
      .lt('fecha', endOfDay.toISOString());

    if (error) {
      logger.error('Error checking today posts', { detail: error?.message || String(error) });
      return { hasDayPost: false, hasNightPost: false };
    }

    const hasDayPost = entries?.some(entry => entry.franja === 'DIA') || false;
    const hasNightPost = entries?.some(entry => entry.franja === 'NOCHE') || false;

    return { hasDayPost, hasNightPost };
  } catch (error) {
    logger.error('Error checking today posts', { detail: error instanceof Error ? error.message : String(error) });
    return { hasDayPost: false, hasNightPost: false };
  }
}
