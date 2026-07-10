import { clearAuthorPortalSession } from '@/lib/server/author-portal-context'

export async function POST() {
  return clearAuthorPortalSession()
}
