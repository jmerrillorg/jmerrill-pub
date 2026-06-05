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

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
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
    if (!automationUrl && process.env.NODE_ENV === 'production') {
      console.error('Newsletter automation is not configured. Set POWER_AUTOMATE_NEWSLETTER_URL.')
      return NextResponse.json(
        {
          error: 'Newsletter signup is not fully configured yet. Please email publishing@jmerrill.one so we can keep you updated.',
        },
        { status: 503 },
      )
    }

    if (automationUrl) {
      const response = await fetch(automationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error('Newsletter automation error:', response.status, await response.text())
        return NextResponse.json(
          {
            error: 'Unable to save your newsletter signup right now. Please email publishing@jmerrill.one so we can keep you updated.',
          },
          { status: 502 },
        )
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
