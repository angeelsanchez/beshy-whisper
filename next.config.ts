import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Code splitting and chunking optimizations
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'next-auth', 'react-google-recaptcha-v3'],
  },
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com'],
    minimumCacheTTL: 31536000, // 1 year cache
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  
  // Webpack optimizations
  webpack: (config) => {
    config.optimization.minimize = true;
    return config;
  },
};

export default nextConfig;
