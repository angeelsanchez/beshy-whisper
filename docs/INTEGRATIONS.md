# Guía de Integraciones

## Snyk — Escaneo de Vulnerabilidades en Dependencias

### Propósito
Detectar vulnerabilidades conocidas en paquetes y sus dependencias transitivas. Alerta automática cuando se descubre un CVE nuevo.

### Setup

1. Instalar Snyk CLI:
```bash
pnpm add -g snyk
snyk auth
```

2. Testear localmente:
```bash
snyk test          # Escanea vulnerabilidades
snyk monitor       # Registra proyecto para monitoreo continuo
```

3. CI (GitHub Actions):
```yaml
- name: Snyk Security Check
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    command: test
    args: --severity-threshold=high
```

### Configuración recomendada
- Severity threshold: `high` (ignorar low/medium para no bloquear CI)
- Monitoreo: activar notificaciones por email para nuevos CVEs
- `.snyk` policy file para ignorar falsos positivos documentados

---

## Sentry — Error Tracking y Performance Monitoring

### Propósito
Capturar errores en producción (client + server) con contexto completo (stack trace, breadcrumbs, user info). Monitorizar performance de rutas y transacciones.

### Setup

1. Instalar SDK:
```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

2. Archivos generados:
- `sentry.client.config.ts` — Configuración client-side
- `sentry.server.config.ts` — Configuración server-side
- `sentry.edge.config.ts` — Configuración edge runtime
- `next.config.ts` — Wrapeado con `withSentryConfig`

3. Variables de entorno:
```
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx    # Solo para CI (source maps upload)
```

### Configuración recomendada
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,        // 10% de transacciones
  replaysSessionSampleRate: 0,   // No session replays (usamos Clarity)
  replaysOnErrorSampleRate: 1.0, // 100% replay on error
  environment: process.env.NODE_ENV,
});
```

### Integración con logger
Cuando se implemente `src/lib/logger.ts`, los errores level `error` deben reportarse a Sentry automáticamente:
```typescript
if (level === 'error') {
  Sentry.captureException(error);
}
```

---

## Microsoft Clarity — Session Recordings y Heatmaps

### Propósito
Entender cómo los usuarios interactúan con la app: session recordings, heatmaps de clicks, scroll depth, rage clicks, dead clicks.

### Setup

1. Crear proyecto en [clarity.microsoft.com](https://clarity.microsoft.com)
2. Obtener el Clarity Project ID
3. Añadir script en `src/app/layout.tsx`:

```tsx
<Script
  id="clarity-analytics"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
    `,
  }}
/>
```

4. Variable de entorno:
```
NEXT_PUBLIC_CLARITY_ID=xxx
```

5. Actualizar CSP en `next.config.ts`:
```
script-src: añadir https://www.clarity.ms
connect-src: añadir https://www.clarity.ms https://*.clarity.ms
```

### Consideraciones de privacidad
- Clarity anonimiza inputs por defecto
- Configurar masking de datos sensibles (emails, nombres)
- Añadir aviso en la política de privacidad

---

## SonarQube — Análisis Estático de Código

### Propósito
Detectar code smells, bugs potenciales, vulnerabilidades de seguridad, y duplicación de código. Mantener quality gates que bloqueen merges si no se cumplen.

### Setup con SonarCloud (hosted)

1. Registrar proyecto en [sonarcloud.io](https://sonarcloud.io)
2. Crear `sonar-project.properties` en la raíz:

```properties
sonar.projectKey=beshy-whisper
sonar.organization=beshy
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/.next/**,**/coverage/**
```

3. GitHub Actions:
```yaml
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Quality Gates recomendadas
- Coverage on new code: >= 70%
- Duplicated lines on new code: < 3%
- Maintainability rating: A
- Reliability rating: A
- Security rating: A
- No blocker/critical issues

### Setup local (con MCP)
El proyecto ya tiene configurado un MCP server de SonarQube en `.mcp.json` para acceso directo desde Claude Code. Esto permite consultar issues, métricas y quality gates sin salir del editor.

---

## Pipeline CI/CD Recomendado

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run test:coverage
      - run: pnpm run build
      - name: Snyk
        uses: snyk/actions/node@master
        env: { SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} }
      - name: SonarCloud
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```
