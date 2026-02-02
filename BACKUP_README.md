# 🗄️ Sistema de Backup para Supabase

Sistema de backup y restauración para bases de datos Supabase con múltiples opciones según tu entorno.

## ✨ Opciones de Backup Disponibles

### 🔧 Backup Simple (Recomendado para desarrollo)
- **Método**: API de Supabase
- **Contenido**: Datos de tablas principales
- **Formato**: JSON comprimido
- **Ventajas**: No requiere PostgreSQL client tools, funciona en cualquier entorno

### 🗃️ Backup Completo con pg_dump (Recomendado para producción)
- **Método**: PostgreSQL pg_dump
- **Contenido**: Schemas completos, políticas RLS, funciones, triggers, datos
- **Formato**: PostgreSQL custom format
- **Ventajas**: Restauración completa idéntica, incluye toda la estructura de BD

## 🖥️ Compatibilidad por Sistema Operativo

### Linux/macOS (Recomendado)
- ✅ Backup Simple: Funciona perfectamente
- ✅ Backup Completo: Instalación sencilla de postgresql-client
- ✅ Restauración completa: Sin problemas

### Windows  
- ✅ Backup Simple: Funciona perfectamente
- ⚠️ Backup Completo: Requiere instalación de PostgreSQL for Windows
- ⚠️ Configuración adicional: PATH y permisos

## 📋 Requisitos Previos

### 1. PostgreSQL Client Tools

**Windows:**
```bash
# Usando Chocolatey
choco install postgresql

# O descargar desde: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Usando Homebrew
brew install postgresql

# O usando MacPorts
sudo port install postgresql15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install postgresql
```

### 2. Node.js
- Node.js 16.0.0 o superior
- pnpm

## ⚙️ Instalación

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales reales:

```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# Configuración de Backup (OPCIONAL)
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESS=true
LOG_LEVEL=info
LOG_FILE=./logs/backup.log

# PostgreSQL (OPCIONAL - se extrae de SUPABASE_URL si no se proporciona)
PGPASSWORD=tu-password-de-base-de-datos
```

### 3. Crear Directorios

```bash
mkdir -p backups logs
```

## 🚀 Uso

### Backup Simple (Sin PostgreSQL)

```bash
# Backup usando API de Supabase (recomendado para desarrollo)
ppnpm run backup:simple
```

### Backup Completo con PostgreSQL (Linux/macOS)

```bash
# Instalar PostgreSQL client en Linux
sudo apt-get install postgresql-client

# Instalar PostgreSQL client en macOS
brew install postgresql

# Crear backup completo
ppnpm run backup:full

# O usando pg_dump directamente
ppnpm run backup:pg
```

### Restauración

```bash
# Listar backups disponibles  
pnpm run restore -- --list-backups

# Restaurar backup simple (JSON)
pnpm run restore -- --file ./backups/supabase_simple_backup_*.json.gz

# Restaurar backup completo (PostgreSQL) - Solo en Linux/macOS
pnpm run restore -- --file ./backups/supabase_complete_backup_*.backup
```

## 📁 Estructura de Archivos

```
proyecto/
├── scripts/
│   ├── backup.js          # Script principal de backup
│   └── restore.js         # Script de restauración
├── backups/               # Directorio de backups
│   ├── supabase_full_backup_20240130_143022.sql.gz
│   └── supabase_incremental_backup_20240130_150015.sql.gz
├── logs/                  # Directorio de logs
│   └── backup.log         # Log de operaciones
├── .env.local            # Variables de entorno (NO SUBIR A GIT)
├── .env.local.example    # Plantilla de variables de entorno
└── BACKUP_README.md      # Esta documentación
```

## 🔧 Configuración Avanzada

### Variables de Entorno Detalladas

| Variable | Descripción | Valor por Defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | - | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key de Supabase | - | ✅ |
| `BACKUP_DIR` | Directorio donde guardar backups | `./backups` | ❌ |
| `BACKUP_RETENTION_DAYS` | Días para mantener backups antiguos | `30` | ❌ |
| `BACKUP_COMPRESS` | Comprimir backups con gzip | `true` | ❌ |
| `LOG_LEVEL` | Nivel de logging (info, warn, error) | `info` | ❌ |
| `LOG_FILE` | Archivo de log | `./logs/backup.log` | ❌ |
| `PGPASSWORD` | Password de PostgreSQL | Extraído de SUPABASE_URL | ❌ |
| `DATABASE_URL` | URL completa de conexión a PostgreSQL | Construida automáticamente | ❌ |

### Configuración de pg_dump

El sistema incluye automáticamente:

- **Schemas**: `public`, `auth`, `storage`, `extensions`
- **Seguridad**: Policies RLS, security labels
- **Objetos**: Funciones, triggers, sequences
- **Opciones**: `--clean`, `--if-exists`, `--disable-triggers`
- **Formato**: Custom format para mejor compresión y velocidad

### Formatos de Backup

Los archivos de backup siguen este patrón de nomenclatura:

```
supabase_{tipo}_backup_{YYYYMMDD_HHMMSS}.sql[.gz]
```

Ejemplos:
- `supabase_full_backup_20240130_143022.sql.gz`
- `supabase_incremental_backup_20240130_150015.sql.gz`

## 🤖 Automatización

### Cron Jobs (Linux/macOS)

```bash
# Editar crontab
crontab -e

# Backup diario a las 2:00 AM
0 2 * * * cd /ruta/a/tu/proyecto && pnpm run backup >> /var/log/supabase-backup.log 2>&1

# Backup incremental cada 6 horas
0 */6 * * * cd /ruta/a/tu/proyecto && pnpm run backup:incremental >> /var/log/supabase-backup.log 2>&1
```

### Task Scheduler (Windows)

1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Configurar trigger (diario, semanal, etc.)
4. Acción: Iniciar programa
   - Programa: `node`
   - Argumentos: `scripts/backup.js`
   - Iniciar en: `C:\ruta\a\tu\proyecto`

### GitHub Actions

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2:00 AM UTC
  workflow_dispatch:     # Permite ejecución manual

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install PostgreSQL client
      run: |
        sudo apt-get update
        sudo apt-get install -y postgresql-client
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Create backup
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        PGPASSWORD: ${{ secrets.DB_PASSWORD }}
      run: pnpm run backup
      
    - name: Upload backup to storage
      # Aquí puedes agregar steps para subir a S3, Google Cloud, etc.
```

## 🚨 Troubleshooting

### Errores Comunes

#### 1. "pg_dump is not installed"

**Solución:**
```bash
# Verificar instalación
pg_dump --version

# Si no está instalado, instalar PostgreSQL client tools
# Ver sección "Requisitos Previos"
```

#### 2. "Cannot connect to database"

**Solución:**
- Verificar que `NEXT_PUBLIC_SUPABASE_URL` sea correcta
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` sea válida
- Verificar conectividad de red
- Revisar configuración de firewall

#### 3. "Database password not found"

**Solución:**
```bash
# Opción 1: Configurar PGPASSWORD
export PGPASSWORD="tu-password"

# Opción 2: Configurar DATABASE_URL completa
export DATABASE_URL="postgresql://postgres:password@db.proyecto.supabase.co:5432/postgres"
```

#### 4. "Permission denied"

**Solución:**
```bash
# Dar permisos de ejecución a los scripts
chmod +x scripts/backup.js
chmod +x scripts/restore.js

# Verificar permisos en directorios
chmod 755 backups logs
```

#### 5. "Backup validation failed"

**Solución:**
- Verificar espacio disponible en disco
- Revisar logs para detalles específicos
- Verificar conectividad durante el backup
- Intentar backup sin compresión para debug

### Logs y Debugging

#### Habilitar Logging Detallado

```bash
# Debug completo
LOG_LEVEL=debug node scripts/backup.js

# Solo errores
LOG_LEVEL=error node scripts/backup.js
```

#### Ubicación de Logs

Los logs se guardan en:
- Archivo: `./logs/backup.log` (configurable)
- Consola: Output colorizado en tiempo real

#### Formato de Logs

```json
{
  "timestamp": "2024-01-30T14:30:22.123Z",
  "level": "INFO",
  "message": "Backup completed successfully",
  "data": {
    "filename": "supabase_full_backup_20240130_143022.sql.gz",
    "size": 1048576,
    "sizeMB": "1.00 MB",
    "type": "full"
  }
}
```

## ⚡ Optimización y Rendimiento

### Backups Grandes

Para bases de datos grandes (>1GB):

```bash
# Aumentar buffer de pg_dump
export PGDUMP_BUFFER_SIZE=64MB

# Usar compresión máxima
BACKUP_COMPRESS=true node scripts/backup.js

# Backup por schemas específicos
node scripts/backup.js --schema=public --schema=auth
```

### Backup Incremental Avanzado

El sistema incluye backup incremental básico. Para implementaciones más avanzadas:

1. **WAL-E/WAL-G**: Para backups continuos
2. **Point-in-time Recovery**: Usando Supabase PITR
3. **Replica Streaming**: Para backups en tiempo real

### Monitoreo

```bash
# Verificar espacio usado por backups
du -sh backups/

# Contar archivos de backup
ls -1 backups/ | wc -l

# Verificar último backup
ls -lt backups/ | head -n 2
```

## 🔒 Seguridad

### Mejores Prácticas

1. **Nunca subir `.env.local` a control de versiones**
2. **Usar Service Role Key**, no la Anon Key
3. **Rotar keys regularmente**
4. **Cifrar backups en reposo** (para producción)
5. **Usar conexiones SSL** (habilitado por defecto en Supabase)

### Cifrado de Backups

Para cifrar backups (recomendado para producción):

```bash
# Cifrar backup después de crearlo
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Descifrar para restaurar
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

## 📊 Monitoreo y Alertas

### Healthchecks

```bash
# Script de verificación
#!/bin/bash
LATEST_BACKUP=$(ls -t backups/ | head -n1)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "backups/$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 25 ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE hours old"
    # Enviar alerta (email, Slack, etc.)
fi
```

### Integración con Servicios de Monitoreo

- **Healthchecks.io**: Para verificar ejecución de backups
- **DataDog**: Para métricas y alertas
- **PagerDuty**: Para alertas críticas
- **Slack/Discord**: Para notificaciones

## 🆘 Soporte

### Información del Sistema

```bash
# Versión de PostgreSQL client
pg_dump --version

# Versión de Node.js
node --version

# Información del sistema
uname -a

# Espacio disponible
df -h
```

### Reportar Issues

1. Incluir logs completos
2. Versiones de software
3. Configuración (sin credenciales)
4. Pasos para reproducir

## 📝 Changelog

### v1.0.0
- ✅ Backup completo con pg_dump
- ✅ Backup incremental básico
- ✅ Compresión gzip
- ✅ Validación de backups
- ✅ Restauración con validación
- ✅ Limpieza automática de backups antiguos
- ✅ Logging detallado
- ✅ CLI completa
- ✅ Documentación completa

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles.

---

**⚠️ Importante**: Este sistema está diseñado para Supabase pero puede adaptarse a cualquier base de datos PostgreSQL. Siempre prueba en un entorno de desarrollo antes de usar en producción.