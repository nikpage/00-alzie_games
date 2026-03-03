export const ANALYTICS_VERSION = '1.0.0'

export interface DerivedRoundMetrics {
  mean_latency_ms: number | null
  latency_std_dev_ms: number | null
  latency_cv: number | null        // std_dev / mean
  latency_slope: number | null     // ms change per cycle (linear regression)
}

export function computeRoundMetrics(latencies: number[]): DerivedRoundMetrics {
  const n = latencies.length
  if (n === 0) return { mean_latency_ms: null, latency_std_dev_ms: null, latency_cv: null, latency_slope: null }

  const mean = latencies.reduce((a, b) => a + b, 0) / n

  const variance = latencies.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const std_dev = Math.sqrt(variance)

  const cv = mean > 0 ? std_dev / mean : null

  // Linear slope via least-squares (x = cycle index, y = latency)
  let slope: number | null = null
  if (n >= 2) {
    const xMean = (n - 1) / 2
    const num = latencies.reduce((sum, y, x) => sum + (x - xMean) * (y - mean), 0)
    const den = latencies.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0)
    slope = den > 0 ? num / den : 0
  }

  return {
    mean_latency_ms: Math.round(mean),
    latency_std_dev_ms: Math.round(std_dev),
    latency_cv: cv !== null ? Math.round(cv * 1000) / 1000 : null,
    latency_slope: slope !== null ? Math.round(slope * 10) / 10 : null,
  }
}
