'use client';

import { useEffect } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';

export default function LandingRedirect() {
  const { session, status } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const isGuest =
      typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true';

    if (session || isGuest) {
      router.push('/feed');
    }
  }, [session, status, router]);

  return null;
}
