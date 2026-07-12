-- 202607110004_investments_premium.sql
-- Plan Premium: portafolio de inversiones en el mercado de valores de EE. UU.
-- Idempotente: seguro de ejecutar múltiples veces. No borra ni modifica datos
-- existentes. Moneda inicial del módulo: USD.
--
-- Tablas:
--   - investment_portfolios          portafolio por usuario (uno default activo)
--   - investment_positions           posiciones (stock | etf) por portafolio
--   - investment_portfolio_snapshots evolución diaria real del portafolio

-- 1. Portafolios ---------------------------------------------------------------
create table if not exists public.investment_portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  base_currency text not null default 'USD',
  is_default    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null
);

-- Solo un portafolio predeterminado ACTIVO por usuario (los soft-deleted no cuentan).
create unique index if not exists uq_investment_portfolios_user_default
  on public.investment_portfolios (user_id)
  where is_default = true and deleted_at is null;

create index if not exists idx_investment_portfolios_user_id
  on public.investment_portfolios (user_id);
create index if not exists idx_investment_portfolios_user_deleted_at
  on public.investment_portfolios (user_id, deleted_at);

-- 2. Posiciones ----------------------------------------------------------------
create table if not exists public.investment_positions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  portfolio_id  uuid not null references public.investment_portfolios (id) on delete cascade,
  symbol        text not null,
  display_name  text null,
  asset_type    text not null,
  quantity      numeric(20, 8) not null,
  average_cost  numeric(18, 6) not null,
  currency      text not null default 'USD',
  purchase_date date null,
  notes         text null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'investment_positions_asset_type_chk'
  ) then
    alter table public.investment_positions
      add constraint investment_positions_asset_type_chk
      check (asset_type in ('stock', 'etf'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'investment_positions_quantity_chk'
  ) then
    alter table public.investment_positions
      add constraint investment_positions_quantity_chk
      check (quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'investment_positions_average_cost_chk'
  ) then
    alter table public.investment_positions
      add constraint investment_positions_average_cost_chk
      check (average_cost >= 0);
  end if;

  -- Símbolo normalizado: mayúsculas A-Z, dígitos, punto o guion; máx. 12 chars.
  if not exists (
    select 1 from pg_constraint where conname = 'investment_positions_symbol_chk'
  ) then
    alter table public.investment_positions
      add constraint investment_positions_symbol_chk
      check (symbol ~ '^[A-Z0-9.\-]{1,12}$');
  end if;
end$$;

-- Sin posiciones duplicadas ACTIVAS para el mismo símbolo dentro del portafolio.
create unique index if not exists uq_investment_positions_portfolio_symbol
  on public.investment_positions (portfolio_id, symbol)
  where deleted_at is null;

create index if not exists idx_investment_positions_user_id
  on public.investment_positions (user_id);
create index if not exists idx_investment_positions_user_deleted_at
  on public.investment_positions (user_id, deleted_at);
create index if not exists idx_investment_positions_portfolio_id
  on public.investment_positions (portfolio_id);

-- 3. Snapshots diarios ----------------------------------------------------------
create table if not exists public.investment_portfolio_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  portfolio_id         uuid not null references public.investment_portfolios (id) on delete cascade,
  snapshot_date        date not null,
  cost_basis           numeric(18, 2) not null,
  market_value         numeric(18, 2) null,
  unrealized_gain_loss numeric(18, 2) null,
  currency             text not null default 'USD',
  market_data_status   text not null,
  created_at           timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'investment_snapshots_status_chk'
  ) then
    alter table public.investment_portfolio_snapshots
      add constraint investment_snapshots_status_chk
      check (market_data_status in ('fresh', 'partial', 'stale', 'unavailable'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'uq_investment_snapshots_portfolio_date'
  ) then
    alter table public.investment_portfolio_snapshots
      add constraint uq_investment_snapshots_portfolio_date
      unique (portfolio_id, snapshot_date);
  end if;
end$$;

create index if not exists idx_investment_snapshots_user_id
  on public.investment_portfolio_snapshots (user_id);
create index if not exists idx_investment_snapshots_portfolio_date
  on public.investment_portfolio_snapshots (portfolio_id, snapshot_date desc);

-- 4. Row level security ----------------------------------------------------------
-- El backend accede con un rol privilegiado que omite RLS; estas políticas son
-- defensa en profundidad para acceso directo con la clave anon/authenticated.

alter table public.investment_portfolios enable row level security;

drop policy if exists "Users read own investment portfolios" on public.investment_portfolios;
create policy "Users read own investment portfolios"
  on public.investment_portfolios
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own investment portfolios" on public.investment_portfolios;
create policy "Users insert own investment portfolios"
  on public.investment_portfolios
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own investment portfolios" on public.investment_portfolios;
create policy "Users update own investment portfolios"
  on public.investment_portfolios
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own investment portfolios" on public.investment_portfolios;
create policy "Users delete own investment portfolios"
  on public.investment_portfolios
  for delete
  using (auth.uid() = user_id);

alter table public.investment_positions enable row level security;

drop policy if exists "Users read own investment positions" on public.investment_positions;
create policy "Users read own investment positions"
  on public.investment_positions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own investment positions" on public.investment_positions;
create policy "Users insert own investment positions"
  on public.investment_positions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own investment positions" on public.investment_positions;
create policy "Users update own investment positions"
  on public.investment_positions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own investment positions" on public.investment_positions;
create policy "Users delete own investment positions"
  on public.investment_positions
  for delete
  using (auth.uid() = user_id);

-- Snapshots: solo LECTURA para el usuario. Los snapshots los calcula y escribe
-- el backend; no hay políticas de insert/update/delete a propósito.
alter table public.investment_portfolio_snapshots enable row level security;

drop policy if exists "Users read own portfolio snapshots" on public.investment_portfolio_snapshots;
create policy "Users read own portfolio snapshots"
  on public.investment_portfolio_snapshots
  for select
  using (auth.uid() = user_id);
