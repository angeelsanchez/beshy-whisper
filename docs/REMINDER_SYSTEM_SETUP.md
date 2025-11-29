# 🚀 Sistema de Recordatorios de BESHY Whisper

## 📋 **Descripción General**

El sistema de recordatorios de BESHY Whisper envía notificaciones push automáticas para recordar a los usuarios que publiquen sus whispers diarios y nocturnos, además de advertencias sobre rachas.

## ⏰ **Horarios de Recordatorios**

### **🌅 Recordatorio Matutino**
- **Hora**: 10:00 AM
- **Condición**: Solo si no ha publicado el whisper del día
- **Mensaje**: "¡Hora de tu Whisper matutino! No olvides compartir tu whisper del día para mantener tu racha"

### **⚠️ Advertencia de Racha**
- **Hora**: 15:00 - 18:00 (3:00 PM - 6:00 PM)
- **Condición**: Solo si tiene una racha activa y no ha completado ambos posts del día
- **Mensaje**: "¡Cuidado con tu racha! Tienes una racha de X días. ¡Postea ahora para no perderla!"

### **🌙 Recordatorio Nocturno**
- **Hora**: 21:30 (9:30 PM)
- **Condición**: Solo si no ha publicado el whisper de la noche
- **Mensaje**: "¡Hora de tu Whisper nocturno! Completa tu día con tu whisper de la noche"

## 🏗️ **Arquitectura del Sistema**

### **1. API de Recordatorios Programados**
- **Endpoint**: `/api/notifications/schedule-reminders`
- **Función**: Procesa recordatorios para todos los usuarios
- **Uso**: Llamadas manuales o programadas

### **2. API de Cron Jobs**
- **Endpoint**: `/api/notifications/cron-reminders`
- **Función**: Endpoint para servicios de cron externos
- **Seguridad**: Autenticación opcional con `CRON_SECRET`

### **3. APIs de Usuario**
- **Streak**: `/api/user/streak` - Información de rachas
- **Today Posts**: `/api/user/today-posts` - Posts del día actual

### **4. Hook de Frontend**
- **Hook**: `useReminderNotifications`
- **Función**: Gestión de configuraciones y estado de recordatorios

## 🔧 **Configuración del Sistema**

### **Variables de Entorno Requeridas**

```bash
# VAPID Keys para Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_clave_publica_vapid
VAPID_PRIVATE_KEY=tu_clave_privada_vapid
VAPID_EMAIL=mailto:your@email.com

# Seguridad para Cron Jobs (opcional)
CRON_SECRET=tu_secreto_seguro_para_cron
```

### **Configuración de Cron Jobs**

#### **Opción 1: Cron Local (Linux/Mac)**

```bash
# Editar crontab
crontab -e

# Agregar estas líneas para ejecutar cada 15 minutos
*/15 * * * * curl -X GET "https://tudominio.com/api/notifications/cron-reminders" -H "Authorization: Bearer tu_secreto_cron"
```

#### **Opción 2: Cron en Windows (Task Scheduler)**

1. Abrir "Task Scheduler"
2. Crear nueva tarea básica
3. Configurar para ejecutar cada 15 minutos
4. Acción: Iniciar programa
5. Programa: `curl.exe`
6. Argumentos: `-X GET "https://tudominio.com/api/notifications/cron-reminders" -H "Authorization: Bearer tu_secreto_cron"`

#### **Opción 3: Servicios de Cron Online**

**Vercel Cron (Recomendado para Vercel)**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/notifications/cron-reminders",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**GitHub Actions**
```yaml
# .github/workflows/reminders.yml
name: Daily Reminders
on:
  schedule:
    - cron: '*/15 * * * *'

jobs:
  reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminders
        run: |
          curl -X GET "https://tudominio.com/api/notifications/cron-reminders" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Cron-job.org**
1. Ir a [cron-job.org](https://cron-job.org)
2. Crear nueva cuenta
3. Agregar nueva tarea cron
4. URL: `https://tudominio.com/api/notifications/cron-reminders`
5. Headers: `Authorization: Bearer tu_secreto_cron`
6. Frecuencia: Cada 15 minutos

## 🧪 **Pruebas del Sistema**

### **1. Probar Recordatorios Manualmente**

```bash
# Procesar recordatorios manualmente
curl -X POST "https://tudominio.com/api/notifications/schedule-reminders" \
  -H "Content-Type: application/json" \
  -d '{"action": "process"}'

# Verificar estado del sistema
curl -X GET "https://tudominio.com/api/notifications/schedule-reminders"
```

### **2. Probar Cron Endpoint**

```bash
# Con autenticación
curl -X GET "https://tudominio.com/api/notifications/cron-reminders" \
  -H "Authorization: Bearer tu_secreto_cron"

# Sin autenticación (si no está configurado)
curl -X GET "https://tudominio.com/api/notifications/cron-reminders"
```

### **3. Verificar Notificaciones Push**

1. **Registrar push token** en el frontend
2. **Hacer like** a un post para probar notificaciones
3. **Verificar logs** en la consola del servidor

## 📊 **Monitoreo y Logs**

### **Logs del Sistema**

El sistema genera logs detallados para monitoreo:

```bash
[CRON REMINDERS] Starting reminder processing...
[CRON REMINDERS] Processing reminders for X users
[CRON REMINDERS] Processing complete. Notifications sent: X, Streak warnings: X
```

### **Métricas Disponibles**

- **Usuarios con push tokens**: Total de usuarios registrados
- **Notificaciones enviadas**: Recordatorios exitosos
- **Advertencias de racha**: Usuarios en riesgo
- **Errores**: Problemas de envío o configuración

## 🚨 **Solución de Problemas**

### **Problema: No se envían notificaciones**

**Verificar:**
1. ✅ VAPID keys configuradas
2. ✅ Usuarios con push tokens registrados
3. ✅ Cron job ejecutándose
4. ✅ Logs del servidor

**Solución:**
```bash
# Verificar configuración
curl -X GET "https://tudominio.com/api/notifications/schedule-reminders"

# Probar manualmente
curl -X POST "https://tudominio.com/api/notifications/schedule-reminders" \
  -d '{"action": "process"}'
```

### **Problema: Error de VAPID keys**

**Verificar:**
1. Variables de entorno configuradas
2. Formato correcto de las keys
3. Permisos del servidor

### **Problema: Cron no ejecuta**

**Verificar:**
1. Configuración del cron job
2. Logs del sistema
3. Acceso a la API endpoint
4. Autenticación si está configurada

## 🔒 **Seguridad**

### **Autenticación de Cron Jobs**

```bash
# Configurar secreto
CRON_SECRET=tu_secreto_muy_seguro

# Usar en requests
Authorization: Bearer tu_secreto_muy_seguro
```

### **Rate Limiting**

El sistema incluye protección contra spam:
- **TTL de notificaciones**: 2 horas
- **Verificación de usuarios**: Solo usuarios autenticados
- **Validación de datos**: Verificación de entrada

## 📱 **Frontend Integration**

### **Hook de React**

```typescript
import { useReminderNotifications } from '@/hooks/useReminderNotifications';

const { settings, streakInfo, nextReminder } = useReminderNotifications();
```

### **Componente de Configuración**

```typescript
// Configurar horarios
updateReminderTimes("10:00", "21:30");

// Habilitar/deshabilitar
toggleReminderSetting('enabled');
```

## 🎯 **Próximas Mejoras**

- [ ] **Personalización de horarios** por usuario
- [ ] **Zonas horarias** automáticas
- [ ] **Notificaciones inteligentes** basadas en comportamiento
- [ ] **Dashboard de analytics** de recordatorios
- [ ] **Integración con calendario** del usuario

## 📞 **Soporte**

Para problemas o preguntas sobre el sistema de recordatorios:

1. **Revisar logs** del servidor
2. **Verificar configuración** de variables de entorno
3. **Probar endpoints** manualmente
4. **Consultar documentación** de web-push y VAPID

---

**¡El sistema de recordatorios está listo para mantener a los usuarios comprometidos con sus whispers diarios! 🎉** 