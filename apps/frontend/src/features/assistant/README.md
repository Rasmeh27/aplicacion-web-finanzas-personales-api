# Wallter — asistente financiero (frontend)

Chat con **Wallter** a través de un **bubble flotante global** que abre un
**panel lateral derecho**. El frontend habla SOLO con el backend NestJS; nunca
con el ai-service.

## Cómo se abre el chat

- Botón flotante (FAB) abajo a la derecha en toda la app autenticada
  (montado en `DashboardLayout`, no aparece en login/register/onboarding).
- También desde la página **Wallter** del sidebar (`/ai-assistant`), botón
  "Abrir chat con Wallter".
- El estado del chat (mensajes, `session_id`, abierto/cerrado) vive en un store
  global (`store/slices/wallter.store.ts`), así que la conversación sobrevive al
  cerrar el panel y al navegar entre páginas.

## Estructura

```
features/assistant/
  types.ts                         # tipos (chat, sesiones, metadata segura)
  services/assistant.service.ts    # cliente API (solo backend) + buildChatBody
  utils/detect-leaks.ts            # detector QA de fugas (dev)
  components/
    AssistantMarkdownMessage.tsx   # render Markdown SEGURO (sin HTML crudo)
    AssistantMessageBubble.tsx     # burbuja user/assistant (usa Markdown)
    AssistantComposer.tsx          # textarea (Enter envía, Shift+Enter salto) + cancelar
    AssistantDebugPanel.tsx        # panel dev: request_id/rag/financial/latency
    WallterChatBubble.tsx          # FAB global -> monta el drawer
    WallterChatDrawer.tsx          # panel lateral derecho (orquestador del chat)
    WallterSettingsView.tsx        # página /ai-assistant (configuración, no chat)
store/slices/wallter.store.ts      # estado global (zustand)
app/ai-assistant/page.tsx          # ruta de configuración de Wallter
```

## Contrato con el backend

`POST /api/v1/assistant/chat` — body **exclusivamente**:

```json
{ "message": "string", "session_id": "uuid opcional" }
```

`buildChatBody(message, sessionId)` garantiza ese whitelist: el frontend NUNCA
envía `user_id`, `plan`, `allowed_scopes`, `email` ni `metadata` (los resuelve el
backend desde el JWT). Sesiones: `GET /assistant/sessions`,
`GET /assistant/sessions/:id/messages`, `PATCH /assistant/sessions/:id`,
`DELETE /assistant/sessions/:id`. Auth (Bearer JWT), base URL y refresh 401 los
maneja el `apiClient` compartido. Timeout de cliente: **75s**.

## Render de Markdown

`AssistantMarkdownMessage` convierte la respuesta (que llega en Markdown) a
elementos React: párrafos, **negritas**, *itálicas*, listas numeradas y con
viñetas, `código inline`, encabezados y links (solo http/https). **No** usa
`dangerouslySetInnerHTML` ni interpreta HTML crudo (cualquier HTML se muestra
como texto), así que no puede inyectar markup ni scripts.

## Seguridad / privacidad

- El chat nunca muestra prompts internos, chunks, `raw financial context`,
  `user_id`, `plan`, `allowed_scopes`, provider/model ni secretos.
- El panel de debug (solo `NODE_ENV !== 'production'`) muestra únicamente los
  campos seguros que expone el backend: `request_id`, `rag_enabled`,
  `financial_context_enabled`, y la latencia medida en el cliente.
- Wallter no menciona RAG/Chroma/embeddings/LLM/Hugging Face al usuario, no dice
  ver transacciones crudas y no promete asesoría profesional.

## Estados

- Loading: "Wallter está analizando tu información…"; tras 15s "Esto puede tardar
  un poco por el análisis con IA." (DeepSeek-R1 puede tardar 30–60s).
- Errores amigables: 401 → sesión expiró (redirige a login); 400 → revisa el
  mensaje; 503/504 → tardó demasiado, reintenta; 500/502 → no disponible.
- Cancelar: botón que aborta el request en vuelo (AbortController).

## Cómo probar (manual)

Backend en `:3001` y ai-service en `:8001`. En el ai-service `.env`:
`LLM_PROVIDER=huggingface`, `ENABLE_RAG=true`, `ENABLE_FINANCIAL_CONTEXT=true`;
en el backend `.env`: `AI_SERVICE_TIMEOUT_MS=60000`.

1. `npm --prefix apps/backend run start`  (o `run dev`)
2. `npm --prefix apps/frontend run dev`  → http://localhost:3000
3. Inicia sesión con un usuario de prueba, abre el FAB de Wallter y pregunta:
   - "¿Cómo creo una meta de ahorro?" → Markdown limpio, sin `**`, sin `<think>`.
   - "¿Cómo van mis gastos este mes?" → usa el resumen financiero si hay datos
     (`financial_context_enabled=true` en el panel dev).
   - "¿Debo tomar un préstamo para invertir?" → lo desaconseja, sin prometer
     rendimientos ni recomendar instrumentos.
4. En la pestaña Network, confirma que el body de `/assistant/chat` solo tiene
   `message` (y `session_id` a partir del 2º mensaje).

## Tests

El frontend no tiene runner de tests configurado. La lógica crítica
(`buildChatBody`, `detectAssistantLeaks`) es pura y se verificó por separado; los
demás casos quedan como checklist de QA manual (arriba). Al agregar
Vitest/Jest, estas funciones puras son el primer objetivo de test.
