import { NextRequest, NextResponse } from 'next/server'

import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import { getDataverseServerConfig } from '@/lib/server/dataverse-server'
import {
  assertConnectedAccountMatchesIdentity,
  createFreshConnectAccountLinkFromToken,
  createRecipientAccountLink,
  persistConnectAccountLinkage,
  resolveGovernedAuthorConnectIdentity,
  retrieveConnectedAccount,
} from '@/lib/server/stripe/author-workspace-stripe'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const contact = req.nextUrl.searchParams.get('contact') || ''

  try {
    if (!token && isValidLegacyConnectContact(contact)) {
      const result = await createFreshConnectAccountLinkFromLegacyContact(contact)
      await writeSafeExecutionLog({
        name: `STRIPE-CONNECT-LEGACY-LINK-REFRESHED-${result.identity.royaltyPayeeId}`,
        actionType: 'STRIPE_CONNECT_LEGACY_LINK_REFRESH_GENERATED',
        description:
          `A historical Stripe Connect setup link was refreshed for Contact ${result.identity.contactId}, ` +
          `Author Relationship ${result.identity.authorRelationshipId}, and Royalty Payee ${result.identity.royaltyPayeeId}. ` +
          `The existing canonical Connect account was reused. The author was not sent to an activation-code gate. ` +
          'No duplicate Connect account, royalty payment, payout, transfer, charge, invoice, Business Central posting, agreement change, rights change, or author portal access change occurred.',
        sourceEntity: 'contact',
        sourceRecordId: result.identity.contactId,
      }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))

      return NextResponse.redirect(result.link.url!)
    }

    const result = await createFreshConnectAccountLinkFromToken(token)
    await writeSafeExecutionLog({
      name: `STRIPE-CONNECT-SETUP-LINK-REFRESHED-${result.identity.royaltyPayeeId}`,
      actionType: 'STRIPE_CONNECT_SETUP_LINK_REFRESHED',
      description:
        `A fresh Stripe-hosted direct deposit setup link was generated for Contact ${result.identity.contactId}, ` +
        `Author Relationship ${result.identity.authorRelationshipId}, and Royalty Payee ${result.identity.royaltyPayeeId}. ` +
        `The existing canonical Connect account was reused. No activation code, royalty payment, payout, transfer, charge, invoice, ` +
        'Business Central posting, agreement change, rights change, or author portal access change occurred.',
      sourceEntity: 'contact',
      sourceRecordId: result.identity.contactId,
    }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))

    return NextResponse.redirect(result.link.url!)
  } catch (error: any) {
    console.error('Stripe Connect setup refresh error:', error?.message || error)
    await writeSafeExecutionLog({
      name: 'P0-CONNECT-JOURNEY-REFRESH-FAILED',
      actionType: 'P0_CONNECT_JOURNEY_REGRESSION',
      description:
        'Stripe Connect setup refresh could not produce a fresh Stripe-hosted link and was redirected to support. ' +
        'This watchdog protects against Connect-context traffic reaching an activation-code dead end.',
      sourceEntity: contact ? 'contact' : undefined,
      sourceRecordId: isValidLegacyConnectContact(contact) ? contact : undefined,
    }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))
    const url = new URL('/author/financial-setup?connect=support', req.nextUrl.origin)
    return NextResponse.redirect(url)
  }
}

async function createFreshConnectAccountLinkFromLegacyContact(contactId: string) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')
  const identity = await resolveGovernedAuthorConnectIdentity({ contactId }, config)
  if (!identity.existingStripeAccountId) throw new Error('legacy_connect_account_missing')
  const account = await retrieveConnectedAccount(identity.existingStripeAccountId)
  assertConnectedAccountMatchesIdentity(account, identity)
  const readiness = await persistConnectAccountLinkage(config, identity, account)
  const link = await createRecipientAccountLink(identity.existingStripeAccountId, identity)
  if (!link.url) throw new Error('stripe_account_link_missing_url')
  return { identity, account, readiness, link }
}

function isValidLegacyConnectContact(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
