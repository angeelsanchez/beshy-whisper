import type { Metadata } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import { Providers } from "./providers";
import dynamic from "next/dynamic";

const AdaptiveNavigation = dynamic(() => import("@/components/AdaptiveNavigation"));
const InstallPrompt = dynamic(() => import("@/components/InstallPrompt"));
const NotificationBanner = dynamic(() => import("@/components/NotificationBanner"));

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "BESHY Whisper",
  description: "Susurra tu progreso en silencio.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BESHY Whisper",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BESHY Whisper" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="BESHY Whisper" />
        <link rel="icon" type="image/x-icon" href="/logo_pwa.ico" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const hour = new Date().getHours();
                  const isDaytime = hour >= 6 && hour < 18;
                  const theme = isDaytime ? 'day-theme' : 'night-theme';
                  document.documentElement.className = '${montserrat.variable} ' + theme;
                  
                  window.addEventListener('load', function() {
                    if ('serviceWorker' in navigator) {
                      setTimeout(function() {
                        navigator.serviceWorker.register('/sw.js', { scope: '/' });
                      }, 2000);
                    }
                  });
                  
                  // Optimized splash screen hiding
                  const hideSplash = () => {
                    const splash = document.getElementById('splash-screen');
                    const main = document.getElementById('main-content');
                    if (splash && main) {
                      splash.style.opacity = '0';
                      setTimeout(() => {
                        splash.style.display = 'none';
                        main.style.opacity = '1';
                      }, 200);
                    }
                  };
                  
                  if (document.readyState === 'complete') {
                    setTimeout(hideSplash, 300);
                  } else {
                    window.onload = () => setTimeout(hideSplash, 300);
                  }
                } catch (e) {
                  console.error('Error applying theme:', e);
                }
              })();
            `
          }}
        />
        <link rel="preload" href="/beshy-logo.svg" as="image" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root{--day-bg:#F5F0E1;--day-accent:#4A2E1B;--night-bg:#2D1E1A;--night-accent:#F5F0E1;--prompt:#8A7B6C}html.day-theme{color-scheme:light!important;background-color:var(--day-bg)!important;color:var(--day-accent)!important}html.day-theme body{background-color:var(--day-bg)!important;color:var(--day-accent)!important}html.night-theme{color-scheme:dark!important;background-color:var(--night-bg)!important;color:var(--night-accent)!important}html.night-theme body{background-color:var(--night-bg)!important;color:var(--night-accent)!important}body{font-family:var(--font-montserrat),sans-serif;margin:0;padding:0}#splash-screen{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background-color:#2D1E1A;transition:opacity .2s ease;z-index:9999}html.day-theme #splash-screen{background-color:#F5F0E1}#splash-screen img{width:100px;height:100px;animation:pulse 1.5s ease-in-out infinite}#main-content{opacity:0;transition:opacity .2s ease}@keyframes pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.1);opacity:1}}
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div id="splash-screen">
          <img src="/beshy-logo.svg" alt="Beshy Logo" />
        </div>
        <div id="main-content">
          <Providers>
            <div className="lg:pl-20 pb-16 lg:pb-0">
              {children}
            </div>
            <AdaptiveNavigation />
            <NotificationBanner />
            <InstallPrompt />
          </Providers>
        </div>
      </body>
    </html>
  );
}
