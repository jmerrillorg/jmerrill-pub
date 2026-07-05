'use client'

import { useState } from 'react'

type ActionStatus = {
  type: 'idle' | 'loading' | 'error' | 'success'
  message: string
}

export function StripeWorkspaceActions() {
  const [connectStatus, setConnectStatus] = useState<ActionStatus>({ type: 'idle', message: '' })
  const [paymentStatus, setPaymentStatus] = useState<ActionStatus>({ type: 'idle', message: '' })

  async function startStripeConnect() {
    setConnectStatus({ type: 'loading', message: 'Opening Stripe setup...' })
    try {
      const data = await postAction('/api/author/stripe/connect/start')
      window.location.href = data.onboardingUrl
    } catch (error: any) {
      setConnectStatus({ type: 'error', message: error.message || 'Stripe setup is not available yet.' })
    }
  }

  async function startCommissioningPayment() {
    setPaymentStatus({ type: 'loading', message: 'Opening secure payment...' })
    try {
      const data = await postAction('/api/author/stripe/payment/commissioning/start')
      window.location.href = data.checkoutUrl
    } catch (error: any) {
      setPaymentStatus({ type: 'error', message: error.message || 'Secure payment is not available yet.' })
    }
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <ActionButton
        title="Connect Stripe"
        description="Complete secure payment and royalty setup through Stripe."
        onClick={startStripeConnect}
        busy={connectStatus.type === 'loading'}
      />
      <ActionButton
        title="Complete Initial Payment"
        description="Available only for the approved commissioning payment."
        onClick={startCommissioningPayment}
        busy={paymentStatus.type === 'loading'}
      />
      <StatusMessage status={connectStatus} />
      <StatusMessage status={paymentStatus} />
    </div>
  )
}

function ActionButton({
  title,
  description,
  busy,
  onClick,
}: {
  title: string
  description: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-[24px] border border-blue-500/25 bg-blue-500/[0.08] p-5 text-left transition-colors hover:border-blue-300/45 hover:bg-blue-500/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-[15px] font-semibold text-white">{busy ? 'Opening...' : title}</span>
      <span className="mt-2 block text-[13px] font-light leading-[1.6] text-white/50">{description}</span>
    </button>
  )
}

function StatusMessage({ status }: { status: ActionStatus }) {
  if (status.type === 'idle' || status.type === 'loading') return null
  const tone = status.type === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-blue-500/20 bg-blue-500/10 text-blue-200'
  return <p className={`rounded-2xl border px-4 py-3 text-[13px] ${tone}`}>{status.message}</p>
}

async function postAction(endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-author-access-code': sessionStorage.getItem('jmp-author-portal-access-code') || '',
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'This action is not available yet.')
  return data
}
