create table if not exists public.privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_notifications boolean not null default true,
  weekly_summary boolean not null default true,
  budget_alerts boolean not null default false,
  two_factor boolean not null default false,
  marketing_consent boolean not null default false,
  data_processing_consent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_consents (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  accepted boolean not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_privacy_consents_user_created_at
  on public.privacy_consents (user_id, created_at desc);

create index if not exists idx_audit_logs_user_created_at
  on public.audit_logs (user_id, created_at desc);

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);
