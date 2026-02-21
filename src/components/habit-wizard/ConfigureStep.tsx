import { CATEGORIES, ICON_OPTIONS, type TrackingType, type HabitCategory } from '@/lib/habit-templates';
import AppIcon from '@/components/AppIcon';
import {
  PRESET_COLORS,
  DAY_LABELS,
  DAY_PRESETS,
  COMMON_UNITS,
  CATEGORY_KEYS,
  WEEKLY_TARGET_OPTIONS,
  TIMER_PRESETS,
} from './constants';
import { arraysEqual } from './utils';
import type { FormState, FieldUpdater, FrequencyMode } from './types';

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
            onClick={() => onPreset([...preset.days])}
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

function FrequencySection({
  form,
  isDay,
  onChange,
  onDayToggle,
  onDayPreset,
}: {
  readonly form: FormState;
  readonly isDay: boolean;
  readonly onChange: FieldUpdater;
  readonly onDayToggle: (day: number) => void;
  readonly onDayPreset: (days: number[]) => void;
}): React.ReactElement {
  const modeOptions: { value: FrequencyMode; label: string }[] = [
    { value: 'specific_days', label: 'Días específicos' },
    { value: 'weekly_count', label: 'X días/semana' },
  ];

  return (
    <div>
      <span className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Frecuencia
      </span>
      <div className="flex gap-1.5 mb-3">
        {modeOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange('frequencyMode', opt.value)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              form.frequencyMode === opt.value
                ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                : isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/50' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {form.frequencyMode === 'specific_days' ? (
        <DaySelector
          targetDays={form.targetDays}
          isDay={isDay}
          onToggle={onDayToggle}
          onPreset={onDayPreset}
        />
      ) : (
        <div>
          <span className={`block text-xs mb-2 ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            Cumple cualquier día de la semana
          </span>
          <div className="flex gap-1.5">
            {WEEKLY_TARGET_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onChange('weeklyTargetStr', n.toString())}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  form.weeklyTargetStr === n.toString()
                    ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                    : isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/50' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
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

      <FrequencySection
        form={form}
        isDay={isDay}
        onChange={onChange}
        onDayToggle={onDayToggle}
        onDayPreset={onDayPreset}
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

export default ConfigureStep;
