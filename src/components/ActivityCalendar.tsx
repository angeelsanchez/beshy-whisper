'use client';

import { useState } from 'react';
import { useActivityData } from '@/hooks/useActivityData';

interface ActivityDay {
  date: string;
  count: number;
  hasDayPost: boolean;
  hasNightPost: boolean;
}

interface ActivityCalendarProps {
  userId: string | null;
  isDay: boolean;
}

// Fire icon for streak
const FireIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"/>
  </svg>
);

export default function ActivityCalendar({ userId, isDay }: ActivityCalendarProps) {
  const { days, streak, totalPosts, loading, streakStartDate } = useActivityData(userId);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  if (loading) {
    return (
      <div className={`p-4 rounded-lg transition-all duration-300 ${
        isDay ? 'bg-white/60' : 'bg-[#2D1E1A]/60'
      }`}>
        <div className="animate-pulse">
          <div className={`h-4 w-32 ${isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'} rounded mb-3`}></div>
          <div className="overflow-hidden">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}>
              {Array.from({ length: 371 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-sm ${isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'}`}
                  style={{ minWidth: '2px', maxWidth: '10px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getIntensityClass = (count: number, hasDayPost: boolean, hasNightPost: boolean) => {
    if (count === 0) {
      return isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';
    }
    
    // Perfect day (both day and night posts)
    if (hasDayPost && hasNightPost) {
      return isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]';
    }
    
    // Partial day (only one post)
    if (count === 1) {
      return isDay ? 'bg-[#4A2E1B]/60' : 'bg-[#F5F0E1]/60';
    }
    
    // More than 2 posts (rare, but possible)
    return isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getWeeksAndMonths = () => {
    const now = new Date();
    
    // Determine start date: either from streak start or one year ago
    let startDate = new Date();
    if (streakStartDate && streak > 0) {
      // Start from streak start date, but show up to 365 days
      const streakStart = new Date(streakStartDate);
      const maxStartDate = new Date();
      maxStartDate.setFullYear(maxStartDate.getFullYear() - 1);
      
      // Use streak start if it's within the last year, otherwise use one year ago
      startDate = streakStart > maxStartDate ? streakStart : maxStartDate;
    } else {
      // No streak, show last year
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    // Start from the beginning of the week that contains the start date
    const startOfWeek = new Date(startDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const weeks: ActivityDay[][] = [];
    const monthLabels: { month: string; weekIndex: number }[] = [];
    
    // Generate weeks
    const currentDate = new Date(startOfWeek);
    while (currentDate <= now) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = days.find(d => d.date === dateStr) || {
          date: dateStr,
          count: 0,
          hasDayPost: false,
          hasNightPost: false
        };
        week.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    // Create month labels only for key months (every ~3 months)
    const totalWeeks = weeks.length;
    const monthsToShow = [0, 3, 6, 9]; // Show months at 0, 3, 6, 9 month intervals
    
    monthsToShow.forEach(monthOffset => {
      const weekIndex = Math.floor((monthOffset / 12) * totalWeeks);
      if (weekIndex < weeks.length && weeks[weekIndex][0]) {
        const firstDayOfWeek = new Date(weeks[weekIndex][0].date);
        monthLabels.push({
          month: firstDayOfWeek.toLocaleDateString('es-ES', { month: 'short' }),
          weekIndex: weekIndex
        });
      }
    });
    
    return { weeks, monthLabels };
  };

  const { weeks, monthLabels } = getWeeksAndMonths();
  
  
  return (
    <div className={`p-4 rounded-lg transition-all duration-300 ${
      isDay ? 'bg-white/60 border border-[#4A2E1B]/10' : 'bg-[#2D1E1A]/60 border border-[#F5F0E1]/10'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Actividad del año</h3>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <FireIcon isDay={isDay} />
          <span>Racha: {streak} días</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex justify-between mb-2 text-xs opacity-60">
        {monthLabels.map((monthLabel, i) => (
          <div key={i} className="text-left">
            {monthLabel.month}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative overflow-hidden">
        <div className="flex gap-0.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <div
                  key={day.date}
                  className={`aspect-square rounded-sm cursor-pointer transition-all duration-150 hover:scale-110 ${getIntensityClass(
                    day.count, 
                    day.hasDayPost, 
                    day.hasNightPost
                  )}`}
                  style={{ width: '10px', height: '10px' }}
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${formatDate(day.date)}: ${day.count} whisper${day.count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap z-10 ${
            isDay 
              ? 'bg-[#4A2E1B] text-[#F5F0E1]' 
              : 'bg-[#F5F0E1] text-[#2D1E1A]'
          }`}>
            {(() => {
              const day = weeks.flat().find(d => d.date === hoveredDay);
              if (!day) return '';
              
              return `${formatDate(day.date)}: ${day.count} whisper${day.count !== 1 ? 's' : ''}`;
            })()}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 text-xs opacity-60">
        <span>Menos</span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-sm ${isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'}`} />
          <div className={`w-2 h-2 rounded-sm ${isDay ? 'bg-[#4A2E1B]/30' : 'bg-[#F5F0E1]/30'}`} />
          <div className={`w-2 h-2 rounded-sm ${isDay ? 'bg-[#4A2E1B]/60' : 'bg-[#F5F0E1]/60'}`} />
          <div className={`w-2 h-2 rounded-sm ${isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]'}`} />
        </div>
        <span>Más</span>
      </div>
    </div>
  );
}