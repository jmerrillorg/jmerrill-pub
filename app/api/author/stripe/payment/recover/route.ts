import { NextRequest, NextResponse } from 'next/server'

import {
  processPublishingPaymentSuccess,
  retrieveStripePaymentIntent,
} from '@/lib/server/stripe/publishing-payment-event'

export const runtime = 'nodejs'

function authorized(req: NextRequest) {
  const expected = process.env.JM1_PAYMENT_EVENT_RECOVERY_KEY || ''
  const actual = req.headers.get('x-jm1-payment-event-recovery-key') || ''
  return Boolean(expected && actual && expected === actual)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  }

  const paymentIntentId = typeof body?.paymentIntentId === 'string' ? body.paymentIntentId.trim() : ''
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    return NextResponse.json({ ok: false, code: 'PAYMENT_INTENT_ID_REQUIRED' }, { status: 400 })
  }

  try {
    const livePayment = await retrieveStripePaymentIntent(paymentIntentId)
    const correctedOpportunityId = typeof body?.opportunityId === 'string' ? body.opportunityId.trim() : ''
    const correctionReason = typeof body?.correctionReason === 'string' ? body.correctionReason.trim() : ''
    const manualCorrectionRequested = Boolean(correctedOpportunityId)
    if (manualCorrectionRequested && (body?.confirmBinding !== true || !correctionReason)) {
      return NextResponse.json({ ok: false, code: 'GOVERNED_BINDING_CONFIRMATION_REQUIRED' }, { status: 400 })
    }
    const result = await processPublishingPaymentSuccess({
      ...livePayment,
      opportunityId: correctedOpportunityId || livePayment.opportunityId,
      manualCorrectionConfirmed: manualCorrectionRequested,
      correctionReason: manualCorrectionRequested ? correctionReason : null,
      source: manualCorrectionRequested ? 'GOVERNED_MANUAL_CORRECTION' : 'STRIPE_LIVE_RECOVERY',
    })
    return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 422 })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: error?.safeCode || 'PAYMENT_EVENT_RECOVERY_FAILED',
    }, { status: Number.isInteger(error?.status) ? error.status : 500 })
  }
}
