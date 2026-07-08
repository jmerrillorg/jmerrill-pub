'use client'

import { useMemo, useState } from 'react'

type PortalContext = {
  portalContext?: {
    stripeAccountId?: string
  } | null
}

export function StripeConnectSetupCard() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  const existingStripeAccountId = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('jmp-author-portal-context')
      if (!raw) return ''
      const parsed = JSON.parse(raw) as PortalContext
      return parsed?.portalContext?.stripeAccountId || ''
    } catch {
      return ''
    }
  }, [])

  async function handleStripeConnect() {
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
        body: JSON.stringify({
          stripeAccountId: existingStripeAccountId || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to open Stripe setup.')
      if (!data.onboardingUrl) throw new Error('Stripe setup link was not returned.')

      window.location.assign(data.onboardingUrl)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Unable to open Stripe setup right now.')
    }
  }

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-7 sm:p-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Secure Stripe setup</p>
          <h2 className="mt-3 text-[28px] font-semibold text-white">Connect payment and royalty details.</h2>
          <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/45">
            Stripe handles the secure financial setup for your publishing agreement and future royalty payments. If you
            already have a Stripe account connected with J Merrill Publishing, this step will reopen that setup instead
            of forcing a brand-new account.
          </p>
        </div>
        {existingStripeAccountId ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-emerald-200">
            Existing Stripe account ready
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ['What this does', 'Opens Stripe so you can securely connect or confirm the account used for publishing payments and future royalty payouts.'],
          ['Why it matters', 'This lets us prepare your agreement and keep sensitive payment details inside Stripe instead of in email or general workspace forms.'],
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
          onClick={handleStripeConnect}
          disabled={status === 'submitting'}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
        >
          {status === 'submitting' ? 'Opening Stripe...' : 'Open Stripe Connect'}
        </button>
        <p className="text-[12px] leading-[1.7] text-white/30">
          Additional publishing tools will unlock after your agreement is signed and your initial payment is confirmed.
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
