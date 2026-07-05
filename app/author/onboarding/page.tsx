import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
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
      eyebrow="Author onboarding"
      title="Complete author onboarding."
      description="Confirm your author details, mailing address, and book information so we can prepare your publishing agreement."
    >
      <AuthorGate scope="portal">
        <AuthorSetupForm
          endpoint="/api/author/onboarding"
          fields={onboardingFields}
          submitLabel="Submit onboarding"
          successTitle="Your onboarding intake has been received."
          successMessage="A notification has been sent to publishing@jmerrill.one. You can expect a follow-up within 1–2 business days."
          successDetails={['Next step: complete Payment & Royalty Setup in your Author Workspace.']}
          successLink={{ href: '/author/portal', label: 'Return to Author Workspace' }}
          failureMessage="We could not submit your onboarding form at this time. Please try again or contact publishing@jmerrill.one."
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
