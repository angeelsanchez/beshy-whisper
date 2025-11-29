'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityDay {
  date: string;
  count: number;
  hasDayPost: boolean;
  hasNightPost: boolean;
}

interface ActivityData {
  days: ActivityDay[];
  streak: number;
  totalPosts: number;
  loading: boolean;
  streakStartDate: string | null;
}

export const useActivityData = (userId: string | null): ActivityData => {
  const [data, setData] = useState<ActivityData>({
    days: [],
    streak: 0,
    totalPosts: 0,
    loading: true,
    streakStartDate: null
  });

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!userId) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Get posts from the last 365 days
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: posts, error } = await supabase
          .from('entries')
          .select('fecha, franja')
          .eq('user_id', userId)
          .eq('guest', false)
          .gte('fecha', oneYearAgo.toISOString())
          .order('fecha', { ascending: true });

        if (error) {
          console.error('Error fetching activity data:', error);
          setData(prev => ({ ...prev, loading: false }));
          return;
        }

        // Process posts into daily activity
        const activityMap = new Map<string, ActivityDay>();
        
        // Initialize all days for the last 365 days
        for (let i = 365; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          activityMap.set(dateStr, {
            date: dateStr,
            count: 0,
            hasDayPost: false,
            hasNightPost: false
          });
        }


        // Populate with actual post data
        posts?.forEach(post => {
          const dateStr = post.fecha.split('T')[0];
          const existing = activityMap.get(dateStr);
          
          if (existing) {
            existing.count++;
            if (post.franja === 'DIA') existing.hasDayPost = true;
            if (post.franja === 'NOCHE') existing.hasNightPost = true;
          }
        });

        // Calculate current streak (consecutive days with posts, ending today or most recent)
        let currentStreak = 0;
        let streakStartDate = null;
        const today = new Date().toISOString().split('T')[0];
        const sortedDays = Array.from(activityMap.values()).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
        
        // Find the most recent day with activity, or start from today
        let startIndex = -1;
        const todayIndex = sortedDays.findIndex(day => day.date === today);
        
        // If today has activity, start from today
        if (todayIndex !== -1 && sortedDays[todayIndex].count > 0) {
          startIndex = todayIndex;
        } else {
          // Otherwise, find the most recent day with activity
          startIndex = sortedDays.findIndex(day => day.count > 0);
        }
        
        // Calculate streak from the starting point and find the start date
        if (startIndex !== -1) {
          let streakEndIndex = startIndex;
          for (let i = startIndex; i < sortedDays.length; i++) {
            const day = sortedDays[i];
            if (day.count > 0) {
              currentStreak++;
              streakEndIndex = i;
            } else {
              break;
            }
          }
          
          // The streak start date is the last day in the consecutive sequence
          if (currentStreak > 0) {
            streakStartDate = sortedDays[streakEndIndex].date;
          }
        }

        setData({
          days: Array.from(activityMap.values()),
          streak: currentStreak,
          totalPosts: posts?.length || 0,
          loading: false,
          streakStartDate: streakStartDate
        });

      } catch (err) {
        console.error('Unexpected error fetching activity data:', err);
        setData(prev => ({ ...prev, loading: false, streakStartDate: null }));
      }
    };

    fetchActivityData();
  }, [userId]);

  return data;
};