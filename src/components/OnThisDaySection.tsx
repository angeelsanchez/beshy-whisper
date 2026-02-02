'use client';

import { useState } from 'react';
import { useOnThisDay, type MemoryGroup } from '@/hooks/useOnThisDay';
import { isMood, getMoodEmoji } from '@/types/mood';

interface OnThisDaySectionProps {
  readonly userId: string | null | undefined;
  readonly isDay: boolean;
}

function formatMemoryDate(fecha: string): string {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function MemoryGroupCard({
  group,
  isDay,
  expanded,
  onToggle,
}: {
  readonly group: MemoryGroup;
  readonly isDay: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className={`rounded-lg border transition-all duration-200 ${
      isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 text-left min-h-[44px] ${
          isDay ? 'hover:bg-[#4A2E1B]/5' : 'hover:bg-[#F5F0E1]/5'
        } rounded-lg transition-colors`}
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium">{group.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {group.memories.map((memory) => (
            <div
              key={memory.id}
              className={`p-3 rounded-md text-sm ${
                isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 opacity-60 text-xs">
                <span>{memory.franja === 'DIA' ? '☀️' : '🌙'}</span>
                {memory.mood && isMood(memory.mood) && (
                  <span>{getMoodEmoji(memory.mood)}</span>
                )}
                <span>{formatMemoryDate(memory.fecha)}</span>
              </div>
              <p className="leading-relaxed break-words whitespace-pre-wrap">{memory.mensaje}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnThisDaySection({ userId, isDay }: OnThisDaySectionProps) {
  const { groups, loading } = useOnThisDay(userId);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  if (loading || groups.length === 0) return null;

  const toggleGroup = (monthsAgo: number): void => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(monthsAgo)) {
        next.delete(monthsAgo);
      } else {
        next.add(monthsAgo);
      }
      return next;
    });
  };

  return (
    <div className="mb-6">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
        isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
      }`}>
        <span>📅</span>
        En este día...
      </h3>
      <div className="space-y-2">
        {groups.map((group) => (
          <MemoryGroupCard
            key={group.monthsAgo}
            group={group}
            isDay={isDay}
            expanded={expandedGroups.has(group.monthsAgo)}
            onToggle={() => toggleGroup(group.monthsAgo)}
          />
        ))}
      </div>
    </div>
  );
}
