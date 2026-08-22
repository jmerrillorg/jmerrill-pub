import { NextRequest, NextResponse } from 'next/server'

import { updateCommissioningOpportunityPaymentStatus, writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  COMMISSIONING_REFERENCE,
} from '@/lib/server/stripe/author-workspace-stripe'
import {
  classifyCommissioningWebhookEvent,
  classifyPublishingPaymentSuccessEvent,
  classifyStripeConnectAccountUpdateEvent,
  verifyStripeWebhook,
} from '@/lib/server/stripe/author-workspace-webhook'
import { syncConnectAccountStatusByAccountId } from '@/lib/server/stripe/author-workspace-stripe'
import { processPublishingPaymentSuccess, type PublishingPaymentSuccess } from '@/lib/server/stripe/publishing-payment-event'

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
    const connectAccountUpdate = classifyStripeConnectAccountUpdateEvent(verification.event)
    if (connectAccountUpdate.process) {
      const safeEvent = connectAccountUpdate.safeEvent
      if (!safeEvent) throw new Error('stripe_connect_safe_event_missing')
      const account = verification.event.data?.object || {}
      const readiness = await syncConnectAccountStatusByAccountId(safeEvent.accountId, account)
      const executionLog = await writeSafeExecutionLog({
        name: `STRIPE-CONNECT-STATUS-SYNC-${safeEvent.accountId}`,
        actionType: 'STRIPE_CONNECT_STATUS_SYNCHRONIZED',
        description:
          `Stripe account.updated synchronized safe Connect readiness fields. Account ${safeEvent.accountId}; readiness ${readiness.readiness}; requirements due count ${safeEvent.requirementsDue.length}. No payout, transfer, Business Central posting, royalty calculation, or Bill.com change occurred.`,
        sourceEntity: 'stripe_account',
        sourceRecordId: safeEvent.accountId,
      }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))

      return NextResponse.json({
        received: true,
        processed: true,
        code: connectAccountUpdate.code,
        readiness,
        executionLog,
      })
    }

    const publishingPayment = classifyPublishingPaymentSuccessEvent(verification.event)
    if (!publishingPayment.process) {
      return NextResponse.json({ received: true, processed: false, code: classification.code })
    }

    const safeEvent = publishingPayment.safeEvent
    if (!safeEvent) {
      return NextResponse.json({ received: true, processed: false, code: 'publishing_payment_safe_event_missing' }, { status: 422 })
    }

    const paymentSuccess: PublishingPaymentSuccess = {
      amountCents: safeEvent.amountCents,
      currency: safeEvent.currency,
      eventId: safeEvent.eventId,
      eventType: safeEvent.eventType,
      customerId: safeEvent.customerId,
      invoiceId: safeEvent.invoiceId,
      paymentIntentId: safeEvent.paymentIntentId,
      chargeId: safeEvent.chargeId,
      subscriptionId: safeEvent.subscriptionId,
      created: safeEvent.created,
      source: 'STRIPE_WEBHOOK',
    }
    const result = await processPublishingPaymentSuccess(paymentSuccess)
    const status = result.ok ? 200 : 422
    return NextResponse.json({ received: true, processed: result.ok, result }, { status })
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
