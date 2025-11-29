export const RETOMA_THRESHOLD_DAYS = 7;

export type FrequencyMode = 'specific_days' | 'weekly_count';

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekCompletionCount(
  completedDates: ReadonlySet<string>,
  referenceDate: Date = new Date()
): number {
  const monday = getMonday(referenceDate);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (completedDates.has(toDateStr(d))) {
      count++;
    }
  }
  return count;
}

export function isWeeklyQuotaMet(
  completedDates: ReadonlySet<string>,
  weeklyTarget: number,
  referenceDate: Date = new Date()
): boolean {
  return getWeekCompletionCount(completedDates, referenceDate) >= weeklyTarget;
}

export function isDueToday(
  frequencyMode: FrequencyMode,
  targetDays: readonly number[],
  weeklyTarget: number | null,
  completedDates: ReadonlySet<string>,
  today: Date = new Date()
): boolean {
  if (frequencyMode === 'weekly_count') {
    if (weeklyTarget === null) return true;
    return !isWeeklyQuotaMet(completedDates, weeklyTarget, today);
  }
  return Array.isArray(targetDays) ? targetDays.includes(today.getDay()) : true;
}

export function countRetomas(sortedDates: readonly string[]): number {
  if (sortedDates.length < 2) return 0;

  let retomas = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00Z');
    const curr = new Date(sortedDates[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > RETOMA_THRESHOLD_DAYS) {
      retomas++;
    }
  }
  return retomas;
}

export function calculateCompletionRateForWeeklyCount(
  dates: readonly string[],
  weeklyTarget: number
): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const weekStart = toDateStr(sevenDaysAgo);
  const weekEnd = toDateStr(today);

  const completedThisWeek = dates.filter(d => d >= weekStart && d <= weekEnd).length;
  const divisor = Math.max(weeklyTarget, 1);
  return Math.min(Math.round((completedThisWeek / divisor) * 100), 100);
}
