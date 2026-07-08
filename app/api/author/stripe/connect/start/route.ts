import { NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess } from '@/lib/server/author-access'
import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  COMMISSIONING_REFERENCE,
  createRecipientAccount,
  createRecipientAccountLink,
  getStripeMode,
  isStripeConnectGateOpen,
} from '@/lib/server/stripe/author-workspace-stripe'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    if (!isStripeConnectGateOpen()) {
      return NextResponse.json(
        { error: 'Stripe onboarding is not open for this workspace yet.' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const existingStripeAccountId = typeof body?.stripeAccountId === 'string' ? body.stripeAccountId.trim() : ''
    const accountId = existingStripeAccountId || (await createRecipientAccount()).id
    if (!accountId) throw new Error('stripe_account_missing_id')

    const link = await createRecipientAccountLink(accountId)
    if (!link.url) throw new Error('stripe_account_link_missing_url')

    let executionLog = { created: false, id: null as string | null, detail: 'not_written' }
    try {
      executionLog = await writeSafeExecutionLog({
        name: `STRIPE-ONBOARDING-INITIATED-${COMMISSIONING_REFERENCE}`,
        actionType: 'STRIPE_ONBOARDING_INITIATED',
        description:
          'Stripe hosted recipient onboarding was initiated for PROGRAM-002 commissioning. Stripe collects financial/tax/payout details; website and Dataverse store only safe status/identifier evidence. No Business Central posting, royalty generation, author payment, production, distribution, or workspace movement occurred.',
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
      stripeAccountId: accountId,
      onboardingUrl: link.url,
      expiresAt: link.expires_at || null,
      executionLog,
    })
  } catch (error: any) {
    console.error('Stripe Connect onboarding start error:', error?.message || error)
    return NextResponse.json(
      { error: 'Unable to start Stripe onboarding at this time.', code: error?.code || error?.message || 'stripe_connect_failed' },
      { status: 502 },
    )
  }
}
