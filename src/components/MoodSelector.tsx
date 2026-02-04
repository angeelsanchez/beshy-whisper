'use client';

import { MOOD_OPTIONS, type Mood } from '@/types/mood';
import AppIcon from '@/components/AppIcon';

interface MoodSelectorProps {
  readonly selected: Mood | null;
  readonly onChange: (mood: Mood | null) => void;
  readonly isDay: boolean;
}

export default function MoodSelector({ selected, onChange, isDay }: MoodSelectorProps) {
  const handleSelect = (mood: Mood): void => {
    onChange(selected === mood ? null : mood);
  };

  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2">¿Cómo te sientes?</p>
      <div className="grid grid-cols-4 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-h-[44px] ${
                isSelected
                  ? isDay
                    ? 'bg-[#4A2E1B]/20 ring-2 ring-[#4A2E1B]/40'
                    : 'bg-[#F5F0E1]/20 ring-2 ring-[#F5F0E1]/40'
                  : isDay
                    ? 'hover:bg-[#4A2E1B]/5'
                    : 'hover:bg-[#F5F0E1]/5'
              }`}
              aria-label={option.label}
              aria-pressed={isSelected}
            >
              <AppIcon identifier={option.value} type="mood" className="w-5 h-5" color={option.color} />
              <span className="text-[10px] leading-tight opacity-70">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
