import { NextRequest, NextResponse } from 'next/server'

import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  createFreshConnectAccountLinkFromToken,
} from '@/lib/server/stripe/author-workspace-stripe'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  // A record identifier is not authorization to enter its financial setup.
  if (!token) {
    return NextResponse.redirect(new URL('/author/financial-setup?connect=support', req.nextUrl.origin), {
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    })
  }

  try {
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

    return NextResponse.redirect(result.link.url!, {
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    })
  } catch {
    console.error('Stripe Connect setup refresh failed; author-bound link not issued')
    await writeSafeExecutionLog({
      name: 'P0-CONNECT-JOURNEY-REFRESH-FAILED',
      actionType: 'P0_CONNECT_JOURNEY_REGRESSION',
      description:
        'Stripe Connect setup refresh could not produce a fresh Stripe-hosted link and was redirected to support. ' +
        'This watchdog protects against Connect-context traffic reaching an activation-code dead end.',
    }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))
    const url = new URL('/author/financial-setup?connect=support', req.nextUrl.origin)
    return NextResponse.redirect(url, {
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    })
  }
}
