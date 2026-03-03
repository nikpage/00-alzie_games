-- Brain Snack – Phase 1 schema
-- Run this once in your Supabase SQL editor
-- (Replaces the earlier sessions table scaffold)

-- ─────────────────────────────────────────────
-- GAME-SPECIFIC RAW DATA
-- ─────────────────────────────────────────────

create table if not exists speed_tiles_rounds (
  round_id                text primary key,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  meta_session_id         text not null,
  round_index_in_chain    integer not null,
  round_start_ts          timestamptz not null,
  round_end_ts            timestamptz not null,
  total_cycles            integer not null,   -- hits completed
  total_misses            integer not null,
  score                   integer not null,   -- = total_cycles
  break_duration_ms       integer,            -- null = first round in chain
  input_mode              text not null,
  -- derived metrics (computed server-side)
  mean_latency_ms         integer,
  latency_std_dev_ms      integer,
  latency_cv              real,
  latency_slope           real,
  -- versioning
  game_id                 text not null default 'speed_tiles',
  game_version            text not null,
  scoring_version         text not null,
  analytics_version       text not null,
  context_tags            text[]       -- user-reported round context, e.g. ['tired', 'green_tea']
);

create table if not exists speed_tiles_cycles (
  id                      bigint generated always as identity primary key,
  round_id                text not null references speed_tiles_rounds(round_id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  cycle_index             integer not null,
  latency_ms              integer not null,
  miss_count              integer not null,
  cycle_start_ts          timestamptz not null,
  cycle_end_ts            timestamptz not null,
  game_version            text not null
);

-- ─────────────────────────────────────────────
-- PLATFORM-LEVEL DERIVED COGNITIVE METRICS
-- ─────────────────────────────────────────────

create table if not exists cognitive_metrics (
  id                      bigint generated always as identity primary key,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  round_id                text not null,
  meta_session_id         text not null,
  date                    date not null,
  game_id                 text not null,
  domain                  text not null default 'processing_speed',
  mean_latency_ms         integer,
  latency_variability     real,   -- CV
  accuracy                real,   -- hits / (hits + misses)
  drift_slope             real,   -- latency slope within round
  analytics_version       text not null
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table speed_tiles_rounds enable row level security;
alter table speed_tiles_cycles enable row level security;
alter table cognitive_metrics enable row level security;

create policy "own rounds insert" on speed_tiles_rounds for insert with check (auth.uid() = user_id);
create policy "own rounds select" on speed_tiles_rounds for select using (auth.uid() = user_id);

create policy "own cycles insert" on speed_tiles_cycles for insert with check (auth.uid() = user_id);
create policy "own cycles select" on speed_tiles_cycles for select using (auth.uid() = user_id);

create policy "own metrics insert" on cognitive_metrics for insert with check (auth.uid() = user_id);
create policy "own metrics select" on cognitive_metrics for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

create index if not exists idx_rounds_user_ts   on speed_tiles_rounds (user_id, round_start_ts desc);
create index if not exists idx_cycles_round     on speed_tiles_cycles (round_id, cycle_index);
create index if not exists idx_metrics_user_date on cognitive_metrics (user_id, date desc);
