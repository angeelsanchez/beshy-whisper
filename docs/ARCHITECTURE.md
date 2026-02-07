# Arquitectura del Sistema

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (Browser)                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │  React   │ │ Supabase │ │  Service Worker   │   │
│  │Components│ │ Realtime │ │  (Push + PWA)     │   │
│  └────┬─────┘ └────┬─────┘ └───────────────────┘   │
│       │             │                               │
└───────┼─────────────┼───────────────────────────────┘
        │             │
        ▼             ▼
┌───────────────────────────────────────────────┐
│              Next.js App Router               │
│  ┌────────────┐  ┌──────────────────────┐    │
│  │   Pages    │  │    API Routes        │    │
│  │ (SSR/CSR)  │  │ (supabaseAdmin)      │    │
│  └────────────┘  └──────────┬───────────┘    │
│                             │                │
│  ┌──────────────────────────┤                │
│  │    NextAuth (JWT)        │                │
│  └──────────────────────────┤                │
│                             │                │
│  ┌──────────────────────────┤                │
│  │    Middleware             │                │
│  │    (Rate Limiting)       │                │
│  └──────────────────────────┘                │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│              Supabase (PostgreSQL)             │
│  ┌────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │  RLS   │ │Realtime  │ │  RPC Functions   │ │
│  │Policies│ │Channels  │ │  (add_like, etc) │ │
│  └────────┘ └─────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │  Storage (bucket: avatars)               │ │
│  │  Fotos de perfil, 200x200 WebP           │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

## Flujos de Datos Principales

### 1. Publicar un Whisper
```
WhisperForm → POST body al supabase client (anon key, RLS INSERT permisivo)
           → PostContext.addLocalPost() (optimistic UI)
           → Supabase Realtime notifica a otros usuarios
           → Feed se actualiza en tiempo real
```

### 2. Dar Like
```
LikeButton → POST /api/likes (session check + supabaseAdmin)
          → Supabase INSERT/DELETE en tabla likes
          → Fire-and-forget: POST /api/notifications/send-like
          → Supabase Realtime actualiza contadores en otros clients
```

### 3. Autenticación
```
Login Page → NextAuth signIn (Google OAuth o Credentials)
          → auth.ts signIn callback → supabaseAdmin busca/crea usuario
          → JWT con {id, alias, bsy_id, name, role, profile_photo_url, bio}
          → Session disponible via useSession() / getServerSession()
          → Client-side refresh via update() (ej: al cambiar foto/bio)
```

### 3b. Follows
```
FollowButton → POST /api/follows (toggle)
            → INSERT/DELETE en follows + triggers actualizan contadores
            → Push notification al seguido
```

### 3c. Habits
```
HabitList → GET /api/habits → POST /api/habits/log (toggle por fecha)
         → GET /api/habits/stats (rachas, porcentajes)
```

### 3d. Foto de perfil
```
ProfileEditForm → compressAvatar() client-side (200x200 WebP ~15KB)
              → POST /api/user/update-photo (FormData, magic bytes check)
              → Supabase Storage: avatars/{userId}.webp (upsert)
              → URL + ?v={timestamp} para cache bust
```

### 4. Push Notifications
```
useNotifications → serviceWorker.pushManager.subscribe(VAPID)
               → POST /api/notifications/register (guarda token)
               → Cron: GET /api/notifications/cron-reminders → web-push.sendNotification()
               → Like: POST /api/notifications/send-like → web-push.sendNotification()
```

### 5. Generación de Imagen
```
SocialShareModal → POST /api/generate-image
                → Puppeteer renderiza HTML template en headless browser
                → Screenshot → Buffer → Base64 → Response
```

## Jerarquía de Providers

```tsx
<ThemeProvider>           // Tema día/noche automático (6AM-6PM)
  <SessionProvider>       // NextAuth session (refetch cada 15min)
    <PostProvider>        // Entries + realtime subscriptions
      <AuthWrapper>       // NameInputModal si el usuario necesita nombre
        {children}
      </AuthWrapper>
    </PostProvider>
  </SessionProvider>
</ThemeProvider>
```

## Patrones de Supabase

### Cliente Anon (`src/lib/supabase.ts`)
- Usado en: componentes client-side (PostContext, WhisperForm, ObjectivesList, hooks)
- Permisos: RLS activo, solo lee datos públicos, INSERT permisivo
- Auth: sin sesión persistente (NextAuth maneja auth)

### Cliente Admin (`src/lib/supabase-admin.ts`)
- Usado en: API routes server-side exclusivamente
- Permisos: service_role, bypasses RLS completamente
- Auth: sin sesión, sin auto-refresh

## Rate Limiting

Implementado en `src/middleware.ts` con Redis (producción) y fallback a Map en memoria (desarrollo):

| Ruta | Límite | Ventana |
|------|--------|---------|
| `/api/auth/check-lockout` | 5 req | 60s |
| `/api/auth/register` | 5 req | 60s |
| `/api/auth/callback` | 5 req | 60s |
| `/api/likes` | 30 req | 60s |
| `/api/posts` | 20 req | 60s |
| `/api/notifications` | 30 req | 60s |
| `/api/webhooks` | 10 req | 60s |
| `/api/follows` | 20 req | 60s |
| `/api/feed` | 30 req | 60s |
| `/api/habits` | 30 req | 60s |
| `/api/user/update-photo` | 10 req | 60s |
| `/api/user/delete-photo` | 10 req | 60s |
| `/api/user/update-bio` | 15 req | 60s |
| Resto de `/api/*` | 60 req | 60s |

En producción, Redis persiste los contadores entre reinicios de contenedor. En desarrollo (sin Redis), cleanup automático del Map cuando supera 10K entries.

## Tema Día/Noche

ThemeContext determina automáticamente el tema según la hora:
- 6:00 AM - 5:59 PM → Tema DÍA
- 6:00 PM - 5:59 AM → Tema NOCHE

Persistido en localStorage, sincronizado entre tabs via `storage` event. Las clases CSS se aplican en `<html>`.
