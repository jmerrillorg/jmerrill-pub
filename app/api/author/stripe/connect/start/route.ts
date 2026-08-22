import { NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess, validateAuthorPortalAccessCode } from '@/lib/server/author-access'
import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import { getDataverseServerConfig } from '@/lib/server/dataverse-server'
import {
  createRecipientAccountLink,
  getStripeMode,
  isStripeConnectGateOpen,
  persistConnectAccountLinkage,
  resolveGovernedAuthorConnectIdentity,
  resolveRecipientAccountId,
  retrieveConnectedAccount,
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

    const access = validateAuthorPortalAccessCode(req.headers.get('x-author-access-code'))
    if (!access.success || access.accessType !== 'author' || !access.portalContext?.contactId) {
      return NextResponse.json(
        { error: 'Author Payout Enrollment requires an exact author relationship access context.' },
        { status: 403 },
      )
    }

    const config = getDataverseServerConfig()
    if (!config) throw new Error('dataverse_config_missing')

    const identity = await resolveGovernedAuthorConnectIdentity({
      contactId: access.portalContext.contactId,
      authorEmail: undefined,
    }, config)
    const { accountId, reused, source } = await resolveRecipientAccountId(identity)
    const account = await retrieveConnectedAccount(accountId)
    const readiness = await persistConnectAccountLinkage(config, identity, account)

    const link = await createRecipientAccountLink(accountId, identity)
    if (!link.url) throw new Error('stripe_account_link_missing_url')

    let executionLog = { created: false, id: null as string | null, detail: 'not_written' }
    try {
      executionLog = await writeSafeExecutionLog({
        name: `STRIPE-ONBOARDING-INITIATED-${identity.royaltyPayeeId}`,
        actionType: reused ? 'STRIPE_CONNECTED_ACCOUNT_REUSED' : 'STRIPE_CONNECTED_ACCOUNT_CREATED',
        description:
          `Author Payout Enrollment was initiated for Contact ${identity.contactId}, Author Relationship ${identity.authorRelationshipId}, and Royalty Payee ${identity.royaltyPayeeId}. ` +
          `Stripe account source: ${source}. Readiness: ${readiness.readiness}. ` +
          'Stripe collects identity, tax, and payout-destination details; website and Dataverse store only safe status/identifier evidence. No Account Link URL, Business Central posting, royalty generation, author payment, transfer, payout, production, distribution, or workspace movement occurred.',
        sourceEntity: 'contact',
        sourceRecordId: identity.contactId,
      })
    } catch {
      executionLog = { created: false, id: null, detail: 'execution_log_write_failed' }
    }

    return NextResponse.json({
      success: true,
      mode: getStripeMode(),
      authorRelationshipId: identity.authorRelationshipId,
      royaltyPayeeId: identity.royaltyPayeeId,
      stripeAccountId: accountId,
      reusedStripeAccount: reused,
      accountSource: source,
      readiness: readiness.readiness,
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
