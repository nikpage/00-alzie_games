import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeRoundMetrics, ANALYTICS_VERSION } from '@/lib/game/analytics'
import type { RoundPayload } from '@/types'

// POST /api/round — store a completed round, its cycles, and derived cognitive metrics
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload: RoundPayload = await request.json()
  const { cycles, ...roundData } = payload

  // Compute derived metrics server-side from raw cycle latencies
  const latencies = cycles.map(c => c.latency_ms)
  const derived = computeRoundMetrics(latencies)

  const accuracy = (payload.score + payload.total_misses) > 0
    ? payload.score / (payload.score + payload.total_misses)
    : 1

  // Insert round
  const { error: roundError } = await supabase
    .from('speed_tiles_rounds')
    .insert({
      ...roundData,
      user_id: user.id,
      total_cycles: payload.score,
      ...derived,
      analytics_version: ANALYTICS_VERSION,
    })
  if (roundError) return NextResponse.json({ error: roundError.message }, { status: 500 })

  // Insert cycles (batch)
  if (cycles.length > 0) {
    const cycleRows = cycles.map(c => ({
      ...c,
      round_id: payload.round_id,
      user_id: user.id,
      game_version: payload.game_version,
    }))
    const { error: cyclesError } = await supabase
      .from('speed_tiles_cycles')
      .insert(cycleRows)
    if (cyclesError) return NextResponse.json({ error: cyclesError.message }, { status: 500 })
  }

  // Insert cognitive metrics (platform-level derived)
  const { error: metricsError } = await supabase
    .from('cognitive_metrics')
    .insert({
      user_id: user.id,
      round_id: payload.round_id,
      meta_session_id: payload.meta_session_id,
      date: payload.round_start_ts.slice(0, 10),
      game_id: payload.game_id,
      domain: 'processing_speed',
      mean_latency_ms: derived.mean_latency_ms,
      latency_variability: derived.latency_cv,
      accuracy,
      drift_slope: derived.latency_slope,
      analytics_version: ANALYTICS_VERSION,
    })
  if (metricsError) return NextResponse.json({ error: metricsError.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 201 })
}

// GET /api/round — fetch round history for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('speed_tiles_rounds')
    .select('round_id, round_start_ts, score, total_cycles, total_misses, mean_latency_ms, latency_cv')
    .eq('user_id', user.id)
    .order('round_start_ts', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rounds: data })
}
