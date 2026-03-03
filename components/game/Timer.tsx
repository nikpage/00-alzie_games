'use client'

interface TimerProps {
  seconds: number
}

export default function Timer({ seconds }: TimerProps) {
  const pct = seconds / 90
  const urgent = seconds <= 10

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <span
        style={{
          fontSize: 'var(--font-size-xl)',
          color: urgent ? 'var(--color-error)' : 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          transition: 'color var(--transition-normal)',
        }}
      >
        {seconds}s
      </span>
      <div
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '999px',
          background: 'var(--color-surface-raised)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: urgent ? 'var(--color-error)' : 'var(--color-primary)',
            borderRadius: '999px',
            transition: 'width 1s linear, background var(--transition-normal)',
          }}
        />
      </div>
    </div>
  )
}
