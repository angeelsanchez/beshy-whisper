# API Reference

Todas las rutas están en `src/app/api/`. Todas requieren session NextAuth excepto donde se indica.

## Auth

### POST /api/auth/register
Registro con email/password.
- **Auth**: No requerida
- **Schema Zod**: `{ email: string().email().max(255), password: string().min(8).max(128), token: string().min(1), name?: string().max(50) }`
- **Validaciones**: reCAPTCHA v3 (score >= 0.5), email único
- **Respuesta**: `201 { message, user: { id, email, alias, bsy_id } }` | `400/409/500`

### GET /api/auth/check-lockout
Comprueba si una IP+email están bloqueados por intentos fallidos.
- **Auth**: No requerida
- **Params**: query `?email=string`
- **Respuesta**: `200 { locked: boolean, remainingAttempts?, lockoutEnds? }` | `400/500`

### [...nextauth]
Manejado por NextAuth. Providers: Google, Credentials.
- `GET/POST /api/auth/callback/google` — OAuth callback
- `GET /api/auth/providers` — Lista providers
- `GET /api/auth/session` — Sesión actual
- `POST /api/auth/signin/credentials` — Login email/password
- `POST /api/auth/signout` — Logout

## Feed

### GET /api/feed
Obtiene el feed de whispers con paginación.
- **Auth**: Opcional (filtra posts privados si autenticado)
- **Params**: query `?page=number&limit=number&franja=DIA|NOCHE`
- **Respuesta**: `200 { entries: Entry[], hasMore: boolean }` | `500`

## Posts

### POST /api/posts/create
Crea un nuevo whisper.
- **Auth**: Requerida (o guest mode)
- **Schema Zod**: `{ mensaje: string, franja: 'DIA'|'NOCHE', nombre?: string }`
- **Respuesta**: `201 { entry }` | `400/500`

### POST /api/posts/delete
Elimina un whisper del usuario autenticado.
- **Auth**: Requerida (session + ownership)
- **Params**: query `?entryId=uuid`
- **Lógica**: Verifica ownership, elimina likes asociados, luego elimina entry
- **Respuesta**: `200 { message }` | `401/403/404/500`

### PATCH /api/posts/update
Actualiza mensaje o privacidad de un whisper.
- **Auth**: Requerida (session + ownership)
- **Body**: `{ entryId: uuid, mensaje?: string, is_private?: boolean }`
- **Respuesta**: `200 { message, entry }` | `400/401/403/404/500`

## Likes

### POST /api/likes
Toggle like en un whisper.
- **Auth**: Requerida
- **Body**: `{ entryId: uuid }`
- **Lógica**: Si existe like → DELETE. Si no → INSERT. Fire-and-forget: envía notificación push
- **Respuesta**: `200 { message, action: 'liked'|'unliked', likesCount }` | `400/401/500`

### GET /api/likes/status
Comprueba si el usuario ha dado like a un entry.
- **Auth**: Requerida
- **Params**: query `?entryId=uuid`
- **Respuesta**: `200 { liked: boolean, likesCount: number }` | `400/401/500`

### POST /api/likes/direct
Crea un like directamente (sin toggle).
- **Auth**: Requerida
- **Body**: `{ entryId: uuid }`
- **Respuesta**: `200 { success, action, likesCount }` | `400/401/500`

## Objectives

### PATCH /api/objectives
Actualiza estado (done/undone) de un objetivo.
- **Auth**: Requerida
- **Body**: `{ objectiveId: uuid, done: boolean }`
- **Respuesta**: `200 { objective }` | `400/401/500`

### DELETE /api/objectives
Elimina un objetivo.
- **Auth**: Requerida
- **Params**: query `?objectiveId=uuid`
- **Respuesta**: `200 { message }` | `400/401/500`

### POST /api/objectives/batch
Guarda múltiples objetivos para un entry.
- **Auth**: Requerida
- **Body**: `{ entry_id: uuid, objectives: [{ text: string }] }`
- **Respuesta**: `200 { objectives }` | `400/401/500`

## Follows

### POST /api/follows
Toggle follow/unfollow a un usuario.
- **Auth**: Requerida
- **Body**: `{ targetUserId: uuid }`
- **Lógica**: Toggle follow/unfollow. Triggers actualizan contadores. Envía push notification al seguido
- **Respuesta**: `200 { action: 'followed'|'unfollowed' }` | `400/401/500`

### GET /api/follows/status
Comprueba si el usuario sigue a otro.
- **Auth**: Requerida
- **Params**: query `?targetUserId=uuid`
- **Respuesta**: `200 { isFollowing: boolean }` | `400/401/500`

### GET /api/follows/list
Lista seguidores o seguidos de un usuario.
- **Auth**: Requerida
- **Params**: query `?userId=uuid&type=followers|following`
- **Respuesta**: `200 { users: [{ id, alias, bsy_id, name, profile_photo_url }] }` | `400/401/500`

## Habits

### GET /api/habits
Lista hábitos del usuario autenticado.
- **Auth**: Requerida
- **Respuesta**: `200 { habits: Habit[] }` | `401/500`

### POST /api/habits
Crea un nuevo hábito.
- **Auth**: Requerida
- **Schema Zod**: `{ name: string(1-100), description?: string(max 500), frequency: 'daily'|'weekly', target_days_per_week?: number(1-7), color?: string(hex) }`
- **Respuesta**: `201 { habit }` | `400/401/500`

### DELETE /api/habits/[habitId]
Elimina un hábito (cascade elimina sus logs).
- **Auth**: Requerida (session + ownership)
- **Respuesta**: `200 { message }` | `401/403/404/500`

### PATCH /api/habits/[habitId]
Actualiza un hábito existente.
- **Auth**: Requerida (session + ownership)
- **Body**: `{ name?, description?, frequency?, target_days_per_week?, color?, is_active?, sort_order? }`
- **Respuesta**: `200 { habit }` | `400/401/403/404/500`

### POST /api/habits/log
Toggle completado de un hábito para una fecha.
- **Auth**: Requerida
- **Body**: `{ habitId: uuid, date?: string(YYYY-MM-DD) }`
- **Lógica**: Si ya existe log para esa fecha lo elimina, si no lo crea
- **Respuesta**: `200 { action: 'logged'|'unlogged' }` | `400/401/500`

### GET /api/habits/stats
Estadísticas de hábitos del usuario.
- **Auth**: Requerida
- **Params**: query `?period=week|month|all`
- **Respuesta**: `200 { stats }` | `401/500`

## User

### GET /api/user/today-posts
Comprueba si el usuario ha publicado hoy (día y noche).
- **Auth**: Requerida
- **Respuesta**: `200 { hasDayPost: boolean, hasNightPost: boolean, dayPost?, nightPost? }`

### GET /api/user/streak
Obtiene información de racha del usuario.
- **Auth**: Requerida
- **Respuesta**: `200 { currentStreak, longestStreak, lastPostedAt, totalPosts }`

### PUT /api/user/update-name
Actualiza el nombre de display del usuario.
- **Auth**: Requerida
- **Body**: `{ name: string (1-50 chars) }`
- **Validación**: Cooldown de 14 días entre cambios (vía RPC `can_update_name`)
- **Respuesta**: `200 { message, name }` | `400/401/429/500`

### GET /api/user/name-status
Comprueba si el usuario necesita configurar su nombre.
- **Auth**: Requerida
- **Respuesta**: `200 { needsNameInput: boolean, name?, bsy_id? }`

### GET /api/user/available-bsy-ids
Lista BSY IDs disponibles (debug/admin).
- **Auth**: Requerida
- **Respuesta**: `200 { availableIds: string[] }`

### POST /api/user/update-photo
Sube o actualiza la foto de perfil.
- **Auth**: Requerida
- **Body**: `FormData` con campo `photo` (archivo imagen)
- **Validaciones**: tamaño ≤512KB, MIME type (jpeg/png/webp), magic bytes server-side
- **Lógica**: Sube a Supabase Storage `avatars/{userId}.webp` (upsert). Actualiza `users.profile_photo_url` con URL pública + `?v={timestamp}` para cache bust
- **Respuesta**: `200 { profile_photo_url }` | `400/401/500`

### DELETE /api/user/delete-photo
Elimina la foto de perfil.
- **Auth**: Requerida
- **Lógica**: Borra archivo de Storage, pone `profile_photo_url = NULL`
- **Respuesta**: `200 { message }` | `401/500`

### POST /api/user/update-bio
Actualiza la mini bio del usuario.
- **Auth**: Requerida
- **Schema Zod**: `{ bio: string().max(160).trim() }`
- **Respuesta**: `200 { bio }` | `400/401/500`

### GET /api/user/notification-preferences
Obtiene las preferencias de notificación del usuario.
- **Auth**: Requerida
- **Respuesta**: `200 { preferences: Record<NotificationType, boolean> }` | `401/500`
- **Nota**: Retorna `{}` si el usuario no ha personalizado preferencias (todas habilitadas por defecto)

### PUT /api/user/notification-preferences
Actualiza las preferencias de notificación del usuario.
- **Auth**: Requerida
- **Schema Zod**: `{ preferences: Record<NotificationType, boolean> }`
- **Lógica**: Mergea con preferencias existentes, elimina claves `true` (representación sparse), guarda `null` si todo habilitado
- **Respuesta**: `200 { preferences }` | `400/401/500`
- **Tipos disponibles**: `like`, `follow`, `follow_post`, `chat`, `reminder_morning`, `reminder_streak`, `reminder_night`, `reminder_habit`, `initiative_reminder`, `initiative_weekly`, `initiative_streak`, `initiative_checkin`, `habit_milestone`

## Notifications

### POST /api/notifications/register
Registra un push token para el usuario.
- **Auth**: Requerida
- **Schema Zod**: `{ endpoint: string().url(), p256dh: string().min(1), auth: string().min(1) }`
- **Respuesta**: `200 { message }` | `400/401/500`

### POST /api/notifications/send
Envía push notification a un usuario.
- **Auth**: Bearer token (`INTERNAL_API_KEY`)
- **Body**: `{ userId: uuid, title: string, body: string, data?: object }`
- **Respuesta**: `200 { success }` | `400/401/404/500`

### POST /api/notifications/send-like
Envía notificación de like.
- **Auth**: Interna (llamada desde `/api/likes`)
- **Body**: `{ likerName: string, likerBsyId: string, entryId: uuid, entryOwnerId: uuid }`
- **Respuesta**: `200 { success }` | `400/500`

### GET /api/notifications/cron-reminders
Procesa recordatorios programados (mañana, tarde, noche).
- **Auth**: Bearer token (`CRON_SECRET`)
- **Lógica**: Determina franja horaria, busca usuarios sin post, envía push
- **Respuesta**: `200 { processed, sent, errors }`

### GET /api/notifications/status
Estado de notificaciones del usuario.
- **Auth**: Requerida
- **Respuesta**: `200 { hasToken: boolean, permission: string }`

### POST /api/notifications/test-push
Envía notificación de prueba.
- **Auth**: Requerida
- **Respuesta**: `200 { success }` | `500`

## Webhooks

### POST /api/webhooks/like-notification
Webhook para notificaciones de likes (legacy).
- **Auth**: `WEBHOOK_SECRET` en body (comparación con `timingSafeEqual`)
- **Body**: `{ record: { user_id, type, title, body, data }, secret: string }`
- **Respuesta**: `200 { success }` | `401/500`

## Image Generation

### POST /api/generate-image
Genera imagen/PDF de un whisper.
- **Auth**: Requerida
- **Body**: `{ type: 'bubble'|'sticker'|'story', nombre, mensaje, fecha, franja, objectives?, display_name?, display_id? }`
- **Lógica**: Puppeteer renderiza HTML template → screenshot → base64
- **Respuesta**: `200 { image: base64string }` | `400/401/500`
