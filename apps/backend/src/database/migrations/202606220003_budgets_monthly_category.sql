-- 202606220003_budgets_monthly_category.sql
-- Amplía budgets para presupuestos mensuales por categoría con métricas:
--   period_type, month, year, alert_threshold_pct, is_active.
-- El gasto (spentAmount) NUNCA se persiste: se calcula desde movements.
-- Idempotente: seguro de ejecutar múltiples veces. No borra datos existentes.

-- 1. Columnas nuevas ---------------------------------------------------------
alter table public.budgets
  add column if not exists period_type        text    not null default 'monthly',
  add column if not exists month               integer null,
  add column if not exists year                integer null,
  add column if not exists alert_threshold_pct integer not null default 80,
  add column if not exists is_active           boolean not null default true;

-- 2. Backfill month/year desde period_month para filas existentes ------------
update public.budgets
  set month = extract(month from period_month)::int
  where month is null and period_month is not null;

update public.budgets
  set year = extract(year from period_month)::int
  where year is null and period_month is not null;

-- 3. Constraints de validación (defensa en profundidad) ----------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budgets_period_type_chk') then
    alter table public.budgets
      add constraint budgets_period_type_chk check (period_type in ('monthly'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budgets_month_chk') then
    alter table public.budgets
      add constraint budgets_month_chk check (month is null or (month between 1 and 12));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budgets_year_chk') then
    alter table public.budgets
      add constraint budgets_year_chk check (year is null or (year between 2000 and 2100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budgets_alert_threshold_chk') then
    alter table public.budgets
      add constraint budgets_alert_threshold_chk check (alert_threshold_pct between 1 and 100);
  end if;
end$$;

-- 4. Unicidad activo-aware para presupuestos por categoría -------------------
--    Permite tener inactivos (soft-deleted) y recrear uno activo para el mismo
--    (usuario, categoría, periodo). Reemplaza el índice no-activo previo.
drop index if exists public.budgets_user_month_category_idx;
create unique index if not exists budgets_active_user_category_period_idx
  on public.budgets (user_id, category_id, period_month)
  where category_id is not null and is_active = true;

-- 5. Índices útiles ----------------------------------------------------------
create index if not exists idx_budgets_user_id
  on public.budgets (user_id);
create index if not exists idx_budgets_user_month_year
  on public.budgets (user_id, year, month);
create index if not exists idx_budgets_user_category_month_year
  on public.budgets (user_id, category_id, year, month);
create index if not exists idx_budgets_category_id
  on public.budgets (category_id);
