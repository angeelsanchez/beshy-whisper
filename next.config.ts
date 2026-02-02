import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'next-auth', 'react-google-recaptcha-v3', 'zod', 'lucide-react'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'jpjvphycemtihwzrsgoa.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    minimumCacheTTL: 31536000,
    formats: ['image/webp', 'image/avif'],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/:path*.(ico|svg|png|jpg|jpeg|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://jpjvphycemtihwzrsgoa.supabase.co",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google.com https://fcm.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com",
              "frame-src 'self' https://www.google.com",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.optimization.minimize = true;
    return config;
  },
};

export default nextConfig;
