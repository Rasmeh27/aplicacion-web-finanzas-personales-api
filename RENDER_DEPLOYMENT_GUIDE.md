# Guía operativa de despliegue de MONI en Render

Estado técnico: Next.js 15.5.20, React 18.3.1, instalación/build/smoke verdes. Antes de desplegar, Luis debe obtener la evidencia `MIGRATION 14 VERIFIED` descrita en `DEPLOYMENT_AUDIT_REPORT.md`; hasta entonces el estado es `TECHNICALLY READY — DATABASE VERIFICATION PENDING`.

Documentación de referencia: [Blueprints](https://render.com/docs/blueprint-spec), [variables](https://render.com/docs/configure-environment-variables), [Node](https://render.com/docs/node-version) y [health checks](https://render.com/docs/health-checks).

# Despliegue rápido para presentación universitaria

Ejecutar este flujo solo después de confirmar las cuatro tablas de privacidad en Supabase. El bloqueante de Next.js ya está cerrado.

## Paso 1 — Subir cambios

Publicar por separado el monorepo MONI y el repositorio del servicio IA, únicamente después de revisar y aprobar sus diffs. No incluir ningún ZIP, `.env`, `.next`, `dist` ni salida de auditoría. Los comandos sugeridos están al final de este informe; esta preparación no ejecuta commit ni push.

## Paso 2 — Desplegar IA

- Name: `moni-ai`.
- Repo: `https://github.com/Rasmeh27/asistente-financiero-moni.git`.
- Branch: `main`.
- Root: raíz.
- Runtime: Docker.
- Health: `/health`.

Configurar solo el subconjunto aplicable de `# Variables mínimas para la demo`. Render entregará una URL con forma `https://<moni-ai>.onrender.com`; no inventarla de antemano. Validar `GET /health` = 200 y conservar el origen, sin paths adicionales, para el backend.

## Paso 3 — Desplegar backend

- Name: `moni-api`.
- Repo: `https://github.com/Rasmeh27/aplicacion-web-finanzas-personales-api.git`.
- Branch: `main`.
- Root: raíz.
- Runtime: Node.
- Build: `npm ci && npm run build --workspace=@smartwallet/backend`.
- Start: `node apps/backend/dist/main.js`.
- Health: `/health/ready`.

Configurar `DATABASE_URL`, `DATABASE_SSL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MARKET_DATA_PROVIDER`, la clave del proveedor real si corresponde, `AI_SERVICE_BASE_URL`, `AI_SERVICE_INTERNAL_API_KEY`, `BACKEND_INTERNAL_API_KEY`, `ENABLE_SWAGGER=false`, `NODE_ENV=production` y `NODE_VERSION=22.23.1`. Omitir `FRONTEND_URL` durante este boot inicial si la web aún no existe; no intentar login hasta fijar el origen final. No definir `PORT`. Validar `GET /health/live` y `GET /health/ready`; ambos deben responder 200.

## Paso 4 — Desplegar frontend

Antes del build fijar exactamente `NEXT_PUBLIC_API_URL=https://<moni-api>.onrender.com/api/v1`; nunca localhost ni un host temporal. Crear `moni-web` con el build/start de la tabla inferior y validar `GET /api/health`, `GET /` y `GET /login`.

## Paso 5 — Ajustar CORS

Actualizar en backend `FRONTEND_URL=https://<moni-web>.onrender.com`, sin path ni barra final, y redeployar API. Actualizar en IA `BACKEND_BASE_URL=https://<moni-api>.onrender.com` si se habilita contexto financiero. Probar login desde el navegador y confirmar que CORS acepta únicamente el origen final.

## Paso 6 — Prueba funcional mínima

Probar registro o login, dashboard, creación de ingreso, creación de gasto, creación de meta, presupuestos, perfil, premium/inversiones, market data y asistente IA. Confirmar en Network que solo aparece el host final de API, nunca localhost ni un origen temporal, y registrar evidencia redactada.

## Configuración exacta

| Orden | Servicio | Repo / rama | Root | Runtime / plan | Build | Start | Health |
|---:|---|---|---|---|---|---|---|
| 1 | IA (`moni-ai`) | `https://github.com/Rasmeh27/asistente-financiero-moni.git` / `main` | raíz | Docker / Starter | Dockerfile | Dockerfile: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}` | `/health` |
| 2 | API (`moni-api`) | `https://github.com/Rasmeh27/aplicacion-web-finanzas-personales-api.git` / `main` | raíz | Node / Starter | `npm ci && npm run build --workspace=@smartwallet/backend` | `node apps/backend/dist/main.js` | `/health/ready` |
| 3 | Web (`moni-web`) | mismo monorepo / `main` | raíz | Node / Starter | `npm ci && npm run build --workspace=@smartwallet/frontend` | `npm run start --workspace=@smartwallet/frontend` | `/api/health` |

Starter es el mínimo recomendado para producción. Free sirve para evaluación, pero el sleep/cold start puede degradar readiness, auth y llamadas de IA. `PORT` lo proporciona Render y no debe fijarse manualmente. Node se fuerza exactamente a `22.23.1` mediante `NODE_VERSION`, `.nvmrc`, `.node-version` y `engines`.

## A. Acciones previas

1. Confirmar que `main` apunta al commit aprobado y revisar el diff exacto.
2. Registrar la aceptación temporal del riesgo de credenciales históricas para la demo y programar su rotación/revocación inmediatamente después. No afirmar que borrar archivos actuales limpia el historial.
3. Crear dos secretos aleatorios diferentes:
   - `AI_SERVICE_INTERNAL_API_KEY`: mismo valor en backend e IA.
   - `BACKEND_INTERNAL_API_KEY`: mismo valor en backend e IA.
4. Confirmar el proyecto Supabase destino, región, backup y ventana de cambio.
5. Verificar primero las cuatro tablas de privacidad indicadas en el informe. Si falta alguna, aplicar manualmente `202607130001_privacy_notifications_audit.sql` en Supabase y registrar archivo, fecha, operador y resultado. No ejecutar Prisma ni asumir que los scripts TypeORM del `package.json` están configurados.
6. Ejecutar `npm run schema:check --workspace=@smartwallet/backend` con acceso read-only a la base ya migrada.
7. Confirmar en el lockfile Next.js `15.5.20`, React/DOM `18.3.1` y `eslint-config-next` `15.5.20`; el audit final debe mantener en cero los high aplicables a Next.
8. Elegir proveedor de mercado: `alphavantage`, `twelve_data` o `mock`. Para producción real, configurar la clave que corresponde; no dejar un fallback implícito.

## B. Desplegar IA

1. En Render, crear un Web Service desde el repo de IA.
2. Seleccionar `main`, Root Directory vacío/raíz, Runtime Docker y plan Starter.
3. Configurar antes del primer deploy:
   - `APP_ENV=production`.
   - `AI_SERVICE_INTERNAL_API_KEY` y `BACKEND_INTERNAL_API_KEY`.
   - `LLM_PROVIDER`, `LLM_MODEL` y la credencial condicional correspondiente.
   - Omitir `BACKEND_BASE_URL` mientras `ENABLE_FINANCIAL_CONTEXT=false`; configurarlo únicamente con el origen final después de crear la API.
   - Mantener `ENABLE_RAG=false` hasta completar ingest real con embeddings compatibles.
   - Mantener `ENABLE_FINANCIAL_CONTEXT=false` hasta que la API interna esté disponible.
4. No definir `PORT`; el Dockerfile usa el valor inyectado por Render.
5. Desplegar y comprobar `GET https://<host-ia>/health` = 200.
6. Guardar el origen final de IA sin `/api/v1/chat`; será `AI_SERVICE_BASE_URL` del backend.
7. No ejecutar ingest RAG en build, start ni initial deploy hook.

## C. Crear backend y frontend con el Blueprint

`render.yaml` describe ambos servicios del monorepo. Como el build web falla deliberadamente sin la URL final de API, no debe iniciarse con un hostname provisional:

1. Preferir el orden manual de esta guía: crear primero `moni-api`, guardar su hostname real y luego crear `moni-web` usando los mismos comandos del Blueprint.
2. Si se usa Blueprint, revisar que detecte solo `moni-api` y `moni-web`. Si la UI no muestra aún el hostname final de API, cancelar el alta conjunta y volver al orden manual; no insertar una URL provisional.
3. Completar todos los `sync: false` con valores finales y mantener `autoDeployTrigger: off` durante el bootstrap.
4. En backend configurar:
   - `DATABASE_URL`, `DATABASE_SSL=true`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
   - `SUPABASE_SERVICE_ROLE_KEY` si se usarán links administrativos de recuperación.
   - Omitir `FRONTEND_URL` hasta conocer el origen final de web; configurarlo antes de probar autenticación desde navegador.
   - `MARKET_DATA_PROVIDER` y únicamente la clave real del proveedor seleccionado.
   - URL final de IA y las dos claves internas.
   - `ENABLE_SWAGGER=false`.
5. Dejar vacía la key del proveedor de mercado no seleccionado. No colocar secretos en `render.yaml`.

## D. Validar backend

1. Esperar build y start de `moni-api`.
2. Verificar:
   - `GET https://<host-api>/health/live` = 200.
   - `GET https://<host-api>/health/ready` = 200 y `database=up`.
3. Si readiness devuelve 503, no continuar al frontend: revisar DB/TLS/migraciones.
4. Guardar el origen final de API y formar exactamente `https://<host-api>/api/v1`.

## E. Reconstruir frontend con la URL final

1. En `moni-web` cambiar `NEXT_PUBLIC_API_URL` a `https://<host-api>/api/v1`.
2. Elegir **Save, rebuild, and deploy**. Un simple restart/redeploy del artefacto anterior no sustituye el valor incrustado por Next.
3. Configurar `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL` solo si el checkout existe y es público.
4. Verificar `/api/health` = 200 y abrir `/`; el redirect a `/auth/login` es esperado.
5. Inspeccionar el bundle/red del navegador y confirmar que ninguna solicitud apunta a localhost ni a un origen no final.

## F. Volver al backend

1. Actualizar `FRONTEND_URL` al origen final de `moni-web`, sin barra final. Para varios orígenes, separarlos por coma.
2. Guardar y desplegar backend; confirmar CORS desde el frontend real.
3. En IA, actualizar `BACKEND_BASE_URL` al origen de backend, sin `/api/v1`.
4. Si se habilita contexto financiero, establecer `ENABLE_FINANCIAL_CONTEXT=true`, redeploy de IA y probar el flujo controlado.
5. Habilitar auto deploy solo después de decidir la política: `commit`, `checksPass` o mantener `off`. Para producción se recomienda `checksPass` cuando exista CI obligatorio.

## G. Validación integral

Ejecutar `PRODUCTION_SMOKE_TEST.md` con usuarios de prueba y datos desechables. Adjuntar timestamps, deploy IDs, códigos HTTP y capturas/logs redactados. No copiar JWT, cookies, URLs con contraseña ni claves.

Validar como mínimo:

- HTTPS y health de los tres servicios.
- Auth completa con confirmación y recuperación.
- CRUD de transacciones, categorías, presupuestos, metas y perfil.
- Separación Basic/Premium.
- Market data real o etiquetado explícito como mock.
- AI assistant y, si se habilitan, RAG/contexto financiero.
- 401/403/404, CORS, rate limiting y errores 503 controlados.

## H. Rollback

1. Aplicación: usar **Rollback** al deploy anterior de cada servicio o desplegar un commit conocido. Mantener frontend/API/IA en versiones contractualmente compatibles.
2. Variables: restaurar la versión anterior documentada desde el gestor de secretos, nunca desde Git.
3. Base de datos: no revertir SQL automáticamente. Usar el plan de rollback escrito y probado para cada migración; restaurar backup solo con aprobación y análisis de pérdida de datos.
4. Si falla una migración, detener tráfico/escrituras antes de cualquier restauración.

## I. Logs y troubleshooting

| Síntoma | Diagnóstico | Acción |
|---|---|---|
| Build falla en `npm ci` | Lockfile, Node o registry | Confirmar raíz, Node 22.23.1 y `package-lock.json`; no usar `--force`. |
| API aborta al iniciar | Variable requerida ausente | Revisar el nombre indicado; Render debe tenerla en el servicio API. |
| `/health/ready` 503 | DB/TLS/esquema | Revisar `DATABASE_URL`, `DATABASE_SSL=true`, red y SQL aplicados. |
| `/health/live` 200 y ready 503 | Proceso sano, DB no lista | No desactivar readiness; corregir dependencia. |
| CORS bloquea navegador | `FRONTEND_URL` incorrecta | Usar origen exacto, sin path/barra final; redeploy API. |
| Frontend llama localhost | URL no existía al build | Corregir `NEXT_PUBLIC_API_URL`; **rebuild and deploy**. |
| IA timeout | Acople de timeouts/modelo | `AI_SERVICE_TIMEOUT_MS` del backend debe superar `LLM_TIMEOUT_MS`; revisar plan/cold start. |
| IA 401/502 | Key interna distinta | Hacer coincidir `AI_SERVICE_INTERNAL_API_KEY`; no imprimirla. |
| Contexto financiero 500/401 | Backend URL/key incorrectos | Revisar origen sin `/api/v1` y `BACKEND_INTERNAL_API_KEY`. |
| Market data impide boot | Provider/key incoherentes | Configurar provider explícito y su key; no caer silenciosamente a mock. |
| News/email no funcionan | Integración opcional incompleta | Revisar `NEWS_API_KEY` o EmailJS; Supabase email puede ser fallback. |
| Health frontend 200, app rota | Health es liveness aislado | Revisar consola, bundle y conectividad API por separado. |

## Variables

La lista completa, secreto/no secreto, momento y condicionalidad está en `RENDER_ENVIRONMENT_MATRIX.md`. Regla invariable: ninguna variable `NEXT_PUBLIC_*` puede contener secretos.
