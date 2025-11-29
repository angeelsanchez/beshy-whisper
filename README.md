# BESHY Whisper

Una aplicación de journaling diario con modo día/noche automático.

## Características

- **Autenticación**: Google Sign-In y email/password
- **Modo Invitado**: Permite publicar un susurro sin registro
- **Journaling**: Prompts rotativos según franja horaria (día/noche)
- **Exportación**: Exporta tus susurros como imagen para compartir
- **Límite de publicaciones**: 1 post diurno y 1 post nocturno por día
- **Diseño responsivo**: Mobile first con modo día/noche automático

## Tecnologías

- Next.js
- TypeScript
- Tailwind CSS
- NextAuth.js
- Supabase
- html2canvas

## Requisitos

- Node.js 18.x o superior
- NPM 8.x o superior
- Cuenta de Supabase
- Credenciales OAuth de Google

## Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/beshy-whisper.git
cd beshy-whisper
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=tu_secreto_seguro
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_supabase
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
RECAPTCHA_SITE_KEY=tu_recaptcha_site_key
RECAPTCHA_SECRET_KEY=tu_recaptcha_secret_key
```

4. Configura la base de datos en Supabase:

   a. Crea un nuevo proyecto en [Supabase](https://supabase.com/)
   
   b. Obtén las credenciales de conexión desde la sección "Project Settings" > "API"
   
   c. Ejecuta el script SQL de inicialización incluido en el proyecto:
      - Ve al "SQL Editor" en el panel de Supabase
      - Copia y pega el contenido del archivo `init-db.sql`
      - Ejecuta el script

   El script creará las siguientes tablas:

   **users**
   - id (uuid, primary key)
   - email (text, unique)
   - password_hash (text, nullable)
   - alias (text, unique) - Formato BSYXXX
   - reset_token (text, nullable)
   - reset_token_expires (timestamp, nullable)

   **entries**
   - id (uuid, primary key)
   - user_id (uuid, foreign key to users.id, nullable)
   - nombre (text)
   - mensaje (text)
   - fecha (timestamp)
   - ip (text)
   - franja (text) - 'DIA' o 'NOCHE'
   - guest (boolean)

5. Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en http://localhost:4000

## Solución de problemas

### Error "Error loading entries"

Este error puede ocurrir por varias razones:

1. **Variables de entorno incorrectas**: Verifica que las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctamente configuradas en tu archivo `.env.local`.

2. **Tablas no creadas**: Asegúrate de haber ejecutado el script `init-db.sql` en tu base de datos Supabase.

3. **Problemas de conexión**: Verifica tu conexión a internet y que el proyecto de Supabase esté activo.

4. **Políticas de seguridad**: Asegúrate de que las políticas de seguridad (RLS) permitan el acceso a las tablas.

### Error "supabaseKey is required"

Este error ocurre cuando la clave anónima de Supabase no está configurada correctamente. Verifica que:

1. La variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté correctamente configurada en tu archivo `.env.local`.
2. No haya espacios adicionales o caracteres especiales en la clave.
3. El servidor se haya reiniciado después de actualizar las variables de entorno.

## Database Migrations

If you encounter authentication issues with Google OAuth, you may need to run the following SQL migration in your Supabase SQL Editor:

```sql
-- Add provider ID columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create an index for faster lookups by provider ID
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);

-- Migration comment
COMMENT ON TABLE public.users IS 'User accounts with support for OAuth providers';
```

After running this migration, you can update the NextAuth configuration to use these columns.

## Funcionalidad de "Me gusta"

La aplicación ahora incluye una funcionalidad de "Me gusta" para los susurros (whispers):

### Características principales:

- **Solo usuarios registrados** pueden dar "me gusta" a los susurros.
- Un usuario solo puede dar un "me gusta" por susurro (se evitan duplicados).
- Conteo de "me gusta" junto a cada susurro:
  - Formato XXX (de 0 a 999)
  - Formato XXX,XXmil (de 1,000 a 999,999)
  - Formato XXX,XM (a partir de 1,000,000)
- Perfil de usuario muestra:
  - Conteo de "me gusta" en cada susurro del usuario
  - Total de "me gusta" recibidos entre todos los susurros

### Implementación técnica:

- Tabla `likes` en Supabase con campos `user_id`, `entry_id`, y `created_at`.
- Restricción UNIQUE en (`user_id`, `entry_id`) para evitar duplicados.
- Políticas de seguridad para garantizar que solo usuarios autenticados puedan dar "me gusta".
- Formateo de conteos según los rangos especificados.

### Uso:

- Haz clic en el icono de corazón para dar/quitar un "me gusta" a un susurro.
- Visita el perfil de un usuario para ver el total de "me gusta" recibidos.

## Despliegue

Para desplegar en producción:

```bash
npm run build
npm start
```

## Licencia

MIT
