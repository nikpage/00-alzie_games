-- Brain Snack – Phase 1 schema
-- Run this once in your Supabase SQL editor

create table if not exists sessions (
  session_id      text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  game_id         text not null default 'speed_tiles',
  timestamp       timestamptz not null default now(),
  duration        integer not null,       -- seconds
  total_score     integer not null,
  accuracy        real not null,          -- 0.0–1.0
  reaction_times  integer[] not null,     -- ms per correct tap
  error_count     integer not null,
  input_mode      text not null,          -- touch | mouse | keyboard
  game_version    text not null,
  scoring_version text not null
);

-- Users can only read/write their own sessions
alter table sessions enable row level security;

create policy "Users can insert own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own sessions"
  on sessions for select
  using (auth.uid() = user_id);

-- Index for fast history queries
create index if not exists sessions_user_timestamp
  on sessions (user_id, timestamp desc);
