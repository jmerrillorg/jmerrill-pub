import { NextRequest, NextResponse } from 'next/server'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

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
    const missing = missingFields(body, required)
    if (missing.length) {
      return requiredFieldsResponse(missing)
    }

    // Build Dataverse-ready payload
    const payload = {
      // Contact fields → jm1_author table
      firstName:       cleanString(body.firstName),
      lastName:        cleanString(body.lastName),
      email:           cleanString(body.email),
      phone:           cleanString(body.phone),
      timezone:        cleanString(body.timezone),

      // Title fields → jm1_title (intake stage)
      bookTitle:       cleanString(body.bookTitle),
      genre:           cleanString(body.genre),
      estimatedWords:  cleanString(body.wordCount),
      publishDate:     cleanString(body.publishDate),
      imprint:         deriveImprint(cleanString(body.genre)),

      // Lead routing
      goal:            cleanString(body.goal),
      message:         cleanString(body.message),
      source:          'website-join-form',

      // JM1 metadata
      division:        'publishing',
      divisionNumber:  '01',
    }

    const integration = await submitWebsiteForm({
      formType: 'join-family-inquiry',
      source: 'website-join-form',
      subject: `New Join the Family inquiry: ${payload.firstName} ${payload.lastName}`,
      dataverseFlowUrl: process.env.POWER_AUTOMATE_JOIN_URL,
      payload,
      notificationPreview: `${payload.firstName} ${payload.lastName} submitted a Join the Family inquiry for "${payload.bookTitle}".`,
    })

    if (!hasConfirmedNotificationDelivery(integration)) {
      return NextResponse.json(
        {
          error: notificationNotConfiguredMessage(),
          integration,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry received. We\'ll be in touch within 1–2 business days.',
      integration,
    })

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
