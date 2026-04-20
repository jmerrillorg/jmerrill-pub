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
          successTitle="Financial setup received."
          successMessage="Your financial setup details have been received. J Merrill Publishing will use a secure channel for any tax forms or bank details that should not be entered here."
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
