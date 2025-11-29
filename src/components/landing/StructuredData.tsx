interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

const FAQ_DATA: readonly FAQItem[] = [
  {
    question: '¿Qué es Beshy Whisper?',
    answer:
      'Beshy Whisper es una aplicación de journaling diario que te ayuda a reflexionar sobre tu día a través de prompts inteligentes que cambian según la hora. Es tu espacio personal para expresar pensamientos, emociones y experiencias.',
  },
  {
    question: '¿Cómo funciona el modo día/noche?',
    answer:
      'La aplicación detecta automáticamente la hora del día y cambia su interfaz visual y los prompts que te ofrece. Durante el día (6:00 AM - 6:00 PM) tendrás preguntas más energéticas, mientras que por la noche serán más reflexivas.',
  },
  {
    question: '¿Puedo usar Beshy Whisper sin crear cuenta?',
    answer:
      'Sí. Ofrecemos un modo invitado que te permite probar la aplicación sin registro. Podrás crear un susurro y ver cómo funciona.',
  },
  {
    question: '¿Cuántos susurros puedo crear por día?',
    answer:
      'Puedes crear un susurro diurno (entre 6:00 AM y 6:00 PM) y un susurro nocturno (entre 6:00 PM y 6:00 AM). Esto te ayuda a mantener un ritmo saludable de reflexión.',
  },
  {
    question: '¿Puedo exportar mis susurros?',
    answer:
      'Sí. Puedes exportar tus susurros como imágenes personalizables para compartir en redes sociales o guardar en tu dispositivo.',
  },
  {
    question: '¿Es seguro compartir mis pensamientos?',
    answer:
      'Tu privacidad es nuestra prioridad. Puedes elegir qué susurros hacer públicos y cuáles mantener privados.',
  },
  {
    question: '¿Cómo funciona la comunidad?',
    answer:
      'La comunidad de Beshy Whisper te permite conectar con otros usuarios a través de likes y follows. Puedes descubrir cómo otros ven el mundo y construir conexiones significativas basadas en la reflexión personal.',
  },
  {
    question: '¿Beshy Whisper es gratuito?',
    answer:
      'Sí, Beshy Whisper es completamente gratuito. No hay costos ocultos ni suscripciones premium.',
  },
];

export default function StructuredData() {
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Beshy Whisper',
    url: 'https://whisper.beshy.es',
    description:
      'Aplicación de journaling diario anónimo para bienestar y reflexión personal. Escribe susurros, conecta con la comunidad y trackea hábitos.',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    inLanguage: 'es',
    author: {
      '@type': 'Organization',
      name: 'Beshy Whisper',
      url: 'https://whisper.beshy.es',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
