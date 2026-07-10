import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorPortalWorkspace } from '../_components/AuthorPortalWorkspace'

export const metadata: Metadata = {
  title: 'Author Operating Center | J Merrill Publishing',
  description: 'Private author operating center for J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorPortalPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Operating Center"
      title="Your Author Operating Center is ready."
      description="View your current publishing relationship, linked projects, and next expected actions in one place."
    >
      <AuthorGate>
        <AuthorPortalWorkspace />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
