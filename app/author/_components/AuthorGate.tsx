'use client'

import { useEffect, useState } from 'react'

export function AuthorGate({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setUnlocked(sessionStorage.getItem('jmp-author-onboarding-unlocked') === 'true')
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/author/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid access code.')
      sessionStorage.setItem('jmp-author-onboarding-unlocked', 'true')
      setUnlocked(true)
    } catch (err: any) {
      setError(err.message || 'Unable to validate access code.')
    } finally {
      setSubmitting(false)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 backdrop-blur">
      <div className="mb-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Invitation required</div>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Author setup is private.
        </h2>
        <p className="mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/40">
          Enter the access code provided by J Merrill Publishing to continue. Financial and royalty intake are separated from general onboarding for privacy and operational control.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Access code"
          className="min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[52px] rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? 'Checking...' : 'Unlock'}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
