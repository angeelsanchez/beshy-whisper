import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Use E2E prefix (not BSY) so test users are excluded from BSY ID generation
const TEST_USER_EMAIL = 'e2e-test@beshy.es';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_BSY_ID = 'E2E001';

const SECOND_USER_EMAIL = 'e2e-second@beshy.es';
const SECOND_USER_BSY_ID = 'E2E002';

// Email used by registration tests (cleaned up after each test)
const REGISTER_TEST_EMAIL = 'e2e-register@beshy.es';

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

  const { data: existing } = await db
    .from('users')
    .select('id, email, bsy_id')
    .eq('email', SECOND_USER_EMAIL)
    .single();

  if (existing) {
    return { id: existing.id, email: existing.email, bsy_id: existing.bsy_id };
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash('TestPassword123!', 12);

  const { error } = await db.from('users').insert({
    id,
    email: SECOND_USER_EMAIL,
    alias: SECOND_USER_BSY_ID,
    bsy_id: SECOND_USER_BSY_ID,
    name: 'E2E Second User',
    password_hash: passwordHash,
    provider: 'credentials',
    last_name_update: new Date().toISOString(),
    needs_name_input: false,
  });

  if (error) {
    throw new Error(`Failed to create second user: ${error.message}`);
  }

  return { id, email: SECOND_USER_EMAIL, bsy_id: SECOND_USER_BSY_ID };
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

/** Delete a user by email along with all related data */
async function deleteUserByEmail(db: SupabaseClient, email: string): Promise<void> {
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) return;

  const uid = user.id;

  // Clean related data
  const { data: habits } = await db.from('habits').select('id').eq('user_id', uid);
  if (habits && habits.length > 0) {
    const habitIds = habits.map((h) => h.id);
    await db.from('habit_logs').delete().in('habit_id', habitIds);
  }

  await Promise.all([
    db.from('entry_habit_snapshots').delete().eq('entry_id', uid), // just in case
    db.from('habits').delete().eq('user_id', uid),
    db.from('entries').delete().eq('user_id', uid),
    db.from('likes').delete().eq('user_id', uid),
    db.from('follows').delete().eq('follower_id', uid),
    db.from('follows').delete().eq('followed_id', uid),
    db.from('push_tokens').delete().eq('user_id', uid),
    db.from('objectives').delete().eq('user_id', uid),
    db.from('login_attempts').delete().eq('email', email),
  ]);

  // Delete the user record itself
  await db.from('users').delete().eq('id', uid);
}

/** Clean up ALL test data including user records */
export async function cleanAllTestData(): Promise<void> {
  const db = getSupabase();

  const testEmails = [TEST_USER_EMAIL, SECOND_USER_EMAIL, REGISTER_TEST_EMAIL];

  for (const email of testEmails) {
    await deleteUserByEmail(db, email);
  }
}

/** Delete only the registration test user (used in beforeEach) */
export async function cleanRegisterTestUser(): Promise<void> {
  const db = getSupabase();
  await deleteUserByEmail(db, REGISTER_TEST_EMAIL);
}

export { TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_BSY_ID, SECOND_USER_BSY_ID, REGISTER_TEST_EMAIL };
