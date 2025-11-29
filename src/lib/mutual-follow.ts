import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Check if two users follow each other (mutual follow)
 * Required for DM functionality
 */
export async function areMutualFollows(
  userA: string,
  userB: string
): Promise<boolean> {
  if (userA === userB) return false;

  const { data: follows, error } = await supabaseAdmin
    .from('follows')
    .select('follower_id, following_id')
    .or(
      `and(follower_id.eq.${userA},following_id.eq.${userB}),` +
        `and(follower_id.eq.${userB},following_id.eq.${userA})`
    );

  if (error || !follows) return false;
  if (follows.length !== 2) return false;

  const aFollowsB = follows.some(
    (f) => f.follower_id === userA && f.following_id === userB
  );
  const bFollowsA = follows.some(
    (f) => f.follower_id === userB && f.following_id === userA
  );

  return aFollowsB && bFollowsA;
}

/**
 * Get the canonical conversation pair order
 * Ensures user_a_id < user_b_id for consistent lookups
 */
export function getCanonicalPair(
  userId1: string,
  userId2: string
): { userAId: string; userBId: string } {
  return userId1 < userId2
    ? { userAId: userId1, userBId: userId2 }
    : { userAId: userId2, userBId: userId1 };
}
