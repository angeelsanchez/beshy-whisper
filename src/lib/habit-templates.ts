export type HabitCategory = 'health' | 'mind' | 'productivity' | 'wellness' | 'social' | 'creativity';
export type TrackingType = 'binary' | 'quantity';

export interface HabitTemplate {
  readonly name: string;
  readonly icon: string;
  readonly category: HabitCategory;
  readonly color: string;
  readonly trackingType: TrackingType;
  readonly targetValue?: number;
  readonly unit?: string;
  readonly suggestedDays: number[];
  readonly description?: string;
}

export interface CategoryInfo {
  readonly label: string;
  readonly icon: string;
}

export const CATEGORIES: Record<HabitCategory, CategoryInfo> = {
  health: { label: 'Salud', icon: '💪' },
  mind: { label: 'Mente', icon: '🧠' },
  productivity: { label: 'Productividad', icon: '📚' },
  wellness: { label: 'Bienestar', icon: '🌿' },
  social: { label: 'Social', icon: '👥' },
  creativity: { label: 'Creatividad', icon: '🎨' },
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const HABIT_TEMPLATES: readonly HabitTemplate[] = [
  {
    name: 'Ejercicio',
    icon: '🏋️',
    category: 'health',
    color: '#2E7D32',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Actividad física diaria',
  },
  {
    name: 'Beber agua',
    icon: '💧',
    category: 'health',
    color: '#1565C0',
    trackingType: 'quantity',
    targetValue: 8,
    unit: 'vasos',
    suggestedDays: ALL_DAYS,
    description: 'Hidratación diaria',
  },
  {
    name: 'Dormir temprano',
    icon: '😴',
    category: 'health',
    color: '#6A1B9A',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Acostarse antes de las 23:00',
  },
  {
    name: 'Caminar',
    icon: '🚶',
    category: 'health',
    color: '#00838F',
    trackingType: 'quantity',
    targetValue: 10000,
    unit: 'pasos',
    suggestedDays: ALL_DAYS,
    description: 'Pasos diarios',
  },
  {
    name: 'Meditación',
    icon: '🧘',
    category: 'mind',
    color: '#6A1B9A',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Sesión de meditación o mindfulness',
  },
  {
    name: 'Lectura',
    icon: '📖',
    category: 'mind',
    color: '#EF6C00',
    trackingType: 'quantity',
    targetValue: 30,
    unit: 'páginas',
    suggestedDays: ALL_DAYS,
    description: 'Leer cada día',
  },
  {
    name: 'Journaling',
    icon: '📝',
    category: 'mind',
    color: '#4A2E1B',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Escribir en tu diario personal',
  },
  {
    name: 'Gratitud',
    icon: '🙏',
    category: 'mind',
    color: '#CD853F',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Anotar 3 cosas por las que estás agradecido',
  },
  {
    name: 'Estudiar',
    icon: '📚',
    category: 'productivity',
    color: '#1565C0',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Sesión de estudio enfocada',
  },
  {
    name: 'Programar',
    icon: '💻',
    category: 'productivity',
    color: '#37474F',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Práctica de programación',
  },
  {
    name: 'Aprender idioma',
    icon: '🗣️',
    category: 'productivity',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Practicar un nuevo idioma',
  },
  {
    name: 'Paseo al aire libre',
    icon: '🌳',
    category: 'wellness',
    color: '#2E7D32',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Salir a caminar al aire libre',
  },
  {
    name: 'Estiramientos',
    icon: '🤸',
    category: 'wellness',
    color: '#00838F',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Rutina de estiramientos',
  },
  {
    name: 'Sin redes sociales',
    icon: '📵',
    category: 'wellness',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Día sin usar redes sociales',
  },
  {
    name: 'Llamar a alguien',
    icon: '📞',
    category: 'social',
    color: '#8B5E3C',
    trackingType: 'binary',
    suggestedDays: [1, 3, 5],
    description: 'Llamar a un amigo o familiar',
  },
  {
    name: 'Acto de bondad',
    icon: '❤️',
    category: 'social',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Hacer algo amable por alguien',
  },
  {
    name: 'Dibujar',
    icon: '🎨',
    category: 'creativity',
    color: '#EF6C00',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Sesión de dibujo o pintura',
  },
  {
    name: 'Escribir',
    icon: '✍️',
    category: 'creativity',
    color: '#4E342E',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Escritura creativa',
  },
  {
    name: 'Tocar instrumento',
    icon: '🎵',
    category: 'creativity',
    color: '#A0522D',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Practicar un instrumento musical',
  },
];

export const ICON_OPTIONS: readonly string[] = [
  '💪', '💧', '🏋️', '🧘', '📖', '📝', '📚', '💻',
  '🌳', '🤸', '📞', '❤️', '🎨', '✍️', '🎵', '🚶',
  '😴', '🙏', '📵', '🗣️', '🎯', '⭐', '🔥', '✅',
];

export function getTemplatesByCategory(category: HabitCategory): readonly HabitTemplate[] {
  return HABIT_TEMPLATES.filter(t => t.category === category);
}
