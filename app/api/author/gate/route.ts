import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ACCESS_CODE = 'JMP-AUTHOR-2026'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code || '').trim()
    const expected = process.env.AUTHOR_ONBOARDING_ACCESS_CODE || DEFAULT_ACCESS_CODE

    if (!code || code !== expected) {
      return NextResponse.json(
        { error: 'Invalid access code.' },
        { status: 401 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Author onboarding gate error:', error)
    return NextResponse.json(
      { error: 'Unable to validate access code.' },
      { status: 500 },
    )
  }
}
