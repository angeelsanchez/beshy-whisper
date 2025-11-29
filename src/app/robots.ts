import type { MetadataRoute } from 'next';

const BASE_URL = 'https://whisper.beshy.es';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/guest'],
        disallow: ['/api/', '/admin/', '/feed/', '/create/', '/profile/', '/habits/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
