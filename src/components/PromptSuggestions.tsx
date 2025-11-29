'use client';

import { useMemo } from 'react';
import { getPromptsForFranja } from '@/data/writing-prompts';

interface PromptSuggestionsProps {
  readonly franja: 'DIA' | 'NOCHE';
  readonly isDay: boolean;
  readonly onSelect: (text: string) => void;
}

export default function PromptSuggestions({ franja, isDay, onSelect }: PromptSuggestionsProps) {
  const prompts = useMemo(() => getPromptsForFranja(franja), [franja]);

  return (
    <div className="mb-3">
      <p className="text-xs opacity-60 mb-2">Prueba con una de estas ideas:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.text}
            type="button"
            onClick={() => onSelect(prompt.text)}
            className={`text-xs px-3 py-2 rounded-full border transition-all duration-200 min-h-[44px] ${
              isDay
                ? 'border-[#4A2E1B]/30 hover:bg-[#4A2E1B]/10 active:bg-[#4A2E1B]/20'
                : 'border-[#F5F0E1]/30 hover:bg-[#F5F0E1]/10 active:bg-[#F5F0E1]/20'
            }`}
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
