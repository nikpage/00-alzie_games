'use client'

interface GameGridProps {
  tiles: string[]
  target: string
  onTap: (index: number) => void
  lastResult?: 'hit' | 'miss' | null
  lastIndex?: number | null
}

export default function GameGrid({ tiles, target, onTap, lastResult, lastIndex }: GameGridProps) {
  return (
    <div
      role="grid"
      aria-label="Game grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, var(--tile-size))',
        gridTemplateRows: 'repeat(3, var(--tile-size))',
        gap: 'var(--tile-gap)',
      }}
    >
      {tiles.map((symbol, i) => {
        const wasHit  = lastIndex === i && lastResult === 'hit'
        const wasMiss = lastIndex === i && lastResult === 'miss'

        let bg = 'var(--color-tile-bg)'
        if (wasHit)  bg = 'var(--color-tile-correct)'
        if (wasMiss) bg = 'var(--color-tile-error)'

        return (
          <button
            key={i}
            role="gridcell"
            aria-label={`${symbol}${symbol === target ? ', stimulus' : ''}`}
            onClick={() => onTap(i)}
            style={{
              width: 'var(--tile-size)',
              height: 'var(--tile-size)',
              borderRadius: 'var(--tile-radius)',
              background: bg,
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--tile-font-size)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              transition: `background var(--transition-fast), transform var(--transition-fast)`,
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)' }}
            onPointerUp={e =>   { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            {symbol}
          </button>
        )
      })}
    </div>
  )
}
