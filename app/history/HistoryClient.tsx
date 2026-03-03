'use client'

import { useRouter } from 'next/navigation'

interface RoundRow {
  round_id: string
  round_start_ts: string
  score: number
  total_misses: number
  mean_latency_ms: number | null
}

interface Props {
  rounds: RoundRow[]
  bestScore: number
}

export default function HistoryClient({ rounds, bestScore }: Props) {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      background: 'var(--color-bg)',
      maxWidth: '480px',
      margin: '0 auto',
      gap: '1.5rem',
    }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-text)' }}>
        History
      </h1>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Best round</span>
        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
          {bestScore} hits
        </span>
      </div>

      {rounds.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
          No rounds yet. Play your first game!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rounds.map((r, i) => <RoundRow key={r.round_id} round={r} rank={i + 1} />)}
        </div>
      )}

      <button
        onClick={() => router.push('/play')}
        style={{
          marginTop: 'auto',
          padding: '0.875rem',
          borderRadius: '0.75rem',
          background: 'var(--color-primary)',
          color: 'var(--color-primary-text)',
          border: 'none',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Play again
      </button>
    </main>
  )
}

function RoundRow({ round, rank }: { round: RoundRow; rank: number }) {
  const date = new Date(round.round_start_ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
  const time = new Date(round.round_start_ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
  const totalSel = round.score + round.total_misses
  const accuracy = totalSel > 0 ? Math.round((round.score / totalSel) * 100) : 100

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '1rem',
      padding: '0.875rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <span style={{ width: '1.5rem', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)', flexShrink: 0 }}>
        {rank}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}>
          {round.score} hits
        </div>
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
          {accuracy}% accuracy
          {round.mean_latency_ms ? ` · ${round.mean_latency_ms}ms avg` : ''}
          {' · '}{date} {time}
        </div>
      </div>
    </div>
  )
}
