import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
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
      eyebrow="Payment setup"
      title="Connect payment details."
      description="Share the information needed to prepare secure payment and royalty handling for your publishing project."
    >
      <AuthorGate scope="portal">
        <AuthorSetupForm
          endpoint="/api/author/financial-setup"
          fields={financialFields}
          submitLabel="Submit financial setup"
          successTitle="Your payment setup has been received."
          successMessage="A notification has been sent to publishing@jmerrill.one. If any follow-up is needed, we will contact you."
          successDetails={['Next step: complete Royalty Setup in your Author Workspace.']}
          successLink={{ href: '/author/portal', label: 'Return to Author Workspace' }}
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
