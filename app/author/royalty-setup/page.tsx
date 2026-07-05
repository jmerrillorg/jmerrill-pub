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
      title="Confirm royalty preferences."
      description="Tell us how royalty reporting and related author details should be handled for your publishing project."
    >
      <AuthorGate scope="portal">
        <AuthorSetupForm
          endpoint="/api/author/royalty-setup"
          fields={royaltyFields}
          submitLabel="Submit royalty setup"
          successTitle="Your royalty setup has been received."
          successMessage="A notification has been sent to publishing@jmerrill.one. Your reporting preferences will be applied when your royalty cycle begins."
          successDetails={['Your pre-contract workspace setup is complete.']}
          successLink={{ href: '/author/portal', label: 'Return to Author Workspace' }}
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
