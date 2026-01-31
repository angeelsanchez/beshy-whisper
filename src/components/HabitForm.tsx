'use client';

import { useState, useEffect } from 'react';

interface HabitFormData {
  name: string;
  description: string;
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek: number;
  color: string;
}

interface HabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HabitFormData) => Promise<boolean>;
  isDay: boolean;
  initialData?: {
    name: string;
    description: string | null;
    frequency: 'daily' | 'weekly';
    target_days_per_week: number;
    color: string;
  };
  mode: 'create' | 'edit';
}

const PRESET_COLORS = [
  '#4A2E1B', '#8B5E3C', '#A0522D', '#CD853F',
  '#2E7D32', '#1565C0', '#6A1B9A', '#C62828',
  '#EF6C00', '#00838F', '#4E342E', '#37474F',
];

export default function HabitForm({ isOpen, onClose, onSubmit, isDay, initialData, mode }: HabitFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(7);
  const [color, setColor] = useState('#4A2E1B');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? '');
      setFrequency(initialData.frequency);
      setTargetDaysPerWeek(initialData.target_days_per_week);
      setColor(initialData.color);
      setError(null);
    } else if (isOpen) {
      setName('');
      setDescription('');
      setFrequency('daily');
      setTargetDaysPerWeek(7);
      setColor('#4A2E1B');
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio');
      return;
    }

    if (trimmedName.length > 100) {
      setError('El nombre no puede superar 100 caracteres');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({
      name: trimmedName,
      description: description.trim() || '',
      frequency,
      targetDaysPerWeek,
      color,
    });
    setSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError('Error al guardar el habito');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto rounded-xl shadow-xl z-50 ${
        isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${
          isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'
        }`}>
          <h3 className={`font-bold text-lg ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            {mode === 'create' ? 'Nuevo habito' : 'Editar habito'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDay ? 'hover:bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'hover:bg-[#F5F0E1]/10 text-[#F5F0E1]'
            }`}
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="Ej: Leer 20 minutos"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDay
                  ? 'bg-white/60 border-[#4A2E1B]/20 text-[#4A2E1B] placeholder:text-[#4A2E1B]/40'
                  : 'bg-white/5 border-[#F5F0E1]/20 text-[#F5F0E1] placeholder:text-[#F5F0E1]/40'
              }`}
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Descripcion
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Descripcion opcional"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDay
                  ? 'bg-white/60 border-[#4A2E1B]/20 text-[#4A2E1B] placeholder:text-[#4A2E1B]/40'
                  : 'bg-white/5 border-[#F5F0E1]/20 text-[#F5F0E1] placeholder:text-[#F5F0E1]/40'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Frecuencia
            </label>
            <div className={`flex gap-2 p-1 rounded-lg ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
              {(['daily', 'weekly'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFrequency(f);
                    if (f === 'weekly') setTargetDaysPerWeek(1);
                    else if (targetDaysPerWeek < 2) setTargetDaysPerWeek(7);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                    frequency === f
                      ? isDay
                        ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                        : 'bg-[#F5F0E1] text-[#2D1E1A]'
                      : isDay
                        ? 'text-[#4A2E1B]'
                        : 'text-[#F5F0E1]'
                  }`}
                >
                  {f === 'daily' ? 'Diario' : 'Semanal'}
                </button>
              ))}
            </div>
          </div>

          {frequency === 'daily' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
                Dias por semana: {targetDaysPerWeek}
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={targetDaysPerWeek}
                onChange={e => setTargetDaysPerWeek(Number(e.target.value))}
                className="w-full accent-[#4A2E1B]"
              />
              <div className={`flex justify-between text-xs mt-1 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
                <span>1</span>
                <span>7</span>
              </div>
            </div>
          )}

          {frequency === 'weekly' && (
            <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              Se espera completar 1 vez por semana
            </p>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'scale-110' : 'hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '3px',
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
              submitting || !name.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:opacity-90 active:scale-[0.98]'
            } ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                : 'bg-[#F5F0E1] text-[#2D1E1A]'
            }`}
          >
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear habito' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </>
  );
}
