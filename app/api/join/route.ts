import { NextRequest, NextResponse } from 'next/server'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm, type Jm1PubInternalClassification } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

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
    const required = ['firstName', 'lastName', 'email', 'bookTitle', 'genre', 'goal', 'workType', 'manuscriptStatus']
    const missing = missingFields(body, required)
    if (missing.length) {
      return requiredFieldsResponse(missing)
    }

    if (!asBoolean(body.consentToContact) || !asBoolean(body.consentToTerms)) {
      return NextResponse.json(
        { error: 'Please fill in all required fields and confirm consent to continue.' },
        { status: 400 },
      )
    }

    if (asBoolean(body.returningAuthor) && !cleanString(body.priorTitles)) {
      return NextResponse.json(
        { error: 'Please fill in all required fields and confirm consent to continue.' },
        { status: 400 },
      )
    }

    const firstName = cleanString(body.firstName)
    const lastName = cleanString(body.lastName)
    const email = cleanString(body.email)
    const phone = cleanString(body.phone)
    const city = cleanString(body.city)
    const stateProvince = cleanString(body.stateProvince)
    const country = cleanString(body.country) || 'United States'
    const timezone = cleanString(body.timezone)
    const bookTitle = cleanString(body.bookTitle)
    const workType = cleanString(body.workType)
    const genre = cleanString(body.genre)
    const manuscriptStatus = cleanString(body.manuscriptStatus)
    const wordCount = parseOptionalInteger(body.wordCount)
    const goal = cleanString(body.goal)
    const primaryAudience = cleanString(body.primaryAudience)
    const comparableBooks = cleanString(body.comparableBooks)
    const publishTimeline = cleanString(body.publishTimeline)
    const authorBio = cleanString(body.authorBio)
    const submissionUrl = cleanString(body.submissionUrl)
    const existingPlatform = cleanString(body.existingPlatform)
    const returningAuthor = asBoolean(body.returningAuthor)
    const priorTitles = cleanString(body.priorTitles)
    const consentToContact = asBoolean(body.consentToContact)
    const consentToTerms = asBoolean(body.consentToTerms)
    const message = cleanString(body.message)

    // Build Dataverse-ready payload
    const payload = {
      websiteSource: 196650016,
      intakeStatus: 'New',

      firstName,
      lastName,
      email,
      phone: phone || null,

      city: city || null,
      stateProvince: stateProvince || null,
      country,
      timezone: timezone || null,

      projectTitle: bookTitle,
      workType: workType || null,
      genre,
      manuscriptStatus: manuscriptStatus || null,
      estimatedWordCount: wordCount,
      imprint: deriveImprint(genre, cleanString(body.imprint)),

      goals: goal,
      primaryTargetAudience: primaryAudience || null,
      comparableBooks: comparableBooks || null,

      desiredPublishingTimeline: publishTimeline || null,
      needBrandingSupport: asBoolean(body.needsBranding),
      needMarketingSupport: asBoolean(body.needsMarketing),
      allowAiAssistedEditing: asBoolean(body.allowAiEditing),

      authorBio: authorBio || null,
      submissionUrl: submissionUrl || null,
      existingPlatform: existingPlatform || null,

      returningAuthor,
      priorTitles: priorTitles || null,

      purpose: message || null,

      consentToContact,
      consentToTerms,

      source: 'website-join-form',
      division: 'publishing',
      divisionNumber: '01',
    }

    const integration = await submitWebsiteForm({
      formType: 'join-family-inquiry',
      route: '/join',
      source: 'website-join-form',
      subject: `New Join the Family inquiry: ${payload.firstName} ${payload.lastName}`,
      routeSpecificFlowUrl: process.env.POWER_AUTOMATE_JOIN_URL,
      payload,
      notificationPreview: `${payload.firstName} ${payload.lastName} submitted a Join the Family inquiry for "${payload.projectTitle}".`,
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

function asBoolean(value: unknown) {
  return value === true || value === 'true'
}

function parseOptionalInteger(value: unknown) {
  const cleaned = cleanString(value)
  if (!cleaned) return null

  const parsed = Number.parseInt(cleaned, 10)
  return Number.isNaN(parsed) ? null : parsed
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
