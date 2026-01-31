'use client';

import { useState, useEffect } from 'react';

interface HabitFormData {
  name: string;
  description: string;
  targetDays: number[];
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
    target_days: number[];
    color: string;
  };
  mode: 'create' | 'edit';
}

const PRESET_COLORS = [
  '#4A2E1B', '#8B5E3C', '#A0522D', '#CD853F',
  '#2E7D32', '#1565C0', '#6A1B9A', '#C62828',
  '#EF6C00', '#00838F', '#4E342E', '#37474F',
];

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export default function HabitForm({ isOpen, onClose, onSubmit, isDay, initialData, mode }: HabitFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState<number[]>(ALL_DAYS);
  const [color, setColor] = useState('#4A2E1B');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? '');
      setTargetDays(
        Array.isArray(initialData.target_days) && initialData.target_days.length > 0
          ? [...initialData.target_days].sort((a, b) => a - b)
          : ALL_DAYS
      );
      setColor(initialData.color);
      setError(null);
    } else if (isOpen) {
      setName('');
      setDescription('');
      setTargetDays(ALL_DAYS);
      setColor('#4A2E1B');
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setTargetDays(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const setPreset = (days: number[]) => {
    setTargetDays([...days].sort((a, b) => a - b));
  };

  const arraysEqual = (a: number[], b: number[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((x, y) => x - y);
    const sortedB = [...b].sort((x, y) => x - y);
    return sortedA.every((v, i) => v === sortedB[i]);
  };

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
      targetDays,
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
            <label className={`block text-sm font-medium mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Dias
            </label>
            <div className="flex gap-1.5 mb-2">
              {DAY_LABELS.map((label, dayIndex) => {
                const isSelected = targetDays.includes(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? isDay
                          ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                          : 'bg-[#F5F0E1] text-[#2D1E1A]'
                        : isDay
                          ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/50'
                          : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreset(ALL_DAYS)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  arraysEqual(targetDays, ALL_DAYS)
                    ? isDay
                      ? 'bg-[#4A2E1B]/20 text-[#4A2E1B]'
                      : 'bg-[#F5F0E1]/20 text-[#F5F0E1]'
                    : isDay
                      ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/10'
                      : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/10'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setPreset(WEEKDAYS)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  arraysEqual(targetDays, WEEKDAYS)
                    ? isDay
                      ? 'bg-[#4A2E1B]/20 text-[#4A2E1B]'
                      : 'bg-[#F5F0E1]/20 text-[#F5F0E1]'
                    : isDay
                      ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/10'
                      : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/10'
                }`}
              >
                L-V
              </button>
            </div>
          </div>

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
