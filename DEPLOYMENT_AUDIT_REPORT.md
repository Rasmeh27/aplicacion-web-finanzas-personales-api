# Auditoría de preparación de MONI para demo universitaria

## Veredicto

**TECHNICALLY READY — DATABASE VERIFICATION PENDING** al 2026-07-14 (America/La_Paz).

El bloqueante de Next.js quedó cerrado mediante una migración controlada de `14.2.35` a `15.5.20`: instalación reproducible, lint, build, rutas y smoke productivo pasan, y los cuatro advisories high aplicables al servidor Next bajaron a cero. El backend conserva sus 320 pruebas verdes y su build.

El único cierre pendiente requiere evidencia humana de Luis en Supabase. No se declara `READY WITH ACCEPTED RISKS` hasta confirmar las cuatro tablas de la migración 14.

## Identidad y alcance

| Campo | Evidencia |
|---|---|
| Monorepo canónico | `C:\aplicacion-de-finanzas\backend\aplicacion-web-finanzas-personales-api\aplicacion-web-finanzas-personales-api` |
| Rama / commit base | `main` / `09ae19bda4928daac41599965f47e698e3ba923c` |
| Frontend | Next.js App Router, servicio público autocontenido con `next start` |
| Runtime objetivo | Node `22.23.1`, acotado a `<23.0.0` |
| Fuera de alcance | Commit, push, deploy, SQL, DDL, seeds, secretos y repo IA |

## Migración Next.js

| Componente | Antes | Después | Decisión |
|---|---:|---:|---|
| Next.js | 14.2.35 | **15.5.20** | Última estable publicada en la línea 15.5.x y posterior a todos los patches requeridos. |
| React | 18.3.1 | **18.3.1** | Se conserva: Next 15.5.20 lo acepta y las librerías UI actuales declaran peers React 18. |
| React DOM | 18.3.1 | **18.3.1** | Exactamente alineado con React. |
| `@types/react` | 18.3.29 instalado | **18.3.31** | Último tipo estable de la línea compatible. |
| `@types/react-dom` | 18.3.7 instalado | **18.3.7** | Alineado con React DOM 18. |
| `eslint-config-next` | 14.2.35 instalado | **15.5.20** | Misma versión que Next. |

No se instaló React 19 porque `lucide-react` y otras dependencias existentes del producto aún limitan sus contratos declarados a React 18. `npm ls` confirma una única versión deduplicada y ninguna peer inválida.

### Inspección y codemod

La búsqueda previa cubrió `cookies`, `headers`, `draftMode`, props `params/searchParams`, metadata, route handlers, Server Actions, middleware, `fetch`, caching y runtime:

- No existen usos de `cookies()`, `headers()`, `draftMode()`, Server Actions ni props request-time en páginas/layouts.
- El único route handler es `/api/health`; no recibe params y ya declara `dynamic = 'force-dynamic'`, por lo que conserva su semántica con el nuevo default de cache.
- El middleware solo devuelve `NextResponse.next()` y no consume `geo`, `ip` ni APIs retiradas.
- No hay `experimental-edge`, configuración experimental renombrada ni `fetch` servidor dependiente del cache anterior.

Se ejecutó el codemod oficial fijado `@next/codemod@15.5.20 next-async-request-api` en dry-run sobre 127 archivos: 126 sin cambios y un falso positivo sobre el re-export estático de `/login`. El modo escritura se negó por el worktree existente y exigía `--force`, opción prohibida. No se forzó ni se agregó el marcador incorrecto.

Next regeneró `apps/frontend/next-env.d.ts` con la referencia de tipos de rutas propia de 15.5. El lint se migró manualmente de `next lint`, deprecado, a `eslint . --max-warnings=0` sin desactivar reglas.

## Validaciones ejecutadas

| Comando / prueba | Exit | Resultado / evidencia |
|---|---:|---|
| `node --version` | 0 | `v25.8.1` local; Render usará 22.23.1. |
| `npm --version` | 0 | `11.11.0`. |
| `npm ci` | 0 | 1105 paquetes instalados desde lockfile; sin flags de bypass. |
| `npm ls next react react-dom @types/react @types/react-dom eslint-config-next --all` | 0 | Next 15.5.20 único; React/DOM 18.3.1 únicos; sin `invalid`. |
| Frontend lint | 0 | ESLint CLI, cero warnings. |
| Frontend build | 0 | Next 15.5.20, compilación/typecheck y 22 rutas; `BUILD_ID` presente. |
| Bundle productivo | 0 | Sin localhost; contiene solo el host reservado usado temporalmente durante esta validación. |
| Frontend smoke | 0 | `/api/health` 200; `/` 307 diseñado; `/login` 200; `/auth/login` 200; proceso detenido. |
| Backend lint | 0 | Sin errores. |
| Backend Jest | 0 | 29/29 suites, 320/320 pruebas. |
| Backend build | 0 | `apps/backend/dist/main.js` presente. |
| `npm audit --omit=dev --json` | 1 esperado | 19 moderate, 7 high, 0 critical; los high de Next son 0. |

El primer build no pudo descargar Inter dentro del sandbox (`EACCES`). Repetido con acceso de red, compiló correctamente; no fue un defecto de código.

## Vulnerabilidades productivas: antes y después

| Métrica | Antes | Después |
|---|---:|---:|
| Moderate productivas | 18 | **19** |
| High productivas | 8 | **7** |
| Critical productivas | 0 | **0** |
| High de Next.js aplicables | 4 | **0** |

Los cuatro advisories que bloqueaban Next 14 (`GHSA-h25m-26qc-wcjf`, `GHSA-q4gf-8mx6-v5v3`, `GHSA-8h8q-6873-q5fj`, `GHSA-c4j6-fc7j-m34r`) quedan fuera de los rangos afectados con 15.5.20.

Next aún aparece como **moderate** porque integra `postcss@8.4.31` y el advisory `GHSA-qx2v-qp2m-jg93`. MONI no stringify CSS suministrado por usuarios; sus estilos son fuentes confiables compiladas en build. No es un high ni un camino remoto demostrado para esta configuración.

### High restantes

| Paquete | Cadena | Uso real | Exposición real | Fix | Decisión |
|---|---|---|---|---|---|
| `@nestjs/platform-express` | API directa → Express/Multer | Adaptador HTTP público; no hay `MulterModule`, `FileInterceptor` ni endpoints de upload. | Los high heredados requieren parsing de uploads no cableado. | Nest 11, cambio mayor. | No bloquea la demo; migración backend separada. |
| `multer` | `@nestjs/platform-express` → `multer` | Instalado transitivamente, sin imports ni rutas. | No hay camino runtime alcanzable demostrado. | Multer 2.2 mediante Nest nuevo. | No bloquea. |
| `form-data` | Axios frontend → `form-data@4.0.5` | Axios corre en navegador; no se construye multipart Node con nombres controlados. | Sin sink servidor alcanzable. | 4.0.6 transitivo. | No bloquea; actualizar en mantenimiento. |
| `lodash` | Nest config/swagger/Bull y Recharts navegador | No se usa `_.template` con imports del usuario. | No se encontró entrada remota al sink de code injection. | Requiere coordinar dependencias Nest/Recharts. | No bloquea. |
| `tar` | `bcrypt` → `@mapbox/node-pre-gyp` → `tar@6.2.1` | Descarga/extracción durante instalación de bcrypt; no en requests. | Tooling de build, sin extracción runtime. | bcrypt 6, cambio mayor. | No bloquea tráfico de demo. |
| `@mapbox/node-pre-gyp` | Hereda `tar` | Instalación del binario bcrypt. | Sin endpoint runtime. | bcrypt 6. | No bloquea. |
| `bcrypt` | Dependencia directa backend → node-pre-gyp/tar | Hash de contraseñas sí se usa; el advisory high proviene de la herramienta de instalación, no del hash. | No hay extracción tar causada por usuario en runtime. | bcrypt 6, cambio mayor. | No bloquea; regresión auth posterior. |

No se ejecutó `npm audit fix`, `--force`, `--legacy-peer-deps`, override ni actualización indiscriminada.

## Supabase y migración 14

Estado actual: **DATABASE VERIFICATION PENDING**.

Luis debe ejecutar en el SQL Editor del proyecto objetivo, sin compartir resultados sensibles:

```sql
select
  to_regclass('public.privacy_settings') as privacy_settings,
  to_regclass('public.privacy_consents') as privacy_consents,
  to_regclass('public.audit_logs') as audit_logs,
  to_regclass('public.notifications') as notifications;
```

- Si las cuatro columnas devuelven nombres de tabla: **MIGRATION 14 VERIFIED** y el veredicto puede pasar a `READY WITH ACCEPTED RISKS` tras registrar evidencia.
- Si alguna devuelve `null`: **MIGRATION 14 REQUIRED**. Hacer backup y aplicar manualmente `apps/backend/src/database/migrations/202607130001_privacy_notifications_audit.sql`; luego repetir la consulta y `schema:check`.

Esta sesión no ejecutó SQL ni DDL y no declara la migración aplicada sin evidencia.

## Riesgos aceptados y limitaciones

- **ACCEPTED TEMPORARY RISK — UNIVERSITY DEMO:** credenciales históricas no rotadas por decisión del propietario. No aparecen secretos nuevos rastreados; deben rotarse después de la presentación.
- La validación local usó Node 25.8.1 porque Node 22 no está instalado. Render está fijado exactamente a 22.23.1.
- No se probaron Supabase real, CORS/HTTPS Render, email, market data real, RAG ni contexto financiero remoto.
- Los smokes locales validan proceso y rutas, no sustituyen el checklist posterior al deploy.

## Criterio de salida

Con evidencia **MIGRATION 14 VERIFIED**, sin cambios adicionales y tras revalidar `/health/ready`, el veredicto pasa a **READY WITH ACCEPTED RISKS**. Si alguna tabla falta, el despliegue continúa bloqueado hasta aplicar y verificar únicamente la migración 14.
