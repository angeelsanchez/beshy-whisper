interface InspirationalQuote {
  readonly text: string;
  readonly author: string;
}

const QUOTES: readonly InspirationalQuote[] = [
  { text: 'Escribe lo que no debe olvidarse.', author: 'Isabel Allende' },
  { text: 'La vida no examinada no merece ser vivida.', author: 'Sócrates' },
  { text: 'No hay viento favorable para quien no sabe a dónde va.', author: 'Séneca' },
  { text: 'La gratitud transforma lo que tenemos en suficiente.', author: 'Melody Beattie' },
  { text: 'Conócete a ti mismo.', author: 'Templo de Apolo en Delfos' },
  { text: 'El diario es un viaje con un capitán que solo se revela después del viaje.', author: 'Anaïs Nin' },
  { text: 'La felicidad no es algo que pospones para el futuro; es algo que diseñas para el presente.', author: 'Jim Rohn' },
  { text: 'Escribir es la manera de hablar sin que te interrumpan.', author: 'Jules Renard' },
  { text: 'Lo que no se mide no se puede mejorar.', author: 'Peter Drucker' },
  { text: 'Cada día es una página nueva en el libro de tu vida.', author: 'Anónimo' },
  { text: 'La mejor forma de predecir el futuro es creándolo.', author: 'Abraham Lincoln' },
  { text: 'Solo se puede avanzar cuando se mira lejos.', author: 'José Ortega y Gasset' },
  { text: 'La escritura es la pintura de la voz.', author: 'Voltaire' },
  { text: 'La reflexión es el camino hacia la inmortalidad; la falta de reflexión, el camino hacia la muerte.', author: 'Buda' },
  { text: 'Un poco de progreso cada día se convierte en grandes resultados.', author: 'Anónimo' },
  { text: 'Las palabras que no se dijeron son las flores que no florecieron.', author: 'Anónimo' },
  { text: 'La paz viene de dentro. No la busques fuera.', author: 'Buda' },
  { text: 'Lo que resistes, persiste. Lo que aceptas, se transforma.', author: 'Carl Jung' },
  { text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali' },
  { text: 'Sé el cambio que deseas ver en el mundo.', author: 'Mahatma Gandhi' },
  { text: 'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.', author: 'Abraham Lincoln' },
  { text: 'Donde hay una voluntad, hay un camino.', author: 'Anónimo' },
  { text: 'Lo importante no es lo que te pasa, sino lo que haces con lo que te pasa.', author: 'Aldous Huxley' },
  { text: 'El secreto de avanzar es empezar.', author: 'Mark Twain' },
  { text: 'La mente que se abre a una nueva idea jamás vuelve a su tamaño original.', author: 'Albert Einstein' },
  { text: 'Nada es permanente en este mundo cruel, ni siquiera nuestros problemas.', author: 'Charlie Chaplin' },
  { text: 'El único viaje imposible es el que nunca empiezas.', author: 'Tony Robbins' },
  { text: 'Haz de tu vida un sueño, y de tu sueño una realidad.', author: 'Antoine de Saint-Exupéry' },
  { text: 'La mejor hora del día es ahora.', author: 'Anónimo' },
  { text: 'El agradecimiento es la memoria del corazón.', author: 'Lao Tsé' },
  { text: 'Lo que niegas te somete. Lo que aceptas te transforma.', author: 'Carl Jung' },
  { text: 'No busques ser una persona de éxito, sino una persona de valor.', author: 'Albert Einstein' },
  { text: 'El pensamiento es la semilla de la acción.', author: 'Ralph Waldo Emerson' },
  { text: 'Cada mañana nacemos de nuevo. Lo que hagamos hoy es lo que más importa.', author: 'Buda' },
  { text: 'La simplicidad es la última sofisticación.', author: 'Leonardo da Vinci' },
  { text: 'Si quieres algo que nunca has tenido, debes hacer algo que nunca has hecho.', author: 'Thomas Jefferson' },
  { text: 'El silencio es un amigo que nunca traiciona.', author: 'Confucio' },
  { text: 'La paciencia es amarga, pero su fruto es dulce.', author: 'Aristóteles' },
  { text: 'Cuida tus pensamientos, porque se convertirán en tus palabras.', author: 'Lao Tsé' },
  { text: 'La vida es lo que pasa mientras estás ocupado haciendo otros planes.', author: 'John Lennon' },
  { text: 'No es más rico quien más tiene, sino quien menos necesita.', author: 'Anónimo' },
  { text: 'Hoy es un buen día para ser un buen día.', author: 'Anónimo' },
  { text: 'Lo maravilloso de aprender es que nadie puede arrebatártelo.', author: 'B.B. King' },
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' },
  { text: 'La creatividad requiere el coraje de soltar las certezas.', author: 'Erich Fromm' },
  { text: 'No dejes que el ruido de otros ahogue tu voz interior.', author: 'Steve Jobs' },
  { text: 'Lo que se puede medir se puede gestionar.', author: 'Peter Drucker' },
  { text: 'La constancia es la virtud por la cual las demás dan fruto.', author: 'Arturo Graf' },
  { text: 'Tu tiempo es limitado, no lo desperdicies viviendo la vida de otro.', author: 'Steve Jobs' },
  { text: 'El que tiene un porqué para vivir puede soportar casi cualquier cómo.', author: 'Friedrich Nietzsche' },
] as const;

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getQuoteOfTheDay(date: Date = new Date()): InspirationalQuote {
  const dayOfYear = getDayOfYear(date);
  const index = dayOfYear % QUOTES.length;
  return QUOTES[index];
}

export type { InspirationalQuote };
