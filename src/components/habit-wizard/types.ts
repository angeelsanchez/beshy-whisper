import type { HabitCategory, TrackingType } from '@/lib/habit-templates';

export type FrequencyMode = 'specific_days' | 'weekly_count';

export interface HabitWizardData {
  name: string;
  description: string;
  trackingType: TrackingType;
  targetValue?: number;
  unit?: string;
  frequencyMode: FrequencyMode;
  targetDays: number[];
  weeklyTarget?: number;
  color: string;
  icon?: string;
  category?: HabitCategory;
  reminderTime?: string;
  hasProgression?: boolean;
}

export interface InitialHabitData {
  readonly name: string;
  readonly description: string | null;
  readonly tracking_type: TrackingType;
  readonly target_value: number | null;
  readonly unit: string | null;
  readonly frequency_mode: FrequencyMode;
  readonly target_days: number[];
  readonly weekly_target: number | null;
  readonly color: string;
  readonly icon: string | null;
  readonly category: HabitCategory | null;
  readonly reminder_time: string | null;
  readonly has_progression?: boolean;
}

export interface HabitWizardProps {
  readonly mode: 'create' | 'edit';
  readonly initialData?: InitialHabitData;
  readonly onSubmit: (data: HabitWizardData) => Promise<boolean>;
  readonly onDelete?: () => Promise<boolean>;
  readonly additionalContent?: React.ReactNode;
}

export interface FormState {
  name: string;
  description: string;
  trackingType: TrackingType;
  targetValueStr: string;
  unit: string;
  frequencyMode: FrequencyMode;
  targetDays: number[];
  weeklyTargetStr: string;
  color: string;
  icon: string;
  category: HabitCategory | null;
  reminderEnabled: boolean;
  reminderTime: string;
  hasProgression: boolean;
}

export type FieldUpdater = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
