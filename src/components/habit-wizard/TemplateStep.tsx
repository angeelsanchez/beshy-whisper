'use client';

import { useState } from 'react';
import {
  CATEGORIES,
  getTemplatesByCategory,
  type HabitCategory,
  type HabitTemplate,
} from '@/lib/habit-templates';
import AppIcon from '@/components/AppIcon';
import { CATEGORY_KEYS } from './constants';

function TemplateCard({
  template,
  isDay,
  onClick,
}: {
  readonly template: HabitTemplate;
  readonly isDay: boolean;
  readonly onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-left transition-all active:scale-95 ${
        isDay
          ? 'bg-[#4A2E1B]/5 hover:bg-[#4A2E1B]/10'
          : 'bg-[#F5F0E1]/5 hover:bg-[#F5F0E1]/10'
      }`}
    >
      <div className="mb-1"><AppIcon identifier={template.icon} type="habit" className="w-6 h-6" /></div>
      <div className={`text-sm font-medium truncate ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        {template.name}
      </div>
      <div className={`text-[10px] mt-0.5 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
        {template.trackingType === 'binary'
          ? 'Sí/No'
          : `${template.targetValue} ${template.unit}/día`}
      </div>
    </button>
  );
}

function TemplateStep({
  isDay,
  onSelectTemplate,
  onCustom,
}: {
  readonly isDay: boolean;
  readonly onSelectTemplate: (template: HabitTemplate) => void;
  readonly onCustom: () => void;
}): React.ReactElement {
  const [selectedCat, setSelectedCat] = useState<HabitCategory>('health');
  const templates = getTemplatesByCategory(selectedCat);

  return (
    <div className="space-y-4">
      <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'}`}>
        Elige un template o crea uno personalizado
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {CATEGORY_KEYS.map(key => {
          const cat = CATEGORIES[key];
          const isSelected = selectedCat === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCat(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                isSelected
                  ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  : isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/70' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/70'
              }`}
            >
              <AppIcon identifier={cat.icon} type="category" className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {templates.map(template => (
          <TemplateCard
            key={template.name}
            template={template}
            isDay={isDay}
            onClick={() => onSelectTemplate(template)}
          />
        ))}
      </div>

      <button
        onClick={onCustom}
        className={`w-full py-3 rounded-xl text-sm font-medium border-2 border-dashed transition-colors ${
          isDay
            ? 'border-[#4A2E1B]/20 text-[#4A2E1B]/70 hover:border-[#4A2E1B]/40 hover:bg-[#4A2E1B]/5'
            : 'border-[#F5F0E1]/20 text-[#F5F0E1]/70 hover:border-[#F5F0E1]/40 hover:bg-[#F5F0E1]/5'
        }`}
      >
        Crear personalizado
      </button>
    </div>
  );
}

export default TemplateStep;
