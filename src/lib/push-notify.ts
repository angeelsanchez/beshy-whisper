import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { isNotificationEnabledForUser } from '@/lib/notification-preferences';
import type { NotificationType } from '@/types/notification-preferences';

export interface PushPayload {
  readonly title: string;
  readonly body: string;
  readonly tag: string;
  readonly data?: Record<string, unknown>;
  readonly requireInteraction?: boolean;
}

function ensureVapidConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    logger.error('VAPID keys not configured');
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:hola@beshy.es',
    publicKey,
    privateKey
  );

  return true;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!ensureVapidConfigured()) return false;

  const { data: token, error: tokenError } = await supabaseAdmin
    .from('push_tokens')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !token) {
    logger.info('No push token registered', { userId });
    return false;
  }

  const pushSubscription = {
    endpoint: token.endpoint,
    keys: { p256dh: token.p256dh, auth: token.auth },
  };

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag,
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data ?? {},
  });

  try {
    await webpush.sendNotification(pushSubscription, jsonPayload, {
      TTL: 60 * 60,
      headers: { Urgency: 'normal' },
    });
    logger.info('Push notification sent', { userId, tag: payload.tag });
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;

    if (statusCode === 410 || statusCode === 404) {
      await supabaseAdmin
        .from('push_tokens')
        .delete()
        .eq('endpoint', token.endpoint);
      logger.info('Removed expired push token', { userId, statusCode });
    } else {
      logger.error('Push notification failed', {
        userId,
        statusCode: statusCode ?? 'unknown',
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    return false;
  }
}

export async function sendPushToUserIfEnabled(
  userId: string,
  payload: PushPayload,
  notificationType: NotificationType
): Promise<boolean> {
  const enabled = await isNotificationEnabledForUser(userId, notificationType);
  if (!enabled) {
    logger.info('Notification skipped (user preference)', { userId, type: notificationType });
    return false;
  }
  return sendPushToUser(userId, payload);
}
