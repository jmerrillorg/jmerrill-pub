import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorPortalWorkspace } from '../_components/AuthorPortalWorkspace'

export const metadata: Metadata = {
  title: 'Author Workspace | J Merrill Publishing',
  description: 'Private author workspace for active J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorPortalPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Workspace"
      title="Your Author Workspace is ready."
      description="Complete these setup steps so we can prepare your publishing agreement and begin your publishing journey."
    >
      <AuthorGate scope="portal">
        <AuthorPortalWorkspace />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
