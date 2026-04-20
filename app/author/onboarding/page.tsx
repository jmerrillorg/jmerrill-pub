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
      title="Welcome to your author setup."
      description="This private intake gives J Merrill Publishing the core author, title, manuscript, and platform details needed to move from inquiry into a structured publishing relationship."
    >
      <AuthorGate>
        <AuthorSetupForm
          endpoint="/api/author/onboarding"
          fields={onboardingFields}
          submitLabel="Submit onboarding"
          successTitle="Onboarding received."
          successMessage="Your author onboarding details have been received. The publishing team will review your setup and follow up with next steps."
        />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
