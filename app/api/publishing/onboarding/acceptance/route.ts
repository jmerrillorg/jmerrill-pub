import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { writeAuthorOnboardingDataverseFallback } from '@/lib/server/author-onboarding-dataverse'
import { configuration, payloadFor, submissionId } from '../../../../../azure-functions/diagnostic-ai-runner/src/lifecycle/onboardingAccessFixture'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const expected = Buffer.from(process.env.JM1_ORCHESTRATION_WORKER_KEY || '')
  const supplied = Buffer.from(request.headers.get('x-jm1-orchestration-worker-key') || '')
  if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    if ((await request.text()) !== '{}') return NextResponse.json({ code: 'FIXED_FIXTURE_ONLY' }, { status: 400 })
    const { key } = configuration()
    const result = await writeAuthorOnboardingDataverseFallback(payloadFor(key), 'Bounded synthetic access acceptance; no author or title created.', true)
    if (result.status !== 'success' || result.submissionId !== submissionId(key)) throw Error('ONBOARDING_ACCEPTANCE_RECEIPT_UNCONFIRMED')
    return NextResponse.json({ synthetic: true, receipt: result.submissionId, processorAccess: result.processorAccess,
      stageCompletion: false, communications: 0, payments: 0 }, { status: result.processorAccess?.status === 'READY' ? 200 : 202, headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ code: 'ONBOARDING_ACCEPTANCE_UNAVAILABLE' }, { status: 503 }) }
}
