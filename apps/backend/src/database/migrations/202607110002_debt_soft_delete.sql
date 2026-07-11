alter table if exists public.debts
  add column if not exists deleted_at timestamptz;

create index if not exists idx_debts_user_deleted
  on public.debts (user_id, deleted_at);
