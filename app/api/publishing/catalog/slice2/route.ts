import { NextResponse } from 'next/server'

import {
  executePublishingCommercialCatalogSlice2,
  type PublishingCommercialCatalogSlice2Request,
} from '@/lib/server/publishing-commercial-catalog-slice2-service'
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
    const identity = await verifyGitHubActionsOidcToken(token, { audience: 'jm1-pub-catalog-slice2' })
    const body = (await req.json().catch(() => null)) as Partial<PublishingCommercialCatalogSlice2Request> | null
    if (!body) return NextResponse.json({ error: 'Request body is required.' }, { status: 400 })
    if (body.mode !== 'dry-run' && body.mode !== 'execute') {
      return NextResponse.json({ error: 'Mode must be dry-run or execute.' }, { status: 400 })
    }
    if (body.mode === 'execute' && body.confirm !== true) {
      return NextResponse.json({ error: 'Confirmed Slice 2 execution requires confirm=true.' }, { status: 400 })
    }
    if (!body.expectedMainSha || !body.seedManifestSha256 || !body.correlationId) {
      return NextResponse.json(
        { error: 'expectedMainSha, seedManifestSha256, and correlationId are required.' },
        { status: 400 },
      )
    }

    const result = await executePublishingCommercialCatalogSlice2({
      mode: body.mode,
      confirm: body.confirm === true,
      expectedMainSha: body.expectedMainSha,
      seedManifestSha256: body.seedManifestSha256,
      correlationId: body.correlationId,
      operator: identity.subject,
    })

    return NextResponse.json(
      { identity, result },
      { status: statusFor(result.resultCode), headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing catalog Slice 2 failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

function statusFor(code: string) {
  if (code === 'CATALOG_SLICE2_DRY_RUN_PASS') return 200
  if (code === 'CATALOG_SLICE2_EXECUTED') return 200
  if (code === 'CATALOG_SLICE2_ALREADY_APPLIED') return 200
  return 422
}
