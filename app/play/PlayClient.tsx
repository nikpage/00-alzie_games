'use client'

import { useEffect, useCallback, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import GameGrid from '@/components/game/GameGrid'
import TargetDisplay from '@/components/game/TargetDisplay'
import ScoreDisplay from '@/components/game/ScoreDisplay'
import Timer from '@/components/game/Timer'
import {
  initGameState,
  startRound,
  tickSecond,
  tapTile,
  getRoundResult,
  keyToTileIndex,
  GAME_VERSION,
  type GameState,
} from '@/lib/game/engine'
import { SCORING_VERSION } from '@/lib/game/scoring'
import type { InputMode, RoundPayload } from '@/types'

const CHAIN_THRESHOLD_MS = 30_000  // ≤30s break = same chain

type TapFeedback = { index: number; result: 'hit' | 'miss' } | null

// ── Chain state persisted in localStorage ──────────────────────────────────
interface ChainState {
  meta_session_id: string
  last_round_end_ts: number   // epoch ms
  round_index_in_chain: number
}

function getChainState(): ChainState {
  try {
    const raw = localStorage.getItem('chain_state')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { meta_session_id: crypto.randomUUID(), last_round_end_ts: 0, round_index_in_chain: -1 }
}

function resolveChain(): { meta_session_id: string; round_index_in_chain: number; break_duration_ms: number | null } {
  const prev = getChainState()
  const now = Date.now()
  const breakMs = prev.last_round_end_ts > 0 ? now - prev.last_round_end_ts : null
  const inChain = breakMs !== null && breakMs <= CHAIN_THRESHOLD_MS

  return {
    meta_session_id: inChain ? prev.meta_session_id : crypto.randomUUID(),
    round_index_in_chain: inChain ? prev.round_index_in_chain + 1 : 0,
    break_duration_ms: inChain ? breakMs : null,
  }
}

function saveChainState(meta_session_id: string, round_index_in_chain: number) {
  const state: ChainState = {
    meta_session_id,
    last_round_end_ts: Date.now(),
    round_index_in_chain,
  }
  localStorage.setItem('chain_state', JSON.stringify(state))
}

// ── Game reducer ────────────────────────────────────────────────────────────
function gameReducer(state: GameState, action:
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'TAP'; index: number; inputMode: InputMode }
): GameState {
  switch (action.type) {
    case 'START': return startRound(state)
    case 'TICK':  return tickSecond(state)
    case 'TAP':   return tapTile(state, action.index, action.inputMode)
    default: return state
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PlayPage() {
  const router = useRouter()
  const [game, dispatch] = useReducer(gameReducer, undefined, initGameState)
  const [feedback, setFeedback] = useState<TapFeedback>(null)
  const gameRef = useRef(game)
  gameRef.current = game

  // Tick loop
  useEffect(() => {
    if (!game.running) return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [game.running])

  // Round finished — save and navigate
  useEffect(() => {
    if (!game.finished) return

    const result = getRoundResult(game)
    const chain = resolveChain()

    const payload: RoundPayload = {
      round_id: crypto.randomUUID(),
      game_id: 'speed_tiles',
      game_version: GAME_VERSION,
      scoring_version: SCORING_VERSION,
      context_tags: [],
      ...result,
      ...chain,
    }

    saveChainState(payload.meta_session_id, payload.round_index_in_chain)
    sessionStorage.setItem('last_round', JSON.stringify(payload))

    fetch('/api/round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    router.push('/results')
  }, [game.finished]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = useCallback((index: number, inputMode: InputMode = 'touch') => {
    const g = gameRef.current
    if (!g.running) return
    const isHit = g.tiles[index] === g.stimulus
    dispatch({ type: 'TAP', index, inputMode })
    setFeedback({ index, result: isHit ? 'hit' : 'miss' })
    setTimeout(() => setFeedback(null), 150)
  }, [])

  // Keyboard input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!gameRef.current.running) {
        if (e.key === ' ' || e.key === 'Enter') dispatch({ type: 'START' })
        return
      }
      const idx = keyToTileIndex(e.key)
      if (idx !== null) handleTap(idx, 'keyboard')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleTap])

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.5rem 1rem',
      background: 'var(--color-bg)',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Timer seconds={game.timeRemaining} />
        <ScoreDisplay score={game.cycles.length} />
      </div>

      <TargetDisplay symbol={game.stimulus} />

      <GameGrid
        tiles={game.tiles}
        target={game.stimulus}
        onTap={i => handleTap(i, 'touch')}
        lastResult={feedback?.result ?? null}
        lastIndex={feedback?.index ?? null}
      />

      {!game.running && !game.finished && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
          }}
          onClick={() => dispatch({ type: 'START' })}
        >
          <h2 style={{ color: '#fff', fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Speed Tiles
          </h2>
          <p style={{
            color: '#e5e7eb',
            fontSize: 'var(--font-size-lg)',
            textAlign: 'center',
            padding: '0 2rem',
            lineHeight: 1.5,
          }}>
            Tap the tile that matches the symbol. 30 seconds.
          </p>
          <button style={{
            padding: '1rem 2.5rem',
            borderRadius: '1rem',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
            border: 'none',
            fontSize: 'var(--font-size-xl)',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            Tap to Start
          </button>
        </div>
      )}
    </main>
  )
}
