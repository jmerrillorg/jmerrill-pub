import { NextResponse } from 'next/server'

import {
  closeApprovedStage,
  TITLE_CLOSEOUT_PILOT_DEFAULTS,
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
    const input = normalizeCloseoutRequest(body, identity.subject)
    const result = await closeApprovedStage(input)
    return NextResponse.json({ identity, result }, { status: statusFor(result.resultCode), headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TITLE_CLOSEOUT_AUTHORITY_MISSING'
    return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
}

function normalizeCloseoutRequest(input: Partial<PublishingTitleCloseoutRequest>, operator: string): PublishingTitleCloseoutRequest {
  const defaults = TITLE_CLOSEOUT_PILOT_DEFAULTS
  return {
    titleId: input.titleId || defaults.titleId,
    stageId: input.stageId || defaults.stageId,
    gateId: input.gateId || defaults.gateId,
    approvedArtifactId: input.approvedArtifactId || '',
    approvedArtifactChecksum: input.approvedArtifactChecksum || defaults.approvedChecksum,
    approvalSource: input.approvalSource || '',
    approvalTimestamp: input.approvalTimestamp || '',
    authorApprovalSemantic: input.authorApprovalSemantic,
    currentStageArtifactVersion: input.currentStageArtifactVersion,
    approvedArtifactVersion: input.approvedArtifactVersion,
    unresolvedAuthorCorrections: input.unresolvedAuthorCorrections,
    requiredInternalVerification: input.requiredInternalVerification,
    expectedCurrentStage: input.expectedCurrentStage || defaults.expectedStage,
    expectedGateState: input.expectedGateState || defaults.expectedGateState,
    expectedActiveGateCount: Number(input.expectedActiveGateCount ?? defaults.expectedActiveGateCount),
    expectedResponseClockCount: Number(input.expectedResponseClockCount ?? defaults.expectedResponseClockCount),
    idempotencyKey: input.idempotencyKey,
    dryRun: input.dryRun === true,
    confirm: input.confirm === true,
    nextStage: input.nextStage || defaults.nextStage,
    incompleteIntermediateArtifactIds: input.incompleteIntermediateArtifactIds || [],
    obsoleteArtifactIds: input.obsoleteArtifactIds || [],
    operator,
  }
}

function statusFor(code: string) {
  if (code === 'TITLE_CLOSEOUT_ALREADY_COMPLETE') return 200
  if (code === 'TITLE_CLOSEOUT_COMPLETED') return 200
  if (code === 'TITLE_CLOSEOUT_ELIGIBLE') return 200
  if (code === 'TITLE_CLOSEOUT_TITLE_NOT_FOUND') return 404
  return 422
}
