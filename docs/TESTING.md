# Guía de Testing

## Framework

- **Vitest** — Test runner compatible con Next.js 15 y TypeScript
- **React Testing Library** — Tests de componentes React
- **@testing-library/jest-dom** — Matchers adicionales para DOM assertions

## Scripts

```bash
npm test              # Vitest en modo watch
npm run test:run      # Ejecución única (CI)
npm run test:coverage # Con reporte de cobertura
```

## Estructura

```
src/
├── __tests__/
│   ├── setup.ts              # Setup global (mocks, env vars)
│   └── mocks/
│       ├── supabase.ts       # Mock de supabaseAdmin y supabase
│       └── next-auth.ts      # Mock de getServerSession
├── utils/
│   └── __tests__/
│       ├── format-utils.test.ts
│       ├── user-helpers.test.ts
│       ├── html-escape.test.ts
│       └── crypto-helpers.test.ts
├── app/api/
│   ├── auth/register/__tests__/route.test.ts
│   ├── likes/__tests__/route.test.ts
│   ├── posts/delete/__tests__/route.test.ts
│   ├── posts/update/__tests__/route.test.ts
│   ├── objectives/__tests__/route.test.ts
│   └── ...
└── middleware.test.ts
```

## Configuración (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Coverage Targets

| Área | Objetivo |
|------|----------|
| `src/utils/` | 80% |
| `src/app/api/` | 70% |
| Global | 60% mínimo |

## Mocking

### Supabase (`src/__tests__/mocks/supabase.ts`)

Mock chainable del SDK:
```typescript
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  // ...
};

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQuery),
    rpc: vi.fn(),
  },
}));
```

### NextAuth (`src/__tests__/mocks/next-auth.ts`)

```typescript
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// En cada test:
const mockSession = {
  user: { id: 'uuid', email: 'test@test.com', alias: 'BSY001', bsy_id: 'BSY001', name: 'Test', role: 'user' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};
vi.mocked(getServerSession).mockResolvedValue(mockSession);
```

## Cómo escribir un test de API Route

Plantilla:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';

// Importar mocks
vi.mock('next-auth');
vi.mock('@/lib/supabase-admin');

describe('POST /api/example', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 sin sesión', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/example', {
      method: 'POST',
      body: JSON.stringify({ field: 'value' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('retorna 400 con datos inválidos', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost/api/example', {
      method: 'POST',
      body: JSON.stringify({ field: '' }), // inválido
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('retorna 200 con datos válidos', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    // Mock de supabase...

    const request = new NextRequest('http://localhost/api/example', {
      method: 'POST',
      body: JSON.stringify({ field: 'valid' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Qué testear por tipo

### Utilidades (`src/utils/`)
- Todos los edge cases de input (null, undefined, empty, boundary values)
- Valores esperados para inputs válidos
- No requieren mocks

### API Routes (`src/app/api/`)
- **401**: Request sin sesión
- **400**: Request con datos inválidos (schema Zod falla)
- **403**: Request de usuario que no es owner
- **404**: Recurso no encontrado
- **200**: Happy path con datos válidos
- Verificar que se llama a `supabaseAdmin` con los parámetros correctos

### Middleware
- Request bajo el límite → pasa
- Request sobre el límite → 429 con Retry-After
- Request a ruta no-API → pasa sin rate limit
