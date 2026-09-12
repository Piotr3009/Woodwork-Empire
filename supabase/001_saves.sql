-- Woodwork Empire, Turn 2: one saved game per player per slot.
-- SQL BEFORE use: run this in the Supabase SQL editor before the Save and Load buttons will work.
-- Nothing in the game applies it.

create table if not exists public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null,
  state jsonb not null,
  state_version int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.saves enable row level security;

-- A player sees and writes his own saves and nobody else's.
create policy "saves are read by their owner"
  on public.saves for select
  using (auth.uid() = user_id);

create policy "saves are written by their owner"
  on public.saves for insert
  with check (auth.uid() = user_id);

create policy "saves are updated by their owner"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saves are deleted by their owner"
  on public.saves for delete
  using (auth.uid() = user_id);
