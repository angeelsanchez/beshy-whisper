'use client';

import { useState } from 'react';
import { usePostingFrequency, useMoodDistribution, useObjectivesRate } from '@/hooks/useChartData';
import PostingFrequencyChart from '@/components/charts/PostingFrequencyChart';
import MoodDistributionChart from '@/components/charts/MoodDistributionChart';
import ObjectivesRateChart from '@/components/charts/ObjectivesRateChart';
import ActivityCalendar from '@/components/ActivityCalendar';

interface StatsSectionProps {
  readonly userId: string | null;
  readonly isDay: boolean;
}

type ChartTab = 'frequency' | 'calendar' | 'mood' | 'objectives';

interface TabConfig {
  readonly key: ChartTab;
  readonly label: string;
}

const TABS: readonly TabConfig[] = [
  { key: 'frequency', label: 'Actividad' },
  { key: 'calendar', label: 'Calendario' },
  { key: 'mood', label: 'Emociones' },
  { key: 'objectives', label: 'Objetivos' },
] as const;

export default function StatsSection({ userId, isDay }: StatsSectionProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('frequency');

  const { data: frequencyData, loading: freqLoading } = usePostingFrequency(userId);
  const { data: moodData, loading: moodLoading } = useMoodDistribution(userId);
  const { data: objectivesData, loading: objLoading } = useObjectivesRate(userId);

  const hasFrequencyData = frequencyData.some(w => w.count > 0);
  const hasMoodData = moodData.length > 0;
  const hasObjectivesData = objectivesData.some(w => w.rate > 0);
  const isLoading = freqLoading || moodLoading || objLoading;

  if (isLoading) {
    return (
      <div className={`mb-8 p-4 rounded-lg ${isDay ? 'bg-white/10' : 'bg-white/5'}`}>
        <div className="animate-pulse space-y-3">
          <div className={`h-5 w-32 rounded ${isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'}`} />
          <div className={`h-[200px] rounded ${isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'}`} />
        </div>
      </div>
    );
  }

  const availableTabs = TABS.filter(tab => {
    if (tab.key === 'frequency') return hasFrequencyData;
    if (tab.key === 'calendar') return true;
    if (tab.key === 'mood') return hasMoodData;
    if (tab.key === 'objectives') return hasObjectivesData;
    return false;
  });

  if (availableTabs.length === 0) return null;

  const resolvedTab = availableTabs.some(t => t.key === activeTab)
    ? activeTab
    : availableTabs[0].key;

  return (
    <div className={`mb-8 p-4 rounded-lg shadow-md ${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'}`}>
      <h3 className="font-bold text-sm mb-3">Estadísticas</h3>

      {availableTabs.length > 1 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                resolvedTab === tab.key
                  ? isDay
                    ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                    : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  : isDay
                    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
                    : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-[200px]">
        {resolvedTab === 'frequency' && hasFrequencyData && (
          <div>
            <p className="text-xs opacity-70 mb-2">Whispers por semana (12 semanas)</p>
            <PostingFrequencyChart data={frequencyData} isDay={isDay} />
          </div>
        )}

        {resolvedTab === 'calendar' && (
          <ActivityCalendar userId={userId} isDay={isDay} />
        )}

        {resolvedTab === 'mood' && hasMoodData && (
          <div>
            <p className="text-xs opacity-70 mb-2">Distribución de emociones</p>
            <MoodDistributionChart data={moodData} isDay={isDay} />
          </div>
        )}

        {resolvedTab === 'objectives' && hasObjectivesData && (
          <div>
            <p className="text-xs opacity-70 mb-2">Tasa de objetivos completados (12 semanas)</p>
            <ObjectivesRateChart data={objectivesData} isDay={isDay} />
          </div>
        )}
      </div>
    </div>
  );
}
