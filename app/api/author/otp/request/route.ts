import { NextRequest, NextResponse } from 'next/server'

import { requestAuthorEmailOtp } from '@/lib/server/author-email-otp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await requestAuthorEmailOtp(String(body.email || ''))
    return NextResponse.json({
      accepted: true,
      challengeId: result.challengeId,
      expiresInSeconds: result.expiresInSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
      correlationId: result.correlationId,
      message: 'If this email belongs to an active J Merrill Publishing author, we sent a one-time sign-in code.',
    })
  } catch (error) {
    console.error('Author OTP request failed closed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        accepted: false,
        status: 'attention_required',
        error: 'Author sign-in is temporarily unavailable. Please contact publishing@jmerrill.one for access help.',
      },
      { status: 503 },
    )
  }
}
