'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'

interface RoundRow {
  round_id: string
  round_start_ts: string
  score: number
  total_misses: number
  mean_latency_ms: number | null
  latency_cv: number | null
  latency_slope: number | null
  meta_session_id: string
  round_index_in_chain: number
  break_duration_ms: number | null
}

type Period = '7d' | '30d' | 'all'

// ── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function rollingAvg(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null
    const slice = data.slice(i - window + 1, i + 1)
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
  })
}

function stdDev(arr: number[]): number | null {
  if (arr.length < 2) return null
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length)
}

function timeOfDayLabel(hour: number): string {
  if (hour >= 5  && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 21) return 'Evening'
  return 'Night'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HistoryClient({ rounds }: { rounds: RoundRow[] }) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('30d')

  // Period-filtered data (for charts)
  const filtered = useMemo(() => {
    if (period === 'all') return rounds
    const days = period === '7d' ? 7 : 30
    const cutoff = Date.now() - days * 86_400_000
    return rounds.filter(r => Date.parse(r.round_start_ts) >= cutoff)
  }, [rounds, period])

  // ── Insights (always computed on ALL data) ──────────────────────────────────

  const insights = useMemo(() => {
    if (rounds.length < 2) return null

    // Longest chain
    const chainLengths: Record<string, number> = {}
    rounds.forEach(r => {
      chainLengths[r.meta_session_id] = Math.max(
        chainLengths[r.meta_session_id] ?? 0,
        r.round_index_in_chain + 1
      )
    })
    const longestChain = Math.max(...Object.values(chainLengths))

    // Week-over-week
    const now = Date.now()
    const thisWeek = rounds.filter(r => Date.parse(r.round_start_ts) >= now - 7 * 86_400_000)
    const lastWeek = rounds.filter(r => {
      const ts = Date.parse(r.round_start_ts)
      return ts >= now - 14 * 86_400_000 && ts < now - 7 * 86_400_000
    })
    const thisWeekAvg = avg(thisWeek.map(r => r.score))
    const lastWeekAvg = avg(lastWeek.map(r => r.score))
    const weeklyDelta = thisWeekAvg !== null && lastWeekAvg !== null
      ? +(thisWeekAvg - lastWeekAvg).toFixed(1)
      : null

    // Best time of day
    const timeGroups: Record<string, number[]> = {
      Morning: [], Afternoon: [], Evening: [], Night: []
    }
    rounds.forEach(r => {
      const label = timeOfDayLabel(new Date(r.round_start_ts).getHours())
      timeGroups[label].push(r.score)
    })
    const timeAvgs = Object.entries(timeGroups)
      .filter(([, scores]) => scores.length >= 3)
      .map(([label, scores]) => ({ label, avg: avg(scores)! }))
    const bestTime = timeAvgs.length
      ? timeAvgs.reduce((a, b) => b.avg > a.avg ? b : a)
      : null

    // Consistency trend: compare CV of first half vs second half
    const cvs = rounds.map(r => r.latency_cv).filter((v): v is number => v !== null)
    let consistencyTrend: 'improving' | 'stable' | 'worsening' | null = null
    if (cvs.length >= 6) {
      const mid = Math.floor(cvs.length / 2)
      const firstCV = avg(cvs.slice(0, mid))!
      const secondCV = avg(cvs.slice(mid))!
      const delta = secondCV - firstCV
      consistencyTrend = delta < -0.02 ? 'improving'
        : delta > 0.02 ? 'worsening'
        : 'stable'
    }

    // In-chain warmup: avg score by chain position (across all chains of length ≥ 2)
    const positionScores: Record<number, number[]> = {}
    const multiRoundChains = new Set(
      Object.entries(chainLengths)
        .filter(([, len]) => len >= 2)
        .map(([id]) => id)
    )
    rounds
      .filter(r => multiRoundChains.has(r.meta_session_id))
      .forEach(r => {
        if (!positionScores[r.round_index_in_chain])
          positionScores[r.round_index_in_chain] = []
        positionScores[r.round_index_in_chain].push(r.score)
      })
    const warmupCurve = Object.entries(positionScores)
      .sort(([a], [b]) => +a - +b)
      .slice(0, 6)
      .map(([pos, scores]) => ({
        label: `Round ${+pos + 1}`,
        avgHits: Math.round(avg(scores)!),
        n: scores.length,
      }))

    return {
      longestChain,
      weeklyDelta,
      thisWeekAvg: thisWeekAvg ? Math.round(thisWeekAvg) : null,
      lastWeekAvg: lastWeekAvg ? Math.round(lastWeekAvg) : null,
      bestTime,
      consistencyTrend,
      warmupCurve,
      hasChainData: warmupCurve.length >= 2,
    }
  }, [rounds])

  // ── Chart data (period-filtered) ────────────────────────────────────────────

  const chartData = useMemo(() => {
    const hitsAvg  = rollingAvg(filtered.map(r => r.score), 5)
    const latencies = filtered.map(r => r.mean_latency_ms ?? 0)
    const latAvg   = rollingAvg(latencies, 5)
    return filtered.map((r, i) => {
      const date = new Date(r.round_start_ts)
      const accuracy = r.score + r.total_misses > 0
        ? Math.round(r.score / (r.score + r.total_misses) * 100)
        : 100
      return {
        label:      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        time:       date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        hits:       r.score,
        hitsAvg:    hitsAvg[i],
        latency:    r.mean_latency_ms,
        latencyAvg: latAvg[i] ?? null,
        cv:         r.latency_cv ? Math.round(r.latency_cv * 100) : null,
        accuracy,
        chainIndex: r.round_index_in_chain,
      }
    })
  }, [filtered])

  // ── Summary stats (period-filtered) ────────────────────────────────────────

  const stats = useMemo(() => {
    if (filtered.length === 0) return null
    const hits = filtered.map(r => r.score)
    const best = Math.max(...hits)
    const mean = avg(hits)!
    const sd   = stdDev(hits)
    const latencies = filtered.map(r => r.mean_latency_ms).filter((v): v is number => v !== null)
    const avgLat = avg(latencies)
    const mid = Math.floor(hits.length / 2)
    const trend = hits.length < 4 ? null
      : avg(hits.slice(mid))! > avg(hits.slice(0, mid))! + 0.5 ? 'up'
      : avg(hits.slice(mid))! < avg(hits.slice(0, mid))! - 0.5 ? 'down'
      : 'stable'
    return {
      best, avg: Math.round(mean),
      sd: sd ? Math.round(sd * 10) / 10 : null,
      avgLat: avgLat ? Math.round(avgLat) : null,
      trend,
      count: filtered.length,
    }
  }, [filtered])

  const hasData = filtered.length >= 2

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem 2rem',
      background: 'var(--color-bg)',
      maxWidth: '600px',
      margin: '0 auto',
      gap: '1.25rem',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-text)' }}>
          Performance
        </h1>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Summary */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <StatCard label="Best" value={`${stats.best}`} unit="hits" />
          <StatCard label="Average" value={`${stats.avg}`} unit={`±${stats.sd ?? '—'} hits`} />
          <StatCard
            label="Trend"
            value={stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
            unit={stats.trend === 'up' ? 'improving' : stats.trend === 'down' ? 'declining' : 'stable'}
            highlight={stats.trend === 'up' ? 'good' : stats.trend === 'down' ? 'warn' : undefined}
          />
        </div>
      )}

      {/* Insights (all-time) */}
      {insights && (
        <Section title="Insights">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>

            {/* Longest chain */}
            <InsightCard
              label="Longest chain"
              value={`${insights.longestChain}`}
              unit="rounds"
              note="Consecutive rounds ≤30s apart"
            />

            {/* Week over week */}
            {insights.weeklyDelta !== null && (
              <InsightCard
                label="Week vs last week"
                value={insights.weeklyDelta > 0 ? `+${insights.weeklyDelta}` : `${insights.weeklyDelta}`}
                unit="avg hits"
                highlight={insights.weeklyDelta > 0 ? 'good' : insights.weeklyDelta < 0 ? 'warn' : undefined}
                note={`This week: ${insights.thisWeekAvg} · Last: ${insights.lastWeekAvg}`}
              />
            )}

            {/* Best time of day */}
            {insights.bestTime && (
              <InsightCard
                label="Peak time"
                value={insights.bestTime.label}
                unit={`avg ${Math.round(insights.bestTime.avg)} hits`}
                note="When you perform best"
              />
            )}

            {/* Consistency */}
            {insights.consistencyTrend && (
              <InsightCard
                label="Consistency"
                value={
                  insights.consistencyTrend === 'improving' ? '↑' :
                  insights.consistencyTrend === 'worsening' ? '↓' : '→'
                }
                unit={insights.consistencyTrend}
                highlight={
                  insights.consistencyTrend === 'improving' ? 'good' :
                  insights.consistencyTrend === 'worsening' ? 'warn' : undefined
                }
                note="Response time variability over time"
              />
            )}
          </div>

          {/* In-chain warmup curve */}
          {insights.hasChainData && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                Chain warmup curve
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Average hits by position within a chain — shows warmup & fatigue
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={insights.warmupCurve} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip content={<WarmupTooltip />} />
                  <Bar dataKey="avgHits" radius={[4, 4, 0, 0]} name="Avg hits">
                    {insights.warmupCurve.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? '#c7d2fe' : i === insights.warmupCurve.length - 1 ? '#818cf8' : '#a5b4fc'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      )}

      {!hasData ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem 1rem',
        }}>
          {rounds.length === 0
            ? 'No rounds yet. Play your first game!'
            : `Not enough data for this period. Play more rounds or select 'All'.`}
        </div>
      ) : (
        <>
          {/* Hits trend */}
          <ChartCard title="Hits per round" subtitle="5-round rolling average shown">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                {stats && <ReferenceLine y={stats.avg} stroke="#9ca3af" strokeDasharray="4 2" />}
                <Tooltip content={<HitsTooltip />} />
                <Line type="monotone" dataKey="hits" stroke="#c7d2fe" strokeWidth={1.5}
                  dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="hitsAvg" stroke="#4f46e5" strokeWidth={2.5}
                  dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Response time */}
          {chartData.some(d => d.latency !== null) && (
            <ChartCard title="Response time" subtitle="Lower is faster · ms per decision · 5-round avg">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="ms" />
                  {stats?.avgLat && <ReferenceLine y={stats.avgLat} stroke="#9ca3af" strokeDasharray="4 2" />}
                  <Tooltip content={<LatencyTooltip />} />
                  <Line type="monotone" dataKey="latency" stroke="#bfdbfe" strokeWidth={1.5}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey="latencyAvg" stroke="#3b82f6" strokeWidth={2.5}
                    dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Accuracy */}
          <ChartCard title="Accuracy" subtitle="Hits as % of all selections">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} unit="%" />
                <ReferenceLine y={100} stroke="#e5e7eb" />
                <Tooltip content={<AccuracyTooltip />} />
                <Line type="monotone" dataKey="accuracy" stroke="#059669" strokeWidth={2}
                  dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Response variability */}
          {chartData.some(d => d.cv !== null) && (
            <ChartCard
              title="Response consistency"
              subtitle="Coefficient of variation — lower & stable = more consistent"
            >
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="%" />
                  <Tooltip content={<CVTooltip />} />
                  <Line type="monotone" dataKey="cv" stroke="#d97706" strokeWidth={2}
                    dot={{ r: 3, fill: '#d97706', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Round list */}
          <Section title="Recent rounds">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {[...filtered].reverse().slice(0, 15).map(r => (
                <RoundRowItem key={r.round_id} round={r} />
              ))}
            </div>
          </Section>
        </>
      )}

      <button
        onClick={() => router.push('/play')}
        style={{
          padding: '0.875rem', borderRadius: '0.75rem',
          background: 'var(--color-primary)', color: 'var(--color-primary-text)',
          border: 'none', fontSize: 'var(--font-size-lg)', fontWeight: 700,
          cursor: 'pointer', marginTop: 'auto',
        }}
      >
        Play
      </button>
    </main>
  )
}

// ── Layout components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.625rem' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--color-surface-raised)',
      borderRadius: '0.625rem', padding: '2px', gap: '2px',
    }}>
      {(['7d', '30d', 'all'] as Period[]).map(p => (
        <button key={p} onClick={() => onChange(p)} style={{
          padding: '0.25rem 0.625rem', borderRadius: '0.5rem', border: 'none',
          background: value === p ? 'var(--color-surface)' : 'transparent',
          color: value === p ? 'var(--color-text)' : 'var(--color-text-muted)',
          fontSize: 'var(--font-size-base)',
          fontWeight: value === p ? 600 : 400, cursor: 'pointer',
        }}>
          {p === 'all' ? 'All' : p}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, unit, highlight }: {
  label: string; value: string; unit: string; highlight?: 'good' | 'warn'
}) {
  const color = highlight === 'good' ? '#059669' : highlight === 'warn' ? '#dc2626' : 'var(--color-text)'
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: '1rem', padding: '0.875rem',
      display: 'flex', flexDirection: 'column', gap: '0.125rem',
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{unit}</span>
    </div>
  )
}

function InsightCard({ label, value, unit, highlight, note }: {
  label: string; value: string; unit: string; highlight?: 'good' | 'warn'; note?: string
}) {
  const color = highlight === 'good' ? '#059669' : highlight === 'warn' ? '#dc2626' : 'var(--color-text)'
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: '1rem', padding: '0.875rem',
      display: 'flex', flexDirection: 'column', gap: '0.125rem',
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color, lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color, fontWeight: 600 }}>{unit}</span>
      {note && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{note}</span>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '1.25rem', padding: '1rem 0.5rem 0.5rem' }}>
      <div style={{ padding: '0 0.75rem 0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function RoundRowItem({ round }: { round: RoundRow }) {
  const date = new Date(round.round_start_ts)
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time  = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const accuracy = round.score + round.total_misses > 0
    ? Math.round(round.score / (round.score + round.total_misses) * 100) : 100
  const inChain = round.round_index_in_chain > 0

  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: '0.875rem',
      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
      borderLeft: inChain ? '3px solid var(--color-primary)' : '3px solid transparent',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}>
            {round.score} hits
          </span>
          {inChain && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              chain · {round.round_index_in_chain + 1}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
          {accuracy}% accuracy
          {round.mean_latency_ms ? ` · ${round.mean_latency_ms}ms` : ''}
          {round.latency_cv ? ` · CV ${Math.round(round.latency_cv * 100)}%` : ''}
          {' · '}{label} {time}
        </div>
      </div>
    </div>
  )
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

function TT({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-surface-raised)',
      borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem',
      color: 'var(--color-text)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      {children}
    </div>
  )
}

function HitsTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; hits: number; hitsAvg: number | null; accuracy: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
    <div>Hits: <strong>{d.hits}</strong></div>
    {d.hitsAvg && <div>5-round avg: <strong>{d.hitsAvg}</strong></div>}
    <div>Accuracy: <strong>{d.accuracy}%</strong></div>
  </TT>
}

function LatencyTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; latency: number | null; latencyAvg: number | null } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
    {d.latency && <div>Avg response: <strong>{d.latency}ms</strong></div>}
    {d.latencyAvg && <div>5-round avg: <strong>{d.latencyAvg}ms</strong></div>}
  </TT>
}

function AccuracyTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; accuracy: number; hits: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
    <div>Accuracy: <strong>{d.accuracy}%</strong></div>
    <div>Hits: <strong>{d.hits}</strong></div>
  </TT>
}

function CVTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; cv: number | null } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
    {d.cv !== null && <div>Variability: <strong>{d.cv}%</strong></div>}
    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>Lower = more consistent</div>
  </TT>
}

function WarmupTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; avgHits: number; n: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label}</div>
    <div>Avg hits: <strong>{d.avgHits}</strong></div>
    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>From {d.n} rounds</div>
  </TT>
}
