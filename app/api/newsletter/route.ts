import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim()
    const role = String(body.role || 'Reader').trim()

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
    }

    const payload = {
      email,
      role,
      source: 'website-newsletter',
      submittedAt: new Date().toISOString(),
      division: 'publishing',
      divisionNumber: '01',
    }

    const automationUrl = process.env.POWER_AUTOMATE_NEWSLETTER_URL
    if (automationUrl) {
      const response = await fetch(automationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error('Newsletter automation error:', response.status, await response.text())
      }
    } else {
      console.log('DEV: Newsletter signup', JSON.stringify(payload, null, 2))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter signup error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
