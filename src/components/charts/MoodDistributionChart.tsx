'use client';

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MoodCount } from '@/hooks/useChartData';
import { getMoodColor, getMoodEmoji, getMoodLabel } from '@/types/mood';

interface MoodDistributionChartProps {
  readonly data: readonly MoodCount[];
  readonly isDay: boolean;
}

function legendFormatter(value: string, _entry: unknown, textColor: string) {
  return <span style={{ color: textColor }}>{value}</span>;
}

export default function MoodDistributionChart({ data, isDay }: MoodDistributionChartProps) {
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const tooltipBg = isDay ? '#FFFFFF' : '#3A2723';

  if (data.length === 0) return null;

  const chartData = data.map(item => ({
    name: `${getMoodEmoji(item.mood)} ${getMoodLabel(item.mood)}`,
    value: item.count,
    fill: getMoodColor(item.mood),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: 'none',
            borderRadius: '8px',
            color: textColor,
            fontSize: 12,
          }}
          formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name ?? '']}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: textColor }}
          iconSize={10}
          formatter={(value: string, entry: unknown) => legendFormatter(value, entry, textColor)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
