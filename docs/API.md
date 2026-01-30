# API Reference

Todas las rutas están en `src/app/api/`. Todas requieren session NextAuth excepto donde se indica.

## Auth

### POST /api/auth/register
Registro con email/password.
- **Auth**: No requerida
- **Schema Zod**: `{ email: string().email().max(255), password: string().min(8).max(128), token: string().min(1), name?: string().max(50) }`
- **Validaciones**: reCAPTCHA v3 (score >= 0.5), email único
- **Respuesta**: `201 { message, user: { id, email, alias, bsy_id } }` | `400/409/500`

### [...nextauth]
Manejado por NextAuth. Providers: Google, Credentials.
- `GET/POST /api/auth/callback/google` — OAuth callback
- `GET /api/auth/providers` — Lista providers
- `GET /api/auth/session` — Sesión actual
- `POST /api/auth/signin/credentials` — Login email/password
- `POST /api/auth/signout` — Logout

## Posts

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
- **Auth**: `WEBHOOK_SECRET` en body
- **Body**: `{ record: { user_id, type, title, body, data }, secret: string }`
- **Respuesta**: `200 { success }` | `401/500`

## Image Generation

### POST /api/generate-image
Genera imagen/PDF de un whisper.
- **Auth**: Requerida
- **Body**: `{ type: 'bubble'|'sticker'|'story', nombre, mensaje, fecha, franja, objectives?, display_name?, display_id? }`
- **Lógica**: Puppeteer renderiza HTML template → screenshot → base64
- **Respuesta**: `200 { image: base64string }` | `400/401/500`
