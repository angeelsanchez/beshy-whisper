export function getSupabaseCallbackUrl() {
  const callbackUrl = process.env.SUPABASE_CALLBACK_URL;
  if (!callbackUrl) {
    throw new Error('SUPABASE_CALLBACK_URL environment variable is required');
  }
  return callbackUrl;
}
