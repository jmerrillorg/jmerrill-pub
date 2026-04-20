import { NextRequest, NextResponse } from 'next/server'
import { validateAuthorAccessCode } from '@/lib/server/author-access'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code || '').trim()

    if (!validateAuthorAccessCode(code)) {
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
