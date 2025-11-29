import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabase } from '@/lib/supabase';
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
    
    // Get today's date boundaries
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Get today's entries for this user
    const { data: entries, error } = await supabase
      .from('entries')
      .select('id, fecha, franja, mensaje')
      .eq('user_id', userId)
      .gte('fecha', startOfDay.toISOString())
      .lt('fecha', endOfDay.toISOString())
      .order('fecha', { ascending: true });
    
    if (error) {
      console.error('Error fetching today posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch today posts' },
        { status: 500 }
      );
    }
    
    // Check which posts exist
    const hasDayPost = entries?.some(entry => entry.franja === 'DIA') || false;
    const hasNightPost = entries?.some(entry => entry.franja === 'NOCHE') || false;
    
    // Get the actual posts if they exist
    const dayPost = entries?.find(entry => entry.franja === 'DIA');
    const nightPost = entries?.find(entry => entry.franja === 'NOCHE');
    
    // Calculate time until next reminder
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    let nextReminder: string | null = null;
    let timeUntilNext: string | null = null;
    
    if (!hasDayPost && currentTime < 600) {
      // Morning reminder at 10:00
      const timeUntil = 600 - currentTime;
      const hours = Math.floor(timeUntil / 60);
      const minutes = timeUntil % 60;
      nextReminder = '10:00';
      timeUntilNext = `${hours}h ${minutes}m`;
    } else if (!hasNightPost && currentTime < 1290) {
      // Night reminder at 21:30
      const timeUntil = 1290 - currentTime;
      const hours = Math.floor(timeUntil / 60);
      const minutes = timeUntil % 60;
      nextReminder = '21:30';
      timeUntilNext = `${hours}h ${minutes}m`;
    } else if (!hasDayPost || !hasNightPost) {
      // Afternoon warning
      nextReminder = '15:00-18:00';
      timeUntilNext = 'Streak warning active';
    }
    
    return NextResponse.json({
      hasDayPost,
      hasNightPost,
      dayPost: dayPost ? {
        id: dayPost.id,
        fecha: dayPost.fecha,
        mensaje: dayPost.mensaje
      } : null,
      nightPost: nightPost ? {
        id: nightPost.id,
        fecha: nightPost.fecha,
        mensaje: nightPost.mensaje
      } : null,
      nextReminder,
      timeUntilNext,
      isComplete: hasDayPost && hasNightPost,
      currentTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    });
    
  } catch (error) {
    console.error('Error in today posts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 