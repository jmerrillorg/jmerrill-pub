'use client'

import { useState } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function NewsletterSignup({
  surface = 'dark',
  title = 'Stay close to the catalog',
  description = 'Get new releases, author features, publishing insights, and flagship updates from J Merrill Publishing.',
}: {
  surface?: 'dark' | 'light'
  title?: string
  description?: string
}) {
  const dark = surface === 'dark'
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Reader')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to subscribe.')

      setStatus('success')
      setEmail('')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unable to subscribe.')
    }
  }

  return (
    <div className={`rounded-[28px] border p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-white'}`}>
      <div className={`mb-4 font-mono text-[10px] uppercase tracking-[0.12em] ${dark ? 'text-blue-400' : 'text-blue-500'}`}>
        Newsletter
      </div>
      <h3
        className={dark ? 'text-white' : 'text-charcoal'}
        style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
      >
        {title}
      </h3>
      <p className={`mt-3 text-[14px] font-light leading-[1.8] ${dark ? 'text-white/45' : 'text-gray-500'}`}>
        {description}
      </p>

      {status === 'success' ? (
        <div className={`mt-5 rounded-2xl border px-4 py-3 text-[13px] ${dark ? 'border-blue-500/25 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          You’re in. We’ll keep you updated on new books, authors, and publishing insights.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className={`h-12 flex-1 rounded-full border px-4 text-[14px] outline-none transition-colors ${
                dark
                  ? 'border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-blue-500'
                  : 'border-gray-200 bg-[#F7F8FA] text-charcoal placeholder:text-gray-400 focus:border-blue-500'
              }`}
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={`h-12 rounded-full border px-4 text-[14px] outline-none ${
                dark
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-gray-200 bg-[#F7F8FA] text-charcoal'
              }`}
            >
              <option>Reader</option>
              <option>Author</option>
              <option>Partner</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="h-12 rounded-full bg-blue-500 px-6 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
          >
            {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
          </button>
          {error && (
            <p className={`text-[12px] ${dark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
          )}
        </form>
      )}
    </div>
  )
}
