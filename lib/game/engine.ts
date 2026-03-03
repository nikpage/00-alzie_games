import { shuffleSymbols, getRandomSymbol } from './symbols'
import { SCORING_VERSION } from './scoring'
import type { Cycle, RoundResult, InputMode } from '@/types'

export const GAME_VERSION = '2.0.0'
export const GRID_SIZE = 9       // 3x3
export const ROUND_DURATION = 30 // seconds

export interface GameState {
  tiles: string[]          // 9 symbols on the grid
  stimulus: string         // symbol to hit
  running: boolean
  finished: boolean
  timeRemaining: number

  // Current cycle tracking
  cycleIndex: number
  cycleStartTs: string     // ISO — when current stimulus was shown
  currentMisses: number    // misses on current cycle

  // Completed cycles this round
  cycles: Cycle[]
  totalMisses: number

  // Round timestamps
  roundStartTs: string | null

  inputMode: InputMode
}

function newStimulus(exclude?: string): { tiles: string[]; stimulus: string } {
  const tiles = shuffleSymbols(GRID_SIZE)
  const stimulus = getRandomSymbol(exclude)
  // Guarantee stimulus appears on the grid
  tiles[Math.floor(Math.random() * GRID_SIZE)] = stimulus
  return { tiles, stimulus }
}

export function initGameState(): GameState {
  const { tiles, stimulus } = newStimulus()
  return {
    tiles,
    stimulus,
    running: false,
    finished: false,
    timeRemaining: ROUND_DURATION,
    cycleIndex: 0,
    cycleStartTs: new Date().toISOString(),
    currentMisses: 0,
    cycles: [],
    totalMisses: 0,
    roundStartTs: null,
    inputMode: 'touch',
  }
}

export function startRound(state: GameState): GameState {
  const now = new Date().toISOString()
  return {
    ...state,
    running: true,
    roundStartTs: now,
    cycleStartTs: now,
  }
}

export function tickSecond(state: GameState): GameState {
  if (!state.running || state.finished) return state
  const timeRemaining = state.timeRemaining - 1
  if (timeRemaining <= 0) {
    return { ...state, timeRemaining: 0, running: false, finished: true }
  }
  return { ...state, timeRemaining }
}

export function tapTile(
  state: GameState,
  tileIndex: number,
  inputMode: InputMode,
): GameState {
  if (!state.running || state.finished) return state

  const tapped = state.tiles[tileIndex]
  const isHit = tapped === state.stimulus

  if (!isHit) {
    // Miss — log it, no score effect
    return {
      ...state,
      currentMisses: state.currentMisses + 1,
      totalMisses: state.totalMisses + 1,
      inputMode,
    }
  }

  // Hit — complete this cycle
  const now = new Date().toISOString()
  const latency_ms = Date.parse(now) - Date.parse(state.cycleStartTs)

  const completedCycle: Cycle = {
    cycle_index: state.cycleIndex,
    latency_ms,
    miss_count: state.currentMisses,
    cycle_start_ts: state.cycleStartTs,
    cycle_end_ts: now,
  }

  // Start next cycle with new stimulus
  const { tiles, stimulus } = newStimulus(state.stimulus)

  return {
    ...state,
    tiles,
    stimulus,
    cycleIndex: state.cycleIndex + 1,
    cycleStartTs: now,
    currentMisses: 0,
    cycles: [...state.cycles, completedCycle],
    inputMode,
  }
}

export function getRoundResult(state: GameState): RoundResult {
  return {
    score: state.cycles.length,
    cycles: state.cycles,
    total_misses: state.totalMisses,
    round_start_ts: state.roundStartTs ?? new Date().toISOString(),
    round_end_ts: new Date().toISOString(),
    input_mode: state.inputMode,
  }
}

// Keyboard layout: QWE / ASD / ZXC → tile indices 0–8
const KEY_MAP: Record<string, number> = {
  q: 0, w: 1, e: 2,
  a: 3, s: 4, d: 5,
  z: 6, x: 7, c: 8,
}

export function keyToTileIndex(key: string): number | null {
  const idx = KEY_MAP[key.toLowerCase()]
  return idx !== undefined ? idx : null
}

export { SCORING_VERSION }
