import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type IntakeConfigResponse = {
  turnstileSiteKey: string | null
}

export async function GET() {
  const turnstileSiteKey =
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    null

  const body: IntakeConfigResponse = {
    turnstileSiteKey,
  }

  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
