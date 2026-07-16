import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorPortalWorkspace } from '../_components/AuthorPortalWorkspace'
import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'

export const metadata: Metadata = {
  title: 'Author Operating Center | J Merrill Publishing',
  description: 'Private author operating center for J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AuthorPortalPage({
  searchParams,
}: {
  searchParams?: { view?: string }
}) {
  const publisherSession = await getPublisherOperatingCenterSession()
  if (publisherSession && searchParams?.view !== 'author') {
    redirect('/publisher/operating-center')
  }

  return (
    <AuthorPortalShell
      eyebrow="Author Operating Center"
      title="Your Author Operating Center is ready."
      description="View your current publishing relationship, linked projects, and next expected actions in one place."
    >
      <AuthorGate scope="portal">
        <AuthorPortalWorkspace />
      </AuthorGate>
    </AuthorPortalShell>
  )
}
