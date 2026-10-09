import { NextRequest, NextResponse } from 'next/server'
import { dataverseFirst, getDataverseServerConfig } from '@/lib/server/dataverse-server'
import { DataversePaymentGuardStore } from '@/lib/server/stripe/publishing-payment-guard-store'
import { AgreementPaymentGuard, PAYMENT_GUARD_VERSION, paymentGuardHttpStatus } from '@/lib/server/stripe/publishing-payment-guard'
import { PAYMENT_GUARD_ACCEPTANCE_ID, executeGuardAcceptance, guardAcceptanceAuthorized, parseGuardAcceptanceRequest } from '@/lib/server/stripe/publishing-payment-guard-acceptance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function context() {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('DATAVERSE_PAYMENT_GUARD_CONFIG_MISSING')
  const collision = await dataverseFirst(config, 'jmpv2_agreementrecords', {
    $select: 'jmpv2_agreementrecordid', $filter: `jmpv2_agreementrecordid eq ${PAYMENT_GUARD_ACCEPTANCE_ID}`,
  })
  if (collision) throw new Error('PAYMENT_GUARD_ACCEPTANCE_NAMESPACE_COLLISION')
  return new DataversePaymentGuardStore(config)
}

function authorized(req: NextRequest) {
  return guardAcceptanceAuthorized(req.headers.get('x-jm1-payment-event-recovery-key'))
}

function failure(error: unknown) {
  const raw = error instanceof Error ? error.message : ''
  const code = /^(PAYMENT_GUARD_|DATAVERSE_PAYMENT_GUARD_)[A-Z0-9_]+$/.test(raw) ? raw : 'PAYMENT_GUARD_ACCEPTANCE_FAILED'
  return NextResponse.json({ ok: false, code, businessEffects: 0 }, { status: paymentGuardHttpStatus(code), headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED_OR_DISABLED' }, { status: 401 })
  try {
    const guard = new AgreementPaymentGuard(await context())
    return NextResponse.json({ ok: true, guardVersion: PAYMENT_GUARD_VERSION, businessEffects: 0,
      readback: await guard.readback(PAYMENT_GUARD_ACCEPTANCE_ID) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED_OR_DISABLED' }, { status: 401 })
  try {
    const input = parseGuardAcceptanceRequest(await req.json())
    const store = await context()
    const result = await executeGuardAcceptance(input, { store, assertNonBusinessNamespace: async () => { await context() } })
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}
