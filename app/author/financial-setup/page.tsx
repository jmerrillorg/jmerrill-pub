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
      eyebrow="Financial setup"
      title="Financial setup for author records."
      description="This private intake separates payee, payment preference, and tax-document coordination from general onboarding so sensitive author operations stay structured and controlled."
    >
      <AuthorGate>
        <AuthorSetupForm
          endpoint="/api/author/financial-setup"
          fields={financialFields}
          submitLabel="Submit financial setup"
          successTitle="Your financial setup has been received."
          successMessage="A notification has been sent to publishing@jmerrill.one. If a W-9 or secure payment link is needed, you will receive a follow-up email within 2 business days."
          successDetails={['Next step: complete Royalty Setup using the Author Hub.']}
          successLink={{ href: '/author', label: 'Return to Author Hub' }}
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
