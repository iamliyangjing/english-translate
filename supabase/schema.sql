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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  last_grade int
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
