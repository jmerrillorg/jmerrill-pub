import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorTaskGate } from '../_components/AuthorTaskGate'
import { AuthorSetupForm, financialFields } from '../_components/AuthorSetupForm'

export const metadata: Metadata = {
  title: 'Financial Setup | J Merrill Publishing',
  description: 'Private financial setup intake for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorFinancialSetupPage() {
  return (
    <AuthorPortalShell
      eyebrow="Payment & Royalty Setup"
      title="Connect payment and royalty setup."
      description="Securely connect Stripe so payments and royalties can be handled safely."
    >
      <AuthorGate>
        <AuthorTaskGate
          task="paymentRoyaltyRequired"
          completedTitle="Your payment and royalty setup is already in place."
          completedBody="This workspace is already operating inside your existing author relationship, so we are not asking you to repeat financial setup."
        >
          <AuthorSetupForm
            endpoint="/api/author/financial-setup"
            fields={financialFields}
            submitLabel="Submit setup"
            successTitle="Your payment and royalty setup has been received."
            successMessage="A notification has been sent to publishing@jmerrill.one. If a secure follow-up is needed, you will receive it directly."
            successLink={{ href: '/author/portal', label: 'Return to workspace' }}
          />
        </AuthorTaskGate>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
