'use client'

import dynamic from 'next/dynamic'

// Skip SSR entirely — game state uses Math.random() which causes hydration mismatch
const PlayClient = dynamic(() => import('./PlayClient'), { ssr: false })

export default function PlayPage() {
  return <PlayClient />
}
