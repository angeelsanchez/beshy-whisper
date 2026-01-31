import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

interface LockoutStatus {
  readonly locked: boolean;
  readonly remainingSeconds: number;
  readonly failedAttempts: number;
}

const LOCKOUT_THRESHOLDS: ReadonlyArray<{
  readonly attempts: number;
  readonly cooldownMinutes: number;
}> = [
  { attempts: 20, cooldownMinutes: 15 },
  { attempts: 10, cooldownMinutes: 5 },
  { attempts: 5, cooldownMinutes: 1 },
];

const WINDOW_MINUTES = 30;
const CLEANUP_PROBABILITY = 0.01;

export async function checkLockout(ip: string, email: string): Promise<LockoutStatus> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: attempts, error } = await supabaseAdmin
    .from('login_attempts')
    .select('attempted_at')
    .eq('ip_address', ip)
    .eq('email', normalizedEmail)
    .eq('success', false)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false });

  if (error) {
    logger.error('Error checking login attempts', { detail: error.message });
    return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  const failedCount = attempts?.length ?? 0;

  for (const threshold of LOCKOUT_THRESHOLDS) {
    if (failedCount >= threshold.attempts) {
      const mostRecent = attempts?.[0]?.attempted_at;
      if (mostRecent) {
        const cooldownEnd = new Date(mostRecent).getTime() + threshold.cooldownMinutes * 60 * 1000;
        const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
        if (remaining > 0) {
          return { locked: true, remainingSeconds: remaining, failedAttempts: failedCount };
        }
      }
      break;
    }
  }

  return { locked: false, remainingSeconds: 0, failedAttempts: failedCount };
}

export async function recordLoginAttempt(ip: string, email: string, success: boolean): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabaseAdmin
    .from('login_attempts')
    .insert({
      ip_address: ip,
      email: normalizedEmail,
      success,
    });

  if (error) {
    logger.error('Error recording login attempt', { detail: error.message });
  }

  if (Math.random() < CLEANUP_PROBABILITY) {
    supabaseAdmin.rpc('cleanup_old_login_attempts').then(({ error: cleanupError }) => {
      if (cleanupError) {
        logger.error('Error cleaning up login attempts', { detail: cleanupError.message });
      }
    });
  }
}
