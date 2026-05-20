import { NextRequest, NextResponse } from 'next/server'
import { requireAuthorAccess } from '@/lib/server/author-access'
import { hasConfirmedNotificationDelivery, submitWebsiteForm, type Jm1PubInternalClassification } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    const onboardingFlowUrl = process.env.POWER_AUTOMATE_AUTHOR_ONBOARDING_URL
    if (!onboardingFlowUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Author onboarding integration is not configured.',
        },
        { status: 500 },
      )
    }

    const body = await req.json()
    const required = [
      'authorName',
      'legalName',
      'email',
      'phone',
      'mailingAddress',
      'bookTitle',
      'packageConfirmation',
      'genre',
      'targetAudience',
      'shortDescription',
      'manuscriptStatus',
      'rightsHolderConfirmed',
      'publishingGoal',
    ]
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const legalName = cleanString(body.legalName)
    const { firstName, lastName } = splitName(legalName)
    const email = cleanString(body.email)
    const genre = cleanString(body.genre)
    const bookTitle = cleanString(body.bookTitle)
    const subtitle = cleanString(body.subtitle)
    const manuscriptStatus = cleanString(body.manuscriptStatus)
    const recipient = 'publishing@jmerrill.one'
    const packageConfirmation = cleanString(body.packageConfirmation)
    const audiobookInterest = cleanString(body.audiobookInterest)
    const acxAudiblePreference = cleanString(body.acxAudiblePreference)
    const w9Status = cleanString(body.w9Status)
    const rightsHolderConfirmed = asBoolean(body.rightsHolderConfirmed)
    const multiTitleIntent = cleanString(body.multiTitleIntent)
    const message = cleanString(body.notes || body.authorIntentNotes)

    const author = {
      firstName,
      lastName,
      email,
      phone: cleanString(body.phone),
      timezone: cleanString(body.timezone),
    }

    const book = {
      title: bookTitle,
      subtitle,
      genre,
      estimatedWords: cleanString(body.estimatedWords) || null,
      manuscriptStatus,
      targetPublishDate: cleanString(body.targetPublishDate) || null,
      imprint: cleanString(body.imprint) || null,
    }

    const publishing = {
      packageConfirmation,
      audiobookInterest: audiobookInterest || null,
      acxAudiblePreference: acxAudiblePreference || null,
      w9Status: w9Status || null,
      rightsHolderConfirmed,
      multiTitleIntent: multiTitleIntent || null,
    }

    const payload = {
      formType: 'author-onboarding',
      source: 'website-author-onboarding',
      division: 'publishing',
      divisionNumber: '01',
      route: '/author/onboarding',
      recipient,
      author,
      book,
      publishing,
      message,
      rawFormData: body,

      authorName: cleanString(body.authorName),
      legalName,
      penName: cleanString(body.penName),
      preferredName: cleanString(body.preferredName),
      email,
      phone: author.phone,
      timezone: author.timezone || null,
      birthday: cleanString(body.birthday) || null,
      mailingAddress: cleanString(body.mailingAddress),
      bookTitle,
      subtitle,
      genre,
      targetAudience: cleanString(body.targetAudience),
      shortDescription: cleanString(body.shortDescription),
      longDescription: cleanString(body.longDescription),
      manuscriptStatus,
      manuscriptLink: cleanString(body.manuscriptLink),
      supportingFilesLink: cleanString(body.supportingFilesLink),
      editingLevelAcknowledgment: cleanString(body.editingLevelAcknowledgment),
      authorIntentNotes: cleanString(body.authorIntentNotes),
      rightsHolderConfirmed,
      originalWorkConfirmation: rightsHolderConfirmed,
      hasCoAuthors: cleanString(body.hasCoAuthors),
      coAuthorNames: cleanString(body.coAuthorNames),
      priorPublication: cleanString(body.priorPublication),
      coverVision: cleanString(body.coverVision),
      referenceCovers: cleanString(body.referenceCovers),
      toneStylePreferences: cleanString(body.toneStylePreferences),
      publishingGoal: cleanString(body.publishingGoal),
      packageConfirmation,
      packageInterest: packageConfirmation,
      audiobookInterest: audiobookInterest || null,
      acxAudiblePreference: acxAudiblePreference || null,
      w9Status: w9Status || null,
      multiTitleIntent: multiTitleIntent || null,
      authorBio: cleanString(body.authorBio),
      authorPlatform: cleanString(body.authorPlatform),
      socialMediaLinks: cleanString(body.socialMediaLinks),
      emailListSize: cleanString(body.emailListSize),
      speakingInterest: cleanString(body.speakingInterest),
      notes: cleanString(body.notes),
      firstName,
      lastName,
      workflowStage: 'author-onboarding',
    }

    const integration = await submitWebsiteForm({
      formType: 'author-onboarding',
      route: '/author/onboarding',
      source: 'website-author-onboarding',
      subject: `Author onboarding submitted: ${payload.authorName}`,
      routeSpecificFlowUrl: onboardingFlowUrl,
      payload,
      notificationPreview: `${payload.authorName} submitted author onboarding for "${payload.bookTitle}".`,
      internalClassification: deriveInternalClassification(genre),
    })

    if (!hasConfirmedNotificationDelivery(integration)) {
      return NextResponse.json(
        {
          error: 'We could not submit your onboarding form at this time. Please try again or contact publishing@jmerrill.one.',
          integration,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, integration })
  } catch (error) {
    console.error('Author onboarding form error:', error)
    return NextResponse.json(
      { error: 'We could not submit your onboarding form at this time. Please try again or contact publishing@jmerrill.one.' },
      { status: 500 },
    )
  }
}

function asBoolean(value: unknown) {
  return value === true || value === 'true'
}

function splitName(fullName: string) {
  const parts = fullName.split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
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
