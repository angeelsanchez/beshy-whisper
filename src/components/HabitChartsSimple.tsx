'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { logger } from '@/lib/logger';

type ChartView = 'week' | 'month' | 'year';

interface GlobalChartData {
  date?: string;
  week?: string;
  month?: string;
  label: string;
  percentage: number;
}

interface HabitChartData {
  habitId: string;
  habitName: string;
  data: GlobalChartData[];
}

interface ChartDataResponse {
  success: boolean;
  global: GlobalChartData[];
  habits: HabitChartData[];
  availableHabits: Array<{ id: string; name: string }>;
}

interface HabitChartsSimpleProps {
  readonly isDay: boolean;
}

export default function HabitChartsSimple({ isDay }: HabitChartsSimpleProps) {
  const [view, setView] = useState<ChartView>('week');
  const [globalData, setGlobalData] = useState<GlobalChartData[]>([]);
  const [habitsData, setHabitsData] = useState<HabitChartData[]>([]);
  const [availableHabits, setAvailableHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const params = new URLSearchParams({
          view,
          ...(selectedHabits.length > 0 && { habitIds: selectedHabits.join(',') }),
        });

        const response = await fetch(`/api/habits/chart-data?${params}`);
        if (!response.ok) {
          throw new Error('Failed to load chart data');
        }

        const data: ChartDataResponse = await response.json();
        setGlobalData(data.global);
        setHabitsData(data.habits);
        setAvailableHabits(data.availableHabits);
      } catch (error) {
        logger.error('Error loading chart data', { error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [view, selectedHabits]);

  const toggleHabitSelection = (habitId: string) => {
    if (selectedHabits.includes(habitId)) {
      setSelectedHabits(selectedHabits.filter(id => id !== habitId));
    } else if (selectedHabits.length < 5) {
      setSelectedHabits([...selectedHabits, habitId]);
    }
  };

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const textMuted = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const bg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const bgHover = isDay ? 'hover:bg-[#4A2E1B]/10' : 'hover:bg-[#F5F0E1]/10';
  const bgActive = isDay ? 'bg-[#4A2E1B]/15' : 'bg-[#F5F0E1]/15';

  if (loading) {
    return (
      <div className={`rounded-xl p-4 ${bg}`}>
        <p className={textMuted}>Cargando gráficas...</p>
      </div>
    );
  }

  const chartColors = isDay
    ? ['#4A2E1B', '#8B5A2B', '#A0522D', '#CD853F', '#D2B48C']
    : ['#F5F0E1', '#E8DCC4', '#D4C9B8', '#C0B5A8', '#ACA09C'];

  return (
    <div className={`rounded-xl p-4 ${bg} space-y-6`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-base font-bold ${text}`}>
            Completitud global
          </h2>
          <div className="flex gap-1">
            {(['week', 'month', 'year'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  view === v
                    ? bgActive
                    : `${textMuted} ${bgHover}`
                }`}
              >
                {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>

        {globalData.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={globalData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                stroke={isDay ? '#4A2E1B' : '#F5F0E1'}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke={isDay ? '#4A2E1B' : '#F5F0E1'}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDay ? '#F5F0E1' : '#2D1E1A',
                  border: `1px solid ${isDay ? '#4A2E1B' : '#F5F0E1'}`,
                  borderRadius: '8px',
                }}
                labelStyle={{ color: isDay ? '#4A2E1B' : '#F5F0E1' }}
              />
              <Bar dataKey="percentage" fill={isDay ? '#4A2E1B' : '#F5F0E1'} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {availableHabits.length > 0 && (
        <div>
          <h3 className={`text-sm font-semibold mb-2 ${text}`}>
            Comparar hábitos (hasta 5)
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {availableHabits.map(habit => (
              <button
                key={habit.id}
                onClick={() => toggleHabitSelection(habit.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  selectedHabits.includes(habit.id)
                    ? bgActive
                    : `${textMuted} ${bgHover}`
                }`}
              >
                {habit.name}
                {selectedHabits.includes(habit.id) && ' ✓'}
              </button>
            ))}
          </div>

          {habitsData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={habitsData[0]?.data || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  stroke={isDay ? '#4A2E1B' : '#F5F0E1'}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke={isDay ? '#4A2E1B' : '#F5F0E1'}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDay ? '#F5F0E1' : '#2D1E1A',
                    border: `1px solid ${isDay ? '#4A2E1B' : '#F5F0E1'}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: isDay ? '#4A2E1B' : '#F5F0E1' }}
                />
                <Legend />
                {habitsData.map((habit, idx) => (
                  <Line
                    key={habit.habitId}
                    dataKey="percentage"
                    name={habit.habitName}
                    stroke={chartColors[idx]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {selectedHabits.length === 0 && (
            <p className={`text-sm text-center py-8 ${textMuted}`}>
              Selecciona hasta 5 hábitos para comparar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
