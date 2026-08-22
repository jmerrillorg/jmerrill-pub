'use client'

import { useState } from 'react'

export function StripeConnectSetupCard() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handlePayoutEnrollment() {
    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/author/stripe/connect/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-author-access-code':
            sessionStorage.getItem('jmp-author-portal-access-code') ||
            sessionStorage.getItem('jmp-author-onboarding-access-code') ||
            '',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to open Author Payout Enrollment.')
      if (!data.onboardingUrl) throw new Error('Author Payout Enrollment link was not returned.')

      window.location.assign(data.onboardingUrl)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Unable to open Author Payout Enrollment right now.')
    }
  }

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-7 sm:p-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Author Payout Enrollment</p>
          <h2 className="mt-3 text-[28px] font-semibold text-white">Securely provide future payment details.</h2>
          <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/45">
            Author Payout Enrollment allows you to securely provide Stripe with the identity, tax, and banking
            information needed to receive future payments from J Merrill Publishing. Completing enrollment does not mean
            that a payment is currently due, approved, or scheduled.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ['What this does', 'Opens Stripe-hosted enrollment so identity, tax, and banking details stay with Stripe.'],
          ['What it does not do', 'It does not approve, schedule, release, or guarantee any payment from J Merrill Publishing.'],
        ].map(([heading, body]) => (
          <div key={heading} className="rounded-2xl border border-white/8 bg-black/15 p-5">
            <h3 className="text-[15px] font-semibold text-white">{heading}</h3>
            <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handlePayoutEnrollment}
          disabled={status === 'submitting'}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
        >
          {status === 'submitting' ? 'Opening enrollment...' : 'Open Author Payout Enrollment'}
        </button>
        <p className="text-[12px] leading-[1.7] text-white/30">
          Payment approval remains a separate J Merrill Publishing financial process.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
