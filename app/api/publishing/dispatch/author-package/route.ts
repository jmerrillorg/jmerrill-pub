import { NextResponse } from 'next/server'

import {
  dispatchAuthorPackage,
  type PublishingDispatchExecutionMode,
} from '@/lib/server/publishing-dispatch-service'
import { verifyGitHubActionsOidcToken } from '@/lib/server/github-actions-oidc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXECUTION_MODES: PublishingDispatchExecutionMode[] = ['DRY_RUN', 'PRODUCTION', 'EXECUTIVE_RECOVERY']

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
      executionMode?: PublishingDispatchExecutionMode
      packageVersion?: string
      correlationId?: string
    } | null
    if (!body) return NextResponse.json({ error: 'Request body is required.' }, { status: 400 })
    if (!body.packageId || !body.titleId || !body.stageId || !body.recipientContactId) {
      return NextResponse.json({ error: 'PackageID, TitleID, StageID, and RecipientContactID are required.' }, { status: 400 })
    }
    if (!body.executionMode || !EXECUTION_MODES.includes(body.executionMode)) {
      return NextResponse.json({ error: 'ExecutionMode must be DRY_RUN, PRODUCTION, or EXECUTIVE_RECOVERY.' }, { status: 400 })
    }

    const result = await dispatchAuthorPackage({
      packageId: body.packageId,
      titleId: body.titleId,
      stageId: body.stageId,
      recipientContactId: body.recipientContactId,
      executionMode: body.executionMode,
      packageVersion: body.packageVersion,
      correlationId: body.correlationId,
      operator: identity.subject,
    })

    return NextResponse.json({ identity, result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing dispatch failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
