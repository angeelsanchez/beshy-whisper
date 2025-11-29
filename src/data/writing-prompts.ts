interface WritingPrompt {
  readonly text: string;
  readonly franja: 'DIA' | 'NOCHE';
}

const DAY_PROMPTS: readonly WritingPrompt[] = [
  { text: 'Hoy estoy agradecido por...', franja: 'DIA' },
  { text: 'Si hoy fuera perfecto, lo que pasaría es...', franja: 'DIA' },
  { text: 'Mi intención para hoy es...', franja: 'DIA' },
  { text: 'Algo que me emociona de hoy es...', franja: 'DIA' },
  { text: 'Hoy quiero dedicar tiempo a...', franja: 'DIA' },
  { text: 'Una cosa que puedo hacer hoy por alguien es...', franja: 'DIA' },
  { text: 'Hoy me comprometo a...', franja: 'DIA' },
  { text: 'Lo que más valoro en este momento es...', franja: 'DIA' },
  { text: 'Un pequeño paso que puedo dar hoy es...', franja: 'DIA' },
  { text: 'Hoy elijo enfocarme en...', franja: 'DIA' },
  { text: 'Algo que quiero recordar hoy es...', franja: 'DIA' },
  { text: 'Si pudiera cambiar una cosa hoy sería...', franja: 'DIA' },
] as const;

const NIGHT_PROMPTS: readonly WritingPrompt[] = [
  { text: 'Lo mejor que me pasó hoy fue...', franja: 'NOCHE' },
  { text: 'Hoy aprendí que...', franja: 'NOCHE' },
  { text: 'Algo que me hizo sonreír hoy...', franja: 'NOCHE' },
  { text: 'Si pudiera revivir un momento de hoy sería...', franja: 'NOCHE' },
  { text: 'Hoy me sentí orgulloso de...', franja: 'NOCHE' },
  { text: 'Una cosa que haría diferente mañana es...', franja: 'NOCHE' },
  { text: 'Lo que más agradezco de este día es...', franja: 'NOCHE' },
  { text: 'Un pensamiento que quiero soltar antes de dormir...', franja: 'NOCHE' },
  { text: 'Hoy di lo mejor de mí cuando...', franja: 'NOCHE' },
  { text: 'Algo inesperado que pasó hoy fue...', franja: 'NOCHE' },
  { text: 'Mañana quiero despertar sintiendo...', franja: 'NOCHE' },
  { text: 'Lo que me llevo de este día es...', franja: 'NOCHE' },
] as const;

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getPromptsForFranja(
  franja: 'DIA' | 'NOCHE',
  date: Date = new Date(),
  count: number = 3
): readonly WritingPrompt[] {
  const prompts = franja === 'DIA' ? DAY_PROMPTS : NIGHT_PROMPTS;
  const dayOfYear = getDayOfYear(date);
  const startIndex = dayOfYear % prompts.length;

  const result: WritingPrompt[] = [];
  for (let i = 0; i < count; i++) {
    const index = (startIndex + i) % prompts.length;
    result.push(prompts[index]);
  }

  return result;
}
