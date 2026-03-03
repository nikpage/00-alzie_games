export type InputMode = 'touch' | 'mouse' | 'keyboard'

// One stimulus → first hit
export interface Cycle {
  cycle_index: number
  latency_ms: number       // cycle_start_ts → cycle_end_ts
  miss_count: number       // misses before the hit
  cycle_start_ts: string   // ISO — when stimulus was shown
  cycle_end_ts: string     // ISO — when hit occurred
}

// One 30-second round
export interface RoundResult {
  score: number            // hits = cycles completed
  cycles: Cycle[]
  total_misses: number
  round_start_ts: string
  round_end_ts: string
  input_mode: InputMode
}

// What the client sends to POST /api/round
export interface RoundPayload extends RoundResult {
  round_id: string
  game_id: string
  meta_session_id: string
  round_index_in_chain: number
  break_duration_ms: number | null
  game_version: string
  scoring_version: string
  context_tags: string[]
}

// Row returned from speed_tiles_rounds
export interface RoundRecord extends RoundPayload {
  user_id: string
  mean_latency_ms: number | null
  latency_std_dev_ms: number | null
  latency_cv: number | null
  latency_slope: number | null
}
