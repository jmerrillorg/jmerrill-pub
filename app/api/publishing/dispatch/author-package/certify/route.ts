import { NextResponse } from 'next/server'

import {
  certifyOperationalDelivery,
  type OperationalDeliveryCertificationEvidence,
} from '@/lib/server/publishing-dispatch-service'
import { verifyGitHubActionsOidcToken } from '@/lib/server/github-actions-oidc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVIDENCE_KEYS: Array<keyof OperationalDeliveryCertificationEvidence> = [
  'brandedHtml',
  'plainText',
  'requiredAttachments',
  'attachmentChecksums',
  'archiveConfirmed',
  'portalAccess',
  'packageVisible',
  'responseControls',
  'singleActiveGate',
]

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'GitHub Actions OIDC bearer token required.' }, { status: 401 })
  }

  try {
    const identity = await verifyGitHubActionsOidcToken(token)
    const body = (await req.json().catch(() => null)) as {
      packageId?: string
      titleId?: string
      stageId?: string
      recipientContactId?: string
      gateId?: string
      packageVersion?: string
      correlationId?: string
      dryRun?: boolean
      evidence?: Partial<OperationalDeliveryCertificationEvidence>
    } | null
    if (!body) return NextResponse.json({ error: 'Request body is required.' }, { status: 400 })
    if (!body.packageId || !body.titleId || !body.stageId || !body.recipientContactId || !body.gateId) {
      return NextResponse.json(
        { error: 'PackageID, TitleID, StageID, RecipientContactID, and GateID are required.' },
        { status: 400 },
      )
    }
    const evidence = normalizeEvidence(body.evidence || {})
    const result = await certifyOperationalDelivery({
      packageId: body.packageId,
      titleId: body.titleId,
      stageId: body.stageId,
      recipientContactId: body.recipientContactId,
      gateId: body.gateId,
      packageVersion: body.packageVersion,
      correlationId: body.correlationId,
      dryRun: body.dryRun === true,
      evidence,
      operator: identity.subject,
    })

    return NextResponse.json({ identity, result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing delivery certification failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

function normalizeEvidence(input: Partial<OperationalDeliveryCertificationEvidence>): OperationalDeliveryCertificationEvidence {
  return Object.fromEntries(EVIDENCE_KEYS.map((key) => [key, input[key] === true])) as OperationalDeliveryCertificationEvidence
}
