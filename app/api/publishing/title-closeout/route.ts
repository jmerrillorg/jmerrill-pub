import { NextResponse } from 'next/server'

import {
  closeApprovedStage,
  INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST,
  type PublishingTitleCloseoutRequest,
} from '@/lib/server/publishing-title-closeout-service'
import { verifyGitHubActionsOidcToken } from '@/lib/server/github-actions-oidc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'GitHub Actions OIDC bearer token required.' }, { status: 401 })
  }

  try {
    const identity = await verifyGitHubActionsOidcToken(token, { audience: 'jm1-pub-title-closeout' })
    const body = (await req.json().catch(() => null)) as Partial<PublishingTitleCloseoutRequest> | null
    if (!body) return NextResponse.json({ error: 'Request body is required.' }, { status: 400 })
    if (!body.dryRun && body.confirm !== true) {
      return NextResponse.json({ error: 'Confirmed title closeout requires confirm=true.' }, { status: 400 })
    }
    if (body.titleId !== INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId) {
      return NextResponse.json({ error: 'TITLE_CLOSEOUT_TITLE_NOT_ALLOWLISTED' }, { status: 403 })
    }

    const input = normalizeCloseoutRequest(body, identity.subject)
    const result = await closeApprovedStage(input)
    return NextResponse.json({ identity, result }, { status: statusFor(result.resultCode), headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TITLE_CLOSEOUT_AUTHORITY_MISSING'
    return NextResponse.json({ error: message }, { status: message === 'TITLE_CLOSEOUT_TITLE_NOT_ALLOWLISTED' ? 403 : 400, headers: { 'Cache-Control': 'no-store' } })
  }
}

function normalizeCloseoutRequest(input: Partial<PublishingTitleCloseoutRequest>, operator: string): PublishingTitleCloseoutRequest {
  const allowlist = INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST
  return {
    titleId: input.titleId || '',
    stageId: input.stageId || '',
    gateId: input.gateId || '',
    approvedArtifactId: input.approvedArtifactId || '',
    approvedArtifactChecksum: input.approvedArtifactChecksum || '',
    approvalSource: input.approvalSource || '',
    approvalTimestamp: input.approvalTimestamp || '',
    expectedCurrentStage: input.expectedCurrentStage || allowlist.expectedStage,
    expectedGateState: input.expectedGateState || allowlist.expectedGateState,
    expectedActiveGateCount: Number(input.expectedActiveGateCount ?? allowlist.expectedActiveGateCount),
    expectedResponseClockCount: Number(input.expectedResponseClockCount ?? allowlist.expectedResponseClockCount),
    idempotencyKey: input.idempotencyKey,
    dryRun: input.dryRun === true,
    confirm: input.confirm === true,
    nextStage: input.nextStage || allowlist.nextStage,
    incompleteIntermediateArtifactIds: input.incompleteIntermediateArtifactIds || [],
    obsoleteArtifactIds: input.obsoleteArtifactIds || [],
    operator,
  }
}

function statusFor(code: string) {
  if (code === 'TITLE_CLOSEOUT_ALREADY_COMPLETE') return 200
  if (code === 'TITLE_CLOSEOUT_COMPLETED') return 200
  if (code === 'TITLE_CLOSEOUT_ELIGIBLE') return 200
  if (code === 'TITLE_CLOSEOUT_TITLE_NOT_ALLOWLISTED') return 403
  return 422
}
