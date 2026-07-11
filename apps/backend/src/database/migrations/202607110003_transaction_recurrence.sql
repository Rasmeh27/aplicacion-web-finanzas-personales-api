alter table if exists public.movements
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_frequency text;

create index if not exists idx_movements_user_recurring
  on public.movements (user_id, is_recurring);
