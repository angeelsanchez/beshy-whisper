import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No session or user' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get all entries for this user, ordered by date
    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('fecha, franja')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });
    
    if (error) {
      console.error('Error fetching user entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user entries' },
        { status: 500 }
      );
    }
    
    if (!entries || entries.length === 0) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        totalPosts: 0,
        lastPostDate: null,
        streakHistory: []
      });
    }
    
    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastPostDate = null;
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Group entries by date
    const entriesByDate = new Map<string, { hasDayPost: boolean; hasNightPost: boolean }>();
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.fecha);
      const dateKey = entryDate.toISOString().split('T')[0];
      
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, { hasDayPost: false, hasNightPost: false });
      }
      
      const dateEntry = entriesByDate.get(dateKey)!;
      if (entry.franja === 'DIA') {
        dateEntry.hasDayPost = true;
      } else if (entry.franja === 'NOCHE') {
        dateEntry.hasNightPost = true;
      }
    });
    
    // Sort dates in descending order
    const sortedDates = Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a));
    
    // Calculate streaks
    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i];
      const dateEntry = entriesByDate.get(dateKey)!;
      
      // Check if this date has both day and night posts
      if (dateEntry.hasDayPost && dateEntry.hasNightPost) {
        tempStreak++;
        
        // Update longest streak
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        
        // Update current streak if this is today or yesterday
        const entryDate = new Date(dateKey);
        const daysDiff = Math.floor((startOfToday.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1 && currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        // Break the streak
        tempStreak = 0;
      }
    }
    
    // Get last post date
    if (entries.length > 0) {
      lastPostDate = entries[0].fecha;
    }
    
    // Get streak history (last 30 days)
    const streakHistory = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(thirtyDaysAgo);
      checkDate.setDate(checkDate.getDate() + i);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      const dateEntry = entriesByDate.get(dateKey);
      if (dateEntry) {
        streakHistory.push({
          date: dateKey,
          hasDayPost: dateEntry.hasDayPost,
          hasNightPost: dateEntry.hasNightPost,
          complete: dateEntry.hasDayPost && dateEntry.hasNightPost
        });
      } else {
        streakHistory.push({
          date: dateKey,
          hasDayPost: false,
          hasNightPost: false,
          complete: false
        });
      }
    }
    
    return NextResponse.json({
      currentStreak,
      longestStreak,
      totalPosts: entries.length,
      lastPostDate,
      streakHistory: streakHistory.reverse() // Show oldest to newest
    });
    
  } catch (error) {
    console.error('Error in streak API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 