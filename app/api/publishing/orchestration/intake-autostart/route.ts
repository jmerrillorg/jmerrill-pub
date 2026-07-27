import { NextResponse } from 'next/server'

import { autoInitializeOutsideInquiryEditorialReview } from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CORRELATION_ID_PATTERN = /^[0-9a-zA-Z_-]{1,120}$/

export async function POST(req: Request) {
  const expectedKey = process.env.JM1_ORCHESTRATION_WORKER_KEY
  const suppliedKey = req.headers.get('x-jm1-orchestration-worker-key') || ''
  if (!expectedKey || suppliedKey !== expectedKey) {
    return NextResponse.json({ error: 'Worker authorization failed.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const body = (await req.json().catch(() => null)) as {
    intakeId?: string
    correlationId?: string
  } | null
  const intakeId = clean(body?.intakeId)
  const correlationId = clean(body?.correlationId)

  if (!GUID_PATTERN.test(intakeId)) {
    return NextResponse.json({ status: 'blocked', blocker: 'invalid_intake_id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  if (correlationId && !CORRELATION_ID_PATTERN.test(correlationId)) {
    return NextResponse.json({ status: 'blocked', blocker: 'invalid_correlation_id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const result = await autoInitializeOutsideInquiryEditorialReview({
    intakeId,
    ...(correlationId ? { correlationId } : {}),
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
