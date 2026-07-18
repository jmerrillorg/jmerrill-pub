import { createHash } from 'crypto'
import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { dataverseCreate, getDataverseServerConfig } from '@/lib/server/dataverse-server'

export const runtime = 'nodejs'

const ALLOWED_SOURCES = new Set(['INGRAM', 'KDP', 'ACX', 'DIRECT_SALES'])

export async function POST(req: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const sourceSystem = clean(form?.get('sourceSystem')).toUpperCase()
  const reportingMonth = clean(form?.get('reportingMonth'))
  const noActivity = clean(form?.get('noActivity')) === 'true'
  const file = form?.get('file')

  if (!ALLOWED_SOURCES.has(sourceSystem)) {
    return NextResponse.json({ error: 'Unsupported royalty source.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}$/.test(reportingMonth)) {
    return NextResponse.json({ error: 'Reporting month must use YYYY-MM.' }, { status: 400 })
  }
  if (!noActivity && !(file instanceof File)) {
    return NextResponse.json({ error: 'A source report file is required.' }, { status: 400 })
  }

  const fileEvidence =
    file instanceof File
      ? {
          fileName: file.name,
          size: file.size,
          sha256: createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'),
        }
      : null

  const state = noActivity ? 'NO ACTIVITY CONFIRMED' : 'RECEIVED — NOT PROCESSED'
  const eventType = noActivity ? 'ROYALTY_SOURCE_NO_ACTIVITY_CONFIRMED' : 'ROYALTY_SOURCE_UPLOAD_RECEIVED'
  const description = [
    `${sourceSystem} royalty source ${state.toLowerCase()} for ${reportingMonth}.`,
    fileEvidence ? `File ${fileEvidence.fileName}; sha256:${fileEvidence.sha256}; size:${fileEvidence.size}.` : '',
    'Rows are not author-visible until imported, reconciled, and approved through the royalty close path.',
  ]
    .filter(Boolean)
    .join(' ')

  const config = getDataverseServerConfig()
  let executionLogId: string | null = null
  if (config) {
    const created = await dataverseCreate(config, 'jm1_executionlogs', {
      jm1_name: `${eventType} - ${sourceSystem} ${reportingMonth}`,
      jm1_actiontype: eventType,
      jm1_actiondescription: description,
      jm1_agentname: 'Publisher Operating Center',
      jm1_agentmodel: 'Governed API',
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: new Date().toISOString(),
      jm1_completedon: new Date().toISOString(),
      jm1_sourceentity: 'royalty_source_upload',
      jm1_sourcerecordid: `${sourceSystem}:${reportingMonth}:${fileEvidence?.sha256 || 'no-activity'}`,
    })
    executionLogId = parseDataverseId(created)
  }

  return NextResponse.json(
    {
      ok: true,
      sourceSystem,
      reportingMonth,
      state,
      file: fileEvidence,
      executionLogId,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

function clean(value: FormDataEntryValue | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDataverseId(entityUrl: string) {
  const match = entityUrl.match(/\(([^)]+)\)/)
  return match?.[1] || null
}
