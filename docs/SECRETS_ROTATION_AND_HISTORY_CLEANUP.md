# Rotación de credenciales + limpieza de historial (MONI)

Motivo: la auditoría (FASE 7) encontró `.env` reales en el **historial de git** del
repo del backend (commit `ccffa36` "Revisar archivo .env" y el archivo
`.env.backup-ai-key-sync`). El historial es recuperable aunque los archivos ya no
estén en el árbol actual. El repo del ai-service estaba limpio (solo `.env.example`).

**Orden correcto:** (1) ROTAR primero — invalida los valores filtrados aunque sigan
en el historial; (2) LIMPIAR el historial — defensa en profundidad; (3) fijar los
valores nuevos **solo** en los dashboards de Render (`sync:false`), nunca en git.

> Ninguno de estos pasos los ejecuté yo. Requieren tus credenciales y reescriben
> historia compartida.

## 1. Credenciales a rotar (prioridad ↓)

| # | Credencial | Dónde rotar | Luego actualizar en |
|---|---|---|---|
| 1 | **Password de Postgres** (dentro de `DATABASE_URL`) | Supabase → Project → Database → Reset database password | Render `moni-api` → `DATABASE_URL` |
| 2 | **`SUPABASE_SERVICE_ROLE_KEY`** (en backup local; alta sensibilidad) | Supabase → Project → API → Rotate service_role/JWT secret | Render `moni-api` |
| 3 | **Claves internas** `AI_SERVICE_INTERNAL_API_KEY` y `BACKEND_INTERNAL_API_KEY` (débiles + en historial) | Genera 2 secretos fuertes nuevos (abajo) | Render `moni-api` **y** `moni-ai` (deben coincidir por par) |
| 4 | **`ALPHA_VANTAGE_API_KEY`** (= `MARKET_DATA_API_KEY`) | alphavantage.co → nueva API key | Render `moni-api` |
| 5 | **`NEWS_API_KEY`** | newsapi.org → regenerar | Render `moni-api` |
| 6 | **`EMAILJS_PRIVATE_KEY`** | dashboard de EmailJS → regenerar | Render `moni-api` |
| 7 | `SUPABASE_PUBLISHABLE_KEY` | menor riesgo; rota si Supabase lo permite | Render `moni-api` |

Generar claves internas fuertes (elige y guarda en el gestor de secretos, no en git):
```bash
# dos valores distintos
openssl rand -hex 32     # -> AI_SERVICE_INTERNAL_API_KEY
openssl rand -hex 32     # -> BACKEND_INTERNAL_API_KEY
```
```powershell
[Convert]::ToHexString((1..32|%{Get-Random -Max 256})).ToLower()   # x2
```
Requisito de coincidencia (revalídalo tras rotar):
- `moni-api.AI_SERVICE_INTERNAL_API_KEY` == `moni-ai.AI_SERVICE_INTERNAL_API_KEY`
- `moni-api.BACKEND_INTERNAL_API_KEY`   == `moni-ai.BACKEND_INTERNAL_API_KEY`

Tras actualizar en Render: **redeploy** de ambos servicios y repite la FASE 3 del
kit E2E para confirmar que el endpoint interno sigue autenticando (200) y el
negativo da 401.

## 2. Limpieza del historial de git (tras rotar)

⚠️ Reescribe SHAs e historia: coordina con todos los colaboradores, haz backup y
fuerza el push. Hazlo en un clon fresco.

```bash
# 0) Backup
git clone --mirror <url-repo-backend> backend-backup.git

# 1) En un clon normal, instala git-filter-repo (https://github.com/newren/git-filter-repo)
pip install git-filter-repo

# 2) Purga los archivos sensibles de TODO el historial
git filter-repo --force \
  --path apps/backend/.env \
  --path apps/api/.env \
  --path apps/backend/.env.backup-ai-key-sync \
  --invert-paths

# 3) Revisa que ya no aparezcan
git log --all --oneline -- apps/backend/.env apps/api/.env apps/backend/.env.backup-ai-key-sync   # vacío
git rev-list --all --objects | grep -iE '\.env(\.|$)' | grep -v example   # vacío

# 4) Push forzado (todas las ramas y tags)
git push origin --force --all
git push origin --force --tags
```
Notas:
- GitHub puede conservar cachés/PRs con los blobs viejos; abre un ticket a soporte
  de GitHub si necesitas purga total. Igualmente, **la rotación del paso 1 es lo
  que realmente protege**.
- Borra los backups locales con secretos: `apps/backend/.env.backup-ai-key-sync`
  y cualquier `.env` que no necesites. Verifica que `.env` sigue en `.gitignore`
  (lo está).

## 3. Prevención
- Nunca commitear `.env` (ya ignorado). Evita crear `*.env.backup*` con valores reales.
- Considera un hook/CI de escaneo de secretos (gitleaks/trufflehog) en el pipeline.
- Mantén todos los valores reales solo en Render (`sync:false`) y en tu gestor de secretos.
