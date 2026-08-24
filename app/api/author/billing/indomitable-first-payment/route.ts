import { NextRequest, NextResponse } from 'next/server'

import { runIndomitableBillingContinuation } from '@/lib/server/stripe/publishing-first-payment-billing'

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

  try {
    const result = await runIndomitableBillingContinuation({
      opportunityId: typeof body?.opportunityId === 'string' ? body.opportunityId.trim() : '',
      confirmExecutedAgreement: body?.confirmExecutedAgreement === true,
      confirmCreateFirstPaymentRequest: body?.confirmCreateFirstPaymentRequest === true,
      confirmSendAuthorEmail: body?.confirmSendAuthorEmail === true,
      agreementCompletedOn: typeof body?.agreementCompletedOn === 'string' ? body.agreementCompletedOn.trim() : '',
      agreementEvidence: typeof body?.agreementEvidence === 'string' ? body.agreementEvidence.trim() : '',
      operator: typeof body?.operator === 'string' ? body.operator.trim() : '',
    })
    return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 422 })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: error?.safeCode || 'INDOMITABLE_BILLING_CONTINUATION_FAILED',
    }, { status: Number.isInteger(error?.status) ? error.status : 500 })
  }
}
