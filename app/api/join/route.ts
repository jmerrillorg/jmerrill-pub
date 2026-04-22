import { NextRequest, NextResponse } from 'next/server'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm, type Jm1PubInternalClassification } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export const runtime = 'edge'

type JoinImprint = 'J Merrill Publishing' | 'JM Little' | 'JM Verse' | 'JM Works' | 'JM Signature'

const OFFICIAL_JOIN_IMPRINTS: JoinImprint[] = [
  'J Merrill Publishing',
  'JM Little',
  'JM Verse',
  'JM Works',
  'JM Signature',
]

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
      imprint:         deriveImprint(cleanString(body.genre), cleanString(body.imprint)),

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
      route: '/join',
      source: 'website-join-form',
      subject: `New Join the Family inquiry: ${payload.firstName} ${payload.lastName}`,
      routeSpecificFlowUrl: process.env.POWER_AUTOMATE_JOIN_URL,
      payload,
      notificationPreview: `${payload.firstName} ${payload.lastName} submitted a Join the Family inquiry for "${payload.bookTitle}".`,
      internalClassification: deriveInternalClassification(payload.genre),
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
function deriveImprint(genre: string, requestedImprint = ''): JoinImprint {
  const explicitImprint = normalizeRequestedImprint(requestedImprint)
  if (explicitImprint) return explicitImprint

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

function normalizeRequestedImprint(imprint: string): JoinImprint | null {
  if (OFFICIAL_JOIN_IMPRINTS.includes(imprint as JoinImprint)) {
    return imprint as JoinImprint
  }

  if (imprint === 'Signature') return 'JM Signature'
  if (imprint === 'Little') return 'JM Little'
  if (imprint === 'Verse') return 'JM Verse'
  if (imprint === 'Works') return 'JM Works'
  if (imprint === 'Publishing') return 'J Merrill Publishing'

  return null
}

function deriveInternalClassification(genre: string): Jm1PubInternalClassification {
  if (genre === "Children's") return 'Children'
  if (genre === 'Poetry') return 'Poetry'
  if (genre === 'Biography / Memoir') return 'Memoir'
  if (genre === 'Fiction') return 'Fiction'
  if (genre === 'Business') return 'Business'
  if (genre === 'Christian / Faith' || genre === 'Devotional' || genre === 'Inspirational') return 'Ministry'
  return 'Other'
}
