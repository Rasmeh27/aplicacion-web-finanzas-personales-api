# Smoke test de producción de MONI

Estado remoto: **NO EJECUTADO EN PRODUCCIÓN**. Baseline local posterior a la migración: Next.js `15.5.20`, React `18.3.1`, frontend lint/build PASS, `/api/health` 200, `/` 307 diseñado, `/login` y `/auth/login` 200; backend 29 suites/320 pruebas y build PASS. Estos resultados no sustituyen pruebas en Render.

## Preparación y evidencia

Definir sin guardar secretos en el historial del shell:

```text
WEB_ORIGIN=https://<frontend-host>
API_ORIGIN=https://<api-host>
API_BASE=https://<api-host>/api/v1
AI_ORIGIN=https://<ai-host>
```

Usar un usuario Basic y uno Premium de prueba, correo controlado y datos desechables. Guardar por prueba: timestamp UTC, deploy ID, request/correlation ID, código HTTP, captura o fragmento de log **redactado**. Nunca adjuntar JWT, refresh token, cookies, keys ni connection strings.

Precondición obligatoria: Luis ejecutó la consulta read-only de `DEPLOYMENT_AUDIT_REPORT.md` y registró **MIGRATION 14 VERIFIED**. Si alguna tabla devuelve `null`, marcar todo el smoke como `BLOQUEADA — MIGRATION 14 REQUIRED` y no desplegar.

Estados válidos: `NO EJECUTADA`, `PASS`, `FAIL`, `BLOQUEADA`, `N/A JUSTIFICADA`.

## 1. Infraestructura

| Prueba / endpoint | Precondición | Comando o acción | Resultado esperado | Resultado real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| Web `GET /api/health` | Deploy web activo | `curl -i "$WEB_ORIGIN/api/health"` | 200; JSON `status=ok`, `service=moni-web`; sin secretos | Pendiente | NO EJECUTADA | Añadir |
| Web `GET /` | Deploy web activo | Abrir `$WEB_ORIGIN/` | Redirect controlado a login; destino 200 | Pendiente | NO EJECUTADA | Añadir |
| Web `GET /login` | Deploy web activo | `curl -i "$WEB_ORIGIN/login"` y abrir en navegador | 200; misma pantalla funcional que `/auth/login` | Pendiente | NO EJECUTADA | Añadir |
| API `GET /health/live` | Deploy API activo | `curl -i "$API_ORIGIN/health/live"` | 200; proceso vivo | Pendiente | NO EJECUTADA | Añadir |
| API `GET /health/ready` | Supabase migrado | `curl -i "$API_ORIGIN/health/ready"` | 200; `database=up` | Pendiente | NO EJECUTADA | Añadir |
| IA `GET /health` | Deploy IA activo | `curl -i "$AI_ORIGIN/health"` | 200; `ok=true` | Pendiente | NO EJECUTADA | Añadir |
| HTTPS | DNS/hosts finales | Inspeccionar los tres orígenes | TLS válido; HTTP redirige a HTTPS | Pendiente | NO EJECUTADA | Añadir |
| Logs | Acceso Render | Revisar boot y una request por servicio | Sin keys, JWT, DB URL, prompts ni datos financieros crudos | Pendiente | NO EJECUTADA | Añadir |
| CORS válido | `FRONTEND_URL` final | Login desde navegador web | Preflight/request aceptada solo desde web final | Pendiente | NO EJECUTADA | Añadir |
| Bundle API URL | Frontend reconstruido | Network tab y búsqueda de orígenes no finales | Requests solo a `$API_BASE`; sin localhost ni host provisional | Pendiente | NO EJECUTADA | Añadir |

## 2. Autenticación

| Prueba / endpoint | Precondición | Comando o acción | Resultado esperado | Resultado real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| Registro `POST /auth/register` | Correo nuevo | Registrar desde UI o POST a `$API_BASE/auth/register` | 2xx; usuario creado; respuesta sin secretos | Pendiente | NO EJECUTADA | Añadir |
| Confirmación | Email configurado | Abrir link de confirmación una vez | Sesión/redirect válido; link reutilizado controlado | Pendiente | NO EJECUTADA | Añadir |
| Login `POST /auth/login` | Usuario confirmado | Login válido | 2xx y acceso a dashboard | Pendiente | NO EJECUTADA | Añadir |
| Login inválido | Usuario existente | Password incorrecto | 401 genérico; no enumera datos | Pendiente | NO EJECUTADA | Añadir |
| Refresh `POST /auth/refresh` | Refresh válido | Renovar sesión desde cliente | Nuevo acceso; sesión continúa | Pendiente | NO EJECUTADA | Añadir |
| Logout `POST /auth/logout` | Sesión válida | Cerrar sesión | Sesión local eliminada; rutas privadas piden login | Pendiente | NO EJECUTADA | Añadir |
| Forgot password `POST /auth/forgot-password` | Email controlado | Solicitar recuperación | Respuesta no enumera cuenta; llega correo/link | Pendiente | NO EJECUTADA | Añadir |
| Reset `POST /auth/reset-password` | Link válido | Establecer password nuevo | 2xx; password anterior deja de funcionar | Pendiente | NO EJECUTADA | Añadir |
| Redirects de auth | Login/logout/confirmación | Navegar flujo completo | Solo hosts permitidos; sin open redirect | Pendiente | NO EJECUTADA | Añadir |
| Persistencia de sesión | Login correcto | Recargar y abrir nueva pestaña | Sesión válida persiste; expiración refresca o redirige | Pendiente | NO EJECUTADA | Añadir |

## 3. Funcionalidad

| Prueba / endpoint | Precondición | Comando o acción | Resultado esperado | Resultado real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| Perfil `GET/PUT /financial-profile/me` | JWT válido | Leer y editar perfil | Solo datos propios; cambios persisten | Pendiente | NO EJECUTADA | Añadir |
| Onboarding `PUT /financial-profile/onboarding` | Usuario nuevo | Completar onboarding | 2xx; dashboard refleja perfil | Pendiente | NO EJECUTADA | Añadir |
| Categorías `/category` | JWT válido | Listar, crear, editar y eliminar categoría de prueba | CRUD consistente; aislamiento por usuario | Pendiente | NO EJECUTADA | Añadir |
| Transacciones `/transactions` | Categoría propia | Crear ingreso/gasto, listar, editar y eliminar | Totales/moneda correctos; persiste | Pendiente | NO EJECUTADA | Añadir |
| Resumen `/transactions/summary` | Transacciones de prueba | Consultar periodo | Totales coinciden con fixtures | Pendiente | NO EJECUTADA | Añadir |
| Presupuestos `/budgets` | Categoría propia | CRUD + `/summary` | Límites y progreso correctos | Pendiente | NO EJECUTADA | Añadir |
| Metas `/planning/goals` | JWT válido | CRUD + contribución | Progreso y summary correctos | Pendiente | NO EJECUTADA | Añadir |
| Deudas `/planning/debts` | JWT válido | Crear deuda y pago | Saldo/ratio/summary coherentes | Pendiente | NO EJECUTADA | Añadir |
| Dashboard `/dashboard-reports/*` | Datos de prueba | Abrir dashboard y consultar endpoints | Agregados coinciden con movimientos | Pendiente | NO EJECUTADA | Añadir |
| Plan Basic `GET /subscriptions/me` | Usuario Basic | Abrir features premium | `plan=basic`; premium denegado sin auto-upgrade | Pendiente | NO EJECUTADA | Añadir |
| Plan Premium | Usuario Premium real de prueba | Abrir inversiones/assistant premium | Acceso solo con plan activo | Pendiente | NO EJECUTADA | Añadir |
| Market quote `GET /investments/symbols/:symbol/quote` | Premium + provider real | Consultar símbolo permitido | 200 o error controlado; fuente/estado correcto, no mock oculto | Pendiente | NO EJECUTADA | Añadir |
| Portfolio `/investments/*` | Premium | CRUD posición y analytics | Cálculos y ownership correctos | Pendiente | NO EJECUTADA | Añadir |
| Noticias `GET /financial-news` | Provider configurado | Abrir noticias | Datos reales o degradación explícita | Pendiente | NO EJECUTADA | Añadir |
| Assistant `POST /assistant/chat` | IA/key configuradas | Pregunta de uso/finanzas | Respuesta segura; request ID; sin metadata interna | Pendiente | NO EJECUTADA | Añadir |
| Contexto financiero | Flag habilitado y datos agregados | Pregunta financiera propia | Usa agregados propios; no expone movimientos crudos | Pendiente | NO EJECUTADA | Añadir |
| RAG | Ingest real verificado | Pregunta cubierta por knowledge base | `rag_enabled` coherente; respuesta grounded | Pendiente | NO EJECUTADA | Añadir |

## 4. Seguridad y aislamiento

| Prueba / endpoint | Precondición | Comando o acción | Resultado esperado | Resultado real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| 401 sin token | Endpoint privado | `curl -i "$API_BASE/transactions"` | 401; sin stack trace | Pendiente | NO EJECUTADA | Añadir |
| 403 por plan | Usuario Basic | Consultar endpoint premium | 403 controlado | Pendiente | NO EJECUTADA | Añadir |
| 404 ownership | Dos usuarios de prueba | Usuario B consulta ID de A | 404 sin revelar existencia | Pendiente | NO EJECUTADA | Añadir |
| DTO whitelist | JWT válido | Enviar campo extra a POST `/transactions` | 400; campo rechazado, no persistido | Pendiente | NO EJECUTADA | Añadir |
| CORS origen hostil | API activa | Enviar `Origin: https://evil.example` | Sin ACAO para origen; navegador bloquea | Pendiente | NO EJECUTADA | Añadir |
| API interna sin key | Endpoint interno | POST `/internal/assistant/financial-context` sin header | 401/500 seguro según configuración; nunca datos | Pendiente | NO EJECUTADA | Añadir |
| IA sin key | IA activa | POST `$AI_ORIGIN/api/v1/chat` sin key | 401/500 seguro; `/health` sigue 200 | Pendiente | NO EJECUTADA | Añadir |
| Rate limiting | Ventana acordada | Superar límite de endpoint seguro | 429 sin caída global | Pendiente | NO EJECUTADA | Añadir |
| Stack traces | Provocar validación/error controlado | Revisar body y logs públicos | Body sin paths/stack/secrets | Pendiente | NO EJECUTADA | Añadir |
| Metadata assistant | Chat válido | Inspeccionar respuesta browser | Sin prompt, chunks, user ID interno, keys ni contexto crudo | Pendiente | NO EJECUTADA | Añadir |
| Separación pública/privada | Bundle frontend | Buscar nombres de variables secretas/valores | Solo `NEXT_PUBLIC_*`; ningún secreto | Pendiente | NO EJECUTADA | Añadir |

## 5. Contrato de errores

| Código / endpoint | Precondición | Comando o acción | Resultado esperado | Resultado real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| 400 | API activa | DTO inválido en POST `/transactions` | 400 con mensaje estable y sin internals | Pendiente | NO EJECUTADA | Añadir |
| 401 | Endpoint protegido | Sin/invalid JWT | 401 | Pendiente | NO EJECUTADA | Añadir |
| 403 | Recurso premium | JWT Basic | 403 | Pendiente | NO EJECUTADA | Añadir |
| 404 | ID inexistente/ajeno | JWT válido | GET `/transactions/<uuid-ajeno>` | 404 | Pendiente | NO EJECUTADA | Añadir |
| 422 | Stack/endpoint que lo use | Payload semánticamente inválido | 422 si el contrato lo define; si Nest usa 400, marcar N/A justificada | Pendiente | NO EJECUTADA | Añadir |
| 429 | Throttler activo | Exceder límite acordado | 429 + recuperación tras ventana | Pendiente | NO EJECUTADA | Añadir |
| 500 controlado | Error interno inyectado en entorno de prueba | Ejecutar caso acordado | 500 genérico; correlación en log | Pendiente | NO EJECUTADA | Añadir |
| 503 DB | Ventana de prueba controlada | Interrumpir DB solo en staging | `/health/ready` 503; live 200; sin corrupción | Pendiente | NO EJECUTADA | Añadir |
| 503 IA | IA temporalmente no disponible en staging | Chat desde backend | 503/502 controlado; resto de API sano | Pendiente | NO EJECUTADA | Añadir |

## Cierre

El smoke se aprueba solo si no quedan `FAIL`/`BLOQUEADA`, los `N/A` tienen justificación firmada y la evidencia no contiene secretos. Limpiar después todos los datos/usuarios de prueba según la política de privacidad, sin borrar evidencia operativa redactada.
