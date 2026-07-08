-- 202607060001_assistant_sessions_messages.sql
-- Persistencia de sesiones y mensajes del asistente de IA (chat).
-- Idempotente: seguro de ejecutar múltiples veces. No borra datos existentes.
-- Privacidad: no se guardan API keys, prompts internos, email, allowed_scopes
-- ni datos financieros privados. metadata solo lleva campos saneados.

-- 1. Sesiones ----------------------------------------------------------------
create table if not exists public.assistant_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  title             text null,
  plan_at_creation  varchar(20) not null default 'basic',
  status            varchar(20) not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assistant_sessions_status_chk'
  ) then
    alter table public.assistant_sessions
      add constraint assistant_sessions_status_chk
      check (status in ('active', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assistant_sessions_plan_chk'
  ) then
    alter table public.assistant_sessions
      add constraint assistant_sessions_plan_chk
      check (plan_at_creation in ('basic', 'premium'));
  end if;
end$$;

-- 2. Mensajes ----------------------------------------------------------------
create table if not exists public.assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.assistant_sessions (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         varchar(20) not null,
  content      text not null,
  request_id   text null,
  provider     text null,
  model        text null,
  metadata     jsonb null,
  created_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assistant_messages_role_chk'
  ) then
    alter table public.assistant_messages
      add constraint assistant_messages_role_chk
      check (role in ('user', 'assistant', 'system'));
  end if;
end$$;

-- 3. Índices -----------------------------------------------------------------
create index if not exists idx_assistant_sessions_user_updated
  on public.assistant_sessions (user_id, updated_at desc);
create index if not exists idx_assistant_sessions_user_status
  on public.assistant_sessions (user_id, status);
create index if not exists idx_assistant_messages_session_created
  on public.assistant_messages (session_id, created_at);
create index if not exists idx_assistant_messages_user_id
  on public.assistant_messages (user_id);

-- 4. Row level security ------------------------------------------------------
alter table public.assistant_sessions enable row level security;
alter table public.assistant_messages enable row level security;

-- assistant_sessions: cada usuario solo ve/gestiona sus propias sesiones.
drop policy if exists "Users select own assistant sessions" on public.assistant_sessions;
create policy "Users select own assistant sessions"
  on public.assistant_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own assistant sessions" on public.assistant_sessions;
create policy "Users insert own assistant sessions"
  on public.assistant_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own assistant sessions" on public.assistant_sessions;
create policy "Users update own assistant sessions"
  on public.assistant_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own assistant sessions" on public.assistant_sessions;
create policy "Users delete own assistant sessions"
  on public.assistant_sessions
  for delete
  using (auth.uid() = user_id);

-- assistant_messages: cada usuario solo ve/gestiona sus propios mensajes.
drop policy if exists "Users select own assistant messages" on public.assistant_messages;
create policy "Users select own assistant messages"
  on public.assistant_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own assistant messages" on public.assistant_messages;
create policy "Users insert own assistant messages"
  on public.assistant_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own assistant messages" on public.assistant_messages;
create policy "Users update own assistant messages"
  on public.assistant_messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own assistant messages" on public.assistant_messages;
create policy "Users delete own assistant messages"
  on public.assistant_messages
  for delete
  using (auth.uid() = user_id);
