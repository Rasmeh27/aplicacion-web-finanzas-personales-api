# Runbook E2E — Contexto financiero del asistente (MONI / Wallter)

Verifica en vivo que (1) el contexto financiero del usuario autenticado llega
realmente al ai-service y (2) la respuesta ya **no** se trunca. Diseñado para
ejecutarse contra Supabase real + Hugging Face. No requiere datos inventados.

Arquitectura del flujo (es **pull**, confirmado en la auditoría):

```
Frontend ──POST /api/v1/assistant/chat {message, session_id} + JWT──▶ Backend (NestJS :3001)
Backend  ──POST {AI}/api/v1/chat {request_id,user,plan,allowed_scopes,message}──▶ ai-service (:8001)
ai-service ──POST {BACKEND}/api/v1/internal/assistant/financial-context {user_id,plan,scopes}──▶ Backend
            (header X-Internal-API-Key)                                          (guard interno)
```

---

## 0. Precondición — claves internas alineadas (la causa raíz de "no tengo acceso")

Las dos claves internas deben coincidir **exactamente** entre servicios. Este es
el fallo que producía "la IA no tiene acceso a mis datos".

| Variable | `apps/backend/.env` | `Financial_ai_assistant/ai-service/.env` | Debe |
|---|---|---|---|
| `AI_SERVICE_INTERNAL_API_KEY` | `<valor-A>` | `<valor-A>` | ser IGUAL en ambos (backend→ai) |
| `BACKEND_INTERNAL_API_KEY` | `<valor-B>` | `<valor-B>` | ser IGUAL en ambos (ai→backend) |

> No pegues las claves reales aquí ni en ningún archivo versionado. En producción
> viven solo en el dashboard de Render (`sync: false`). Ver también la lista de
> rotación en el reporte de seguridad (FASE 7).

Comprobación rápida (PowerShell, desde la raíz del backend):

```powershell
Select-String -Path apps\backend\.env, ..\..\..\Financial_ai_assistant\ai-service\.env `
  -Pattern 'INTERNAL_API_KEY'
```

En el ai-service, además: `ENABLE_FINANCIAL_CONTEXT=true`, `BACKEND_BASE_URL=http://localhost:3001`.

> Si divergen: el asistente responde igual (backend→ai funciona) pero el contexto
> financiero falla en silencio (ai→backend da 401) y el modelo dice "no tengo
> acceso". Ahora ese fallo queda registrado como `financial_context_fetch_failed=true`.

---

## 1. Datos de prueba conocidos

Usa una cuenta de prueba y captura los importes esperados. Créala/edítala desde
la app (módulos Movimientos, Metas, Presupuestos, y —Premium— Inversiones):

- ≥ 1 ingreso (p. ej. 75 000 DOP)
- varios gastos (p. ej. 42 000 DOP en total, en 2–3 categorías)
- 1 meta (p. ej. Fondo de emergencia 25 000 / 100 000)
- 1 presupuesto del mes en curso
- (Premium) ≥ 1 posición de inversión

Anota: **ingresos totales**, **gastos totales**, **flujo neto = ingresos − gastos**
y el **período** (mes actual). Los usarás para comparar.

Obtén el `user_id` (UUID) y un JWT:
- **JWT**: inicia sesión en la app; en el navegador, DevTools → Application →
  Local Storage → copia la clave `accessToken`.
- **user_id**: es el claim `sub` del JWT (decodifícalo en jwt.io) o búscalo en la
  tabla `users` de Supabase para ese email.

---

## 2. Levantar los servicios

```powershell
# Terminal A — ai-service
cd C:\aplicacion-de-finanzas\Financial_ai_assistant\ai-service
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal B — backend (script "dev" = nest start --watch)
cd C:\aplicacion-de-finanzas\backend\aplicacion-web-finanzas-personales-api\aplicacion-web-finanzas-personales-api\apps\backend
npm run dev
```

Salud: `curl http://localhost:8001/health` → `{"status":"ok",...}`.

---

## 3. Paso A — Aísla el WIRING del contexto (sin LLM)

Prueba el endpoint interno directamente. Esto demuestra que el backend construye
el resumen real y que la autenticación interna funciona, **sin** depender del LLM.
Reemplaza `<USER_ID>`:

```bash
# Exporta la clave en tu shell (NO la pegues en archivos versionados):
#   PowerShell: $env:BACKEND_INTERNAL_API_KEY = "<tu-clave>"
#   bash:       export BACKEND_INTERNAL_API_KEY="<tu-clave>"
curl -s -X POST http://localhost:3001/api/v1/internal/assistant/financial-context \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: $BACKEND_INTERNAL_API_KEY" \
  -d '{"request_id":"e2e-1","user_id":"<USER_ID>","plan":"basic","allowed_scopes":["app_usage","finance_basic"]}'
```

**Esperado (Fase 7):**
- HTTP 200 con `"ok": true`.
- `summary.income_total`, `summary.expense_total`, `summary.net_cashflow`
  **coinciden con la base de datos** (los importes que anotaste).
- `period.from` / `period.to` = mes actual.
- `has_sufficient_data: true` (si hay ≥ 3 movimientos).
- **No** aparece `user_id` de otro usuario, ni emails, ni transacciones crudas.

**Fallos comunes:**
- `401` → `BACKEND_INTERNAL_API_KEY` del backend ≠ la que envías. Revisa Paso 0.
- `500` "Internal API is not configured" → falta `BACKEND_INTERNAL_API_KEY` en el backend.
- `404` → el `user_id` no existe.

### Aislamiento entre usuarios (Fase 7 / Fase 6 #1)
Repite el curl con el `user_id` de OTRO usuario: los importes deben ser los de
ese otro usuario (o vacío), nunca mezclados. El backend filtra **toda** consulta
por `user_id`.

---

## 4. Paso B — Flujo completo vía el asistente (con LLM)

Con el JWT del usuario de prueba:

```bash
curl -s -X POST http://localhost:3001/api/v1/assistant/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"message":"¿Cómo ves mis finanzas este mes?"}'
```

(O simplemente escribe la pregunta en el chat de la app.)

**Esperado (Fase 7):**
- HTTP 200, `ok: true`.
- `metadata.financial_context_enabled: true`.
- `metadata.truncated: false`.
- `message` menciona **ingresos, gastos y flujo neto** con importes que coinciden
  con el Paso A, y **menciona el período**.
- **No** dice "no tengo acceso a tus datos".
- **No** inventa cifras; **no** expone IDs internos; **no** suelta una explicación
  genérica de educación financiera no solicitada.

Repite con la variante con errores ortográficos (Fase 6 #12) — debe entenderse
igual y traer contexto:

```bash
-d '{"message":"Como vez mis finanzass este mes"}'
```

---

## 5. Paso C — Leer los logs de diagnóstico (Fase 4)

**Backend** (`assistant.chat done ...`), sin PII (user_id hasheado):
```
ai_latency_ms=...  response_chars=...  financial_context_present=true
financial_context_fetch_failed=false  truncated=false
```

**ai-service** (`chat request_id=... status=ok ...`):
```
provider_latency_ms=...  finish_reason=stop  max_tokens=2000
prompt_tokens=...  generated_tokens=...  output_chars=...  truncated=False
```

Interpretación:
- `financial_context_present=true` ⇒ el contexto llegó al ai-service. ✅
- `finish_reason=stop` + `truncated=false` ⇒ respuesta completa. ✅
- `finish_reason=length` ⇒ **todavía se trunca**: el modelo de razonamiento
  gastó los 2000 tokens. Sube `LLM_MAX_TOKENS` (p. ej. 3000) o usa un modelo no
  razonador. No lo subas "por si acaso": hazlo solo si ves `length`.
- `financial_context_fetch_failed=true` ⇒ el ai-service intentó y el backend
  falló (revisa Paso 0). El usuario recibe respuesta (fail-open) pero sabemos por qué.

---

## 6. Checklist de aceptación (Fase 7)

- [ ] Paso A: HTTP 200 y los importes del `summary` = base de datos.
- [ ] Paso B: `financial_context_enabled=true` y `truncated=false`.
- [ ] La respuesta incluye ingresos, gastos y flujo neto, y menciona el período.
- [ ] No inventa datos ni dice "no tengo acceso".
- [ ] Otro `user_id` nunca devuelve datos del usuario de prueba.
- [ ] La respuesta no queda cortada (revisa el final del `message`).
- [ ] Sin fences ```` ```markdown ```` literales en la UI.
- [ ] La pregunta con errores ortográficos también trae contexto.
```
