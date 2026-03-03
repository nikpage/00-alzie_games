export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rounds } = await supabase
    .from('speed_tiles_rounds')
    .select('round_id, round_start_ts, score, total_misses, mean_latency_ms')
    .eq('user_id', user.id)
    .order('round_start_ts', { ascending: false })
    .limit(10)

  const bestScore = rounds?.length
    ? Math.max(...rounds.map((r: { score: number }) => r.score))
    : 0

  return <HistoryClient rounds={rounds ?? []} bestScore={bestScore} />
}
