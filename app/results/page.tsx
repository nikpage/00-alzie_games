'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RoundPayload } from '@/types'

export default function ResultsPage() {
  const router = useRouter()
  const [round, setRound] = useState<RoundPayload | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('last_round')
    if (!raw) { router.replace('/play'); return }
    setRound(JSON.parse(raw))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!round) return null

  const totalSelections = round.score + round.total_misses
  const accuracy = totalSelections > 0
    ? Math.round((round.score / totalSelections) * 100)
    : 100

  const avgLatency = round.cycles.length > 0
    ? Math.round(round.cycles.reduce((a, c) => a + c.latency_ms, 0) / round.cycles.length)
    : null

  const inChain = round.round_index_in_chain > 0

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'var(--color-bg)',
      gap: '2rem',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text)' }}>
          Done!
        </h1>
        {inChain && (
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Round {round.round_index_in_chain + 1} in chain
          </p>
        )}
      </div>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <Stat label="Hits" value={String(round.score)} big />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Misses" value={String(round.total_misses)} />
        {avgLatency && <Stat label="Avg response time" value={`${avgLatency}ms`} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <button onClick={() => router.push('/play')} style={primaryBtn}>
          Play again
        </button>
        <button onClick={() => router.push('/history')} style={ghostBtn}>
          View history
        </button>
      </div>
    </main>
  )
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
        {label}
      </span>
      <span style={{
        fontWeight: 700,
        fontSize: big ? 'var(--font-size-2xl)' : 'var(--font-size-xl)',
        color: 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '0.875rem',
  borderRadius: '0.75rem',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  border: 'none',
  fontSize: 'var(--font-size-lg)',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
}

const ghostBtn: React.CSSProperties = {
  padding: '0.875rem',
  borderRadius: '0.75rem',
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text)',
  border: 'none',
  fontSize: 'var(--font-size-lg)',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
}
