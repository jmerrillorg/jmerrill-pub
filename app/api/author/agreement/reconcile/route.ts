import { NextRequest, NextResponse } from 'next/server'

import {
  processPublishingAgreementExecuted,
  type PublishingAgreementExecutionInput,
} from '@/lib/server/publishing/agreement-execution-reconciliation'

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

  let body: PublishingAgreementExecutionInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  }

  try {
    const result = await processPublishingAgreementExecuted(body)
    return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 422 })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: error?.safeCode || 'AGREEMENT_RECONCILIATION_FAILED',
    }, { status: Number.isInteger(error?.status) ? error.status : 500 })
  }
}
