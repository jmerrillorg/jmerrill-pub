import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { StripeConnectSetupCard } from '../_components/StripeConnectSetupCard'

export const metadata: Metadata = {
  title: 'Payment & Royalty Setup | J Merrill Publishing',
  description: 'Private Stripe setup for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorFinancialSetupPage() {
  return (
    <AuthorPortalShell
      eyebrow="Payment & Royalty Setup"
      title="Connect Stripe for payment and royalties."
      description="Securely connect Stripe so agreement payment and future royalty handling can be managed safely."
    >
      <AuthorGate scope="portal">
        <StripeConnectSetupCard />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
