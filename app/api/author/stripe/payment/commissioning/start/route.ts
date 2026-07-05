import { NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess } from '@/lib/server/author-access'
import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  COMMISSIONING_AMOUNT_CENTS,
  COMMISSIONING_PACKAGE_CODE,
  COMMISSIONING_PACKAGE_NAME,
  COMMISSIONING_REFERENCE,
  COMMISSIONING_STANDARD_AMOUNT_CENTS,
  createCommissioningCheckoutSession,
  getStripeMode,
  isStripeCommissioningPaymentGateOpen,
} from '@/lib/server/stripe/author-workspace-stripe'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    if (!isStripeCommissioningPaymentGateOpen()) {
      return NextResponse.json(
        { error: 'The commissioning payment gate is closed.' },
        { status: 403 },
      )
    }

    const session = await createCommissioningCheckoutSession()
    if (!session.id || !session.url) throw new Error('stripe_checkout_session_missing_url')

    let overrideLog = { created: false, id: null as string | null, detail: 'not_written' }
    try {
      overrideLog = await writeSafeExecutionLog({
        name: `COMMISSIONING-PRICE-OVERRIDE-${COMMISSIONING_REFERENCE}`,
        actionType: 'COMMISSIONING_PRICE_OVERRIDE_APPLIED',
        description:
          `Commissioning-only $${(COMMISSIONING_AMOUNT_CENTS / 100).toFixed(2)} payment override applied for ${COMMISSIONING_REFERENCE}. Standard package remains ${COMMISSIONING_PACKAGE_CODE} (${COMMISSIONING_PACKAGE_NAME}) at $${(COMMISSIONING_STANDARD_AMOUNT_CENTS / 100).toFixed(2)}. The override is blocked for every other title/reference. No payment link, invoice, subscription, Business Central posting, royalty generation, author payment, production, distribution, or workspace movement occurred.`,
        sourceEntity: 'jm1pub_submission',
        sourceRecordId: COMMISSIONING_REFERENCE,
      })
    } catch {
      overrideLog = { created: false, id: null, detail: 'execution_log_write_failed' }
    }

    let executionLog = { created: false, id: null as string | null, detail: 'not_written' }
    try {
      executionLog = await writeSafeExecutionLog({
        name: `INITIAL-PAYMENT-INITIATED-${COMMISSIONING_REFERENCE}`,
        actionType: 'INITIAL_PAYMENT_INITIATED',
        description:
          `Commissioning-only initial payment Checkout Session initiated for ${COMMISSIONING_REFERENCE}. Package ${COMMISSIONING_PACKAGE_CODE} (${COMMISSIONING_PACKAGE_NAME}); standard amount $${(COMMISSIONING_STANDARD_AMOUNT_CENTS / 100).toFixed(2)}; commissioning amount $${(COMMISSIONING_AMOUNT_CENTS / 100).toFixed(2)}. Override is scoped only to this commissioning title/reference and does not apply to normal authors. No Business Central posting, royalty generation, author payment, production, distribution, or workspace movement occurred.`,
        sourceEntity: 'jm1pub_submission',
        sourceRecordId: COMMISSIONING_REFERENCE,
      })
    } catch {
      executionLog = { created: false, id: null, detail: 'execution_log_write_failed' }
    }

    return NextResponse.json({
      success: true,
      mode: getStripeMode(),
      reference: COMMISSIONING_REFERENCE,
      packageCode: COMMISSIONING_PACKAGE_CODE,
      packageName: COMMISSIONING_PACKAGE_NAME,
      standardAmountCents: COMMISSIONING_STANDARD_AMOUNT_CENTS,
      commissioningAmountCents: COMMISSIONING_AMOUNT_CENTS,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentStatus: session.payment_status || 'unpaid',
      overrideLog,
      executionLog,
    })
  } catch (error: any) {
    console.error('Commissioning payment start error:', error?.message || error)
    return NextResponse.json(
      { error: 'Unable to start the commissioning payment at this time.', code: error?.code || error?.message || 'commissioning_payment_failed' },
      { status: 502 },
    )
  }
}
