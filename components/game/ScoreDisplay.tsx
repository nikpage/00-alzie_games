'use client'

interface ScoreDisplayProps {
  score: number
}

export default function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      <span style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 800,
        color: 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {score}
      </span>
      <span style={{
        fontSize: 'var(--font-size-base)',
        color: 'var(--color-text-muted)',
      }}>
        hits
      </span>
    </div>
  )
}
