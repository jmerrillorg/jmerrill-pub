import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorTaskGate } from '../_components/AuthorTaskGate'
import { AuthorSetupForm, onboardingFields } from '../_components/AuthorSetupForm'

export const metadata: Metadata = {
  title: 'Author Onboarding | J Merrill Publishing',
  description: 'Private author onboarding for J Merrill Publishing authors joining the family.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorOnboardingPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Profile"
      title="Complete your author profile."
      description="Confirm your author details, mailing address, and book information."
    >
      <AuthorGate>
        <AuthorTaskGate
          task="authorProfileRequired"
          completedTitle="Your author profile is already on file."
          completedBody="This project opened in your existing author relationship, so we are not asking you to repeat onboarding."
        >
          <AuthorSetupForm
            endpoint="/api/author/onboarding"
            fields={onboardingFields}
            submitLabel="Submit author profile"
            successTitle="Your author profile has been received."
            successMessage="A notification has been sent to publishing@jmerrill.one. You can expect a follow-up within 1–2 business days."
            successDetails={['Next step: complete Payment & Royalty Setup inside your workspace if it is still needed.']}
            successLink={{ href: '/author/portal', label: 'Return to workspace' }}
            failureMessage="We could not submit your author profile at this time. Please try again or contact publishing@jmerrill.one."
          />
        </AuthorTaskGate>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
