'use client';

import { useMemo } from 'react';

interface HabitCalendarProps {
  completionsByDate: Record<string, number>;
  totalHabits: number;
  isDay: boolean;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function HabitCalendar({ completionsByDate, totalHabits, isDay }: HabitCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);

    const cells: { day: number | null; date: string; intensity: number }[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, date: '', intensity: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const completed = completionsByDate[dateStr] ?? 0;
      const intensity = totalHabits > 0 ? Math.min(completed / totalHabits, 1) : 0;
      cells.push({ day: d, date: dateStr, intensity });
    }

    return cells;
  }, [year, month, completionsByDate, totalHabits]);

  const monthName = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const getIntensityClass = (intensity: number, date: string) => {
    const isFuture = date > todayStr;
    if (isFuture) return isDay ? 'bg-[#4A2E1B]/3' : 'bg-[#F5F0E1]/3';
    if (intensity === 0) return isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
    if (intensity <= 0.25) return isDay ? 'bg-[#4A2E1B]/15' : 'bg-[#F5F0E1]/15';
    if (intensity <= 0.5) return isDay ? 'bg-[#4A2E1B]/30' : 'bg-[#F5F0E1]/30';
    if (intensity <= 0.75) return isDay ? 'bg-[#4A2E1B]/50' : 'bg-[#F5F0E1]/50';
    return isDay ? 'bg-[#4A2E1B]/80' : 'bg-[#F5F0E1]/80';
  };

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <h2 className={`text-base font-bold mb-3 capitalize ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        {monthName}
      </h2>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div
            key={day}
            className={`text-center text-xs font-medium pb-1 ${
              isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'
            }`}
          >
            {day}
          </div>
        ))}

        {calendarData.map((cell, i) => (
          <div key={i} className="aspect-square flex items-center justify-center">
            {cell.day !== null ? (
              <div
                className={`w-full h-full rounded-md flex items-center justify-center text-xs transition-colors ${
                  getIntensityClass(cell.intensity, cell.date)
                } ${cell.date === todayStr ? 'ring-1 ' + (isDay ? 'ring-[#4A2E1B]/40' : 'ring-[#F5F0E1]/40') : ''}`}
                title={`${cell.date}: ${Math.round(cell.intensity * 100)}%`}
              >
                <span className={`${
                  cell.intensity > 0.5
                    ? isDay ? 'text-[#F5F0E1]' : 'text-[#2D1E1A]'
                    : isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'
                }`}>
                  {cell.day}
                </span>
              </div>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>

      <div className={`flex items-center justify-end gap-1 mt-3 text-xs ${
        isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
      }`}>
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
          <div
            key={intensity}
            className={`w-3 h-3 rounded-sm ${getIntensityClass(intensity, todayStr)}`}
          />
        ))}
        <span>Mas</span>
      </div>
    </div>
  );
}
