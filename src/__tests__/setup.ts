import '@testing-library/jest-dom/vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-bytes-long-for-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-recaptcha-site-key';
process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-secret-key';
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';
process.env.VAPID_EMAIL = 'mailto:test@test.com';
