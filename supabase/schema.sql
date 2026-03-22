create table if not exists public.cards (
  id uuid primary key,
  user_id text not null,
  user_email text,
  source_text text not null,
  target_text text not null,
  source_lang text not null,
  target_lang text not null,
  pronunciation text,
  tags text,
  deck_name text not null default 'Inbox',
  notes text,
  example_sentence text,
  source_context text,
  is_favorite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  last_grade int,
  review_count int not null default 0,
  lapse_count int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days numeric not null default 0,
  last_reviewed_at timestamptz
);

create index if not exists idx_cards_user on public.cards(user_id);
create index if not exists idx_cards_next_review on public.cards(next_review_at);

create table if not exists public.users (
  id text primary key,
  provider text not null,
  provider_account_id text not null,
  email text,
  name text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create unique index if not exists users_provider_account_id
  on public.users(provider, provider_account_id);

create table if not exists public.model_configs (
  id uuid primary key,
  user_id text not null,
  name text not null,
  model text not null,
  api_endpoint text,
  api_key text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_model_configs_user on public.model_configs(user_id);
create index if not exists idx_model_configs_user_active on public.model_configs(user_id, is_active);

alter table public.cards add column if not exists review_count int not null default 0;
alter table public.cards add column if not exists lapse_count int not null default 0;
alter table public.cards add column if not exists ease_factor numeric not null default 2.5;
alter table public.cards add column if not exists interval_days numeric not null default 0;
alter table public.cards add column if not exists last_reviewed_at timestamptz;
alter table public.cards add column if not exists deck_name text not null default 'Inbox';
alter table public.cards add column if not exists notes text;
alter table public.cards add column if not exists example_sentence text;
alter table public.cards add column if not exists source_context text;
alter table public.cards add column if not exists is_favorite boolean not null default false;
alter table public.cards add column if not exists archived_at timestamptz;
