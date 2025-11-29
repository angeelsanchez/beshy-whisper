export const MOOD_VALUES = [
  'feliz',
  'tranquilo',
  'agradecido',
  'energetico',
  'triste',
  'ansioso',
  'cansado',
  'frustrado',
] as const;

export type Mood = (typeof MOOD_VALUES)[number];

export interface MoodOption {
  readonly value: Mood;
  readonly emoji: string;
  readonly label: string;
  readonly color: string;
}

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { value: 'feliz', emoji: '😊', label: 'Feliz', color: '#FFD700' },
  { value: 'tranquilo', emoji: '😌', label: 'Tranquilo', color: '#87CEEB' },
  { value: 'agradecido', emoji: '🙏', label: 'Agradecido', color: '#98FB98' },
  { value: 'energetico', emoji: '⚡', label: 'Enérgico', color: '#FFA500' },
  { value: 'triste', emoji: '😢', label: 'Triste', color: '#6495ED' },
  { value: 'ansioso', emoji: '😰', label: 'Ansioso', color: '#DDA0DD' },
  { value: 'cansado', emoji: '😴', label: 'Cansado', color: '#B0C4DE' },
  { value: 'frustrado', emoji: '😤', label: 'Frustrado', color: '#CD5C5C' },
] as const;

export function getMoodEmoji(mood: Mood): string {
  const option = MOOD_OPTIONS.find(o => o.value === mood);
  return option?.emoji ?? '';
}

export function getMoodLabel(mood: Mood): string {
  const option = MOOD_OPTIONS.find(o => o.value === mood);
  return option?.label ?? '';
}

export function getMoodColor(mood: Mood): string {
  const option = MOOD_OPTIONS.find(o => o.value === mood);
  return option?.color ?? '#888888';
}

export function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && MOOD_VALUES.includes(value as Mood);
}
