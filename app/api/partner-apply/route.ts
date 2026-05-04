import { NextRequest, NextResponse } from 'next/server'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

function resolvePartnerFlowUrl() {
  return process.env.POWER_AUTOMATE_PARTNER_APPLY_URL || process.env.POWER_AUTOMATE_PARTNER_URL || ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const required = ['firstName', 'lastName', 'email', 'phone', 'bookTitle', 'genre', 'manuscriptStatus', 'goals', 'whyPartner', 'whatYouBring', 'partnerTier', 'referredBy']
    const missing = missingFields(body, required)
    if (missing.length) {
      return requiredFieldsResponse(missing)
    }

    if (!asBoolean(body.budgetConfirmed) || !asBoolean(body.consentToContact) || !asBoolean(body.consentToTerms)) {
      return NextResponse.json(
        { error: 'Please complete all required fields before submitting your application.' },
        { status: 400 },
      )
    }

    if (asBoolean(body.returningAuthor) && !cleanString(body.priorTitles)) {
      return NextResponse.json(
        { error: 'Please complete all required fields before submitting your application.' },
        { status: 400 },
      )
    }

    if (asBoolean(body.hasPublishedElsewhere) && !cleanString(body.priorPublications)) {
      return NextResponse.json(
        { error: 'Please complete all required fields before submitting your application.' },
        { status: 400 },
      )
    }

    if (asBoolean(body.seriesPlanned) && !cleanString(body.seriesDetails)) {
      return NextResponse.json(
        { error: 'Please complete all required fields before submitting your application.' },
        { status: 400 },
      )
    }

    const firstName = cleanString(body.firstName)
    const lastName = cleanString(body.lastName)
    const email = cleanString(body.email)
    const fullName = `${firstName} ${lastName}`.trim()
    const partnerFlowUrl = resolvePartnerFlowUrl()

    if (!partnerFlowUrl && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: notificationNotConfiguredMessage() },
        { status: 503 },
      )
    }

    const payload = {
      websiteSource: 196650017,
      intakeStatus: 'New',
      applicantType: 'Prestige',
      imprint: 'JM Prestige',

      firstName,
      lastName,
      email,
      phone: cleanString(body.phone),
      birthday: cleanString(body.birthday) || null,

      city: cleanString(body.city) || null,
      stateProvince: cleanString(body.stateProvince) || null,
      country: cleanString(body.country) || 'United States',
      timezone: cleanString(body.timezone) || null,

      authorName: cleanString(body.authorName) || null,
      profession: cleanString(body.profession) || null,
      ministry: cleanString(body.ministry) || null,
      website: cleanString(body.website) || null,
      socialPrimary: cleanString(body.socialPrimary) || null,

      returningAuthor: asBoolean(body.returningAuthor),
      priorTitles: cleanString(body.priorTitles) || null,
      hasPublishedElsewhere: asBoolean(body.hasPublishedElsewhere),
      priorPublications: cleanString(body.priorPublications) || null,
      backlist: cleanString(body.backlist) || null,

      projectTitle: cleanString(body.bookTitle),
      workType: cleanString(body.workType) || null,
      genre: cleanString(body.genre),
      manuscriptStatus: cleanString(body.manuscriptStatus) || null,
      estimatedWordCount: parseOptionalInteger(body.wordCount),
      seriesPlanned: asBoolean(body.seriesPlanned),
      seriesDetails: cleanString(body.seriesDetails) || null,

      primaryTargetAudience: cleanString(body.primaryAudience) || null,
      audienceSize: cleanString(body.audienceSize) || null,
      emailListSize: cleanString(body.emailListSize) || null,
      comparableBooks: cleanString(body.comparableBooks) || null,

      goals: cleanString(body.goals),
      desiredPublishingTimeline: cleanString(body.publishTimeline) || null,
      partnerTier: cleanString(body.partnerTier) || null,

      whyPartner: cleanString(body.whyPartner) || null,
      whatYouBring: cleanString(body.whatYouBring) || null,

      needBrandingSupport: asBoolean(body.needsBranding),
      needMarketingSupport: asBoolean(body.needsMarketing),
      needsAudiobook: asBoolean(body.needsAudiobook),
      needsChildrensIllustration: asBoolean(body.needsChildrensIllustration),
      allowAiAssistedEditing: asBoolean(body.allowAiEditing),

      budgetConfirmed: asBoolean(body.budgetConfirmed),
      readyToStart: cleanString(body.readyToStart) || null,
      referredBy: cleanString(body.referredBy) || null,
      additionalNotes: cleanString(body.additionalNotes) || null,

      consentToContact: asBoolean(body.consentToContact),
      consentToTerms: asBoolean(body.consentToTerms),

      applicantName: fullName,
      leadType: 'jm-prestige-application',
      source: 'website-jm-prestige-form',
      requiresReview: true,
      division: 'publishing',
      divisionNumber: '01',
      programTrack: 'prestige',
      dataverseTableHint: 'jm1_publishingintake',
      duplicateDetectionKey: email.toLowerCase(),
      applicantConfirmation: {
        to: email,
        from: 'publishing@jmerrill.one',
        subject: 'We received your JM Prestige application',
        preview: 'Thank you for applying to JM Prestige.',
        body:
          'Thank you for applying to JM Prestige. We received your application and our team will review it within 3–5 business days. We appreciate the opportunity to learn more about your publishing vision.',
      },
    }

    const integration = await submitWebsiteForm({
      formType: 'jm-prestige-application',
      route: '/publishing-partner/apply',
      source: 'website-jm-prestige-form',
      subject: `New JM Prestige Application — ${fullName}`,
      routeSpecificFlowUrl: partnerFlowUrl,
      payload,
      notificationPreview: `${fullName} submitted a JM Prestige application for ${payload.partnerTier || 'manual review'}.`,
      internalClassification: 'Business',
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
      message: 'Application received. We review applications within 3–5 business days.',
      integration,
    })
  } catch (err) {
    console.error('Partner apply error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
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
