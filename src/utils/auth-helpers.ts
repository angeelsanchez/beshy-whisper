import { supabase } from "@/lib/supabase";
import { Session } from "next-auth";

/**
 * Synchronizes the NextAuth session with Supabase
 * This ensures that when a user logs in with NextAuth, they also have a session in Supabase
 */
export async function syncSupabaseSession(session: Session | null) {
  if (!session) return null;
  
  try {
    // For Supabase direct API access, we'll set a custom header with the user's ID
    // This is a workaround since we're not using Supabase Auth directly
    // We'll handle this in the supabase.ts file by adding a global header
    
    // Store the user ID in localStorage for Supabase to use
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase-user-id', session.user.id);
    }
    
    // Make a simple API call to validate that the user exists in Supabase
    const { data, error } = await supabase
      .from('users')
      .select('id, alias')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user from Supabase:', error);
      return null;
    }
    
    // Log success
    console.log('Successfully synchronized with Supabase, user:', data.alias);
    return data;
  } catch (error) {
    console.error('Unexpected error during Supabase session sync:', error);
    return null;
  }
}

/**
 * Get the Supabase callback URL for OAuth providers
 */
export function getSupabaseCallbackUrl() {
  return process.env.SUPABASE_CALLBACK_URL || 'https://jpjvphycemtihwzrsgoa.supabase.co/auth/v1/callback';
} 