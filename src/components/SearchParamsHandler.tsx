'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchParamsHandlerProps {
  onUserIdChange: (userId: string | null) => void;
  defaultUserId?: string | null;
}

export default function SearchParamsHandler({ onUserIdChange, defaultUserId }: SearchParamsHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryUserId = searchParams.get('user');
    onUserIdChange(queryUserId || defaultUserId || null);
  }, [searchParams, onUserIdChange, defaultUserId]);

  return null;
}
