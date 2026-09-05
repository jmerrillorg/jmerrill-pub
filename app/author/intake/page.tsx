import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { V2IntakeWorkspace } from '../_components/V2IntakeWorkspace'

export const metadata: Metadata = {
  title: 'Complete Intake | J Merrill Publishing',
  description: 'Complete the outstanding information for your publishing Intake.',
  robots: { index: false, follow: false },
}

export default function AuthorIntakePage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Operating Center"
      title="Complete your Intake."
      description="Save your progress, return when you need to, and submit once every answer is ready."
    >
      <AuthorGate>
        <V2IntakeWorkspace />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
