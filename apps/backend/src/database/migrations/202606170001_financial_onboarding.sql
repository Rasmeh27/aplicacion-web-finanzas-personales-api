-- 202606170001_financial_onboarding.sql
-- Financial onboarding: profile summary + onboarding state columns and the
-- planned_financial_items table that stores ESTIMATED/PLANNED financial items.
-- NOTE: real transactions still live in public.movements. This table is only
-- for the planned amounts captured during onboarding.
-- Idempotent: safe to run multiple times.

-- 1. Profile summary + onboarding state columns ------------------------------
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz null,
  add column if not exists onboarding_version integer not null default 1,
  add column if not exists monthly_fixed_expense_estimate numeric(14, 2) not null default 0,
  add column if not exists monthly_variable_expense_estimate numeric(14, 2) not null default 0,
  add column if not exists monthly_saving_target_amount numeric(14, 2) null;

-- 2. Enums -------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'planned_financial_item_type') then
    create type public.planned_financial_item_type as enum ('income', 'fixed_expense', 'variable_expense');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'financial_item_frequency') then
    create type public.financial_item_frequency as enum ('weekly', 'biweekly', 'monthly', 'yearly');
  end if;
end$$;

-- 3. Planned financial items table -------------------------------------------
create table if not exists public.planned_financial_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          public.planned_financial_item_type not null,
  name          text not null,
  amount        numeric(14, 2) not null check (amount >= 0),
  currency      varchar(3) not null default 'DOP',
  frequency     public.financial_item_frequency not null default 'monthly',
  category_name text null,
  notes         text null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 4. Indexes -----------------------------------------------------------------
create index if not exists idx_planned_financial_items_user_id
  on public.planned_financial_items (user_id);
create index if not exists idx_planned_financial_items_user_type
  on public.planned_financial_items (user_id, type);
create index if not exists idx_planned_financial_items_user_active
  on public.planned_financial_items (user_id, is_active);

-- 5. Row level security ------------------------------------------------------
alter table public.planned_financial_items enable row level security;

drop policy if exists "Users can select own planned financial items" on public.planned_financial_items;
create policy "Users can select own planned financial items"
  on public.planned_financial_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own planned financial items" on public.planned_financial_items;
create policy "Users can insert own planned financial items"
  on public.planned_financial_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own planned financial items" on public.planned_financial_items;
create policy "Users can update own planned financial items"
  on public.planned_financial_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own planned financial items" on public.planned_financial_items;
create policy "Users can delete own planned financial items"
  on public.planned_financial_items
  for delete
  using (auth.uid() = user_id);

-- 6. updated_at trigger ------------------------------------------------------
-- Reusable timestamp helper (no existing one in the project).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_planned_financial_items_updated_at on public.planned_financial_items;
create trigger set_planned_financial_items_updated_at
  before update on public.planned_financial_items
  for each row
  execute function public.set_updated_at();
