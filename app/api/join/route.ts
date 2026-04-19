import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// ─────────────────────────────────────────────────────────────
// POST /api/join
// Author intake form → Power Automate HTTP trigger → Dataverse
//
// To wire: set POWER_AUTOMATE_JOIN_URL in your environment
// variables (Azure Static Web Apps → Configuration → App settings)
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    const required = ['firstName', 'lastName', 'email', 'bookTitle', 'genre', 'goal']
    const missing = required.filter(f => !body[f])
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Build Dataverse-ready payload
    const payload = {
      // Contact fields → jm1_author table
      firstName:       body.firstName,
      lastName:        body.lastName,
      email:           body.email,
      phone:           body.phone || '',
      timezone:        body.timezone || '',

      // Title fields → jm1_title (intake stage)
      bookTitle:       body.bookTitle,
      genre:           body.genre,
      estimatedWords:  body.wordCount || '',
      publishDate:     body.publishDate || '',
      imprint:         deriveImprint(body.genre),

      // Lead routing
      goal:            body.goal,
      message:         body.message || '',
      source:          'website-join-form',
      submittedAt:     new Date().toISOString(),

      // JM1 metadata
      division:        'publishing',
      divisionNumber:  '01',
    }

    // Send to Power Automate
    const paUrl = process.env.POWER_AUTOMATE_JOIN_URL
    if (paUrl) {
      const res = await fetch(paUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('Power Automate error:', res.status, await res.text())
        // Don't fail the user — log and continue
      }
    } else {
      // Dev mode — log payload
      console.log('DEV: Join form submission:', JSON.stringify(payload, null, 2))
    }

    return NextResponse.json({ success: true, message: 'Inquiry received. We\'ll be in touch within 1–2 business days.' })

  } catch (err) {
    console.error('Join form error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again or email us directly.' },
      { status: 500 }
    )
  }
}

// Auto-derive imprint from genre for Dataverse routing
function deriveImprint(genre: string): string {
  const worksGenres = [
    'Christian / Faith',
    'Devotional',
    'Inspirational',
    'Biography / Memoir',
    'Self-Help',
    'Nonfiction',
    'Business',
    'Fiction',
  ]

  if (genre === "Children's") return 'JM Little'
  if (genre === 'Poetry') return 'JM Verse'
  if (worksGenres.includes(genre)) return 'JM Works'
  return 'J Merrill Publishing'
}
