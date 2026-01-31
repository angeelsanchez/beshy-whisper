'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useDailyPostStatus } from '@/hooks/useDailyPostStatus';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/context/ThemeContext';

// Navigation items configuration
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode | ((isDay: boolean) => React.ReactNode);
  isPostButton?: boolean;
  badge?: number;
}

const getNavItems = (session: { user?: Record<string, unknown> } | null, isGuest: boolean) => {
  const items = [];
  
  // Show profile for authenticated users, login prompt for guests only
  if (session) {
    // If user has a session, they are authenticated (not guest)
    items.push(
      {
        id: 'profile',
        label: 'Perfil',
        href: '/profile',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
          </svg>
        )
      },
      {
        id: 'habits',
        label: 'Habitos',
        href: '/habits',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
          </svg>
        )
      }
    );
  } else if (isGuest) {
    // Only show login button for actual guest users (no session)
    items.push({
      id: 'login',
      label: 'Ingresar',
      href: '/login',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z"/>
          <path fillRule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
        </svg>
      )
    });
  }
  
  items.push(
    {
      id: 'create',
      label: 'Crear',
      href: '/create',
      icon: (isDay: boolean) => (
        <Image
          src="/w.svg"
          alt="Crear Post"
          width={24}
          height={24}
          className="w-6 h-6"
          style={{
            filter: isDay 
              ? 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
              : 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
          }}
        />
      ),
      isPostButton: true
    },
    {
      id: 'feed',
      label: 'Feed',
      href: '/feed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
          <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
        </svg>
      )
    }
  );
  
  return items;
};

export default function AdaptiveNavigation() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const { isDay } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const { contextualMissingCount, loading: statusLoading } = useDailyPostStatus();
  const { permission, requestPermission } = useNotifications();

  useEffect(() => {
    setMounted(true);
    const guestMode = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guestMode);
    
    // Request notification permission for authenticated users
    if (session && !isGuest && permission === 'default') {
      setTimeout(() => {
        requestPermission();
      }, 2000); // Wait 2 seconds after mount to request permission
    }
  }, [session, isGuest, permission, requestPermission]);

  if (!mounted) return null;

  // Don't show navigation on login page or home page (redirect only)
  if (pathname === '/login' || pathname === '/') return null;

  const navItems = getNavItems(session, isGuest);

  const getNavItemStyles = (item: NavItem, isActive: boolean) => {
    const baseStyles = "flex items-center justify-center transition-all duration-300 relative";
    
    if (item.isPostButton) {
      // Central post button - highlighted
      return `${baseStyles} ${
        isDay 
          ? 'bg-[#4A2E1B] text-[#F5F0E1] shadow-lg' 
          : 'bg-[#F5F0E1] text-[#2D1E1A] shadow-lg'
      } lg:w-16 lg:h-16 w-14 h-14 rounded-full hover:scale-110 active:scale-95`;
    }
    
    // Regular nav items
    const activeStyles = isActive 
      ? isDay 
        ? 'text-[#4A2E1B] bg-[#4A2E1B]/10' 
        : 'text-[#F5F0E1] bg-[#F5F0E1]/10'
      : isDay 
        ? 'text-[#4A2E1B]/70 hover:text-[#4A2E1B] hover:bg-[#4A2E1B]/5' 
        : 'text-[#F5F0E1]/70 hover:text-[#F5F0E1] hover:bg-[#F5F0E1]/5';

    return `${baseStyles} ${activeStyles} lg:w-16 lg:h-16 w-12 h-12 rounded-xl`;
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 ${
        isDay ? 'bg-[#F5F0E1]/95' : 'bg-[#2D1E1A]/95'
      } backdrop-blur-sm border-t ${
        isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'
      }`}>
        <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto mobile-nav-safe safe-area-left safe-area-right pb-safe mb-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={getNavItemStyles(item, isActive)}
                title={item.label}
              >
                <div className="flex flex-col items-center gap-1 relative">
                  <div className={item.isPostButton ? 'relative' : 'w-6 h-6'}>
                    {typeof item.icon === 'function' ? item.icon(isDay) : item.icon}
                    {/* Badge for missing posts on create button */}
                    {item.isPostButton && session && !isGuest && contextualMissingCount > 0 && !statusLoading && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {contextualMissingCount}
                      </div>
                    )}
                  </div>
                  {!item.isPostButton && (
                    <span className="text-xs font-medium">{item.label}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <nav className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-20 flex-col items-center py-8 safe-area-top safe-area-left ${
        isDay ? 'bg-[#F5F0E1]/95' : 'bg-[#2D1E1A]/95'
      } backdrop-blur-sm border-r ${
        isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'
      }`}>
        <div className="flex flex-col items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${getNavItemStyles(item, isActive)} group`}
                title={item.label}
              >
                <div className="flex items-center justify-center">
                  <div className={item.isPostButton ? 'relative' : 'w-6 h-6'}>
                    {typeof item.icon === 'function' ? item.icon(isDay) : item.icon}
                    {/* Badge for missing posts on create button */}
                    {item.isPostButton && session && !isGuest && contextualMissingCount > 0 && !statusLoading && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {contextualMissingCount}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Tooltip on hover */}
                <div className={`absolute left-full ml-3 px-2 py-1 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap ${
                  isDay 
                    ? 'bg-[#4A2E1B] text-[#F5F0E1]' 
                    : 'bg-[#F5F0E1] text-[#2D1E1A]'
                }`}>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}