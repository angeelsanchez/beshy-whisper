'use client';

import { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { PostProvider } from '@/context/PostContext';
import { ThemeProvider } from '@/context/ThemeContext';
import dynamic from 'next/dynamic';
import { useAuthSession } from '@/hooks/useAuthSession';

// Dynamically import the modal to avoid SSR issues
const NameInputModal = dynamic(() => import('@/components/NameInputModal'), {
  ssr: false,
});

// Wrapper component to handle the name input modal
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuthSession();
  const [showNameModal, setShowNameModal] = useState(false);
  const [checkedNameStatus, setCheckedNameStatus] = useState(false);

  useEffect(() => {
    // Check if user needs to set their name
    const checkNameStatus = async () => {
      if (status !== 'authenticated' || !session?.user?.id || checkedNameStatus) return;
      
      try {
        const response = await fetch('/api/user/name-status');
        
        if (!response.ok) {
          console.error('Failed to fetch name status');
          return;
        }
        
        const data = await response.json();
        
        if (data.needsNameInput) {
          setShowNameModal(true);
        }
        
        setCheckedNameStatus(true);
      } catch (err) {
        console.error('Error checking name status:', err);
      }
    };
    
    checkNameStatus();
  }, [session, status, checkedNameStatus]);

  return (
    <>
      {children}
      {showNameModal && <NameInputModal onClose={() => setShowNameModal(false)} />}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider 
        // More conservative session refetching
        refetchInterval={15 * 60} // Refetch session every 15 minutes (reduced frequency)
        refetchOnWindowFocus={false} // Disable aggressive refetch on focus
        refetchWhenOffline={false} // Don't refetch when offline
      >
        <PostProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </PostProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 