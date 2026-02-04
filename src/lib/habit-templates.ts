export type HabitCategory = 'health' | 'mind' | 'productivity' | 'wellness' | 'social' | 'creativity';
export type TrackingType = 'binary' | 'quantity' | 'timer';

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
  health: { label: 'Salud', icon: 'dumbbell' },
  mind: { label: 'Mente', icon: 'brain' },
  productivity: { label: 'Productividad', icon: 'book-open' },
  wellness: { label: 'Bienestar', icon: 'leaf' },
  social: { label: 'Social', icon: 'users' },
  creativity: { label: 'Creatividad', icon: 'palette' },
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const HABIT_TEMPLATES: readonly HabitTemplate[] = [
  {
    name: 'Ejercicio',
    icon: 'dumbbell',
    category: 'health',
    color: '#2E7D32',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Actividad física diaria',
  },
  {
    name: 'Beber agua',
    icon: 'droplet',
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
    icon: 'bed-double',
    category: 'health',
    color: '#6A1B9A',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Acostarse antes de las 23:00',
  },
  {
    name: 'Caminar',
    icon: 'footprints',
    category: 'health',
    color: '#00838F',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Salir a caminar cada día',
  },
  {
    name: 'Meditación',
    icon: 'brain',
    category: 'mind',
    color: '#6A1B9A',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Sesión de meditación o mindfulness',
  },
  {
    name: 'Lectura',
    icon: 'book-open',
    category: 'mind',
    color: '#EF6C00',
    trackingType: 'quantity',
    targetValue: 2,
    unit: 'capítulos',
    suggestedDays: ALL_DAYS,
    description: 'Leer cada día',
  },
  {
    name: 'Journaling',
    icon: 'pen-line',
    category: 'mind',
    color: '#4A2E1B',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Escribir en tu diario personal',
  },
  {
    name: 'Gratitud',
    icon: 'heart',
    category: 'mind',
    color: '#CD853F',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Anotar 3 cosas por las que estás agradecido',
  },
  {
    name: 'Estudiar',
    icon: 'graduation-cap',
    category: 'productivity',
    color: '#1565C0',
    trackingType: 'timer',
    targetValue: 45,
    unit: 'min',
    suggestedDays: WEEKDAYS,
    description: 'Sesión de estudio enfocada',
  },
  {
    name: 'Programar',
    icon: 'code',
    category: 'productivity',
    color: '#37474F',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Práctica de programación',
  },
  {
    name: 'Aprender idioma',
    icon: 'languages',
    category: 'productivity',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Practicar un nuevo idioma',
  },
  {
    name: 'Entrenamiento',
    icon: 'timer',
    category: 'health',
    color: '#C62828',
    trackingType: 'timer',
    targetValue: 30,
    unit: 'min',
    suggestedDays: ALL_DAYS,
    description: 'Sesión de entrenamiento cronometrada',
  },
  {
    name: 'Paseo al aire libre',
    icon: 'tree-pine',
    category: 'wellness',
    color: '#2E7D32',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Salir a caminar al aire libre',
  },
  {
    name: 'Estiramientos',
    icon: 'activity',
    category: 'wellness',
    color: '#00838F',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Rutina de estiramientos',
  },
  {
    name: 'Limpieza',
    icon: 'sparkles',
    category: 'wellness',
    color: '#4E342E',
    trackingType: 'timer',
    targetValue: 15,
    unit: 'min',
    suggestedDays: [1, 3, 5],
    description: 'Sesión de limpieza y orden',
  },
  {
    name: 'Sin redes sociales',
    icon: 'monitor-off',
    category: 'wellness',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Día sin usar redes sociales',
  },
  {
    name: 'Llamar a alguien',
    icon: 'phone',
    category: 'social',
    color: '#8B5E3C',
    trackingType: 'binary',
    suggestedDays: [1, 3, 5],
    description: 'Llamar a un amigo o familiar',
  },
  {
    name: 'Acto de bondad',
    icon: 'heart-handshake',
    category: 'social',
    color: '#C62828',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Hacer algo amable por alguien',
  },
  {
    name: 'Dibujar',
    icon: 'palette',
    category: 'creativity',
    color: '#EF6C00',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Sesión de dibujo o pintura',
  },
  {
    name: 'Escribir',
    icon: 'pen',
    category: 'creativity',
    color: '#4E342E',
    trackingType: 'binary',
    suggestedDays: WEEKDAYS,
    description: 'Escritura creativa',
  },
  {
    name: 'Tocar instrumento',
    icon: 'music',
    category: 'creativity',
    color: '#A0522D',
    trackingType: 'binary',
    suggestedDays: ALL_DAYS,
    description: 'Practicar un instrumento musical',
  },
];

export const ICON_OPTIONS: readonly string[] = [
  'dumbbell', 'droplet', 'bed-double', 'footprints', 'brain', 'book-open',
  'pen-line', 'heart', 'graduation-cap', 'code', 'languages', 'timer',
  'tree-pine', 'activity', 'sparkles', 'monitor-off', 'phone',
  'heart-handshake', 'palette', 'pen', 'music', 'target', 'star',
  'flame', 'check-circle', 'moon',
];

export function getTemplatesByCategory(category: HabitCategory): readonly HabitTemplate[] {
  return HABIT_TEMPLATES.filter(t => t.category === category);
}
