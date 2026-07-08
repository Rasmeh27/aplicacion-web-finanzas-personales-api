-- 202607060002_subscription_plans_user_subscriptions.sql
-- Fuente de verdad del plan del usuario (basic | premium).
-- Idempotente: seguro de ejecutar múltiples veces. No borra datos existentes.
-- No crea usuarios ni suscripciones de prueba: solo el catálogo de planes.

-- 1. Catálogo de planes ------------------------------------------------------
create table if not exists public.subscription_plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Suscripciones por usuario ----------------------------------------------
create table if not exists public.user_subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  plan_code            text not null references public.subscription_plans (code),
  status               text not null,
  started_at           timestamptz not null default now(),
  current_period_start timestamptz null,
  current_period_end   timestamptz null,
  canceled_at          timestamptz null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_subscriptions_status_chk'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_status_chk
      check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired'));
  end if;
end$$;

-- 3. Índices -----------------------------------------------------------------
create index if not exists idx_user_subscriptions_user_id
  on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_user_status
  on public.user_subscriptions (user_id, status);
create index if not exists idx_user_subscriptions_plan_code
  on public.user_subscriptions (plan_code);
create index if not exists idx_user_subscriptions_user_period_end
  on public.user_subscriptions (user_id, current_period_end desc);

-- 4. Seed de planes (idempotente) -------------------------------------------
insert into public.subscription_plans (code, name, description)
values
  ('basic',   'Basic',   'Plan básico gratuito.'),
  ('premium', 'Premium', 'Plan premium con capacidades avanzadas del asistente.')
on conflict (code) do nothing;

-- 5. Row level security ------------------------------------------------------
-- El backend accede con un rol que omite RLS; estas políticas son defensa en
-- profundidad para el acceso directo con la clave anon/authenticated.

-- subscription_plans: catálogo público de solo lectura (sin escritura de usuarios).
alter table public.subscription_plans enable row level security;
drop policy if exists "Anyone can read subscription plans" on public.subscription_plans;
create policy "Anyone can read subscription plans"
  on public.subscription_plans
  for select
  using (true);

-- user_subscriptions: el usuario solo puede LEER sus propias suscripciones.
-- No hay políticas de insert/update/delete a propósito: las suscripciones las
-- gestiona el backend/billing (nunca el usuario), para evitar auto-upgrades.
alter table public.user_subscriptions enable row level security;
drop policy if exists "Users read own subscriptions" on public.user_subscriptions;
create policy "Users read own subscriptions"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);
