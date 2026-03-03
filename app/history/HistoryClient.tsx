'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
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

// Rolling average helper
function rollingAvg(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null
    const slice = data.slice(i - window + 1, i + 1)
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
  })
}

export default function HistoryClient({ rounds }: { rounds: RoundRow[] }) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('30d')

  const filtered = useMemo(() => {
    if (period === 'all') return rounds
    const days = period === '7d' ? 7 : 30
    const cutoff = Date.now() - days * 86_400_000
    return rounds.filter(r => Date.parse(r.round_start_ts) >= cutoff)
  }, [rounds, period])

  // Chart data — one point per round
  const chartData = useMemo(() => {
    const hitsAvg = rollingAvg(filtered.map(r => r.score), 5)
    const latAvg = rollingAvg(
      filtered.map(r => r.mean_latency_ms ?? 0).filter(v => v > 0),
      5
    )
    return filtered.map((r, i) => {
      const date = new Date(r.round_start_ts)
      const accuracy = r.score + r.total_misses > 0
        ? Math.round(r.score / (r.score + r.total_misses) * 100)
        : 100
      return {
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        hits: r.score,
        hitsAvg: hitsAvg[i],
        latency: r.mean_latency_ms,
        latencyAvg: latAvg[i] ?? null,
        accuracy,
        chainIndex: r.round_index_in_chain,
        roundId: r.round_id,
      }
    })
  }, [filtered])

  // Summary stats
  const stats = useMemo(() => {
    if (filtered.length === 0) return null
    const hits = filtered.map(r => r.score)
    const latencies = filtered.map(r => r.mean_latency_ms).filter((v): v is number => v !== null)
    const best = Math.max(...hits)
    const avg = Math.round(hits.reduce((a, b) => a + b, 0) / hits.length)
    const avgLat = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null

    // Trend: compare first half vs second half avg
    const mid = Math.floor(hits.length / 2)
    const firstHalf = hits.slice(0, mid)
    const secondHalf = hits.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const trend = firstHalf.length < 2 ? null
      : secondAvg > firstAvg + 0.5 ? 'up'
      : secondAvg < firstAvg - 0.5 ? 'down'
      : 'stable'

    return { best, avg, avgLat, trend, count: filtered.length }
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

      {/* Summary stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
        }}>
          <StatCard label="Best" value={`${stats.best}`} unit="hits" />
          <StatCard label="Average" value={`${stats.avg}`} unit="hits" />
          <StatCard
            label="Trend"
            value={stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
            unit={stats.trend === 'up' ? 'improving' : stats.trend === 'down' ? 'declining' : 'stable'}
            highlight={stats.trend === 'up' ? 'good' : stats.trend === 'down' ? 'warn' : undefined}
          />
        </div>
      )}

      {!hasData ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          padding: '3rem 1rem',
        }}>
          {rounds.length === 0
            ? 'No rounds yet. Play your first game!'
            : `Not enough data for this period. Play more rounds or select 'All'.`}
        </div>
      ) : (
        <>
          {/* Hits chart */}
          <ChartCard title="Hits per round" subtitle="5-round rolling average shown">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                {stats && <ReferenceLine y={stats.avg} stroke="#9ca3af" strokeDasharray="4 2" />}
                <Tooltip content={<HitsTooltip />} />
                <Line
                  type="monotone"
                  dataKey="hits"
                  stroke="#c7d2fe"
                  strokeWidth={1.5}
                  dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="Hits"
                />
                <Line
                  type="monotone"
                  dataKey="hitsAvg"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  name="5-round avg"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Latency chart */}
          {chartData.some(d => d.latency !== null) && (
            <ChartCard title="Response time" subtitle="Lower is faster · ms per decision">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="ms" />
                  {stats?.avgLat && (
                    <ReferenceLine y={stats.avgLat} stroke="#9ca3af" strokeDasharray="4 2" />
                  )}
                  <Tooltip content={<LatencyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#bfdbfe"
                    strokeWidth={1.5}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    name="Avg response"
                  />
                  <Line
                    type="monotone"
                    dataKey="latencyAvg"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name="5-round avg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Accuracy chart */}
          <ChartCard title="Accuracy" subtitle="Hits as % of all selections">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} unit="%" />
                <ReferenceLine y={100} stroke="#e5e7eb" />
                <Tooltip content={<AccuracyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="Accuracy"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Recent rounds list */}
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)' }}>
              Recent rounds
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {[...filtered].reverse().slice(0, 10).map((r) => (
                <RoundRow key={r.round_id} round={r} />
              ))}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => router.push('/play')}
        style={{
          padding: '0.875rem',
          borderRadius: '0.75rem',
          background: 'var(--color-primary)',
          color: 'var(--color-primary-text)',
          border: 'none',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 700,
          cursor: 'pointer',
          marginTop: 'auto',
        }}
      >
        Play
      </button>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: Period[] = ['7d', '30d', 'all']
  return (
    <div style={{
      display: 'flex',
      background: 'var(--color-surface-raised)',
      borderRadius: '0.625rem',
      padding: '2px',
      gap: '2px',
    }}>
      {options.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: '0.25rem 0.625rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: value === p ? 'var(--color-surface)' : 'transparent',
            color: value === p ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontSize: 'var(--font-size-base)',
            fontWeight: value === p ? 600 : 400,
            cursor: 'pointer',
          }}
        >
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
      background: 'var(--color-surface)',
      borderRadius: '1rem',
      padding: '0.875rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.125rem',
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {unit}
      </span>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '1.25rem',
      padding: '1rem 0.5rem 0.5rem 0.5rem',
    }}>
      <div style={{ padding: '0 0.75rem 0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {subtitle}
        </div>
      </div>
      {children}
    </div>
  )
}

function RoundRow({ round }: { round: RoundRow }) {
  const date = new Date(round.round_start_ts)
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const accuracy = round.score + round.total_misses > 0
    ? Math.round(round.score / (round.score + round.total_misses) * 100)
    : 100
  const inChain = round.round_index_in_chain > 0

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '0.875rem',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      borderLeft: inChain ? '3px solid var(--color-primary)' : '3px solid transparent',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}>
            {round.score} hits
          </span>
          {inChain && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              chain ·{round.round_index_in_chain + 1}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
          {accuracy}% accuracy
          {round.mean_latency_ms ? ` · ${round.mean_latency_ms}ms` : ''}
          {' · '}{label} {time}
        </div>
      </div>
    </div>
  )
}

// ── Custom tooltips ──────────────────────────────────────────────────────────

function TooltipWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-surface-raised)',
      borderRadius: '0.625rem',
      padding: '0.625rem 0.875rem',
      fontSize: '0.8125rem',
      color: 'var(--color-text)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      {children}
    </div>
  )
}

function HitsTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; hits: number; hitsAvg: number | null; accuracy: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipWrapper>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
      <div>Hits: <strong>{d.hits}</strong></div>
      {d.hitsAvg && <div>5-round avg: <strong>{d.hitsAvg}</strong></div>}
      <div>Accuracy: <strong>{d.accuracy}%</strong></div>
    </TooltipWrapper>
  )
}

function LatencyTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; latency: number | null; latencyAvg: number | null } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipWrapper>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
      {d.latency && <div>Avg response: <strong>{d.latency}ms</strong></div>}
      {d.latencyAvg && <div>5-round avg: <strong>{d.latencyAvg}ms</strong></div>}
    </TooltipWrapper>
  )
}

function AccuracyTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; time: string; accuracy: number; hits: number; total_misses?: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipWrapper>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.label} · {d.time}</div>
      <div>Accuracy: <strong>{d.accuracy}%</strong></div>
      <div>Hits: <strong>{d.hits}</strong></div>
    </TooltipWrapper>
  )
}
