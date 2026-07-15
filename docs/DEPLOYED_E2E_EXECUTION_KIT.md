# Kit de ejecución E2E — entorno DESPLEGADO (MONI)

Ejecuta TÚ estos comandos (tienen tus secretos/JWT). **Nunca pegues** secretos,
JWT ni importes en el chat ni en archivos versionados. Solo me devuelves lo que
cada paso marca como **📋 pegar** (todo es PII-free) o respuestas **Y/N**.

Primero exporta los orígenes reales (sin barra final, sin `/api/v1`):

```bash
# Git Bash / Linux
export API="https://<moni-api-host>"       # backend
export AI="https://<moni-ai-host>"          # ai-service
export WEB="https://<moni-web-host>"        # frontend
```
```powershell
# PowerShell
$API="https://<moni-api-host>"; $AI="https://<moni-ai-host>"; $WEB="https://<moni-web-host>"
```

---

## FASE 2 — Salud (público, sin secretos)

```bash
for u in "$API/health/live" "$API/health/ready" "$AI/health" "$WEB/api/health"; do
  echo -n "$u -> "; curl -s -o /dev/null -w "HTTP %{http_code}  %{time_total}s\n" "$u"
done
curl -s "$API/health/ready"   # cuerpo incluye estado de base de datos
```

📋 **pegar:** las 4 líneas `HTTP <code> <latencia>` y el cuerpo de `/health/ready`
(muestra `database: up/down`, sin secretos).

---

## FASE 3 — Endpoint interno (aísla el wiring del LLM)

Necesitas la clave interna de producción (dashboard de Render) y el `user_id`
(UUID) de una cuenta de prueba con datos conocidos. El `user_id` es el claim
`sub` del JWT (decodifícalo en jwt.io) o búscalo en la tabla `users` de Supabase.

```bash
export KEY="<BACKEND_INTERNAL_API_KEY de Render>"   # no lo pegues en el chat
export UID="<uuid-usuario-prueba>"

# Positivo
curl -s -X POST "$API/api/v1/internal/assistant/financial-context" \
  -H "Content-Type: application/json" -H "X-Internal-API-Key: $KEY" \
  -d "{\"request_id\":\"e2e-int-1\",\"user_id\":\"$UID\",\"plan\":\"basic\",\"allowed_scopes\":[\"app_usage\",\"finance_basic\"]}" \
  > fc.json; echo "HTTP $?"

# Chequeos SEGUROS (imprimen solo booleanos/campos no sensibles, NO importes):
python - <<'PY'
import json
d=json.load(open("fc.json")); s=json.dumps(d)
print("ok            =", d.get("ok"))
print("request_id_ok =", d.get("request_id")=="e2e-int-1")
print("has_summary   =", "summary" in d)
print("tx_count>0    =", d.get("summary",{}).get("transactions_count",0) > 0)
print("period        =", bool(d.get("period")))
print("raw_included  =", d.get("metadata",{}).get("raw_transactions_included"))
print("LEAK_email    =", "@" in s)
print("LEAK_jwt      =", "eyJ" in s)
print("LEAK_merchant =", "merchant" in s.lower())
print("LEAK_userid   =", ("user_id" in s) or (d.get("summary") and False))
PY

# Negativo: clave inválida -> 401
curl -s -o /dev/null -w "neg_http=%{http_code}\n" -X POST "$API/api/v1/internal/assistant/financial-context" \
  -H "Content-Type: application/json" -H "X-Internal-API-Key: clave-invalida" \
  -d "{\"request_id\":\"e2e-neg\",\"user_id\":\"$UID\",\"plan\":\"basic\",\"allowed_scopes\":[\"app_usage\",\"finance_basic\"]}"
rm -f fc.json
```

📋 **pegar:** la salida del bloque `python` (todo booleano) + `neg_http`.
✅ **tú confirmas (Y/N), sin pegar números:** ¿`income_total` y `expense_total`
coinciden con la base de datos de esa cuenta?

**Esperado:** HTTP 200, `ok=True`, `has_summary=True`, `tx_count>0=True`,
`raw_included=False`, todos los `LEAK_*=False`, `neg_http=401`.

---

## FASE 4 — Chat E2E (necesita JWT)

Inicia sesión en la app → DevTools → Application → Local Storage → copia
`accessToken`.

```bash
export JWT="<accessToken>"   # no lo pegues en el chat
curl -s -X POST "$API/api/v1/assistant/chat" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $JWT" \
  -d '{"message":"¿Cómo ves mis finanzas este mes?"}' > chat.json

python - <<'PY'
import json
d=json.load(open("chat.json")); m=d.get("metadata",{}); msg=d.get("message","")
print("METADATA_SAFE:", json.dumps(m))     # seguro: sin importes ni PII
print("ok            =", d.get("ok"))
print("len_chars     =", len(msg))
print("has_think     =", "<think>" in msg)
print("wraps_fence   =", msg.strip().startswith("```"))
print("ends_clean    =", msg.rstrip()[-1:] in ".!?)”\"")
print("says_no_access=", any(t in msg.lower() for t in ["no tengo acceso","no puedo acceder","no tengo información"]))
PY
rm -f chat.json
```

📋 **pegar:** la línea `METADATA_SAFE: {...}` + los booleanos.
✅ **tú confirmas (Y/N):** la respuesta ¿menciona ingresos, gastos y flujo neto?
¿menciona el período? ¿los importes coinciden con la BD? ¿NO inventa datos?

### Logs desplegados (Render → Logs) del mismo request
Los campos `finish_reason`, `generated_tokens`, `financial_context_fetch_failed`
solo están en los **logs** (no en la respuesta HTTP). Ambas líneas son PII-free.

📋 **pegar** del **backend**: la línea `assistant.chat done request_id=... status=ok ...`
(trae `ai_latency_ms`, `response_chars`, `financial_context_present`,
`financial_context_fetch_failed`, `truncated`).

📋 **pegar** del **ai-service**: la línea `chat request_id=... status=ok ...`
(trae `provider_latency_ms`, `finish_reason`, `max_tokens`, `generated_tokens`,
`output_chars`, `truncated`).

**Repite** con `{"message":"Como vez mis finanzass este mes"}` (Fase 6 #12):
debe traer contexto igual.

---

## FASE 5 — Timeouts (solo si FASE 4 falla)

Antes de subir nada, identifica la capa que cortó:
- ai-service log `finish_reason=length` → truncó el LLM (sube `LLM_MAX_TOKENS`).
- ai-service log ausente / `status=error LLMTimeoutError` → timeout del proveedor HF.
- backend log `status=error reason=AbortError`/503 con `ai_latency_ms≈AI_SERVICE_TIMEOUT_MS`
  → **el backend cortó primero** (verifica `AI_SERVICE_TIMEOUT_MS ≥ ~60000` en Render;
  ver hallazgo de inversión, default 30000 < LLM 45000).
- error solo en el navegador a los ~75 s → `ASSISTANT_TIMEOUT_MS`.

Tabla de latencia (solo si hay `finish_reason=length`): repite FASE 4 fijando en
Render `LLM_MAX_TOKENS` = 900, 1200, 2000 y anota de los logs `provider_latency_ms`,
`finish_reason`, `output_chars`. Elige el **menor** valor con `finish_reason=stop`
consistente.

---

## FASE 6 — Frontend (manual, en el navegador, sobre `$WEB`)

Pregunta algo cuya respuesta sea larga y verifica (Y/N):
1. La respuesta completa se recorre con scroll.
2. El composer inferior no tapa el final del mensaje.
3. No hay recorte visual (line-clamp/altura fija).
4. No aparecen fences ```` ```markdown ```` como texto literal.
5. Forzar un error (p. ej. desconecta la red) y pulsar **Reintentar** NO duplica tu pregunta.
6. Si `truncated=true`, aparece el aviso "La respuesta quedó incompleta".
7. Una respuesta normal NO muestra ese aviso.
8. Recargar la página (F5) conserva el mensaje persistido.

---

## Veredicto (yo lo emito con tu evidencia)
- **PASS:** `financial_context_present=true`, `financial_context_fetch_failed=false`,
  `finish_reason=stop`, `truncated=false`, importes correctos, sin fugas.
- **FAIL:** cualquiera de esas condiciones no se cumple.
