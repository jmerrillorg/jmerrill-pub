import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// ─────────────────────────────────────────────────────────────
// POST /api/partner-apply
// Publishing Partner application → Power Automate → Dataverse
//
// Set POWER_AUTOMATE_PARTNER_URL in environment variables
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const required = ['firstName', 'lastName', 'email', 'tier', 'imprint', 'pipeline', 'vision']
    const missing = required.filter(f => !body[f])
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const payload = {
      // Contact
      firstName:        body.firstName,
      lastName:         body.lastName,
      email:            body.email,
      phone:            body.phone || '',
      website:          body.website || '',

      // Partner-specific
      tier:             body.tier,
      imprint:          body.imprint,
      existingTitles:   body.existingTitles || '',
      pipeline:         body.pipeline,
      vision:           body.vision,

      // Lead routing
      leadType:         'partner-program-application',
      source:           'website-partner-form',
      submittedAt:      new Date().toISOString(),
      requiresReview:   true,

      // JM1 metadata
      division:         'publishing',
      programTrack:     'partner',
    }

    const paUrl = process.env.POWER_AUTOMATE_PARTNER_URL
    if (paUrl) {
      const res = await fetch(paUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('Power Automate partner error:', res.status, await res.text())
      }
    } else {
      console.log('DEV: Partner application:', JSON.stringify(payload, null, 2))
    }

    return NextResponse.json({
      success: true,
      message: 'Application received. We review applications within 3–5 business days.',
    })

  } catch (err) {
    console.error('Partner apply error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
