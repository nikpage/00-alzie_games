'use client'

interface TargetDisplayProps {
  symbol: string
}

export default function TargetDisplay({ symbol }: TargetDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{
        fontSize: 'var(--font-size-lg)',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        Tap this
      </span>
      <div
        style={{ fontSize: 'var(--target-font-size)', lineHeight: 1, userSelect: 'none' }}
        aria-label={`Stimulus: ${symbol}`}
      >
        {symbol}
      </div>
    </div>
  )
}
