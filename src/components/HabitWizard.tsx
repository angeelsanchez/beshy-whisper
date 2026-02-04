'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import {
  CATEGORIES,
  ICON_OPTIONS,
  getTemplatesByCategory,
  type HabitCategory,
  type TrackingType,
  type HabitTemplate,
} from '@/lib/habit-templates';
import AppIcon from '@/components/AppIcon';

const PRESET_COLORS = [
  '#4A2E1B', '#8B5E3C', '#A0522D', '#CD853F',
  '#2E7D32', '#1565C0', '#6A1B9A', '#C62828',
  '#EF6C00', '#00838F', '#4E342E', '#37474F',
];

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND_DAYS = [0, 6];
const COMMON_UNITS = ['vasos', 'páginas', 'min', 'km', 'pasos', 'reps'];
const CATEGORY_KEYS = Object.keys(CATEGORIES) as HabitCategory[];
const DAY_PRESETS = [
  { label: 'Todos', days: ALL_DAYS },
  { label: 'L-V', days: WEEKDAYS },
  { label: 'Fines', days: WEEKEND_DAYS },
];

export interface HabitWizardData {
  name: string;
  description: string;
  trackingType: TrackingType;
  targetValue?: number;
  unit?: string;
  targetDays: number[];
  color: string;
  icon?: string;
  category?: HabitCategory;
  reminderTime?: string;
}

interface InitialHabitData {
  readonly name: string;
  readonly description: string | null;
  readonly tracking_type: TrackingType;
  readonly target_value: number | null;
  readonly unit: string | null;
  readonly target_days: number[];
  readonly color: string;
  readonly icon: string | null;
  readonly category: HabitCategory | null;
  readonly reminder_time: string | null;
}

interface HabitWizardProps {
  readonly mode: 'create' | 'edit';
  readonly initialData?: InitialHabitData;
  readonly onSubmit: (data: HabitWizardData) => Promise<boolean>;
  readonly onDelete?: () => Promise<boolean>;
}

interface FormState {
  name: string;
  description: string;
  trackingType: TrackingType;
  targetValueStr: string;
  unit: string;
  targetDays: number[];
  color: string;
  icon: string;
  category: HabitCategory | null;
  reminderEnabled: boolean;
  reminderTime: string;
}

type FieldUpdater = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function getInitialForm(initialData?: InitialHabitData): FormState {
  if (!initialData) {
    return {
      name: '',
      description: '',
      trackingType: 'binary',
      targetValueStr: '',
      unit: '',
      targetDays: ALL_DAYS,
      color: '#4A2E1B',
      icon: '',
      category: null,
      reminderEnabled: false,
      reminderTime: '09:00',
    };
  }

  return {
    name: initialData.name,
    description: initialData.description ?? '',
    trackingType: initialData.tracking_type,
    targetValueStr: initialData.target_value?.toString() ?? '',
    unit: initialData.unit ?? '',
    targetDays: Array.isArray(initialData.target_days) && initialData.target_days.length > 0
      ? [...initialData.target_days].sort((a, b) => a - b)
      : ALL_DAYS,
    color: initialData.color,
    icon: initialData.icon ?? '',
    category: initialData.category,
    reminderEnabled: initialData.reminder_time !== null,
    reminderTime: initialData.reminder_time ?? '09:00',
  };
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function formatDaysLabel(days: readonly number[]): string {
  if (arraysEqual(days, ALL_DAYS)) return 'Todos los días';
  if (arraysEqual(days, WEEKDAYS)) return 'Lunes a Viernes';
  if (arraysEqual(days, WEEKEND_DAYS)) return 'Fines de semana';
  return days.map(d => DAY_LABELS[d]).join(', ');
}

function StepIndicator({ step, isDay }: { readonly step: number; readonly isDay: boolean }): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8' : 'w-4'
          } ${
            s <= step
              ? isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]'
              : isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'
          }`}
        />
      ))}
    </div>
  );
}

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

function DaySelector({
  targetDays,
  isDay,
  onToggle,
  onPreset,
}: {
  readonly targetDays: readonly number[];
  readonly isDay: boolean;
  readonly onToggle: (day: number) => void;
  readonly onPreset: (days: number[]) => void;
}): React.ReactElement {
  return (
    <div>
      <span className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Días
      </span>
      <div className="flex gap-1.5 mb-2">
        {DAY_LABELS.map((label, dayIndex) => {
          const isSelected = targetDays.includes(dayIndex);
          return (
            <button
              key={dayIndex}
              type="button"
              onClick={() => onToggle(dayIndex)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  : isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/50' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        {DAY_PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPreset(preset.days)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              arraysEqual(targetDays, preset.days)
                ? isDay ? 'bg-[#4A2E1B]/20 text-[#4A2E1B]' : 'bg-[#F5F0E1]/20 text-[#F5F0E1]'
                : isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigureStep({
  form,
  isDay,
  error,
  onChange,
  onDayToggle,
  onDayPreset,
  onNext,
}: {
  readonly form: FormState;
  readonly isDay: boolean;
  readonly error: string | null;
  readonly onChange: FieldUpdater;
  readonly onDayToggle: (day: number) => void;
  readonly onDayPreset: (days: number[]) => void;
  readonly onNext: () => void;
}): React.ReactElement {
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDay
      ? 'bg-white/60 border-[#4A2E1B]/20 text-[#4A2E1B] placeholder:text-[#4A2E1B]/40'
      : 'bg-white/5 border-[#F5F0E1]/20 text-[#F5F0E1] placeholder:text-[#F5F0E1]/40'
  }`;
  const labelCls = `block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Nombre *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
          maxLength={100}
          placeholder="Ej: Leer 20 minutos"
          className={inputCls}
          autoFocus
        />
      </div>

      <div>
        <label className={labelCls}>Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={e => onChange('description', e.target.value)}
          maxLength={500}
          placeholder="Descripción opcional"
          className={inputCls}
        />
      </div>

      <TrackingTypeToggle
        value={form.trackingType}
        isDay={isDay}
        onChange={val => onChange('trackingType', val)}
      />

      {form.trackingType === 'quantity' && (
        <QuantityFields
          targetValueStr={form.targetValueStr}
          unit={form.unit}
          isDay={isDay}
          inputCls={inputCls}
          labelCls={labelCls}
          onTargetChange={val => onChange('targetValueStr', val)}
          onUnitChange={val => onChange('unit', val)}
        />
      )}

      {form.trackingType === 'timer' && (
        <TimerFields
          targetValueStr={form.targetValueStr}
          isDay={isDay}
          inputCls={inputCls}
          labelCls={labelCls}
          onTargetChange={val => onChange('targetValueStr', val)}
        />
      )}

      <CategorySelector
        value={form.category}
        isDay={isDay}
        onChange={val => onChange('category', val)}
      />

      <DaySelector
        targetDays={form.targetDays}
        isDay={isDay}
        onToggle={onDayToggle}
        onPreset={onDayPreset}
      />

      <ColorPicker
        value={form.color}
        isDay={isDay}
        onChange={val => onChange('color', val)}
      />

      <IconPicker
        value={form.icon}
        isDay={isDay}
        onChange={val => onChange('icon', val)}
      />

      <button
        type="button"
        onClick={onNext}
        disabled={!form.name.trim()}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
          !form.name.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
        } ${isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'}`}
      >
        Siguiente
      </button>
    </div>
  );
}

function TrackingTypeToggle({
  value,
  isDay,
  onChange,
}: {
  readonly value: TrackingType;
  readonly isDay: boolean;
  readonly onChange: (val: TrackingType) => void;
}): React.ReactElement {
  const options: { key: TrackingType; label: string }[] = [
    { key: 'binary', label: 'Sí/No' },
    { key: 'quantity', label: 'Cantidad' },
    { key: 'timer', label: 'Tiempo' },
  ];

  return (
    <div>
      <span className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Tipo de seguimiento
      </span>
      <div className={`flex rounded-lg overflow-hidden border ${
        isDay ? 'border-[#4A2E1B]/20' : 'border-[#F5F0E1]/20'
      }`}>
        {options.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              value === opt.key
                ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                : isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuantityFields({
  targetValueStr,
  unit,
  isDay,
  inputCls,
  labelCls,
  onTargetChange,
  onUnitChange,
}: {
  readonly targetValueStr: string;
  readonly unit: string;
  readonly isDay: boolean;
  readonly inputCls: string;
  readonly labelCls: string;
  readonly onTargetChange: (val: string) => void;
  readonly onUnitChange: (val: string) => void;
}): React.ReactElement {
  return (
    <>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Objetivo *</label>
          <input
            type="number"
            value={targetValueStr}
            onChange={e => onTargetChange(e.target.value)}
            min={1}
            max={999999}
            placeholder="8"
            className={inputCls}
            inputMode="decimal"
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Unidad *</label>
          <input
            type="text"
            value={unit}
            onChange={e => onUnitChange(e.target.value)}
            maxLength={20}
            placeholder="vasos"
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_UNITS.map(u => (
          <button
            key={u}
            type="button"
            onClick={() => onUnitChange(u)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              unit === u
                ? isDay ? 'bg-[#4A2E1B]/20 text-[#4A2E1B] font-medium' : 'bg-[#F5F0E1]/20 text-[#F5F0E1] font-medium'
                : isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60'
            }`}
          >
            {u}
          </button>
        ))}
      </div>
    </>
  );
}

const TIMER_PRESETS = [15, 20, 30, 45, 60];

function TimerFields({
  targetValueStr,
  isDay,
  inputCls,
  labelCls,
  onTargetChange,
}: {
  readonly targetValueStr: string;
  readonly isDay: boolean;
  readonly inputCls: string;
  readonly labelCls: string;
  readonly onTargetChange: (val: string) => void;
}): React.ReactElement {
  return (
    <>
      <div>
        <label className={labelCls}>Objetivo en minutos *</label>
        <input
          type="number"
          value={targetValueStr}
          onChange={e => onTargetChange(e.target.value)}
          min={1}
          max={999999}
          placeholder="30"
          className={inputCls}
          inputMode="decimal"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIMER_PRESETS.map(mins => (
          <button
            key={mins}
            type="button"
            onClick={() => onTargetChange(String(mins))}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              targetValueStr === String(mins)
                ? isDay ? 'bg-[#4A2E1B]/20 text-[#4A2E1B] font-medium' : 'bg-[#F5F0E1]/20 text-[#F5F0E1] font-medium'
                : isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60'
            }`}
          >
            {mins} min
          </button>
        ))}
      </div>
    </>
  );
}

function CategorySelector({
  value,
  isDay,
  onChange,
}: {
  readonly value: HabitCategory | null;
  readonly isDay: boolean;
  readonly onChange: (val: HabitCategory | null) => void;
}): React.ReactElement {
  return (
    <div>
      <span className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Categoría
      </span>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_KEYS.map(key => {
          const cat = CATEGORIES[key];
          const isSelected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(isSelected ? null : key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  : isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60'
              }`}
            >
              <AppIcon identifier={cat.icon} type="category" className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  isDay,
  onChange,
}: {
  readonly value: string;
  readonly isDay: boolean;
  readonly onChange: (val: string) => void;
}): React.ReactElement {
  return (
    <div>
      <span className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Color
      </span>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full transition-all ${value === c ? 'scale-110' : 'hover:scale-110'}`}
            style={{
              backgroundColor: c,
              outline: value === c ? `2px solid ${c}` : 'none',
              outlineOffset: '3px',
            }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
    </div>
  );
}

function IconPicker({
  value,
  isDay,
  onChange,
}: {
  readonly value: string;
  readonly isDay: boolean;
  readonly onChange: (val: string) => void;
}): React.ReactElement {
  return (
    <div>
      <span className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Icono
      </span>
      <div className="flex flex-wrap gap-2">
        {ICON_OPTIONS.map(iconId => (
          <button
            key={iconId}
            type="button"
            onClick={() => onChange(value === iconId ? '' : iconId)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              value === iconId
                ? isDay ? 'bg-[#4A2E1B]/15 scale-110' : 'bg-[#F5F0E1]/15 scale-110'
                : isDay ? 'bg-[#4A2E1B]/5 hover:bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/5 hover:bg-[#F5F0E1]/10'
            }`}
          >
            <AppIcon identifier={iconId} type="habit" className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({
  form,
  isDay,
}: {
  readonly form: FormState;
  readonly isDay: boolean;
}): React.ReactElement {
  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <div className="flex items-center gap-3">
        {form.icon && <AppIcon identifier={form.icon} type="habit" className="w-6 h-6 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            {form.name}
          </div>
          {form.description && (
            <div className={`text-xs mt-0.5 truncate ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              {form.description}
            </div>
          )}
        </div>
        <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ backgroundColor: form.color }} />
      </div>

      <div className={`mt-3 pt-3 border-t text-xs space-y-1.5 ${
        isDay ? 'border-[#4A2E1B]/10 text-[#4A2E1B]/60' : 'border-[#F5F0E1]/10 text-[#F5F0E1]/60'
      }`}>
        <div className="flex justify-between">
          <span>Tipo</span>
          <span className="font-medium">
            {form.trackingType === 'binary'
              ? 'Sí/No'
              : form.trackingType === 'timer'
                ? `${form.targetValueStr} min/día`
                : `${form.targetValueStr} ${form.unit}/día`}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Días</span>
          <span className="font-medium">{formatDaysLabel(form.targetDays)}</span>
        </div>
        {form.category && (
          <div className="flex justify-between">
            <span>Categoría</span>
            <span className="font-medium flex items-center gap-1"><AppIcon identifier={CATEGORIES[form.category].icon} type="category" className="w-3.5 h-3.5" /> {CATEGORIES[form.category].label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderToggle({
  enabled,
  time,
  isDay,
  onToggle,
  onTimeChange,
}: {
  readonly enabled: boolean;
  readonly time: string;
  readonly isDay: boolean;
  readonly onToggle: () => void;
  readonly onTimeChange: (val: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between p-3 rounded-xl ${
        isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
      }`}>
        <div className="min-w-0 flex-1 mr-3">
          <div className={`text-sm font-medium ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Recordatorio
          </div>
          <div className={`text-xs ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
            Notificación push diaria
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
            enabled
              ? isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]'
              : isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          } ${
            enabled
              ? isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
              : isDay ? 'bg-[#4A2E1B]/40' : 'bg-[#F5F0E1]/40'
          }`} />
        </button>
      </div>
      {enabled && (
        <div>
          <span className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Hora del recordatorio
          </span>
          <div className={`rounded-lg border overflow-hidden ${
            isDay ? 'bg-white/60 border-[#4A2E1B]/20' : 'bg-white/5 border-[#F5F0E1]/20'
          }`}>
            <input
              type="time"
              value={time}
              onChange={e => onTimeChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm border-none bg-transparent ${
                isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmStep({
  form,
  isDay,
  mode,
  error,
  submitting,
  onChange,
  onSubmit,
}: {
  readonly form: FormState;
  readonly isDay: boolean;
  readonly mode: 'create' | 'edit';
  readonly error: string | null;
  readonly submitting: boolean;
  readonly onChange: FieldUpdater;
  readonly onSubmit: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      <PreviewCard form={form} isDay={isDay} />

      <ReminderToggle
        enabled={form.reminderEnabled}
        time={form.reminderTime}
        isDay={isDay}
        onToggle={() => onChange('reminderEnabled', !form.reminderEnabled)}
        onTimeChange={val => onChange('reminderTime', val)}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
          submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
        } ${isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'}`}
      >
        {submitting ? 'Guardando...' : mode === 'create' ? 'Crear hábito' : 'Guardar cambios'}
      </button>
    </div>
  );
}

export default function HabitWizard({ mode, initialData, onSubmit, onDelete }: HabitWizardProps): React.ReactElement {
  const router = useRouter();
  const { isDay } = useTheme();

  const [step, setStep] = useState(mode === 'edit' ? 2 : 1);
  const [form, setForm] = useState<FormState>(() => getInitialForm(initialData));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const handleSelectTemplate = useCallback((template: HabitTemplate) => {
    setForm({
      name: template.name,
      description: template.description ?? '',
      trackingType: template.trackingType,
      targetValueStr: template.targetValue?.toString() ?? '',
      unit: template.unit ?? '',
      targetDays: [...template.suggestedDays].sort((a, b) => a - b),
      color: template.color,
      icon: template.icon,
      category: template.category,
      reminderEnabled: false,
      reminderTime: '09:00',
    });
    setStep(2);
    setError(null);
  }, []);

  const handleCustom = useCallback(() => {
    setForm(getInitialForm());
    setStep(2);
    setError(null);
  }, []);

  const toggleDay = useCallback((day: number) => {
    setForm(prev => {
      const { targetDays } = prev;
      if (targetDays.includes(day)) {
        if (targetDays.length <= 1) return prev;
        return { ...prev, targetDays: targetDays.filter(d => d !== day) };
      }
      return { ...prev, targetDays: [...targetDays, day].sort((a, b) => a - b) };
    });
  }, []);

  const setDayPreset = useCallback((days: number[]) => {
    setForm(prev => ({ ...prev, targetDays: [...days].sort((a, b) => a - b) }));
  }, []);

  const validateStep2 = useCallback((): boolean => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio');
      return false;
    }
    if (trimmedName.length > 100) {
      setError('El nombre no puede superar 100 caracteres');
      return false;
    }
    if (form.trackingType === 'quantity') {
      const val = Number(form.targetValueStr);
      if (!form.targetValueStr || isNaN(val) || val <= 0) {
        setError('Introduce un objetivo numérico válido');
        return false;
      }
      if (!form.unit.trim()) {
        setError('La unidad es obligatoria para hábitos de cantidad');
        return false;
      }
    }
    if (form.trackingType === 'timer') {
      const val = Number(form.targetValueStr);
      if (!form.targetValueStr || isNaN(val) || val <= 0) {
        setError('Introduce un objetivo en minutos válido');
        return false;
      }
    }
    return true;
  }, [form.name, form.trackingType, form.targetValueStr, form.unit]);

  const handleNext = useCallback(() => {
    if (step !== 2) return;
    if (!validateStep2()) return;
    setStep(3);
    setError(null);
  }, [step, validateStep2]);

  const handleBack = useCallback(() => {
    setError(null);
    setShowConfirmDelete(false);
    if (step === 2 && mode === 'create') {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else {
      router.back();
    }
  }, [step, mode, router]);

  const buildSubmitData = useCallback((): HabitWizardData => {
    const data: HabitWizardData = {
      name: form.name.trim(),
      description: form.description.trim(),
      trackingType: form.trackingType,
      targetDays: form.targetDays,
      color: form.color,
    };
    if (form.trackingType === 'quantity') {
      data.targetValue = Number(form.targetValueStr);
      data.unit = form.unit.trim();
    }
    if (form.trackingType === 'timer') {
      data.targetValue = Number(form.targetValueStr);
      data.unit = 'min';
    }
    if (form.icon) data.icon = form.icon;
    if (form.category) data.category = form.category;
    if (form.reminderEnabled && form.reminderTime) {
      data.reminderTime = form.reminderTime;
    }
    return data;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const success = await onSubmit(buildSubmitData());
    setSubmitting(false);

    if (success) {
      router.push('/habits');
    } else {
      setError('Error al guardar el hábito');
    }
  }, [submitting, onSubmit, buildSubmitData, router]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const success = await onDelete();
    setDeleting(false);
    if (success) {
      router.push('/habits');
    } else {
      setShowConfirmDelete(false);
      setError('Error al eliminar el hábito');
    }
  }, [onDelete, showConfirmDelete, router]);

  const stepTitles: Record<number, string> = {
    1: 'Nuevo hábito',
    2: mode === 'edit' ? 'Editar hábito' : 'Configura tu hábito',
    3: 'Confirma',
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-8 lg:pl-20 ${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'}`}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className={`p-2 -ml-2 rounded-lg transition-colors ${
              isDay ? 'hover:bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'hover:bg-[#F5F0E1]/10 text-[#F5F0E1]'
            }`}
            aria-label="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
          </button>
          <h1 className={`text-xl font-bold flex-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            {stepTitles[step]}
          </h1>
          {mode === 'edit' && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2 -mr-2 rounded-lg transition-colors ${
                deleting ? 'opacity-50 cursor-not-allowed' : ''
              } text-red-500 hover:bg-red-500/10`}
              aria-label="Eliminar hábito"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H13.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
              </svg>
            </button>
          )}
        </div>

        {showConfirmDelete && (
          <div className={`mb-4 p-3 rounded-xl ${isDay ? 'bg-red-50 border border-red-200' : 'bg-red-500/10 border border-red-500/20'}`}>
            <p className={`text-xs text-center mb-2 ${isDay ? 'text-red-700' : 'text-red-400'}`}>
              Se desactivará el hábito y sus registros
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white ${
                  deleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}

        <StepIndicator step={step} isDay={isDay} />

        {step === 1 && (
          <TemplateStep
            isDay={isDay}
            onSelectTemplate={handleSelectTemplate}
            onCustom={handleCustom}
          />
        )}

        {step === 2 && (
          <ConfigureStep
            form={form}
            isDay={isDay}
            error={error}
            onChange={updateField}
            onDayToggle={toggleDay}
            onDayPreset={setDayPreset}
            onNext={handleNext}
          />
        )}

        {step === 3 && (
          <ConfirmStep
            form={form}
            isDay={isDay}
            mode={mode}
            error={error}
            submitting={submitting}
            onChange={updateField}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
