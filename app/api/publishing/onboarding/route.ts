import { NextResponse } from 'next/server'
import { resolveOnboardingLink } from '@/lib/server/publisher-funded-onboarding'
import { writeAuthorOnboardingDataverseFallback } from '@/lib/server/author-onboarding-dataverse'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
function token(request: Request) { return request.headers.get('authorization')?.replace(/^Bearer /, '') || '' }
export async function GET(request: Request) {
  try { return NextResponse.json(await resolveOnboardingLink(token(request)), { headers }) }
  catch { return NextResponse.json({ error: 'This onboarding link is unavailable or its agreement is not yet verified.' }, { status: 403, headers }) }
}
export async function POST(request: Request) {
  try {
    const authority = await resolveOnboardingLink(token(request))
    const raw = await request.text()
    if (raw.length > 64000) return NextResponse.json({ error: 'Submission is too large.' }, { status: 413, headers })
    const body = JSON.parse(raw)
    const required = ['legalName', 'phone', 'mailingAddress', 'genre', 'targetAudience', 'shortDescription',
      'manuscriptStatus', 'preferredPrintFormat', 'preferredTrimSize', 'interiorColor', 'paperTypePreference', 'bindingType', 'publishingGoal', 'governedFormatSelection']
    if (!body || required.some(k => typeof body[k] !== 'string' || !body[k].trim()) ||
        ![true, 'true'].includes(body.rightsHolderConfirmed)) return NextResponse.json({ error: 'Complete the required fields and your rights confirmation.' }, { status: 400, headers })
    if (body.bookTitle !== authority.title || body.email !== authority.email || body.packageConfirmation !== 'PUBLISHER_FUNDED') return NextResponse.json({ error: 'The title, author email or funding route differs from this issued request. Contact Publishing for review.' }, { status: 409, headers })
    const result = await writeAuthorOnboardingDataverseFallback({ ...body, authorName: authority.authorName,
      email: authority.email, bookTitle: authority.title, packageConfirmation: 'PUBLISHER_FUNDED',
      rightsHolderConfirmed: true, genreKey: body.genre, rawFormData: body,
      governedAuthority: { titleId: authority.titleId, contactId: authority.contactId,
        policyVersion: 'PUBLISHER_FUNDED_ONBOARDING_V1', agreementSha256: authority.agreementSha256 },
    }, 'Author-bound login-free onboarding receipt; editorial review and stage completion remain separate.', true)
    if (result.status !== 'success' || !result.submissionId) throw Error('receipt unavailable')
    return NextResponse.json({ success: true, receipt: result.submissionId, stage06Complete: false }, { headers })
  } catch { return NextResponse.json({ error: 'Receipt could not be confirmed. Keep this link and contact Publishing before starting another submission.' }, { status: 503, headers }) }
}
