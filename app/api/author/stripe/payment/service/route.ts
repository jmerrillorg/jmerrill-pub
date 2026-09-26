import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { captureObservedAdditionalRequest, listObservedAdditionalRequests, prepareObservedAdditionalService, reconcileObservedSettlements, reconcileAdditionalPaymentTail } from '@/lib/server/stripe/publishing-observed-payment-service'

export const runtime = 'nodejs'

function authorized(request: NextRequest) {
  const expected = Buffer.from(process.env.JM1_PAYMENT_EVENT_RECOVERY_KEY || '')
  const actual = Buffer.from(request.headers.get('x-jm1-payment-event-recovery-key') || '')
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function GET(request: NextRequest) {
  if (process.env.JM1_OBSERVED_PAYMENT_SERVICE_ENABLED !== 'true') return NextResponse.json({ ok: false, code: 'NOT_COMMISSIONED' }, { status: 503 })
  if (!authorized(request)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    return NextResponse.json({ ok: true, requests: await listObservedAdditionalRequests() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, code: 'OBSERVED_REQUEST_READ_FAILED' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (process.env.JM1_OBSERVED_PAYMENT_SERVICE_ENABLED !== 'true') return NextResponse.json({ ok: false, code: 'NOT_COMMISSIONED' }, { status: 503 })
  if (!authorized(request)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  try {
    if (body.action === 'CAPTURE_OBSERVED_REQUEST') {
      return NextResponse.json({ ok: true, ...await captureObservedAdditionalRequest(body.request) })
    }
    if (body.action === 'PREPARE_OBSERVED_SERVICE' && typeof body.requestId === 'string') {
      return NextResponse.json({ ok: true, preparation: await prepareObservedAdditionalService(body.requestId) })
    }
    if (body.action === 'RECONCILE_SETTLEMENTS' && typeof body.requestId === 'string') {
      const { request, state, authority } = await reconcileObservedSettlements(body.requestId)
      return NextResponse.json({ ok: true, reconciliation: { requestId: request.requestId, status: 'RECONCILED',
        totalAppliedCents: state.netPaymentsAppliedCents, balanceCents: state.remainingBalanceCents,
        pastDueCents: state.pastDueBalanceCents, balanceVersion: state.balanceVersion,
        payments: authority.agreement.snapshot.payments, scheduledObligations: authority.agreement.snapshot.scheduledObligations,
        qboSync: 'QUEUED_PENDING_RECONCILIATION' } })
    }
    if (body.action === 'RECONCILE_PROVIDER_TAIL') {
      return NextResponse.json({ ok: true, results: await reconcileAdditionalPaymentTail() })
    }
    return NextResponse.json({ ok: false, code: 'ACTION_NOT_ALLOWED' }, { status: 400 })
  } catch (error) {
    const reason = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'OBSERVED_PAYMENT_SERVICE_RETRY_REQUIRED'
    return NextResponse.json({ ok: false, code: reason }, { status: 422 })
  }
}
