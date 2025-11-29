import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import type { NotificationType } from '@/types/notification-preferences';

type PreferencesRecord = Record<string, boolean> | null;

/**
 * Check if a specific notification type is enabled given a preferences record.
 * Returns true when: prefs is null (all enabled), key is missing (default enabled),
 * or key is explicitly true. Returns false only if explicitly set to false.
 */
export function isNotificationEnabled(
  preferences: PreferencesRecord,
  type: NotificationType
): boolean {
  if (preferences === null || preferences === undefined) return true;
  const value = preferences[type];
  if (value === undefined) return true;
  return value;
}

export async function getUserNotificationPreferences(
  userId: string
): Promise<PreferencesRecord> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching notification preferences', { userId, detail: error.message });
    return null;
  }

  return (data?.notification_preferences as PreferencesRecord) ?? null;
}

export async function isNotificationEnabledForUser(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const preferences = await getUserNotificationPreferences(userId);
  return isNotificationEnabled(preferences, type);
}

export async function getBatchUserPreferences(
  userIds: ReadonlyArray<string>
): Promise<Map<string, PreferencesRecord>> {
  const result = new Map<string, PreferencesRecord>();

  if (userIds.length === 0) return result;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, notification_preferences')
    .in('id', [...userIds]);

  if (error) {
    logger.error('Error batch-fetching notification preferences', { detail: error.message });
    return result;
  }

  for (const row of data ?? []) {
    const user = row as { id: string; notification_preferences: PreferencesRecord };
    result.set(user.id, user.notification_preferences);
  }

  return result;
}
