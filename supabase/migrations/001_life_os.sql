-- Life OS: профили + облачное хранилище + привязка Telegram
-- Применить в Supabase SQL Editor или: supabase db push

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default 'Гость',
  telegram_id bigint unique,
  telegram_username text,
  has_subscription boolean not null default false,
  life_map_offer_status text not null default 'pending'
    check (life_map_offer_status in ('pending', 'accepted', 'deferred', 'done')),
  training_phase text not null default 'offer'
    check (training_phase in (
      'offer', 'free_tour', 'wheel_offer', 'pro_offer', 'pro_tour', 'completed', 'skipped'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_stores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_telegram_id_idx on public.profiles (telegram_id)
  where telegram_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_stores_updated_at on public.user_stores;
create trigger user_stores_updated_at
  before update on public.user_stores
  for each row execute function public.set_updated_at();

-- Профиль при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_stores (user_id, data)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_stores enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "stores_select_own" on public.user_stores;
create policy "stores_select_own" on public.user_stores
  for select using (auth.uid() = user_id);

drop policy if exists "stores_insert_own" on public.user_stores;
create policy "stores_insert_own" on public.user_stores
  for insert with check (auth.uid() = user_id);

drop policy if exists "stores_update_own" on public.user_stores;
create policy "stores_update_own" on public.user_stores
  for update using (auth.uid() = user_id);
