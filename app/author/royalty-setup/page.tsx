import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorSetupForm, royaltyFields } from '../_components/AuthorSetupForm'

export const metadata: Metadata = {
  title: 'Royalty Setup | J Merrill Publishing',
  description: 'Private royalty reporting setup intake for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorRoyaltySetupPage() {
  return (
    <AuthorPortalShell
      eyebrow="Royalty setup"
      title="Royalty setup for active titles."
      description="This private intake captures title coverage, reporting preferences, royalty contacts, and agreement status so author growth infrastructure can scale cleanly."
    >
      <AuthorGate>
        <AuthorSetupForm
          endpoint="/api/author/royalty-setup"
          fields={royaltyFields}
          submitLabel="Submit royalty setup"
          successTitle="Royalty setup received."
          successMessage="Your royalty setup details have been received. The publishing team will confirm reporting and payment workflow details as the account is prepared."
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
