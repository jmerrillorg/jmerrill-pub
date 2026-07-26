import { NextResponse } from 'next/server'

import { recordPublisherAction, requirePublisherOperator, type PublisherActionRequest } from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_ACTIONS = new Set([
  'place-asset-in-pipeline',
  'advance-stage',
  'begin-interior-layout',
  'begin-cover-design',
  'review-royalty-statement',
])

export async function POST(request: Request) {
  const publisher = requirePublisherOperator()
  if (!publisher.ok) {
    return NextResponse.json({ error: publisher.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const body = (await request.json().catch(() => null)) as PublisherActionRequest | null
  if (!body || !ALLOWED_ACTIONS.has(body.action)) {
    return NextResponse.json(
      { error: 'Choose a supported publisher action.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (!body.reason?.trim()) {
    return NextResponse.json(
      { error: 'A publisher reason is required for audited action requests.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const result = await recordPublisherAction(publisher.operator.email, body)

  return NextResponse.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } })
}
