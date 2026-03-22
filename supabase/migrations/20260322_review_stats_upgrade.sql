alter table public.cards add column if not exists review_count int not null default 0;
alter table public.cards add column if not exists lapse_count int not null default 0;
alter table public.cards add column if not exists ease_factor numeric not null default 2.5;
alter table public.cards add column if not exists interval_days numeric not null default 0;
alter table public.cards add column if not exists last_reviewed_at timestamptz;
