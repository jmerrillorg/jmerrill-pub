import { clearAuthorPortalSession } from '@/lib/server/author-portal-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return clearAuthorPortalSession()
}
