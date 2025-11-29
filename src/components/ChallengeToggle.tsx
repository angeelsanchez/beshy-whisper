'use client';

import type { Challenge } from '@/types/challenge';

interface ChallengeToggleProps {
  readonly challenge: Challenge;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly isDay: boolean;
}

export default function ChallengeToggle({ challenge, checked, onChange, isDay }: ChallengeToggleProps) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        checked
          ? isDay
            ? 'bg-[#4A2E1B]/10'
            : 'bg-[#F5F0E1]/10'
          : 'bg-transparent'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? isDay
              ? 'bg-[#4A2E1B] border-[#4A2E1B]'
              : 'bg-[#F5F0E1] border-[#F5F0E1]'
            : isDay
              ? 'border-[#4A2E1B]/40'
              : 'border-[#F5F0E1]/40'
        }`}
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill={isDay ? '#F5F0E1' : '#2D1E1A'}
            viewBox="0 0 16 16"
          >
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">
          🏆 Participar en: <span className="font-bold">{challenge.title}</span>
        </span>
      </div>
    </label>
  );
}
