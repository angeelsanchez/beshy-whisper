import Link from 'next/link';

export default function CTASection() {
  return (
    <section
      id="cta"
      aria-labelledby="cta-title"
      className="py-20 bg-app-form-bg text-app-text"
    >
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 id="cta-title" className="text-4xl md:text-5xl font-bold mb-6">
          ¿Listo para Transformar tu Vida?
        </h2>
        <p className="text-xl mb-6 opacity-80">
          Únete a personas que ya están experimentando los beneficios del journaling diario
        </p>
        <p className="text-lg mb-8 opacity-70">
          <span className="font-semibold">Compromiso:</span> Solo 15 minutos al día durante 21 días
        </p>

        <div className="flex flex-col items-center gap-4 mb-6">
          <Link
            href="/login"
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 btn-landing gradient-button text-center"
          >
            Crear Cuenta Gratis
          </Link>
          <p className="text-sm opacity-70">
            o{' '}
            <Link href="/guest" className="underline hover:opacity-100 transition-opacity">
              probar ahora como invitado
            </Link>
          </p>
        </div>

        <div className="text-sm opacity-60 space-y-1">
          <p>Sin tarjeta de crédito &middot; 100% gratuito &middot; Empieza en 30 segundos</p>
          <p>Tus datos están seguros &middot; Cancelas cuando quieras</p>
        </div>
      </div>
    </section>
  );
}
