'use client';

import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  isDay: boolean;
  refreshThreshold?: number;
  maxPullDistance?: number;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  isDay,
  refreshThreshold = 60,
  maxPullDistance = 120
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);

  // Detect iOS device
  useEffect(() => {
    const detectIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };
    setIsIOS(detectIOS());
  }, []);

  // Check if we're at the top and can start pulling
  const checkCanPull = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop || window.scrollY;
      return scrollTop === 0;
    }
    return false;
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || !isIOS) return;
    
    const canStartPull = checkCanPull();
    setCanPull(canStartPull);
    
    if (canStartPull) {
      setStartY(e.touches[0].clientY);
      setIsPulling(false);
    }
  }, [isRefreshing, isIOS]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isRefreshing || !canPull || !isIOS) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      if (!isPulling) {
        setIsPulling(true);
      }

      // Calculate pull distance with diminishing returns for smoother feel
      const distance = Math.min(
        Math.pow(deltaY * 0.5, 0.8),
        maxPullDistance
      );
      
      setPullDistance(distance);
    }
  }, [isRefreshing, canPull, startY, isPulling, maxPullDistance, isIOS]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (isRefreshing || !isPulling || !isIOS) return;

    if (pullDistance >= refreshThreshold) {
      // Trigger refresh
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
        setCanPull(false);
      });
    } else {
      // Snap back
      setPullDistance(0);
      setIsPulling(false);
      setCanPull(false);
    }
  }, [isRefreshing, isPulling, pullDistance, refreshThreshold, onRefresh, isIOS]);

  // Add event listeners only for iOS
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isIOS) return;

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isIOS]);

  // Animation for pull distance
  useEffect(() => {
    if (refreshIndicatorRef.current) {
      const indicator = refreshIndicatorRef.current;
      
      if (isPulling || isRefreshing) {
        indicator.style.transform = `translateY(${pullDistance}px)`;
        indicator.style.opacity = Math.min(pullDistance / refreshThreshold, 1).toString();
      } else {
        indicator.style.transform = 'translateY(0px)';
        indicator.style.opacity = '0';
      }
    }
  }, [pullDistance, isPulling, isRefreshing, refreshThreshold]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-auto"
    >
      {/* Refresh Indicator - Only show on iOS */}
      {isIOS && (
        <div
          ref={refreshIndicatorRef}
          className={`fixed top-0 z-40 pointer-events-none transition-all duration-300 ${
            isPulling || isRefreshing ? 'visible' : 'invisible'
          }`}
          style={{
            left: '35%',
            transform: `translateX(-50%) translateY(${Math.max(pullDistance - 40, -40)}px)`,
            opacity: isPulling || isRefreshing ? Math.min(pullDistance / refreshThreshold, 1) : 0
          }}
        >
        <div className={`flex flex-col items-center justify-center p-4 rounded-full shadow-lg backdrop-blur-sm ${
          isDay 
            ? 'bg-[#F5F0E1]/90 text-[#4A2E1B]' 
            : 'bg-[#2D1E1A]/90 text-[#F5F0E1]'
        }`}>
          {isRefreshing ? (
            // Spinning refresh icon
            <div className="animate-spin">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="animate-spin"
              >
                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
            </div>
          ) : pullDistance >= refreshThreshold ? (
            // Release to refresh - arrow pointing up
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="currentColor" 
              viewBox="0 0 16 16"
              className="transform rotate-180"
            >
              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
            </svg>
          ) : (
            // Pull down arrow
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="currentColor" 
              viewBox="0 0 16 16"
            >
              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
            </svg>
          )}
          
          {/* Status text */}
          <span className="text-xs mt-1 font-medium">
            {isRefreshing 
              ? 'Actualizando...' 
              : pullDistance >= refreshThreshold 
                ? 'Suelta para actualizar'
                : 'Desliza hacia abajo'
            }
          </span>
        </div>
        </div>
      )}

      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  );
}