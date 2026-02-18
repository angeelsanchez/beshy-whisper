'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import type { HabitTemplate } from '@/lib/habit-templates';
import StepIndicator from './StepIndicator';
import TemplateStep from './TemplateStep';
import ConfigureStep from './ConfigureStep';
import ConfirmStep from './ConfirmStep';
import { getInitialForm } from './utils';
import type { FormState, HabitWizardProps, HabitWizardData } from './types';

export type { HabitWizardData, FrequencyMode, HabitWizardProps, FormState, InitialHabitData, FieldUpdater } from './types';

export default function HabitWizard({ mode, initialData, onSubmit, onDelete, additionalContent }: HabitWizardProps): React.ReactElement {
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
      frequencyMode: 'specific_days',
      targetDays: [...template.suggestedDays].sort((a, b) => a - b),
      weeklyTargetStr: '3',
      color: template.color,
      icon: template.icon,
      category: template.category,
      reminderEnabled: false,
      reminderTime: '09:00',
      hasProgression: false,
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
        setError('Introduce un objetivo num\u00e9rico v\u00e1lido');
        return false;
      }
      if (!form.unit.trim()) {
        setError('La unidad es obligatoria para h\u00e1bitos de cantidad');
        return false;
      }
    }
    if (form.trackingType === 'timer') {
      const val = Number(form.targetValueStr);
      if (!form.targetValueStr || isNaN(val) || val <= 0) {
        setError('Introduce un objetivo en minutos v\u00e1lido');
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
      frequencyMode: form.frequencyMode,
      targetDays: form.targetDays,
      color: form.color,
    };
    if (form.frequencyMode === 'weekly_count') {
      data.weeklyTarget = Number(form.weeklyTargetStr) || 3;
    }
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
    if (form.hasProgression) {
      data.hasProgression = true;
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
      setError('Error al guardar el h\u00e1bito');
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
      setError('Error al eliminar el h\u00e1bito');
    }
  }, [onDelete, showConfirmDelete, router]);

  const stepTitles: Record<number, string> = {
    1: 'Nuevo h\u00e1bito',
    2: mode === 'edit' ? 'Editar h\u00e1bito' : 'Configura tu h\u00e1bito',
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
              aria-label="Eliminar h\u00e1bito"
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
              Se desactivar\u00e1 el h\u00e1bito y sus registros
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

        {additionalContent}
      </div>
    </div>
  );
}
