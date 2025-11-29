'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { syncSupabaseSession } from '@/utils/auth-helpers';

/**
 * This component synchronizes the NextAuth session with Supabase
 * Include it in your layout or pages where you need Supabase authentication
 */
export default function SupabaseSessionSync() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    // Only attempt to sync when we have a confirmed session
    if (session && status === 'authenticated') {
      // Sync the NextAuth session with Supabase when it changes
      syncSupabaseSession(session)
        .then(result => {
          if (result) {
            console.log('Session sync successful');
          }
        })
        .catch(error => {
          console.error('Session sync failed:', error);
        });
    }
  }, [session, status]);
  
  // This is a background component that doesn't render anything
  return null;
} 