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
    .select('round_id, round_start_ts, score, total_misses, mean_latency_ms, latency_cv, latency_slope, meta_session_id, round_index_in_chain, break_duration_ms')
    .eq('user_id', user.id)
    .order('round_start_ts', { ascending: true })
    .limit(90)

  return <HistoryClient rounds={rounds ?? []} />
}
