import { NextRequest, NextResponse } from 'next/server'
import { requireAuthorAccess } from '@/lib/server/author-access'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm, type Jm1PubInternalClassification } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    const body = await req.json()
    const required = [
      'authorName',
      'legalName',
      'email',
      'phone',
      'mailingAddress',
      'bookTitle',
      'genre',
      'targetAudience',
      'shortDescription',
      'manuscriptStatus',
      'originalWorkConfirmation',
      'publishingGoal',
    ]
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const payload = {
      authorName: cleanString(body.authorName),
      legalName: cleanString(body.legalName),
      penName: cleanString(body.penName),
      preferredName: cleanString(body.preferredName),
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      mailingAddress: cleanString(body.mailingAddress),
      bookTitle: cleanString(body.bookTitle),
      subtitle: cleanString(body.subtitle),
      genre: cleanString(body.genre),
      targetAudience: cleanString(body.targetAudience),
      shortDescription: cleanString(body.shortDescription),
      longDescription: cleanString(body.longDescription),
      manuscriptStatus: cleanString(body.manuscriptStatus),
      manuscriptLink: cleanString(body.manuscriptLink),
      supportingFilesLink: cleanString(body.supportingFilesLink),
      editingLevelAcknowledgment: cleanString(body.editingLevelAcknowledgment),
      authorIntentNotes: cleanString(body.authorIntentNotes),
      originalWorkConfirmation: cleanString(body.originalWorkConfirmation),
      hasCoAuthors: cleanString(body.hasCoAuthors),
      coAuthorNames: cleanString(body.coAuthorNames),
      priorPublication: cleanString(body.priorPublication),
      coverVision: cleanString(body.coverVision),
      referenceCovers: cleanString(body.referenceCovers),
      toneStylePreferences: cleanString(body.toneStylePreferences),
      publishingGoal: cleanString(body.publishingGoal),
      packageInterest: cleanString(body.packageInterest),
      authorBio: cleanString(body.authorBio),
      authorPlatform: cleanString(body.authorPlatform),
      socialMediaLinks: cleanString(body.socialMediaLinks),
      emailListSize: cleanString(body.emailListSize),
      speakingInterest: cleanString(body.speakingInterest),
      notes: cleanString(body.notes),
      source: 'author-onboarding-form',
      division: 'publishing',
      divisionNumber: '01',
      workflowStage: 'author-onboarding',
    }

    const integration = await submitWebsiteForm({
      formType: 'author-onboarding',
      route: '/author/onboarding',
      source: 'author-onboarding-form',
      subject: `Author onboarding submitted: ${payload.authorName}`,
      routeSpecificFlowUrl: process.env.POWER_AUTOMATE_AUTHOR_ONBOARDING_URL,
      payload,
      notificationPreview: `${payload.authorName} submitted author onboarding for "${payload.bookTitle}".`,
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

    return NextResponse.json({ success: true, integration })
  } catch (error) {
    console.error('Author onboarding form error:', error)
    return NextResponse.json(
      { error: 'Unable to submit author onboarding.' },
      { status: 500 },
    )
  }
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
