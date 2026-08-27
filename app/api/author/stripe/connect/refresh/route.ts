import { NextRequest, NextResponse } from 'next/server'

import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import { createFreshConnectAccountLinkFromToken } from '@/lib/server/stripe/author-workspace-stripe'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''

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

    return NextResponse.redirect(result.link.url!)
  } catch (error: any) {
    console.error('Stripe Connect setup refresh error:', error?.message || error)
    const url = new URL('/author/financial-setup?connect=support', req.nextUrl.origin)
    return NextResponse.redirect(url)
  }
}
