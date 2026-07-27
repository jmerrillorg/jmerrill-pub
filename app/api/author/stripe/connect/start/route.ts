import { NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess } from '@/lib/server/author-access'
import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  COMMISSIONING_REFERENCE,
  createRecipientAccountLink,
  getStripeMode,
  isStripeConnectGateOpen,
  resolveRecipientAccountId,
} from '@/lib/server/stripe/author-workspace-stripe'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    if (!isStripeConnectGateOpen()) {
      return NextResponse.json(
        { error: 'Author Payout Enrollment is not open for this workspace yet.' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const existingStripeAccountId = typeof body?.stripeAccountId === 'string' ? body.stripeAccountId.trim() : ''
    const { accountId, reused } = await resolveRecipientAccountId(existingStripeAccountId)

    const link = await createRecipientAccountLink(accountId)
    if (!link.url) throw new Error('stripe_account_link_missing_url')

    let executionLog = { created: false, id: null as string | null, detail: 'not_written' }
    try {
      executionLog = await writeSafeExecutionLog({
        name: `STRIPE-ONBOARDING-INITIATED-${COMMISSIONING_REFERENCE}`,
        actionType: reused ? 'STRIPE_CONNECTED_ACCOUNT_REUSED' : 'STRIPE_CONNECTED_ACCOUNT_CREATED',
        description:
          'Author Payout Enrollment was initiated through Stripe-hosted onboarding. Stripe collects identity, tax, and payout-destination details; website and Dataverse store only safe status/identifier evidence. No Account Link URL, Business Central posting, royalty generation, author payment, transfer, payout, production, distribution, or workspace movement occurred.',
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
      reusedStripeAccount: reused,
      onboardingUrl: link.url,
      expiresAt: link.expires_at || null,
      executionLog,
    })
  } catch (error: any) {
    console.error('Author Payout Enrollment start error:', error?.message || error)
    return NextResponse.json(
      { error: 'Unable to start Author Payout Enrollment at this time.', code: error?.code || error?.message || 'author_payout_enrollment_failed' },
      { status: 502 },
    )
  }
}
