alter table public.cards add column if not exists deck_name text not null default 'Inbox';
alter table public.cards add column if not exists notes text;
alter table public.cards add column if not exists example_sentence text;
alter table public.cards add column if not exists source_context text;
alter table public.cards add column if not exists is_favorite boolean not null default false;
alter table public.cards add column if not exists archived_at timestamptz;
