import { NextResponse } from 'next/server'

import { verifyGitHubActionsOidcToken } from '@/lib/server/github-actions-oidc'
import {
  runStripeConnectAuthorPilot,
  type StripeConnectAuthorPilotRequest,
} from '@/lib/server/stripe/connect-author-pilot-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'GitHub Actions OIDC bearer token required.' }, { status: 401 })
  }

  try {
    const identity = await verifyGitHubActionsOidcToken(token, { audience: 'jm1-pub-stripe-connect-author-pilot' })
    const body = (await req.json().catch(() => null)) as Partial<StripeConnectAuthorPilotRequest> | null
    if (!body) return NextResponse.json({ error: 'Request body is required.' }, { status: 400 })
    if (body.mode !== 'dry-run' && body.mode !== 'execute') {
      return NextResponse.json({ error: 'Mode must be dry-run or execute.' }, { status: 400 })
    }
    if (body.mode === 'execute' && body.confirm !== true) {
      return NextResponse.json({ error: 'Confirmed Stripe Connect pilot requires confirm=true.' }, { status: 400 })
    }
    const result = await runStripeConnectAuthorPilot({
      mode: body.mode,
      confirm: body.confirm === true,
      expectedProductionRelease: body.expectedProductionRelease,
      maxAuthors: body.maxAuthors || 3,
      operator: identity.subject,
    })
    return NextResponse.json({ identity, result }, { status: result.failures.length ? 422 : 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stripe Connect author pilot failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
