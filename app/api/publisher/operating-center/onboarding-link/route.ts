import { NextResponse } from 'next/server'
import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { onboardingAuthority, signOnboardingClaims } from '@/lib/server/publisher-funded-onboarding'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const input = await request.json()
    if (Object.keys(input).join() !== 'titleId') throw Error('invalid request')
    const authority = await onboardingAuthority(input.titleId)
    const token = signOnboardingClaims({ purpose: 'PUBLISHING_ONBOARDING_V1', titleId: authority.titleId,
      contactId: authority.contactId, agreementSha256: authority.agreementSha256, exp: Math.floor(Date.now() / 1000) + 14 * 86400 })
    return NextResponse.json({ url: `https://jmerrill.pub/onboarding#${token}`, title: authority.title },
      { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch { return NextResponse.json({ code: 'ONBOARDING_AUTHORITY_NOT_READY' }, { status: 409 }) }
}
