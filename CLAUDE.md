# BESHY Whisper - Reglas del Proyecto para Claude Code

## Proyecto

App social de journaling anónimo. Los usuarios publican "whispers" diarios (franja DÍA y NOCHE), dan likes, gestionan objetivos diarios, mantienen rachas de publicación, reciben push notifications y exportan whispers como imagen/PDF. Dominio: `whisper.beshy.es`.

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.9 (strict mode) |
| UI | React 18 + Tailwind CSS 3 |
| Auth | NextAuth v4 (JWT, Google + Credentials) |
| Base de datos | Supabase (PostgreSQL + Realtime + RLS) |
| Validación | Zod |
| Hashing | bcryptjs (cost factor 12) |
| Push | web-push (VAPID) |
| Image gen | Puppeteer (server-side HTML → screenshot) |
| reCAPTCHA | Google reCAPTCHA v3 |

## Arquitectura

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # Route Handlers (REST API, server-side)
│   ├── (pages)/             # Pages: feed, create, profile, login, guest, admin
│   ├── layout.tsx           # Root layout (PWA meta, fonts, splash)
│   └── providers.tsx        # ThemeProvider > SessionProvider > PostProvider > AuthWrapper
├── components/              # React client components (1 componente = 1 archivo)
├── context/                 # PostContext (entries + realtime), ThemeContext (día/noche)
├── hooks/                   # Custom hooks (auth, notifications, activity, streak, stats)
├── lib/                     # Clientes externos
│   ├── supabase.ts          # Cliente anon (client-side reads + writes con RLS)
│   ├── supabase-admin.ts    # Cliente service_role (server-side, bypasses RLS)
│   └── schemas/             # Zod schemas compartidos
├── types/                   # Declaraciones TypeScript (.d.ts)
├── utils/                   # Funciones puras (format, UUID, html-escape, crypto)
└── middleware.ts             # Rate limiting por IP en /api/*
```

### Flujo de auth
NextAuth maneja sesiones JWT. `auth.uid()` de Supabase siempre es NULL porque no usamos Supabase Auth. Los API routes usan `getServerSession()` + `supabaseAdmin` (service_role, bypasses RLS). El client-side usa `supabase` (anon key) con RLS permisivo para reads.

### Jerarquía de providers
```
ThemeProvider → SessionProvider (15min refetch) → PostProvider → AuthWrapper (NameInputModal)
```

### Realtime
PostContext mantiene canales Supabase para `public:entries` (INSERT/DELETE) y `public:likes` (INSERT/DELETE).

## Reglas Estrictas

### TypeScript
- NUNCA usar `any`. Ni `as any`, ni `: any`, ni `<any>`. Usar `unknown` + type guards, interfaces, o genéricos
- NUNCA usar `@ts-ignore` o `@ts-expect-error`
- Parámetros de función y return types deben estar tipados explícitamente
- Usar `readonly` para props y datos inmutables

### Validación con Zod
- TODA ruta API DEBE validar su input con un schema Zod definido al inicio del archivo
- Schemas compartidos van en `src/lib/schemas/`
- SIEMPRE usar `.safeParse()`, NUNCA `.parse()`
- Devolver 400 con `parsed.error.flatten().fieldErrors` cuando falla la validación

### Seguridad (OWASP Top 10 / Security by Design)

**Principios fundamentales:**
- **Security by Design**: la seguridad no es un afterthought, es un requisito
- **Security by Default**: cada nueva feature se entrega bloqueada, no abierta
- **Worst Case First**: nunca confiar en input del usuario, query params, headers, ni body
- **Minimizar superficie de exposición**: exponer solo lo estrictamente necesario
- **No depender de la buena voluntad del usuario**: construir sistemas que no puedan ser abusados

**Reglas concretas:**
- Comparaciones de secretos con `crypto.timingSafeEqual()` (NUNCA `===` para tokens/secrets)
- Escapar SIEMPRE contenido de usuario inyectado en HTML (función `escapeHtml()` de `src/utils/html-escape.ts`)
- TODA ruta que modifica datos DEBE verificar sesión Y ownership (prevención IDOR)
- `supabaseAdmin` (service_role) SOLO en API routes server-side, NUNCA en client-side
- `supabase` (anon key) SOLO para operaciones de lectura desde el cliente
- NUNCA loguear datos sensibles (passwords, tokens, objetos de sesión completos)
- NUNCA exponer detalles internos de error en respuestas de producción
- Rate limiting está en `middleware.ts` — no hacer bypass
- RLS está habilitado en Supabase — `supabaseAdmin` lo bypassa intencionalmente

**Checklist OWASP rápido:**
1. **Injection**: Supabase SDK parametriza queries. No concatenar SQL
2. **Broken Auth**: NextAuth JWT + bcrypt. Migración dual-hash SHA256→bcrypt
3. **Sensitive Data Exposure**: .env.local para secrets. Nunca hardcodear
4. **XXE**: No procesamos XML
5. **Broken Access Control**: Session + ownership check en toda mutación. Role-based admin
6. **Security Misconfiguration**: CSP, HSTS, X-Frame-Options en next.config.ts
7. **XSS**: Escapar user content en HTML templates. React escapa JSX por defecto
8. **Insecure Deserialization**: Zod valida estructura de inputs
9. **Known Vulnerabilities**: Dependencias actualizadas. Snyk para monitoreo (futuro)
10. **Insufficient Logging**: Logger estructurado (sin datos sensibles)

### Calidad de Código
- Código autoexplicativo ANTES que comentarios. Los comentarios solo explican el POR QUÉ cuando no es obvio
- NO poner comentarios tipo `// Get the session`, `// Return response`, `// Import dependencies`
- NO `console.log` en producción. Usar el logger de `src/lib/logger.ts`
- `console.error` SOLO en catch blocks de errores reales, sin datos sensibles
- DRY: utilidades compartidas en `src/utils/`, tipos en `src/types/`, schemas Zod en `src/lib/schemas/`
- No archivos temporales (no `.tmp.tsx`, no `-fixed.ts`, no `-old.ts`)

### Git
- Conventional commits oneline: `feat:`, `fix:`, `sec:`, `refactor:`, `test:`, `docs:`, `chore:`
- NUNCA añadir "generated by Claude" ni coautoría
- Ramas: `feature/descripcion` o `bugfix/descripcion`
- NUNCA commitear .env, credentials, archivos de debug
- .mcp.json NUNCA se commitea (está en .gitignore)

### Testing
- Framework: Vitest + React Testing Library
- Tests colocados: `__tests__/` junto al módulo o sufijo `.test.ts`
- Todas las rutas API: tests de happy path, errores de validación, errores de auth, edge cases
- Todas las utilidades: tests unitarios
- Coverage target: 80% utils, 70% API routes
- Mock de Supabase a nivel de módulo (no por test)
- Mock de NextAuth `getServerSession` para tests de API routes
- Scripts: `npm test`, `npm run test:run`, `npm run test:coverage`

### Estructura de API Routes
Patrón estándar para toda ruta:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { z } from 'zod';

const requestSchema = z.object({
  // definir schema
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // lógica de negocio con supabaseAdmin
}
```

## Variables de Entorno Requeridas

```
NEXT_PUBLIC_SUPABASE_URL          # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Clave anon (client-side, RLS activo)
SUPABASE_SERVICE_ROLE_KEY         # Clave service_role (server-side, bypasses RLS)
NEXTAUTH_SECRET                   # Secret para JWT (mín 32 bytes hex)
NEXTAUTH_URL                      # URL canónica (https://whisper.beshy.es en prod)
GOOGLE_CLIENT_ID                  # OAuth Google
GOOGLE_CLIENT_SECRET              # OAuth Google
NEXT_PUBLIC_RECAPTCHA_SITE_KEY    # reCAPTCHA v3 site key
RECAPTCHA_SECRET_KEY              # reCAPTCHA v3 server key
NEXT_PUBLIC_VAPID_PUBLIC_KEY      # Web Push VAPID public
VAPID_PRIVATE_KEY                 # Web Push VAPID private
VAPID_EMAIL                       # mailto: para Web Push
```

Opcionales (para cron/webhooks):
```
CRON_SECRET                       # Auth para cron endpoint
WEBHOOK_SECRET                    # Auth para webhook de likes
INTERNAL_API_KEY                  # Auth para endpoint de envío de notificaciones
```

## Integraciones Futuras

Estas integraciones están planificadas. Al implementarlas, consultar `docs/INTEGRATIONS.md`:

| Integración | Propósito | Estado |
|------------|----------|--------|
| **Snyk** | Escaneo de vulnerabilidades en dependencias (CI) | Planificado |
| **Sentry** | Error tracking + performance monitoring (client + server) | Planificado |
| **Microsoft Clarity** | Session recordings + heatmaps (solo client) | Planificado |
| **SonarQube** | Análisis estático de código (quality gates) | Planificado |

## Documentación Adicional

- `docs/ARCHITECTURE.md` — Arquitectura detallada del sistema
- `docs/SECURITY.md` — Checklist OWASP y políticas de seguridad
- `docs/API.md` — Referencia completa de API routes
- `docs/DATABASE.md` — Schema de base de datos, RLS, funciones RPC
- `docs/TESTING.md` — Guía de testing con Vitest
- `docs/INTEGRATIONS.md` — Guías de integración (Snyk, Sentry, Clarity, SonarQube)
- `docs/REMINDER_SYSTEM_SETUP.md` — Setup del sistema de recordatorios
