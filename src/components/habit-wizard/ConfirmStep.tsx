import { CATEGORIES } from '@/lib/habit-templates';
import AppIcon from '@/components/AppIcon';
import { Bell, BellOff } from 'lucide-react';
import { formatDaysLabel } from './utils';
import type { FormState, FieldUpdater } from './types';

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
              ? 'S\u00ed/No'
              : form.trackingType === 'timer'
                ? `${form.targetValueStr} min/d\u00eda`
                : `${form.targetValueStr} ${form.unit}/d\u00eda`}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Frecuencia</span>
          <span className="font-medium">
            {form.frequencyMode === 'weekly_count'
              ? `${form.weeklyTargetStr} d\u00edas/semana`
              : formatDaysLabel(form.targetDays)}
          </span>
        </div>
        {form.category && (
          <div className="flex justify-between">
            <span>Categor\u00eda</span>
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
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors ${
          isDay
            ? 'border-[#4A2E1B]/20 hover:border-[#4A2E1B]/40 hover:bg-[#4A2E1B]/5'
            : 'border-[#F5F0E1]/20 hover:border-[#F5F0E1]/40 hover:bg-[#F5F0E1]/5'
        }`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
          isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
        }`}>
          <BellOff className={`w-4 h-4 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`} strokeWidth={2} />
        </div>
        <div className="text-left flex-1">
          <p className={`text-sm font-medium ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            Activar recordatorio
          </p>
          <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/35' : 'text-[#F5F0E1]/35'}`}>
            Recibe una notificaci\u00f3n push diaria
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${
      isDay ? 'border-[#4A2E1B]/20 bg-[#4A2E1B]/5' : 'border-[#F5F0E1]/20 bg-[#F5F0E1]/5'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
          isDay ? 'bg-[#4A2E1B]/15' : 'bg-[#F5F0E1]/15'
        }`}>
          <Bell className={`w-4 h-4 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Recordatorio activo
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
            isDay
              ? 'text-[#4A2E1B]/50 hover:text-[#4A2E1B] hover:bg-[#4A2E1B]/10'
              : 'text-[#F5F0E1]/50 hover:text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
          }`}
        >
          Desactivar
        </button>
      </div>
      <div className={`rounded-lg border overflow-hidden ${
        isDay ? 'bg-white/60 border-[#4A2E1B]/15' : 'bg-white/5 border-[#F5F0E1]/15'
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

      <div className={`p-4 rounded-lg border ${isDay ? 'bg-[#4A2E1B]/5 border-[#4A2E1B]/20' : 'bg-[#F5F0E1]/5 border-[#F5F0E1]/20'}`}>
        <label className={`flex items-center gap-3 cursor-pointer ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
          <input
            type="checkbox"
            checked={form.hasProgression}
            onChange={e => onChange('hasProgression', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-sm font-medium">Activar progresi\u00f3n de niveles</span>
        </label>
        <p className={`text-xs mt-2 ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          Divide este h\u00e1bito en 2-10 niveles progresivos para aumentar la dificultad con el tiempo
        </p>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
          submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
        } ${isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'}`}
      >
        {submitting ? 'Guardando...' : mode === 'create' ? 'Crear h\u00e1bito' : 'Guardar cambios'}
      </button>
    </div>
  );
}

export default ConfirmStep;
