-- 202606220001_transactions_classification.sql
-- Agrega la clasificación de finanzas personales a movements y categories:
--   regular_income | extra_income | fixed_expense | variable_expense
-- No se introduce ninguna categoría de inversión.
-- Idempotente: seguro de ejecutar múltiples veces. No borra datos existentes.

-- 1. Enum de clasificación --------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_classification') then
    create type public.transaction_classification as enum (
      'regular_income',
      'extra_income',
      'fixed_expense',
      'variable_expense'
    );
  end if;
end$$;

-- 2. Columnas nuevas en movements -------------------------------------------
alter table public.movements
  add column if not exists classification public.transaction_classification null,
  add column if not exists notes text null;

-- 3. Backfill razonable de clasificación para filas existentes ---------------
--    income -> regular_income, expense -> variable_expense (solo si es null).
update public.movements
  set classification = 'regular_income'::public.transaction_classification
  where classification is null and type = 'income';

update public.movements
  set classification = 'variable_expense'::public.transaction_classification
  where classification is null and type = 'expense';

-- 4. classification obligatoria una vez backfilleada -------------------------
do $$
begin
  if not exists (
    select 1 from public.movements where classification is null
  ) then
    alter table public.movements alter column classification set not null;
  end if;
end$$;

-- 5. Coherencia type/classification (defensa en profundidad) -----------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'movements_type_classification_chk'
  ) then
    alter table public.movements
      add constraint movements_type_classification_chk check (
        (type = 'income'  and classification in ('regular_income', 'extra_income'))
        or
        (type = 'expense' and classification in ('fixed_expense', 'variable_expense'))
      );
  end if;
end$$;

-- 6. Índices útiles ----------------------------------------------------------
create index if not exists idx_movements_user_date
  on public.movements (user_id, movement_date);
create index if not exists idx_movements_user_type_date
  on public.movements (user_id, type, movement_date);
create index if not exists idx_movements_user_classification_date
  on public.movements (user_id, classification, movement_date);

-- 7. Clasificación opcional en categories ------------------------------------
alter table public.categories
  add column if not exists classification public.transaction_classification null;

create index if not exists idx_categories_user_type
  on public.categories (user_id, type);
