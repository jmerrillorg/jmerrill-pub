import { NextRequest, NextResponse } from 'next/server'
import { ATTA_TAIL, tailAuthorized } from '@/lib/server/stripe/atta-approved-tail-plan'
import { executeAttaApprovedTail, inspectAttaApprovedTail } from '@/lib/server/stripe/atta-approved-tail-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest) { return tailAuthorized(req.headers.get('x-jm1-payment-event-recovery-key')) }
function reply(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }) }
function failed(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const code = /^(ATTA_TAIL_|PAYMENT_GUARD_|DATAVERSE_PAYMENT_GUARD_)[A-Z0-9_]+$/.test(message) ? message : 'ATTA_TAIL_OWNER_FAILURE'
  return reply({ ok: false, code, recovery: 'READ_PROVIDER_AND_DURABLE_CLAIM_BEFORE_RETRY' }, 503)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return reply({ ok: false, code: 'UNAUTHORIZED_OR_DISABLED' }, 401)
  try { return reply({ ok: true, result: await inspectAttaApprovedTail() }) } catch (error) { return failed(error) }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return reply({ ok: false, code: 'UNAUTHORIZED_OR_DISABLED' }, 401)
  let body: any
  try { body = await req.json() } catch { return reply({ ok: false, code: 'INVALID_JSON' }, 400) }
  if (!body || Array.isArray(body) || Object.keys(body).length !== 2 || body.packet !== ATTA_TAIL.packet ||
      body.action !== 'EXECUTE_APPROVED_PLAN') return reply({ ok: false, code: 'EXACT_APPROVED_PACKET_REQUIRED' }, 400)
  try { return reply({ ok: true, result: await executeAttaApprovedTail() }) } catch (error) { return failed(error) }
}
