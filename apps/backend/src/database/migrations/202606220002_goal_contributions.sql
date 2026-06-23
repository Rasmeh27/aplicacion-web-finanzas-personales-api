-- 202606220002_goal_contributions.sql
-- Trazabilidad de aportes a metas financieras + flag de meta predeterminada
-- (Fondo de emergencia) en financial_goals.
-- Idempotente: seguro de ejecutar múltiples veces. No borra datos existentes.

-- 1. Flag de meta predeterminada (Fondo de emergencia) -----------------------
alter table public.financial_goals
  add column if not exists is_default boolean not null default false;

-- 2. Constraints de montos en financial_goals (defensa en profundidad) -------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'financial_goals_target_amount_chk'
  ) then
    alter table public.financial_goals
      add constraint financial_goals_target_amount_chk check (target_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'financial_goals_current_amount_chk'
  ) then
    alter table public.financial_goals
      add constraint financial_goals_current_amount_chk check (current_amount >= 0);
  end if;
end$$;

-- 3. Tabla de aportes --------------------------------------------------------
create table if not exists public.goal_contributions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  goal_id           uuid not null references public.financial_goals (id) on delete cascade,
  amount            numeric(12, 2) not null check (amount > 0),
  currency          varchar(3) not null default 'DOP',
  contribution_date date not null default current_date,
  note              text null,
  created_at        timestamptz not null default now()
);

-- 4. Índices -----------------------------------------------------------------
create index if not exists idx_goal_contributions_user_id
  on public.goal_contributions (user_id);
create index if not exists idx_goal_contributions_goal_id
  on public.goal_contributions (goal_id);
create index if not exists idx_goal_contributions_user_goal_date
  on public.goal_contributions (user_id, goal_id, contribution_date);

-- 5. Row level security ------------------------------------------------------
alter table public.goal_contributions enable row level security;

drop policy if exists "Users can select own goal contributions" on public.goal_contributions;
create policy "Users can select own goal contributions"
  on public.goal_contributions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own goal contributions" on public.goal_contributions;
create policy "Users can insert own goal contributions"
  on public.goal_contributions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own goal contributions" on public.goal_contributions;
create policy "Users can update own goal contributions"
  on public.goal_contributions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goal contributions" on public.goal_contributions;
create policy "Users can delete own goal contributions"
  on public.goal_contributions
  for delete
  using (auth.uid() = user_id);
