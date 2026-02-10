import dynamic from 'next/dynamic';

const AdaptiveNavigation = dynamic(() => import('@/components/AdaptiveNavigation'));
const FloatingTimer = dynamic(() => import('@/components/FloatingTimer'));
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'));
const NotificationBanner = dynamic(() => import('@/components/NotificationBanner'));
const OfflineBanner = dynamic(() => import('@/components/OfflineBanner'));

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="lg:pl-20 pb-16 lg:pb-0 safe-area-top overflow-x-hidden">
        {children}
      </main>
      <OfflineBanner />
      <FloatingTimer />
      <AdaptiveNavigation />
      <NotificationBanner />
      <InstallPrompt />
    </>
  );
}
