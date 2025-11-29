import { describe, it, expect } from 'vitest';
import { updateNotificationPreferencesSchema } from '../notification-preferences';

describe('updateNotificationPreferencesSchema', () => {
  it('accepts valid preferences with boolean values', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { like: false, follow: true, chat: false },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty preferences object', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: {},
    });
    expect(result.success).toBe(true);
  });

  it('accepts a single preference', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { reminder_morning: false },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid notification type key', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { invalid_type: false },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean value', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { like: 'yes' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric value', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { like: 1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing preferences key', () => {
    const result = updateNotificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null preferences', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid notification types', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: {
        like: true,
        follow: false,
        follow_post: true,
        chat: false,
        reminder_morning: true,
        reminder_streak: false,
        reminder_night: true,
        reminder_habit: false,
        initiative_reminder: true,
        initiative_weekly: false,
        initiative_streak: true,
        initiative_checkin: false,
        habit_milestone: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('provides field errors on validation failure', () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      preferences: { bad_key: 'not_bool' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error.flatten();
      expect(flat.fieldErrors).toBeDefined();
    }
  });
});
