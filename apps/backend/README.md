# SmartWallet Backend API

Guia rapida para levantar el backend y probar manualmente los casos de uso implementados con Swagger y Supabase SQL Editor.

## Estado actual

- Backend: NestJS + TypeORM + Supabase Auth.
- Base de datos: Supabase PostgreSQL.
- Autenticacion: Bearer token de Supabase.
- Ruta base: `/api/v1`.
- Swagger: `http://localhost:3001/api/docs`.
- Tablas principales: `auth.users`, `public.profiles`, `public.movements`, `public.categories`, `public.budgets`, `public.financial_goals`, `public.debts`, `public.debt_payments`.

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

## Ejecutar y validar

```bash
cd apps/backend
npm run build
npm run start
```

Validacion tecnica:

```bash
npm run build
npm test -- --runInBand
```

Desde la raiz del monorepo:

```bash
npm run build
npm test
```

## Autorizacion en Swagger

1. Ejecutar `POST /api/v1/auth/login`.
2. Copiar `accessToken`.
3. Abrir `Authorize` en Swagger.
4. Pegar el token como `Bearer ACCESS_TOKEN` si Swagger no agrega el prefijo automaticamente.

En desarrollo, los endpoints protegidos tambien aceptan `x-user-id` si no hay JWT y `NODE_ENV` no es `production`.

## Variables usadas en SQL

Reemplazar estos valores en los ejemplos:

```txt
USER_ID=uuid del usuario autenticado
EMAIL=correo usado en register/login
MOVEMENT_ID=uuid de public.movements
CATEGORY_ID=uuid de public.categories
BUDGET_ID=uuid de public.budgets
GOAL_ID=uuid de public.financial_goals
DEBT_ID=uuid de public.debts
```

Buscar usuario y perfil por email:

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
where u.email = 'EMAIL';
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
  "fullName": "Usuario Prueba",
  "primaryCurrency": "DOP",
  "monthlyIncomeEstimate": 45000,
  "monthlySavingTargetPct": 20
}
```

Respuesta esperada:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "email": "usuario.prueba@gmail.com",
    "fullName": "Usuario Prueba",
    "primaryCurrency": "DOP"
  }
}
```

SQL:

```sql
select u.id, u.email, p.full_name, p.primary_currency
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

Respuesta esperada: `accessToken`, `refreshToken` y datos del usuario/perfil.

SQL:

```sql
select id, email, last_sign_in_at
from auth.users
where email = 'usuario.prueba@gmail.com';
```

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

SQL: no cambia tablas para MVP. Logout queda simple; TODO futuro: revocar refresh token o blacklist.

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

Respuesta esperada: perfil actualizado.

SQL:

```sql
select id, full_name, primary_currency, updated_at
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

Respuesta esperada: perfil actualizado.

SQL:

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
POST /api/v1/transactions
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

Respuesta esperada: movimiento creado con `type = income`.

SQL:

```sql
select *
from public.movements
where user_id = 'USER_ID' and type = 'income'
order by created_at desc;
```

## CU-007 Registrar gasto

Endpoint protegido:

```txt
POST /api/v1/transactions
```

Body:

```json
{
  "type": "expense",
  "amount": 1200,
  "currency": "DOP",
  "description": "Gasto manual Swagger",
  "date": "2026-06-03",
  "categoryId": "CATEGORY_ID"
}
```

Respuesta esperada: movimiento creado con `type = expense`.

SQL:

```sql
select *
from public.movements
where user_id = 'USER_ID' and type = 'expense'
order by created_at desc;
```

## CU-008 Editar movimiento

Endpoint protegido:

```txt
PUT /api/v1/transactions/{id}
```

Body:

```json
{
  "amount": 1500,
  "description": "Gasto manual Swagger editado"
}
```

Respuesta esperada: movimiento actualizado. Si no existe o no pertenece al usuario, `404`.

SQL:

```sql
select id, amount, description, updated_at
from public.movements
where id = 'MOVEMENT_ID' and user_id = 'USER_ID';
```

## CU-009 Eliminar movimiento

Endpoint protegido:

```txt
DELETE /api/v1/transactions/{id}
```

Respuesta esperada:

```txt
204 No Content
```

SQL:

```sql
select *
from public.movements
where id = 'MOVEMENT_ID' and user_id = 'USER_ID';
```

Debe devolver 0 filas si se elimino correctamente.

## CU-010 Consultar historial de movimientos

Endpoint protegido:

```txt
GET /api/v1/transactions
```

Query params:

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
  "total": 1,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

SQL:

```sql
select *
from public.movements
where user_id = 'USER_ID'
order by movement_date desc, created_at desc;
```

## CU-011 Filtrar movimientos

Endpoint protegido:

```txt
GET /api/v1/transactions?type=expense&startDate=2026-06-01&endDate=2026-06-30&limit=20&offset=0
```

Body: no aplica.

Respuesta esperada: misma estructura paginada de CU-010, filtrada.

SQL:

```sql
select *
from public.movements
where user_id = 'USER_ID'
  and type = 'expense'
  and movement_date between '2026-06-01' and '2026-06-30'
order by movement_date desc, created_at desc;
```

## CU-012 Crear presupuesto mensual

Endpoint protegido:

```txt
POST /api/v1/budget
```

Body:

```json
{
  "name": "Presupuesto mensual junio 2026",
  "month": 6,
  "year": 2026,
  "limitAmount": 25000,
  "currency": "DOP"
}
```

Respuesta esperada: presupuesto creado con `categoryId = null`.

SQL:

```sql
select *
from public.budgets
where user_id = 'USER_ID'
  and category_id is null
  and period_month = '2026-06-01';
```

## CU-013 Crear presupuesto por categoria

Endpoint protegido:

```txt
POST /api/v1/budget/category
```

Body:

```json
{
  "categoryId": "CATEGORY_ID",
  "name": "Presupuesto comida junio 2026",
  "month": 6,
  "year": 2026,
  "limitAmount": 8500,
  "currency": "DOP"
}
```

Respuesta esperada: presupuesto creado para una categoria de gasto.

SQL:

```sql
select b.*, c.name as category_name
from public.budgets b
left join public.categories c on c.id = b.category_id
where b.user_id = 'USER_ID'
  and b.category_id = 'CATEGORY_ID'
  and b.period_month = '2026-06-01';
```

## CU-014 Ver avance de presupuesto

Endpoint protegido:

```txt
GET /api/v1/budget/progress?year=2026&month=6
```

Body: no aplica.

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "budgets": [
    {
      "id": "...",
      "name": "Presupuesto mensual junio 2026",
      "categoryId": null,
      "limitAmount": 25000,
      "spentAmount": 1200,
      "remainingAmount": 23800,
      "progressPercentage": 4.8,
      "isExceeded": false,
      "currency": "DOP"
    }
  ]
}
```

SQL:

```sql
select *
from public.budgets
where user_id = 'USER_ID'
  and period_month = '2026-06-01'
order by created_at desc;
```

## CU-015 Crear meta financiera

Endpoint protegido:

```txt
POST /api/v1/planning/goals
```

Body:

```json
{
  "name": "Fondo de emergencia",
  "targetAmount": 50000,
  "currentAmount": 5000,
  "currency": "DOP",
  "targetDate": "2026-12-31"
}
```

Respuesta esperada: meta creada con `status = active` o `completed` si `currentAmount >= targetAmount`.

SQL:

```sql
select *
from public.financial_goals
where user_id = 'USER_ID'
order by created_at desc;
```

## CU-016 Registrar deuda

Endpoint protegido:

```txt
POST /api/v1/planning/debts
```

Body:

```json
{
  "name": "Prestamo del carro",
  "creditor": "Banco Popular",
  "initialAmount": 150000,
  "minimumPayment": 7500,
  "interestRatePct": 12.5,
  "dueDay": 15,
  "currency": "DOP"
}
```

Respuesta esperada: deuda creada con `status = active`.

SQL:

```sql
select *
from public.debts
where user_id = 'USER_ID'
order by created_at desc;
```

## CU-017 Registrar pago de deuda

Endpoint protegido:

```txt
POST /api/v1/planning/debts/{debtId}/payments
```

Body:

```json
{
  "amount": 7500,
  "paymentDate": "2026-06-30",
  "note": "Pago mensual"
}
```

Respuesta esperada: pago creado. Si el pago completa la deuda, la deuda pasa a `paid`.

SQL:

```sql
select *
from public.debt_payments
where user_id = 'USER_ID'
  and debt_id = 'DEBT_ID'
order by created_at desc;

select id, status
from public.debts
where id = 'DEBT_ID'
  and user_id = 'USER_ID';
```

## CU-018 Calcular ratio deuda/ingreso

Endpoint protegido:

```txt
GET /api/v1/planning/debts/income-ratio?year=2026&month=6
```

Body: no aplica.

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalMonthlyIncome": 30000,
  "totalMinimumDebtPayment": 7500,
  "debtIncomeRatio": 25,
  "riskLevel": "healthy",
  "isHealthy": true
}
```

SQL:

```sql
select
  (select coalesce(sum(amount), 0)
   from public.movements
   where user_id = 'USER_ID'
     and type = 'income'
     and movement_date between '2026-06-01' and '2026-06-30') as total_income,
  (select coalesce(sum(minimum_payment), 0)
   from public.debts
   where user_id = 'USER_ID'
     and status = 'active') as total_minimum_debt_payment;
```

## CU-019 Ver total de ingresos del mes

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/monthly-income-total?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 30000,
  "currency": "DOP"
}
```

SQL:

```sql
select coalesce(sum(amount), 0) as total_income
from public.movements
where user_id = 'USER_ID'
  and type = 'income'
  and movement_date between '2026-06-01' and '2026-06-30';
```

## CU-020 Ver total de gastos del mes

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/monthly-expense-total?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalExpense": 1200,
  "currency": "DOP"
}
```

SQL:

```sql
select coalesce(sum(amount), 0) as total_expense
from public.movements
where user_id = 'USER_ID'
  and type = 'expense'
  and movement_date between '2026-06-01' and '2026-06-30';
```

## CU-021 Ver balance mensual

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/monthly-balance?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 30000,
  "totalExpense": 1200,
  "balance": 28800,
  "currency": "DOP"
}
```

SQL:

```sql
select
  coalesce(sum(case when type = 'income' then amount else 0 end), 0) as total_income,
  coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as total_expense,
  coalesce(sum(case when type = 'income' then amount else -amount end), 0) as balance
from public.movements
where user_id = 'USER_ID'
  and movement_date between '2026-06-01' and '2026-06-30';
```

## CU-022 Ver porcentaje de ahorro

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/savings-percentage?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 30000,
  "totalExpense": 1200,
  "savedAmount": 28800,
  "savingsPercentage": 96,
  "currency": "DOP"
}
```

SQL:

```sql
with totals as (
  select
    coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income,
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expense
  from public.movements
  where user_id = 'USER_ID'
    and movement_date between '2026-06-01' and '2026-06-30'
)
select
  income,
  expense,
  income - expense as saved_amount,
  case when income > 0 then round(((income - expense) / income) * 100, 2) else null end as savings_percentage
from totals;
```

## CU-023 Ver gastos por categoria

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/expenses-by-category?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalExpense": 1200,
  "categories": [
    {
      "categoryId": "...",
      "categoryName": "Alimentacion",
      "totalExpense": 1200,
      "percentage": 100
    }
  ],
  "currency": "DOP"
}
```

SQL:

```sql
select
  m.category_id,
  coalesce(c.name, 'Sin categoria') as category_name,
  sum(m.amount) as total_expense
from public.movements m
left join public.categories c on c.id = m.category_id
where m.user_id = 'USER_ID'
  and m.type = 'expense'
  and m.movement_date between '2026-06-01' and '2026-06-30'
group by m.category_id, c.name
order by total_expense desc;
```

## CU-024 Ver resumen de metas

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/financial-goals-summary
```

Respuesta esperada:

```json
{
  "totalGoals": 1,
  "activeGoals": 1,
  "completedGoals": 0,
  "totalTargetAmount": 50000,
  "totalCurrentAmount": 5000,
  "overallProgressPercentage": 10,
  "currency": "DOP",
  "goals": []
}
```

SQL:

```sql
select *
from public.financial_goals
where user_id = 'USER_ID'
order by created_at desc;
```

## CU-025 Ver resumen de deudas

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/debts-summary
```

Respuesta esperada:

```json
{
  "totalDebts": 1,
  "activeDebts": 1,
  "paidDebts": 0,
  "totalInitialAmount": 150000,
  "totalPaidAmount": 7500,
  "totalRemainingAmount": 142500,
  "totalMinimumPayment": 7500,
  "averageInterestRatePct": 12.5,
  "currency": "DOP",
  "debts": []
}
```

SQL:

```sql
select d.*, coalesce(sum(p.amount), 0) as paid_amount
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
where d.user_id = 'USER_ID'
group by d.id
order by d.created_at desc;
```

## CU-026 Calcular salud financiera

Endpoint protegido:

```txt
GET /api/v1/dashboard-reports/financial-health?year=2026&month=6
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 30000,
  "totalExpense": 1200,
  "monthlyBalance": 28800,
  "savingsPercentage": 96,
  "debtIncomeRatio": 25,
  "totalDebtRemaining": 142500,
  "goalsProgressPercentage": 10,
  "financialHealthScore": 80,
  "status": "excellent",
  "recommendations": [
    "Priorizar pagos a deudas activas para bajar el saldo pendiente."
  ],
  "currency": "DOP"
}
```

SQL recomendado para comparar insumos:

```sql
select *
from public.movements
where user_id = 'USER_ID'
  and movement_date between '2026-06-01' and '2026-06-30'
order by movement_date desc;

select *
from public.debts
where user_id = 'USER_ID'
order by created_at desc;

select *
from public.debt_payments
where user_id = 'USER_ID'
order by created_at desc;

select *
from public.financial_goals
where user_id = 'USER_ID'
order by created_at desc;
```

## Consultas utiles

Movimientos por email:

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
where u.email = 'EMAIL'
order by m.created_at desc;
```

Datos principales por usuario:

```sql
select * from public.profiles where id = 'USER_ID';
select * from public.categories where user_id = 'USER_ID' order by created_at desc;
select * from public.budgets where user_id = 'USER_ID' order by created_at desc;
select * from public.financial_goals where user_id = 'USER_ID' order by created_at desc;
select * from public.debts where user_id = 'USER_ID' order by created_at desc;
select * from public.debt_payments where user_id = 'USER_ID' order by created_at desc;
```

## Notas para el equipo

- En codigo el modulo se llama `movements`, pero el controlador expone `/api/v1/transactions`.
- La tabla de base de datos para ingresos/gastos es `public.movements`.
- No subir `.env`; usar `.env.example`.
- Usar datos de prueba claros y borrar registros temporales si se contamina la base compartida.
