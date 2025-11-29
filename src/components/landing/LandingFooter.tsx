import Image from 'next/image';
import Link from 'next/link';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-app-divider bg-app-bg text-app-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="text-center md:text-left">
            <Image
              src="/beshy-logo.svg"
              alt="Beshy Whisper"
              width={48}
              height={48}
              className="mx-auto md:mx-0 opacity-70 hover:opacity-100 transition-opacity duration-300"
            />
            <p className="mt-2 text-sm opacity-70">Tu espacio de reflexión personal</p>
          </div>

          <nav aria-label="Accesos" className="text-center md:text-right">
            <h4 className="font-semibold mb-3">Accesos</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>
                <Link href="/login" className="hover:opacity-100 transition-opacity">
                  Iniciar Sesión
                </Link>
              </li>
              <li>
                <Link href="/guest" className="hover:opacity-100 transition-opacity">
                  Modo Invitado
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="text-center text-sm opacity-60 pt-8 border-t border-app-divider">
          <p>&copy; {currentYear} Beshy Whisper</p>
        </div>
      </div>
    </footer>
  );
}
