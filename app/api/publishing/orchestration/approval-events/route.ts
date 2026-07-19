import { NextResponse } from 'next/server'

import { runAutomaticApprovalEventConsumer } from '@/lib/server/approval-event-consumer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const expectedKey = process.env.JM1_ORCHESTRATION_WORKER_KEY
  const suppliedKey = req.headers.get('x-jm1-orchestration-worker-key') || ''
  if (!expectedKey || suppliedKey !== expectedKey) {
    return NextResponse.json({ error: 'Worker authorization failed.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const body = (await req.json().catch(() => null)) as { maxEvents?: number; triggerSource?: 'SCHEDULED_WORKER' | 'DATAVERSE_EVENT' | 'ADMIN_RETRY' } | null
  const result = await runAutomaticApprovalEventConsumer({
    maxEvents: Math.min(Math.max(Number(body?.maxEvents || 10), 1), 25),
    triggerSource: body?.triggerSource || 'SCHEDULED_WORKER',
  })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
