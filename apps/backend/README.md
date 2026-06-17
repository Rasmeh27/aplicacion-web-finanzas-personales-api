# SmartWallet API - CU-001 a CU-010

Este README resume los casos de uso implementados en el backend API y como probarlos manualmente con Swagger y Supabase.

## Estado actual

- Backend: NestJS + TypeORM + Supabase Auth.
- Base de datos: Supabase PostgreSQL.
- Autenticacion: Supabase Auth con Bearer token.
- Perfil del usuario: tabla `public.profiles`.
- Movimientos: tabla `public.movements`.

## Configuracion local

Crear `apps/backend/.env` con valores reales. No subir este archivo al repo.

```env
NODE_ENV=development
API_PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@host:5432/postgres
DATABASE_SSL=true

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Ejecutar

```bash
cd apps/backend
npm run build
npm run start
```

Swagger:

```txt
http://localhost:3001/api/docs
```

## Autorizacion en Swagger

1. Ejecutar `POST /api/v1/auth/login`.
2. Copiar el `accessToken`.
3. Pulsar `Authorize` en Swagger.
4. Pegar el token. Si Swagger no agrega `Bearer` automaticamente, usar:

```txt
Bearer ACCESS_TOKEN
```

## CU-001 Registrarse

Endpoint:

```txt
POST /api/v1/auth/register
```

Body:

```json
{
  "email": "usuario.prueba@gmail.com",
  "password": "Test1234!",
  "fullName": "Usuario Prueba"
}
```

Efecto esperado:

- Crea usuario en `auth.users`.
- Crea/actualiza perfil en `public.profiles` con defaults iniciales (`DOP`, `0`, `20`).
- Si Supabase requiere confirmacion de correo, responde `status = email_confirmation_required` y no devuelve tokens.
- Si Supabase devuelve sesion, responde `status = authenticated` con `accessToken` y `refreshToken`.

Respuesta cuando requiere confirmacion:

```json
{
  "status": "email_confirmation_required",
  "accessToken": null,
  "refreshToken": null,
  "message": "Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
  "user": {
    "id": "...",
    "email": "usuario.prueba@gmail.com",
    "fullName": "Usuario Prueba",
    "primaryCurrency": "DOP",
    "monthlyIncomeEstimate": 0,
    "monthlySavingTargetPct": 20
  }
}
```

Verificacion SQL:

```sql
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.confirmed_at,
  p.full_name,
  p.primary_currency,
  p.monthly_income_estimate,
  p.monthly_saving_target_pct
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'usuario.prueba@gmail.com';
```

## CU-002 Iniciar sesion

Endpoint:

```txt
POST /api/v1/auth/login
```

Body:

```json
{
  "email": "usuario.prueba@gmail.com",
  "password": "Test1234!"
}
```

Respuesta esperada:

```json
{
  "status": "authenticated",
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "email": "usuario.prueba@gmail.com",
    "fullName": "Usuario Prueba",
    "primaryCurrency": "DOP",
    "monthlyIncomeEstimate": 45000,
    "monthlySavingTargetPct": 20
  }
}
```

Si el correo aun no esta confirmado, responde `403` con:

```json
{
  "code": "email_not_confirmed",
  "message": "Debes confirmar tu correo antes de iniciar sesion."
}
```

Si el correo o password son incorrectos, responde `401 Invalid credentials`.

## CU-003 Cerrar sesion

Endpoint:

```txt
POST /api/v1/auth/logout
```

Body:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Respuesta esperada:

```json
{
  "message": "Logged out successfully."
}
```

Nota: logout esta en modo MVP. Todavia no revoca el refresh token en Supabase; queda marcado como TODO para una version posterior con service role o blacklist.

## CU-004 Configurar moneda principal

Endpoint protegido:

```txt
PATCH /api/v1/user/me/preferences
```

Body:

```json
{
  "primaryCurrency": "USD"
}
```

Efecto esperado:

- Actualiza `public.profiles.primary_currency`.

Verificacion SQL:

```sql
select id, full_name, primary_currency
from public.profiles
where id = 'USER_ID';
```

## CU-005 Configurar perfil financiero basico

Endpoint protegido:

```txt
PUT /api/v1/financial-profile/me
```

Body:

```json
{
  "fullName": "Usuario Prueba Actualizado",
  "primaryCurrency": "DOP",
  "monthlyIncomeEstimate": 50000,
  "monthlySavingTargetPct": 25
}
```

Efecto esperado:

- Actualiza la fila del usuario en `public.profiles`.

Verificacion SQL:

```sql
select
  id,
  full_name,
  primary_currency,
  monthly_income_estimate,
  monthly_saving_target_pct,
  updated_at
from public.profiles
where id = 'USER_ID';
```

## CU-006 Registrar ingreso

Endpoint protegido:

```txt
POST /api/v1/movements
```

Body:

```json
{
  "type": "income",
  "amount": 30000,
  "currency": "DOP",
  "description": "Ingreso manual Swagger",
  "date": "2026-06-03"
}
```

Efecto esperado:

- Inserta una fila en `public.movements` con `type = income`.

## CU-007 Registrar gasto

Endpoint protegido:

```txt
POST /api/v1/movements
```

Body:

```json
{
  "type": "expense",
  "amount": 1200,
  "currency": "DOP",
  "description": "Gasto manual Swagger",
  "date": "2026-06-03"
}
```

Efecto esperado:

- Inserta una fila en `public.movements` con `type = expense`.

## CU-008 Editar movimiento

Endpoint protegido:

```txt
PUT /api/v1/movements/{id}
```

Body:

```json
{
  "amount": 1500,
  "description": "Gasto manual Swagger editado"
}
```

Efecto esperado:

- Actualiza solo movimientos del usuario autenticado.
- Si el movimiento no existe o no pertenece al usuario, responde `404`.

## CU-009 Eliminar movimiento

Endpoint protegido:

```txt
DELETE /api/v1/movements/{id}
```

Respuesta esperada:

```txt
204 No Content
```

Efecto esperado:

- Elimina solo movimientos del usuario autenticado.
- Buscar el mismo `id` luego debe responder `404`.

## CU-010 Consultar historial de movimientos

Endpoint protegido:

```txt
GET /api/v1/movements
```

Query params soportados:

```txt
type=income|expense
categoryId=UUID
startDate=2026-06-01
endDate=2026-06-30
limit=20
offset=0
```

Respuesta esperada:

```json
{
  "items": [
    {
      "id": "...",
      "type": "income",
      "amount": "30000.00",
      "currency": "DOP",
      "description": "Ingreso manual Swagger",
      "date": "2026-06-03"
    }
  ],
  "total": 1
}
```

## SQL para verificar movimientos

Por usuario:

```sql
select
  id,
  user_id,
  category_id,
  type,
  amount,
  currency,
  description,
  movement_date,
  created_at,
  updated_at
from public.movements
where user_id = 'USER_ID'
order by created_at desc;
```

Por email:

```sql
select
  m.id,
  u.email,
  m.type,
  m.amount,
  m.currency,
  m.description,
  m.movement_date,
  m.created_at,
  m.updated_at
from public.movements m
join auth.users u on u.id = m.user_id
where u.email = 'usuario.prueba@gmail.com'
order by m.created_at desc;
```

## Validaciones tecnicas

```bash
cd apps/backend
npm run build
npm test -- --runInBand
```

## Notas para el equipo

- Usar `/api/v1/movements`, no `/api/v1/transactions`.
- No subir `.env`.
- `apps/backend/.env.example` documenta las variables requeridas.
- Las tablas de Supabase usadas por estos casos son `auth.users`, `public.profiles` y `public.movements`.
