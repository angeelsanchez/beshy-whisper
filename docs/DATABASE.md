# Schema de Base de Datos

Supabase PostgreSQL con RLS habilitado. Todas las operaciones server-side usan `supabaseAdmin` (service_role, bypasses RLS).

## Tablas

### users
Cuentas de usuario con soporte OAuth.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `email` | text | NO | — | UNIQUE |
| `password_hash` | text | SÍ | — | bcrypt ($2b$) o legacy SHA256 |
| `alias` | text | NO | — | UNIQUE, igual a bsy_id |
| `bsy_id` | text | SÍ | — | UNIQUE, formato BSYXXX (permanente) |
| `name` | text | SÍ | — | Display name (max 50 chars, editable cada 14 días) |
| `profile_photo_url` | text | SÍ | `NULL` | URL de foto en Supabase Storage (bucket `avatars`) |
| `bio` | text | SÍ | `NULL` | Mini bio, CHECK `char_length(bio) <= 160` |
| `google_id` | text | SÍ | — | Google OAuth provider ID |
| `provider` | text | SÍ | — | 'google' o 'credentials' |
| `provider_id` | text | SÍ | — | ID del provider OAuth |
| `reset_token` | text | SÍ | — | Token de reset password |
| `reset_token_expires` | timestamp | SÍ | — | Expiración del reset token |
| `needs_name_input` | boolean | SÍ | `false` | Flag para mostrar modal de nombre |
| `needsnameinput` | boolean | SÍ | `true` | Legacy (duplicado, mantener por retrocompat) |
| `current_streak` | integer | SÍ | `0` | Racha actual de días consecutivos |
| `longest_streak` | integer | SÍ | `0` | Racha más larga histórica |
| `last_posted_at` | timestamptz | SÍ | — | Último post del usuario |
| `followers_count` | integer | SÍ | `0` | Contador de seguidores (trigger automático) |
| `following_count` | integer | SÍ | `0` | Contador de seguidos (trigger automático) |
| `last_name_update` | timestamptz | SÍ | `now()` | Para cooldown de 14 días |

### entries
Posts/whispers de los usuarios.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | SÍ | — | FK → users.id |
| `nombre` | text | SÍ | — | Nombre mostrado al publicar |
| `mensaje` | text | NO | — | Contenido del whisper |
| `fecha` | timestamptz | SÍ | `now()` | Fecha de publicación |
| `ip` | text | SÍ | — | IP del autor |
| `franja` | text | SÍ | — | CHECK: 'DIA' o 'NOCHE' |
| `guest` | boolean | SÍ | `false` | Post de invitado |
| `edited` | boolean | SÍ | `false` | Si fue editado |
| `is_private` | boolean | SÍ | `false` | Post privado (solo visible al autor) |

### likes

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → users.id |
| `entry_id` | uuid | NO | — | FK → entries.id |
| `created_at` | timestamptz | SÍ | `now()` | |

### objectives
Objetivos diarios vinculados a un entry de franja DÍA.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → users.id |
| `entry_id` | uuid | NO | — | FK → entries.id |
| `text` | text | NO | — | Texto del objetivo |
| `done` | boolean | SÍ | `false` | Completado |
| `created_at` | timestamptz | SÍ | `now()` | |
| `updated_at` | timestamptz | SÍ | `now()` | |

### follows
Relaciones de seguimiento entre usuarios. RLS habilitado. Triggers automáticos actualizan `followers_count`/`following_count` en `users`.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `follower_id` | uuid | NO | — | FK → users.id, PK compuesta |
| `following_id` | uuid | NO | — | FK → users.id, PK compuesta |
| `created_at` | timestamptz | SÍ | `now()` | |

### habits
Sistema de seguimiento de hábitos personales.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → users.id (CASCADE) |
| `name` | text | NO | — | CHECK `char_length BETWEEN 1 AND 100` |
| `description` | text | SÍ | `NULL` | CHECK `char_length <= 500` |
| `frequency` | text | NO | `'daily'` | CHECK: 'daily' o 'weekly' |
| `target_days_per_week` | integer | NO | `7` | CHECK `BETWEEN 1 AND 7` |
| `color` | text | NO | `'#4A2E1B'` | CHECK regex hex `^#[0-9a-fA-F]{6}$` |
| `is_active` | boolean | NO | `true` | Hábito activo/archivado |
| `sort_order` | integer | NO | `0` | Orden de visualización |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | Trigger automático |

### habit_logs
Registros de completado de hábitos (un log por hábito por día).

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `habit_id` | uuid | NO | — | FK → habits.id (CASCADE) |
| `user_id` | uuid | NO | — | FK → users.id (CASCADE) |
| `completed_at` | date | NO | `CURRENT_DATE` | UNIQUE con habit_id |
| `created_at` | timestamptz | NO | `now()` | |

### login_attempts
Registro de intentos de login para protección anti-brute-force. Limpieza automática >24h.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `ip_address` | text | NO | — | IP del intento |
| `email` | text | NO | — | Email intentado |
| `attempted_at` | timestamptz | NO | `now()` | |
| `success` | boolean | NO | `false` | Si el login fue exitoso |

### push_tokens
Tokens de push notification por usuario.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → users.id, UNIQUE |
| `endpoint` | text | SÍ | — | Push subscription endpoint |
| `p256dh` | text | SÍ | — | Push subscription key |
| `auth` | text | SÍ | — | Push subscription auth |
| `user_agent` | text | SÍ | — | Browser user agent |
| `created_at` | timestamptz | SÍ | `now()` | |
| `updated_at` | timestamptz | SÍ | `now()` | |

### notifications
Registro de notificaciones enviadas.

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → users.id |
| `type` | text | NO | — | Tipo de notificación |
| `title` | text | NO | — | Título |
| `body` | text | NO | — | Cuerpo |
| `data` | jsonb | SÍ | — | Datos adicionales |
| `read_at` | timestamptz | SÍ | — | Fecha de lectura |
| `sent_at` | timestamptz | SÍ | `now()` | |
| `created_at` | timestamptz | SÍ | `now()` | |

### quotes
Citas motivacionales (sin RLS, datos públicos).

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `text` | text | NO | — | Texto de la cita |
| `author` | text | SÍ | — | Autor |
| `theme` | text | SÍ | — | CHECK: 'DIA' o 'NOCHE' |
| `created_at` | timestamptz | SÍ | `now()` | |

## Supabase Storage

### Bucket `avatars`
Fotos de perfil de usuarios. Compresión client-side a 200x200 WebP (~10-15KB).

| Config | Valor |
|--------|-------|
| Público | Sí |
| Tamaño máx | 512KB |
| MIME types | `image/webp`, `image/jpeg`, `image/png` |
| Naming | `{userId}.webp` (un archivo por usuario, upsert) |
| Cache bust | `?v={timestamp}` en la URL |
| Free tier | 1GB storage, 2GB bandwidth/mes |

## RLS Policies

Todas las policies son permisivas (USING true / WITH CHECK true) porque la protección real está en los API routes server-side. `auth.uid()` siempre es NULL (usamos NextAuth, no Supabase Auth).

Excepción: `entries_select_public` filtra `is_private = false OR is_private IS NULL` para que el client-side no vea posts privados de otros.

### Tablas con RLS
`users`, `entries`, `likes`, `objectives`, `notifications`, `push_tokens`, `follows`, `habits`, `habit_logs`, `login_attempts`

### Tablas sin RLS
`quotes` — datos públicos de solo lectura

## Funciones RPC

Usadas desde API routes via `supabaseAdmin.rpc()`:
- `can_update_name(user_id)` — Verifica cooldown de 14 días para cambio de nombre
- `add_like(user_id, entry_id)` — Añade like (usado en alternativa directa)
- `check_like_status(user_id, entry_id)` — Comprueba si existe like
- `get_likes_count(entry_id)` — Cuenta likes de un entry
- `cleanup_old_login_attempts()` — Elimina login_attempts >24h

## Triggers

- `trigger_habit_updated_at` — Actualiza `habits.updated_at` en cada UPDATE
- `update_followers_count` / `update_following_count` — Mantienen contadores de follows en `users` sincronizados en INSERT/DELETE

## Migraciones

Directorio: `supabase/migrations/`

Migraciones recientes:
- `20250804000011_reenable_rls_with_service_role.sql` — Clean slate RLS + policies permisivas
- `20260131000001_follows_rls_and_triggers.sql` — RLS + triggers de contadores para follows
- `20260131000002_habits_system.sql` — Tablas habits + habit_logs con RLS e índices
- `20260131000003_add_target_days.sql` — Campo target_days_per_week en habits
- `20260131000004_login_attempts.sql` — Tabla login_attempts + función de limpieza
- Profile photo + bio columns: aplicado via Supabase MCP (no hay archivo de migración local)
