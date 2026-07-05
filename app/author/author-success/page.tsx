import type { Metadata } from 'next'

import { AuthorWorkspaceModulePage } from '@/app/author/_components/AuthorWorkspaceModulePage'
import { getAuthorWorkspaceModule } from '@/lib/publishing/author-workspace-modules'

const workspaceModule = getAuthorWorkspaceModule('author-success')!

export const metadata: Metadata = {
  title: `${workspaceModule.title} | Author Workspace | J Merrill Publishing`,
  description: workspaceModule.summary,
  robots: {
    index: false,
    follow: false,
  },
}

export default function Page() {
  return <AuthorWorkspaceModulePage module={workspaceModule} />
}
