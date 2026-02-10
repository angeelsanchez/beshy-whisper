'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-lg"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <WifiOff className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>Sin conexion a internet</span>
    </div>
  );
}
