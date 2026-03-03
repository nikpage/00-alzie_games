'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/play')
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--color-bg)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 800,
          color: 'var(--color-primary)',
          marginBottom: '0.25rem',
        }}
      >
        Brain Snack
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Quick. Sharp. Daily.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-base)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={primaryBtnStyle}>
          {loading ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={ghostBtnStyle}
        >
          {mode === 'login' ? 'New? Create account' : 'Already have an account? Log in'}
        </button>
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  borderRadius: '0.75rem',
  border: '2px solid var(--color-surface-raised)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-lg)',
  outline: 'none',
  width: '100%',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.875rem',
  borderRadius: '0.75rem',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  border: 'none',
  fontSize: 'var(--font-size-lg)',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '0.5rem',
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-base)',
  cursor: 'pointer',
  textDecoration: 'underline',
}
