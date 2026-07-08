import { NextResponse } from 'next/server'

import { buildWorkspaceEditorialModule } from '@/lib/program003/editorial-command'
import { getEditorialRecordForAsset, getProgram003PilotAssetId } from '@/lib/program003/dataverse'

export const runtime = 'nodejs'

export async function GET() {
  const publishingAssetId = getProgram003PilotAssetId()
  if (!publishingAssetId) {
    return NextResponse.json(
      {
        status: 'unavailable',
        generatedAt: new Date().toISOString(),
        error: 'PROGRAM-003 pilot asset is not configured.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const record = await getEditorialRecordForAsset(publishingAssetId)
  if (!record) {
    return NextResponse.json(
      {
        status: 'unavailable',
        generatedAt: new Date().toISOString(),
        error: 'No live Editorial Command record exists for the configured pilot asset.',
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    {
      status: 'core-live',
      generatedAt: new Date().toISOString(),
      record,
      workspaceModule: buildWorkspaceEditorialModule(record),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
