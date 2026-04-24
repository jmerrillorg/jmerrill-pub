'use client'

import { useId, useState } from 'react'
import type { ImprintSlug } from '@/data/imprints'
import { getImprintStrategyBySlug } from '@/data/imprints'

type Status = 'idle' | 'submitting' | 'success' | 'error'

type ReaderSignupFormProps = {
  imprintSlug: ImprintSlug | null
  source?: string
  contextBookId?: string
  contextTitle?: string
  compact?: boolean
}

export function ReaderSignupForm({
  imprintSlug,
  source = 'Book CTA',
  contextBookId = '',
  contextTitle = '',
  compact = false,
}: ReaderSignupFormProps) {
  const imprint = getImprintStrategyBySlug(imprintSlug)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [submittedImprintLabel, setSubmittedImprintLabel] = useState('')
  const firstNameId = useId()
  const emailId = useId()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!firstName.trim()) {
      setError('Please enter your first name.')
      return
    }

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!imprint) {
      setError('Choose an imprint so we can tailor your updates.')
      return
    }

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          imprintInterest: imprint.slug,
          source,
          contextBookId,
          contextTitle,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save your reader updates request.')

      setSubmittedImprintLabel(imprint.label)
      setStatus('success')
      setFirstName('')
      setEmail('')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unable to save your request right now.')
    }
  }

  const fieldClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-500'

  if (status === 'success') {
    return (
      <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/[0.08] p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-400">You&apos;re in</div>
        <h3
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: compact ? '24px' : '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Be the first to know.
        </h3>
        <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/55">
          We&apos;ll send new releases, special editions, and exclusive content aligned with {submittedImprintLabel}.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-400">Reader updates</div>
      <h3
        className="mt-3 text-white"
        style={{ fontFamily: "'Libre Baskerville', serif", fontSize: compact ? '24px' : '30px', fontWeight: 700, lineHeight: 1.15 }}
      >
        Be the first to know.
      </h3>
      <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/45">
        Get early access to new releases, special editions, and exclusive content from J Merrill Publishing.
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/20">Imprint interest</div>
        <div className="mt-1 text-[15px] text-white">{imprint?.label || 'Select an imprint path above'}</div>
      </div>

      {contextTitle ? (
        <p className="mt-3 text-[12px] text-white/30">
          Signup context: <span className="text-white/55">{contextTitle}</span>
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="imprintInterest" value={imprint?.slug || ''} />
        <input type="hidden" name="source" value={source} />

        <div>
          <label htmlFor={firstNameId} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">
            First Name
          </label>
          <input
            id={firstNameId}
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={fieldClass}
            placeholder="Your first name"
            autoComplete="given-name"
          />
        </div>

        <div>
          <label htmlFor={emailId} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">
            Email Address
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-full bg-blue-500 px-6 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Joining...' : 'Get Updates'}
        </button>
      </form>
    </div>
  )
}
