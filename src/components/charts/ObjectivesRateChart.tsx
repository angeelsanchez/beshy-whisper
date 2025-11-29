'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeeklyObjectivesRate } from '@/hooks/useChartData';

interface ObjectivesRateChartProps {
  readonly data: readonly WeeklyObjectivesRate[];
  readonly isDay: boolean;
}

export default function ObjectivesRateChart({ data, isDay }: ObjectivesRateChartProps) {
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const areaColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const gridColor = isDay ? 'rgba(74,46,27,0.1)' : 'rgba(245,240,225,0.1)';
  const tooltipBg = isDay ? '#FFFFFF' : '#3A2723';
  const areaFillColor = isDay ? 'rgba(74,46,27,0.15)' : 'rgba(245,240,225,0.15)';

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={[...data]} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
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
          formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Completados']}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke={areaColor}
          fill={areaFillColor}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
