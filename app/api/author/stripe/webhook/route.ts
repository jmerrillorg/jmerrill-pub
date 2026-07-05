import { NextRequest, NextResponse } from 'next/server'

import { updateCommissioningOpportunityPaymentStatus, writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  COMMISSIONING_REFERENCE,
} from '@/lib/server/stripe/author-workspace-stripe'
import {
  classifyCommissioningWebhookEvent,
  verifyStripeWebhook,
} from '@/lib/server/stripe/author-workspace-webhook'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const verification = verifyStripeWebhook(rawBody, req.headers.get('stripe-signature'))

  if (!verification.ok) {
    await writeSafeFailureLog('STRIPE_WEBHOOK_REJECTED', verification.code).catch(() => null)
    return NextResponse.json({ received: false, code: verification.code }, { status: verification.status })
  }

  const classification = classifyCommissioningWebhookEvent(verification.event)
  if (!classification.process) {
    return NextResponse.json({ received: true, processed: false, code: classification.code })
  }

  let paymentStatusWriteback = { updated: false, id: null as string | null, detail: 'not_attempted' }
  try {
    paymentStatusWriteback = await updateCommissioningOpportunityPaymentStatus({
      status: 'confirmed',
      source: 'STRIPE_CHECKOUT_WEBHOOK',
    })
  } catch (error: any) {
    paymentStatusWriteback = { updated: false, id: null, detail: error?.message || 'payment_status_writeback_failed' }
  }

  let executionLog = { created: false, id: null as string | null, detail: 'not_written' }
  try {
    executionLog = await writeSafeExecutionLog({
      name: `INITIAL-PAYMENT-CONFIRMED-${COMMISSIONING_REFERENCE}`,
      actionType: 'INITIAL_PAYMENT_CONFIRMED',
      description:
        `Stripe webhook confirmed the commissioning-only initial payment for ${COMMISSIONING_REFERENCE}. ` +
        `Safe event fields: ${JSON.stringify(classification.safeEvent)}. ` +
        `Dataverse payment writeback updated: ${paymentStatusWriteback.updated}. ` +
        'No Business Central posting, royalty generation, author payment, production, distribution, full workspace unlock, or workspace movement occurred.',
      sourceEntity: 'opportunity',
      sourceRecordId: paymentStatusWriteback.id || COMMISSIONING_REFERENCE,
    })
  } catch {
    executionLog = { created: false, id: null, detail: 'execution_log_write_failed' }
  }

  return NextResponse.json({
    received: true,
    processed: true,
    reference: COMMISSIONING_REFERENCE,
    paymentStatusWriteback,
    executionLog,
  })
}

async function writeSafeFailureLog(actionType: string, code: string) {
  return writeSafeExecutionLog({
    name: `${actionType}-${COMMISSIONING_REFERENCE}`,
    actionType,
    status: 'failed',
    description:
      `Stripe webhook request was rejected before processing. Safe rejection code: ${code}. No raw Stripe payload, payment data, secret, or signature was logged.`,
    sourceEntity: 'jm1pub_submission',
    sourceRecordId: COMMISSIONING_REFERENCE,
  })
}
