'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchParamsWrapperProps {
  onUserIdChange: (userId: string | null) => void;
  defaultUserId?: string | null;
}

export function SearchParamsWrapper({ onUserIdChange, defaultUserId }: SearchParamsWrapperProps) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const userId = searchParams.get('user') || defaultUserId || null;
    onUserIdChange(userId);
  }, [searchParams, onUserIdChange, defaultUserId]);
  
  return null;
}
