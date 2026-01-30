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
| `followers_count` | integer | SÍ | `0` | Contador de seguidores |
| `following_count` | integer | SÍ | `0` | Contador de seguidos |
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

### follows
Relaciones de seguimiento (sin RLS, feature en desarrollo).

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `follower_id` | uuid | NO | — | FK → users.id, PK compuesta |
| `following_id` | uuid | NO | — | FK → users.id, PK compuesta |
| `created_at` | timestamptz | SÍ | `now()` | |

## RLS Policies

Todas las policies son permisivas (USING true / WITH CHECK true) porque la protección real está en los API routes server-side. `auth.uid()` siempre es NULL (usamos NextAuth, no Supabase Auth).

Excepción: `entries_select_public` filtra `is_private = false OR is_private IS NULL` para que el client-side no vea posts privados de otros.

## Funciones RPC

Usadas desde API routes via `supabaseAdmin.rpc()`:
- `can_update_name(user_id)` — Verifica cooldown de 14 días para cambio de nombre
- `add_like(user_id, entry_id)` — Añade like (usado en alternativa directa)
- `check_like_status(user_id, entry_id)` — Comprueba si existe like
- `get_likes_count(entry_id)` — Cuenta likes de un entry

## Migraciones

Directorio: `supabase/migrations/`

La migración más reciente es `20250804000011_reenable_rls_with_service_role.sql` que:
1. Elimina todas las policies existentes (clean slate)
2. Elimina funciones debug (`test_entry_deletion`, `debug_entry_permissions`)
3. Habilita RLS en las 6 tablas principales
4. Crea policies permisivas para anon key (service_role bypasses automáticamente)
