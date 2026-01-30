# Seguridad - Checklist y Políticas

## Principios

1. **Security by Design**: la seguridad es un requisito, no un afterthought
2. **Security by Default**: cada feature se entrega bloqueada
3. **Worst Case First**: asumir que todo input es malicioso
4. **Minimizar superficie**: exponer solo lo estrictamente necesario
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
| 7 | **XSS** | Pendiente parcial | React escapa JSX. `generate-image` necesita escaping de user content en HTML templates |
| 8 | **Insecure Deserialization** | Mitigado | Zod valida estructura (en rutas que ya lo usan) |
| 9 | **Known Vulnerabilities** | Mitigado | Dependencias actualizadas. Snyk planificado |
| 10 | **Insufficient Logging** | Pendiente | Logger estructurado planificado |

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
- `follows` — feature en desarrollo

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

Implementado en `src/middleware.ts`. Map en memoria por IP + ruta. Ver `docs/ARCHITECTURE.md` para límites por ruta.

**Limitación conocida**: se resetea al reiniciar el proceso (no persistente). Aceptable para instancia única con PM2.

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

## Hallazgos Pendientes de Remediación

| Severidad | Hallazgo | Archivo | Estado |
|-----------|---------|---------|--------|
| ALTA | XSS en templates HTML | `generate-image/route.ts` | Pendiente |
| ALTA | Timing attack en comparación de secrets | 4 archivos de notifications/webhooks | Pendiente |
| MEDIA | `any` types (13 ocurrencias) | Varios | Pendiente |
| MEDIA | Console.log en producción (~342) | ~51 archivos | Pendiente |
| MEDIA | Rutas API sin Zod (12 de 14) | API routes | Pendiente |
| BAJA | CSP con unsafe-inline/unsafe-eval | next.config.ts | Aceptado (necesario para reCAPTCHA) |
