# BESHY Whisper

Plataforma social de journaling diario anonimo construida como Progressive Web App (PWA). Los usuarios escriben "whispers" (susurros) en dos franjas horarias — dia y noche — conectan con una comunidad, trackean habitos personales, participan en iniciativas colectivas y reciben notificaciones push en tiempo real.

Desplegada en produccion: **https://whisper.beshy.es**

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.9 (strict mode) |
| UI | React 18 + Tailwind CSS 3 |
| Autenticacion | NextAuth v4 (JWT, Google OAuth + Credentials) |
| Base de datos | Supabase (PostgreSQL + Realtime + RLS + Storage) |
| Validacion | Zod |
| Push Notifications | web-push (VAPID) + Service Worker |
| Generacion de imagenes | Puppeteer (server-side HTML → screenshot) |
| Exportacion PDF | Puppeteer (server-side) |
| Compresion de imagenes | browser-image-compression (client-side avatar → WebP) |
| reCAPTCHA | Google reCAPTCHA v3 |
| Error tracking | Sentry (client + server) |
| Analytics | Google Analytics 4 |
| Analisis estatico | SonarQube |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Husky + lint-staged |
| Contenedores | Podman + podman-compose |
| Cache | Redis 7 (rate limiting, contadores, streaks) |

## Funcionalidades Principales

### Journaling (nucleo de la aplicacion)

- **Sistema de franjas horarias**: dos publicaciones diarias — DIA (06:00–17:59) y NOCHE (18:00–05:59)
- **Mood tracking**: 8 estados de animo seleccionables por whisper (feliz, tranquilo, agradecido, energetico, triste, ansioso, cansado, frustrado)
- **Objetivos diarios**: hasta 10 objetivos por whisper diurno, con tracking de completado
- **Writing prompts**: sugerencias rotativas para inspirar la escritura
- **Cita diaria**: frase motivacional en la pantalla de creacion
- **Visibilidad configurable**: whispers publicos o privados
- **Edicion y eliminacion**: los usuarios pueden modificar o borrar sus propios whispers
- **Modo invitado**: permite escribir un whisper sin registro (con reCAPTCHA)

### Social

- **Feed en tiempo real**: actualizaciones instantaneas via Supabase Realtime (WebSocket) para nuevos whispers y likes
- **Sistema de likes**: like/unlike con conteo en tiempo real y notificacion push al autor
- **Reposts**: compartir whispers de otros usuarios en tu perfil, con referencia al autor original
- **Sistema de follows**: seguir/dejar de seguir usuarios, con contadores y listas de followers/following
- **Mensajes directos (DMs)**: chat 1-a-1 entre usuarios con lectura en tiempo real, bandeja de entrada con conteo de no leidos
- **Busqueda de usuarios**: por nombre, alias o BSY ID
- **Perfiles personalizables**: avatar (comprimido a WebP), bio (160 caracteres), nombre editable

### Habitos

- **Tres tipos de tracking**: binario (si/no), cantidad (numerico con meta) y temporizador (minutos)
- **Wizard de creacion guiado**: nombre, icono, frecuencia (dias especificos o semanal), meta, color, categoria
- **Calendario de completado**: heatmap visual mensual con porcentaje de consistencia
- **Sistema de niveles**: progresion gamificada con avance de nivel
- **Rachas (streaks)**: racha actual y maxima por habito
- **FloatingTimer**: temporizador flotante persistente para habitos de tipo timer, con navegacion al habito de origen
- **Habit Links (parejas de accountability)**: enlazar tu habito con el de otro usuario para motivacion mutua
- **Pestaña Community**: descubrir habitos publicos de otros usuarios y enviar solicitudes de enlace
- **Estadisticas detalladas**: graficos de evolucion, retomas, completado semanal/mensual

### Iniciativas Comunitarias

- **Retos colectivos** con fecha de inicio/fin, limite de participantes y recordatorio
- **Tres tipos de tracking**: binario, cantidad y timer (igual que habitos)
- **Check-in diario**: registro individual con progreso acumulado
- **Racha comunitaria**: contador de dias consecutivos con participacion del grupo
- **Chat integrado**: mensajeria en tiempo real entre participantes de la iniciativa
- **Grid semanal**: visualizacion de progreso individual por dias de la semana
- **Notificaciones**: recordatorios diarios y alertas de hitos

### Manifestaciones

- **Afirmaciones personales**: crear frases de manifestacion (max 200 caracteres)
- **Reafirmacion diaria**: seleccionar manifestaciones activas al escribir un whisper
- **Fulfillment**: marcar como cumplida con modal de celebracion
- **Vinculacion con whispers**: las manifestaciones reafirmadas se asocian al whisper del dia

### Challenges (Retos de Plataforma)

- **Retos tematicos** con titulo, descripcion, fechas y tema
- **Banner activo**: se muestra en el feed cuando hay un reto en curso
- **Participacion**: los usuarios vinculan sus whispers al reto activo

### Notificaciones Push

- **Web Push con VAPID**: notificaciones nativas via Service Worker
- **Tipos**: likes, reposts, follows, DMs, recordatorios de habitos, check-ins de iniciativas, retos
- **Panel de preferencias**: control granular por tipo de notificacion desde el perfil
- **Cron jobs**: recordatorios programados para escritura diaria y habitos
- **Almacenamiento sparse**: JSONB en la tabla `users` (solo valores `false`; `null` = todo habilitado)

### PWA y Experiencia Movil

- **Instalable**: manifest completo con iconos, shortcuts (crear whisper, ver feed) y modo standalone
- **Service Worker**: push notifications, deep linking desde notificaciones
- **Tema adaptativo**: cambio automatico dia/noche segun hora del dispositivo
- **Splash screen**: pantalla de carga con logo animado
- **Pull-to-refresh**: gesto nativo para refrescar el feed
- **Safe area**: compatibilidad con notch/Dynamic Island de iOS
- **Responsive**: diseño mobile-first con breakpoints para tablet y desktop

### Exportacion

- **Imagen compartible**: genera una imagen del whisper con Puppeteer (templates dia/noche con mood)
- **PDF**: exporta whispers de un rango de fechas como documento PDF

### Panel de Administracion

- **Gestion de whispers**: visualizar todos los posts, filtrar por usuario/invitado, eliminar contenido
- **Gestion de retos**: crear, activar/desactivar y editar challenges
- **Gestion de iniciativas**: crear iniciativas, configurar tracking, establecer limites

### Landing Page

- **SEO optimizada**: meta tags, Open Graph, Twitter Cards, structured data (JSON-LD), sitemap, robots.txt
- **Secciones**: hero, beneficios, features, pasos, demo interactiva, estadisticas en vivo, FAQ, CTA, footer
- **Auto-redirect**: usuarios autenticados redirigidos al feed

## Estructura del Proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Rutas autenticadas (con navegacion)
│   │   ├── admin/                # Panel de administracion
│   │   ├── create/               # Crear whisper (dia/noche)
│   │   ├── feed/                 # Feed principal con filtros
│   │   ├── habits/               # Habitos: lista, nuevo, editar
│   │   ├── initiatives/[id]/     # Detalle de iniciativa
│   │   ├── messages/             # Bandeja de mensajes directos
│   │   ├── profile/              # Perfil (propio y ajeno)
│   │   └── search/               # Busqueda de usuarios
│   ├── (landing)/                # Landing page publica
│   ├── api/                      # 68 Route Handlers (REST API)
│   │   ├── auth/                 #   NextAuth, registro, lockout
│   │   ├── challenges/           #   CRUD challenges + participacion
│   │   ├── feed/                 #   Feed paginado
│   │   ├── follows/              #   Follow/unfollow + listas
│   │   ├── generate-image/       #   Whisper → imagen (Puppeteer)
│   │   ├── generate-pdf/         #   Whispers → PDF
│   │   ├── habits/               #   CRUD, logs, stats, niveles, links
│   │   ├── initiatives/          #   CRUD, join, checkin, chat, stats
│   │   ├── likes/                #   Like/unlike + estado
│   │   ├── manifestations/       #   CRUD, reafirmacion, fulfillment
│   │   ├── messages/             #   Conversaciones + envio
│   │   ├── notifications/        #   Push, tokens, cron, preferencias
│   │   ├── objectives/           #   CRUD + batch
│   │   ├── posts/                #   Crear, editar, eliminar whispers
│   │   ├── reposts/              #   Repost/unrepost + estado
│   │   ├── user/                 #   Perfil, foto, bio, streak, prefs
│   │   ├── users/                #   Busqueda
│   │   └── webhooks/             #   Webhook de likes
│   ├── guest/                    # Modo invitado
│   ├── login/                    # Pantalla de login
│   ├── layout.tsx                # Root layout (PWA, fonts, splash)
│   └── providers.tsx             # ThemeProvider > SessionProvider > PostProvider
├── components/                   # 75+ componentes React (client-side)
│   ├── landing/                  #   Componentes de landing page
│   └── charts/                   #   Graficos (Recharts)
├── context/                      # React Context
│   ├── PostContext.tsx            #   Entries + Realtime (Supabase channels)
│   └── ThemeContext.tsx           #   Tema dia/noche automatico
├── data/                         # Datos estaticos
│   ├── quotes.ts                 #   Citas diarias
│   └── writing-prompts.ts        #   Prompts de escritura
├── hooks/                        # 28 custom hooks
├── lib/                          # Clientes y logica compartida
│   ├── supabase.ts               #   Cliente anon (client-side, RLS activo)
│   ├── supabase-admin.ts         #   Cliente service_role (server-side)
│   ├── redis.ts                  #   Cliente Redis con fallback a memoria
│   ├── cache/                    #   Cache distribuido
│   │   ├── counters.ts           #     Cache de likes (TTL 5min)
│   │   └── streaks.ts            #     Cache de streaks (TTL 10min)
│   ├── logger.ts                 #   Logger estructurado + Sentry
│   ├── push-notify.ts            #   VAPID centralizado + helpers
│   ├── icon-map.ts               #   Mapeo de iconos (mood, categoria, habito)
│   └── schemas/                  #   Zod schemas compartidos
├── types/                        # Declaraciones TypeScript
├── utils/                        # Funciones puras (formato, crypto, fechas, HTML escape)
└── middleware.ts                  # Rate limiting por IP en /api/*
```

**Metricas del codigo**: ~315 archivos TypeScript, ~45.000 lineas de codigo, 68 API routes, 48 archivos de test.

## Instalacion y Ejecucion

### Requisitos previos

- Node.js 18.x o superior
- pnpm 10.x o superior
- Cuenta de [Supabase](https://supabase.com/) (PostgreSQL + Realtime + Storage)
- Credenciales OAuth de Google (Google Cloud Console)
- Claves reCAPTCHA v3 (Google reCAPTCHA Admin)

### 1. Clonar el repositorio

```bash
git clone https://github.com/angeelsanchez/beshy-whisper.git
cd beshy-whisper
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role

# NextAuth
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=secreto_minimo_32_bytes_hex

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_site_key
RECAPTCHA_SECRET_KEY=tu_secret_key

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
VAPID_EMAIL=mailto:tu@email.com
```

### 4. Configurar la base de datos

En el SQL Editor de Supabase, ejecuta las migraciones del directorio `supabase/migrations/` en orden. Esto creara las 30 tablas necesarias con sus politicas RLS, indices y funciones.

### 5. Iniciar el servidor de desarrollo

```bash
pnpm run dev
```

La aplicacion estara disponible en **http://localhost:4000**.

### Scripts disponibles

| Script | Descripcion |
|--------|------------|
| `pnpm dev` | Servidor de desarrollo (puerto 4000) |
| `pnpm build` | Build de produccion |
| `pnpm start` | Servidor de produccion (puerto 4000) |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm test` | Ejecutar tests (modo watch) |
| `pnpm run test:run` | Ejecutar tests (una vez) |
| `pnpm run test:coverage` | Tests con reporte de cobertura |

## Base de Datos

30 tablas en PostgreSQL (Supabase) con Row Level Security:

| Tabla | Descripcion |
|-------|------------|
| `users` | Cuentas de usuario (email, alias, BSY ID, perfil, preferencias) |
| `entries` | Whispers con franja horaria, mood y visibilidad |
| `likes` | Relaciones like usuario-whisper |
| `objectives` | Objetivos diarios vinculados a whispers |
| `follows` | Relaciones follow entre usuarios |
| `reposts` | Whispers compartidos por otros usuarios |
| `habits` | Habitos personales (tipo, frecuencia, meta, categoria) |
| `habit_logs` | Registros diarios de completado de habitos |
| `habit_levels` | Niveles de progresion por habito |
| `habit_links` | Parejas de accountability entre usuarios |
| `entry_habit_snapshots` | Snapshot de habitos completados al publicar un whisper |
| `initiatives` | Iniciativas comunitarias con tracking |
| `initiative_participants` | Participantes de cada iniciativa |
| `initiative_logs` | Check-ins diarios en iniciativas |
| `initiative_messages` | Chat grupal por iniciativa |
| `initiative_daily_stats` | Estadisticas diarias agregadas |
| `challenges` | Retos de plataforma con fechas |
| `challenge_entries` | Whispers vinculados a retos |
| `manifestations` | Afirmaciones personales |
| `manifestation_logs` | Registros de reafirmacion diaria |
| `conversations` | Hilos de mensajes directos |
| `direct_messages` | Mensajes individuales en conversaciones |
| `push_tokens` | Tokens de push notification por usuario |
| `notifications` | Historial de notificaciones enviadas |
| `login_attempts` | Intentos de login para control de lockout |
| `quotes` | Citas diarias |
| `book_club_*` | Tablas del sistema de club de lectura (genres, rounds, members, votes, suggestions, messages, reviews) |

## Seguridad

- **Autenticacion**: NextAuth v4 con JWT, Google OAuth 2.0, bcrypt (cost factor 12)
- **Autorizacion**: verificacion de sesion + ownership en toda mutacion (prevencion IDOR)
- **Rate limiting**: middleware por IP en todas las rutas API (Redis en produccion, memoria en desarrollo)
- **Validacion de input**: Zod schemas con `.safeParse()` en cada route handler
- **Proteccion XSS**: HTML escaping para contenido de usuario, CSP configurado
- **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Row Level Security**: RLS habilitado en Supabase para lecturas client-side
- **Secrets**: almacenados exclusivamente en variables de entorno
- **Logging**: logger estructurado con Sentry (sin datos sensibles)
- **Lockout**: bloqueo de cuenta tras intentos fallidos de login

## Despliegue en Produccion (Podman + Redis)

La aplicacion corre en contenedores Podman con Redis para cache distribuido.

### Arquitectura

```
┌─────────────────────────────────────────────────┐
│                 Podman Network                   │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐         ┌─────────────────┐   │
│  │   Redis     │◄───────►│   Next.js App   │   │
│  │  (alpine)   │         │  (standalone)   │   │
│  │  :6380      │         │     :4000       │   │
│  └─────────────┘         └────────┬────────┘   │
│                                   │            │
└───────────────────────────────────┼────────────┘
                                    │
                              ┌─────▼─────┐
                              │  Supabase │
                              │  (cloud)  │
                              └───────────┘
```

### Beneficios de Redis

| Funcionalidad | Antes (memoria) | Despues (Redis) |
|---------------|-----------------|-----------------|
| Rate limiting | Se pierde en restart | Persistente, distribuido |
| Likes count | COUNT(*) cada request (~100-500ms) | Cache 5min (~1ms) |
| Streaks | Recalcula todas las entries | Cache 10min (~1ms) |

### Comandos de Deploy

```bash
cd /path/to/beshy-whisper

# Deploy completo (pull + build + restart)
./scripts/deploy-podman.sh deploy

# Solo build
./scripts/deploy-podman.sh build

# Iniciar contenedores
./scripts/deploy-podman.sh up

# Detener contenedores
./scripts/deploy-podman.sh down

# Reiniciar
./scripts/deploy-podman.sh restart

# Ver estado y health check
./scripts/deploy-podman.sh status

# Ver logs (todos o de un servicio)
./scripts/deploy-podman.sh logs
./scripts/deploy-podman.sh logs app

# Shell en contenedor
./scripts/deploy-podman.sh shell

# Redis CLI
./scripts/deploy-podman.sh redis-cli

# Rollback a PM2 (emergencia)
./scripts/deploy-podman.sh rollback

# Limpiar todo (contenedores, imagenes, volumenes)
./scripts/deploy-podman.sh clean
```

### Health Check

```bash
curl https://whisper.beshy.es/api/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2026-02-09T23:53:32.224Z",
  "uptime": 21.6,
  "memory": { "rss": 202031104, "heapTotal": 125341696 },
  "redis": { "available": true, "latency": 1 }
}
```

### Configuracion Inicial (solo primera vez)

```bash
# 1. Instalar Podman (como root)
sudo ./scripts/setup-podman.sh

# 2. Crear archivo de entorno
cp .env.container.example .env.container
nano .env.container  # Rellenar con valores de produccion

# 3. Build y deploy
./scripts/deploy-podman.sh deploy
```

### Archivos de Contenedores

| Archivo | Descripcion |
|---------|-------------|
| `Dockerfile` | Multi-stage build (deps → builder → runner) con Puppeteer |
| `compose.yaml` | Servicios: app + redis con health checks |
| `.dockerignore` | Exclusiones para optimizar build |
| `.env.container` | Variables de entorno (no commitear) |
| `.env.container.example` | Template de variables |
| `scripts/deploy-podman.sh` | Script de operaciones |
| `scripts/setup-podman.sh` | Instalacion inicial |

### Desarrollo Local

El desarrollo local sigue funcionando igual sin necesidad de contenedores:

```bash
pnpm install
pnpm dev
```

Redis es opcional en desarrollo - el sistema usa fallback a memoria automaticamente.

**URL de produccion**: https://whisper.beshy.es

## Licencia

MIT
