'use client';

import { useState, useEffect } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { supabase } from '@/lib/supabase';

interface DailyPostStatus {
  hasDayPost: boolean;
  hasNightPost: boolean;
  missingCount: number;
  contextualMissingCount: number; // Count based on current time of day
  loading: boolean;
}

export const useDailyPostStatus = (): DailyPostStatus => {
  const { session } = useAuthSession();
  const [status, setStatus] = useState<DailyPostStatus>({
    hasDayPost: false,
    hasNightPost: false,
    missingCount: 0,
    contextualMissingCount: 0,
    loading: true
  });

  useEffect(() => {
    const checkTodaysPosts = async () => {
      if (!session?.user?.id) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // Get today's posts for this user (only non-guest posts)
        const { data: todaysPosts, error } = await supabase
          .from('entries')
          .select('franja')
          .eq('user_id', session.user.id)
          .eq('guest', false)
          .gte('fecha', `${todayString}T00:00:00`)
          .lt('fecha', `${todayString}T23:59:59`);

        if (error) {
          console.error('Error checking daily posts:', error);
          setStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        const hasDayPost = todaysPosts?.some(post => post.franja === 'DIA') || false;
        const hasNightPost = todaysPosts?.some(post => post.franja === 'NOCHE') || false;
        
        // Calculate total missing count
        let missingCount = 0;
        if (!hasDayPost) missingCount++;
        if (!hasNightPost) missingCount++;

        // Calculate contextual missing count based on current time
        const now = new Date();
        const hour = now.getHours();
        const isDay = hour >= 6 && hour < 18;
        
        let contextualMissingCount = 0;
        if (isDay) {
          // During day time, only show day post as missing if not done
          if (!hasDayPost) contextualMissingCount++;
        } else {
          // During night time, show both missing posts that haven't been done yet
          if (!hasDayPost) contextualMissingCount++;
          if (!hasNightPost) contextualMissingCount++;
        }

        setStatus({
          hasDayPost,
          hasNightPost,
          missingCount,
          contextualMissingCount,
          loading: false
        });

      } catch (err) {
        console.error('Unexpected error checking daily posts:', err);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkTodaysPosts();
    
    // Check every 5 minutes to update the status
    const interval = setInterval(checkTodaysPosts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return status;
};