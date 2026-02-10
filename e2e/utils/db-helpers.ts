import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const TEST_USER_EMAIL = 'e2e-test@beshy.es';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_BSY_ID = 'BSY999';

let supabase: SupabaseClient;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function ensureTestUser(): Promise<{ id: string; email: string }> {
  const db = getSupabase();

  const { data: existing } = await db
    .from('users')
    .select('id, email')
    .eq('email', TEST_USER_EMAIL)
    .single();

  if (existing) {
    return { id: existing.id, email: existing.email };
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 12);

  const { error } = await db.from('users').insert({
    id,
    email: TEST_USER_EMAIL,
    alias: TEST_USER_BSY_ID,
    bsy_id: TEST_USER_BSY_ID,
    name: 'E2E Test User',
    password_hash: passwordHash,
    provider: 'credentials',
    last_name_update: new Date().toISOString(),
    needs_name_input: false,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return { id, email: TEST_USER_EMAIL };
}

export async function ensureSecondUser(): Promise<{ id: string; email: string; bsy_id: string }> {
  const db = getSupabase();
  const email = 'e2e-second@beshy.es';
  const bsyId = 'BSY998';

  const { data: existing } = await db
    .from('users')
    .select('id, email, bsy_id')
    .eq('email', email)
    .single();

  if (existing) {
    return { id: existing.id, email: existing.email, bsy_id: existing.bsy_id };
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash('TestPassword123!', 12);

  const { error } = await db.from('users').insert({
    id,
    email,
    alias: bsyId,
    bsy_id: bsyId,
    name: 'E2E Second User',
    password_hash: passwordHash,
    provider: 'credentials',
    last_name_update: new Date().toISOString(),
    needs_name_input: false,
  });

  if (error) {
    throw new Error(`Failed to create second user: ${error.message}`);
  }

  return { id, email, bsy_id: bsyId };
}

export async function cleanTestEntries(userId: string): Promise<void> {
  const db = getSupabase();
  await db.from('entries').delete().eq('user_id', userId);
}

export async function cleanTestHabits(userId: string): Promise<void> {
  const db = getSupabase();
  const { data: habits } = await db
    .from('habits')
    .select('id')
    .eq('user_id', userId);

  if (habits && habits.length > 0) {
    const habitIds = habits.map((h) => h.id);
    await db.from('habit_logs').delete().in('habit_id', habitIds);
    await db.from('habits').delete().eq('user_id', userId);
  }
}

export async function cleanTestFollows(userId: string): Promise<void> {
  const db = getSupabase();
  await db.from('follows').delete().eq('follower_id', userId);
  await db.from('follows').delete().eq('followed_id', userId);
}

export async function cleanTestLikes(userId: string): Promise<void> {
  const db = getSupabase();
  await db.from('likes').delete().eq('user_id', userId);
}

export async function seedEntry(
  userId: string,
  opts: { message?: string; franja?: 'DIA' | 'NOCHE'; guest?: boolean } = {},
): Promise<string> {
  const db = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const { error } = await db.from('entries').insert({
    id,
    user_id: userId,
    mensaje: opts.message ?? 'E2E test whisper',
    franja: opts.franja ?? (now.getHours() >= 6 && now.getHours() < 18 ? 'DIA' : 'NOCHE'),
    fecha: now.toISOString(),
    guest: opts.guest ?? false,
    nombre: opts.guest ? 'E2E Guest' : null,
    ip: '127.0.0.1',
  });

  if (error) {
    throw new Error(`Failed to seed entry: ${error.message}`);
  }

  return id;
}

export async function cleanTestNotificationPreferences(userId: string): Promise<void> {
  const db = getSupabase();
  await db
    .from('users')
    .update({ notification_preferences: null })
    .eq('id', userId);
}

export async function cleanTestPushTokens(userId: string): Promise<void> {
  const db = getSupabase();
  await db.from('push_tokens').delete().eq('user_id', userId);
}

export async function cleanTestBio(userId: string): Promise<void> {
  const db = getSupabase();
  await db
    .from('users')
    .update({ bio: null })
    .eq('id', userId);
}

export async function cleanAllTestData(): Promise<void> {
  const db = getSupabase();

  const { data: testUsers } = await db
    .from('users')
    .select('id')
    .in('email', [TEST_USER_EMAIL, 'e2e-second@beshy.es']);

  if (!testUsers || testUsers.length === 0) return;

  const userIds = testUsers.map((u) => u.id);

  const { data: habits } = await db
    .from('habits')
    .select('id')
    .in('user_id', userIds);

  if (habits && habits.length > 0) {
    const habitIds = habits.map((h) => h.id);
    await db.from('habit_logs').delete().in('habit_id', habitIds);
  }

  await Promise.all([
    db.from('habits').delete().in('user_id', userIds),
    db.from('entries').delete().in('user_id', userIds),
    db.from('likes').delete().in('user_id', userIds),
    db.from('follows').delete().in('follower_id', userIds),
    db.from('follows').delete().in('followed_id', userIds),
    db.from('push_tokens').delete().in('user_id', userIds),
  ]);

  await db
    .from('users')
    .update({ notification_preferences: null, bio: null })
    .in('id', userIds);
}

export { TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_BSY_ID };
