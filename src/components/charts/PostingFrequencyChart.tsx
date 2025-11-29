'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeeklyPostData } from '@/hooks/useChartData';

interface PostingFrequencyChartProps {
  readonly data: readonly WeeklyPostData[];
  readonly isDay: boolean;
}

export default function PostingFrequencyChart({ data, isDay }: PostingFrequencyChartProps) {
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const barColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const gridColor = isDay ? 'rgba(74,46,27,0.1)' : 'rgba(245,240,225,0.1)';
  const tooltipBg = isDay ? '#FFFFFF' : '#3A2723';

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={[...data]} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="week"
          tick={{ fill: textColor, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: textColor, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: 'none',
            borderRadius: '8px',
            color: textColor,
            fontSize: 12,
          }}
          labelStyle={{ color: textColor, fontWeight: 'bold' }}
          formatter={(value: number | undefined) => [value ?? 0, 'Whispers']}
        />
        <Bar
          dataKey="count"
          fill={barColor}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
