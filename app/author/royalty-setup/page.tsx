import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorTaskGate } from '../_components/AuthorTaskGate'
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
      eyebrow="Royalty Setup"
      title="Confirm royalty reporting details."
      description="Use this only when your workspace still asks for additional royalty reporting details."
    >
      <AuthorGate>
        <AuthorTaskGate
          task="paymentRoyaltyRequired"
          completedTitle="No additional royalty setup is needed right now."
          completedBody="Your workspace is already using the existing author relationship and project status on file."
        >
          <AuthorSetupForm
            endpoint="/api/author/royalty-setup"
            fields={royaltyFields}
            submitLabel="Submit royalty setup"
            successTitle="Your royalty setup has been received."
            successMessage="A notification has been sent to publishing@jmerrill.one. Your reporting preferences will be applied when your royalty cycle begins."
            successDetails={['Your workspace setup is complete.']}
            successLink={{ href: '/author/portal', label: 'Return to workspace' }}
          />
        </AuthorTaskGate>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
