# Seguridad - Checklist y Políticas

## Principios

0. **Zero Trust**: valida todo, confía en nada. Cada capa verifica independientemente. No asumir que ninguna entrada, sesión, header, o dato intermedio es seguro o legítimo
1. **Security by Design**: la seguridad es un requisito desde la primera línea de código, no un afterthought
2. **Security by Default**: cada feature se entrega bloqueada, permisos mínimos siempre
3. **Worst Case First**: asumir que todo input es malicioso — query params, headers, body, cookies, session claims
4. **Minimizar superficie**: exponer solo lo estrictamente necesario. No endpoints de debug, no datos extra en respuestas
5. **No depender del usuario**: los sistemas no deben ser abusables

## OWASP Top 10 - Estado

| # | Vulnerabilidad | Estado | Detalle |
|---|---------------|--------|---------|
| 1 | **Injection** | Mitigado | Supabase SDK parametriza queries. No SQL raw |
| 2 | **Broken Auth** | Mitigado | NextAuth JWT + bcrypt (cost 12). Migración dual-hash SHA256→bcrypt |
| 3 | **Sensitive Data Exposure** | Mitigado | Secrets en .env.local, .gitignore cubre .env*. CSP + HSTS activos |
| 4 | **XXE** | N/A | No procesamos XML |
| 5 | **Broken Access Control** | Mitigado | Session + ownership check en mutaciones. RLS en Supabase. Admin role-based |
| 6 | **Security Misconfiguration** | Mitigado | CSP, HSTS, X-Frame-Options, Permissions-Policy en next.config.ts |
| 7 | **XSS** | Mitigado | React escapa JSX. `generate-image` usa `escapeHtml()` en todos los templates HTML |
| 8 | **Insecure Deserialization** | Mitigado | Zod valida estructura (en rutas que ya lo usan) |
| 9 | **Known Vulnerabilities** | Mitigado | Dependencias actualizadas. Snyk planificado |
| 10 | **Insufficient Logging** | Mitigado | Logger estructurado en `src/lib/logger.ts` (sanitiza datos sensibles, filtra por nivel en prod) |

## Autenticación

- **Mecanismo**: NextAuth v4 con JWT strategy
- **Providers**: Google OAuth + Email/Password (Credentials)
- **Hashing**: bcryptjs con cost factor 12
- **Migración legacy**: detecta hash SHA256 (hex, 64 chars) vs bcrypt ($2b$/$2a$) y migra automáticamente en login
- **Sesión**: JWT con maxAge 30 días. Campos custom: `id`, `alias`, `bsy_id`, `name`, `role`
- **Admin**: campo `role` en users. Check en `/admin` page y callbacks JWT/session

## Row Level Security (RLS)

### Tablas con RLS habilitado
- `users` — SELECT público, INSERT/UPDATE permisivo (API routes usan service_role)
- `entries` — SELECT filtrado por `is_private = false`, INSERT/UPDATE/DELETE permisivo
- `likes` — SELECT/INSERT/DELETE permisivo
- `objectives` — SELECT/INSERT/UPDATE/DELETE permisivo
- `notifications` — SELECT/INSERT/UPDATE permisivo
- `push_tokens` — SELECT/INSERT/UPDATE/DELETE permisivo

### Tablas sin RLS
- `quotes` — datos públicos de solo lectura

### Estrategia
`auth.uid()` de Supabase siempre es NULL porque usamos NextAuth, no Supabase Auth. Las políticas RLS son permisivas para el anon key (client-side). La protección real está en los API routes (session check + ownership verification + supabaseAdmin).

## Headers de Seguridad (`next.config.ts`)

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: restrictivo con excepciones para reCAPTCHA, Google Fonts, Supabase, FCM

## Rate Limiting

Implementado en `src/middleware.ts`. Usa Redis como almacenamiento distribuido con fallback a Map en memoria si Redis no está disponible. Ver `docs/ARCHITECTURE.md` para límites por ruta.

**Persistencia**: con Redis, los contadores de rate limiting sobreviven reinicios de contenedor. El fallback en memoria solo aplica en desarrollo local o si Redis cae.

## Secrets

### Nunca commitear
- `.env.local` (cubierto por `.env*` en .gitignore)
- `.mcp.json` (cubierto en .gitignore)
- Claves de Supabase service_role
- NEXTAUTH_SECRET
- Claves VAPID privadas
- CRON_SECRET, WEBHOOK_SECRET, INTERNAL_API_KEY

### Comparación de secrets
SIEMPRE usar `crypto.timingSafeEqual()` para comparar tokens/secrets en runtime. NUNCA usar `===` o `!==`.

```typescript
import { safeCompare } from '@/utils/crypto-helpers';

if (!safeCompare(receivedToken, process.env.WEBHOOK_SECRET || '')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Prevención XSS

- React escapa JSX automáticamente
- NUNCA usar `dangerouslySetInnerHTML` con contenido de usuario
- Para HTML templates server-side (generate-image), usar `escapeHtml()` de `src/utils/html-escape.ts`
- CSP restringe sources de scripts, styles, imágenes y conexiones

## File Upload Security

### Foto de perfil (`/api/user/update-photo`)
- **Tamaño**: máx 512KB server-side (client-side comprime a ~15KB antes de subir)
- **MIME type**: solo `image/jpeg`, `image/png`, `image/webp`
- **Magic bytes**: validación server-side de cabeceras binarias
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - WebP: `52 49 46 46...57 45 42 50`
- **Naming**: `{userId}.webp` — no acepta nombres arbitrarios, previene path traversal
- **Storage**: Supabase Storage bucket público con RLS policies (solo el owner puede escribir su propio avatar)

## Brute-force Protection

### Login attempts (`login_attempts` table)
- Registro de cada intento de login (IP + email + timestamp + success)
- Endpoint `/api/auth/check-lockout` verifica bloqueos antes de permitir login
- Limpieza automática de registros >24h via `cleanup_old_login_attempts()`
- Rate limiting adicional en middleware (5 req/min para auth endpoints)

## Hallazgos Remediados

| Severidad | Hallazgo | Archivo | Estado |
|-----------|---------|---------|--------|
| ALTA | XSS en templates HTML | `generate-image/route.ts` | Remediado — `escapeHtml()` aplicado a todos los templates |
| ALTA | Timing attack en comparación de secrets | 4 archivos de notifications/webhooks | Remediado — `safeCompare()` via `crypto.timingSafeEqual()` |
| MEDIA | `any` types (13 ocurrencias) | Varios | Remediado — 0 `any`, ESLint `no-explicit-any: error` |
| MEDIA | Console.log en producción (~342) | ~51 archivos | Remediado — Logger estructurado, ESLint `no-console: warn` |
| MEDIA | Rutas API sin Zod (12 de 14) | API routes | Remediado — Todas las rutas usan Zod `.safeParse()` |
| BAJA | CSP con unsafe-inline/unsafe-eval | next.config.ts | Aceptado (necesario para reCAPTCHA) |
