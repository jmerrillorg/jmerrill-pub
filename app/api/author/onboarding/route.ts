import { NextRequest, NextResponse } from 'next/server'
import {
  audiobookInterestOptions,
  authorPhotoOnBackCoverOptions,
  bindingTypeOptions,
  coverFinishPreferenceOptions,
  genreOptions,
  initialAuthorCopyNeedsOptions,
  interiorColorOptions,
  manuscriptStatusOptions,
  paperTypePreferenceOptions,
  preferredPrintFormatOptions,
  preferredTrimSizeOptions,
  publishingGoalOptions,
  resolveOption,
  w9StatusOptions,
} from '@/lib/publishing/onboarding-production-options'
import { requireAuthorAccess } from '@/lib/server/author-access'
import { writeAuthorOnboardingDataverseFallback } from '@/lib/server/author-onboarding-dataverse'
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
      'preferredPrintFormat',
      'preferredTrimSize',
      'interiorColor',
      'paperTypePreference',
      'bindingType',
      'rightsHolderConfirmed',
      'publishingGoal',
    ]
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const legalName = cleanString(body.legalName)
    const { firstName, lastName } = splitName(legalName)
    const email = cleanString(body.email)
    const genreOption = resolveOption(genreOptions, cleanString(body.genre))
    const genreKey = genreOption.key
    const genre = genreOption.label
    const bookTitle = cleanString(body.bookTitle)
    const subtitle = cleanString(body.subtitle)
    const manuscriptStatusOption = resolveOption(manuscriptStatusOptions, cleanString(body.manuscriptStatus))
    const manuscriptStatusKey = manuscriptStatusOption.key
    const manuscriptStatus = manuscriptStatusOption.label
    const recipient = 'publishing@jmerrill.one'
    const packageConfirmation = cleanString(body.packageConfirmation)
    const audiobookInterestOption = resolveOption(audiobookInterestOptions, cleanString(body.audiobookInterest))
    const audiobookInterestKey = audiobookInterestOption.key
    const audiobookInterest = audiobookInterestOption.label
    const acxAudiblePreference = cleanString(body.acxAudiblePreference)
    const w9StatusOption = resolveOption(w9StatusOptions, cleanString(body.w9Status))
    const w9StatusKey = w9StatusOption.key
    const w9Status = w9StatusOption.label
    const rightsHolderConfirmed = asBoolean(body.rightsHolderConfirmed)
    const rightsHolderConfirmedKey = rightsHolderConfirmed ? 'confirmed' : 'not_confirmed'
    const multiTitleIntent = cleanString(body.multiTitleIntent)
    const message = cleanString(body.notes || body.authorIntentNotes)
    const publishingGoalOption = resolveOption(publishingGoalOptions, cleanString(body.publishingGoal))
    const publishingGoalKey = publishingGoalOption.key
    const publishingGoal = publishingGoalOption.label
    const preferredPrintFormatOption = resolveOption(preferredPrintFormatOptions, cleanString(body.preferredPrintFormat))
    const preferredPrintFormatKey = preferredPrintFormatOption.key
    const preferredPrintFormat = preferredPrintFormatOption.label
    const preferredTrimSizeOption = resolveOption(preferredTrimSizeOptions, cleanString(body.preferredTrimSize))
    const preferredTrimSizeKey = preferredTrimSizeOption.key
    const preferredTrimSize = preferredTrimSizeOption.label
    const interiorColorOption = resolveOption(interiorColorOptions, cleanString(body.interiorColor))
    const interiorColorKey = interiorColorOption.key
    const interiorColor = interiorColorOption.label
    const paperTypePreferenceOption = resolveOption(paperTypePreferenceOptions, cleanString(body.paperTypePreference))
    const paperTypePreferenceKey = paperTypePreferenceOption.key
    const paperTypePreference = paperTypePreferenceOption.label
    const bindingTypeOption = resolveOption(bindingTypeOptions, cleanString(body.bindingType))
    const bindingTypeKey = bindingTypeOption.key
    const bindingType = bindingTypeOption.label
    const coverFinishPreferenceOption = resolveOption(coverFinishPreferenceOptions, cleanString(body.coverFinishPreference))
    const coverFinishPreferenceKey = coverFinishPreferenceOption.key
    const coverFinishPreference = coverFinishPreferenceOption.label
    const backCoverCopy = cleanString(body.backCoverCopy)
    const backCoverAuthorBio = cleanString(body.backCoverAuthorBio)
    const authorPhotoOnBackCoverOption = resolveOption(
      authorPhotoOnBackCoverOptions,
      cleanString(body.authorPhotoOnBackCover) || 'recommend_best_option',
    )
    const authorPhotoOnBackCoverKey = authorPhotoOnBackCoverOption.key
    const authorPhotoOnBackCover = authorPhotoOnBackCoverOption.label
    const coverEndorsements = cleanString(body.coverEndorsements)
    const retailPricePreference = cleanString(body.retailPricePreference)
    const initialAuthorCopyNeedsOption = resolveOption(
      initialAuthorCopyNeedsOptions,
      cleanString(body.initialAuthorCopyNeeds) || 'not_sure_yet',
    )
    const initialAuthorCopyNeedsKey = initialAuthorCopyNeedsOption.key
    const initialAuthorCopyNeeds = initialAuthorCopyNeedsOption.label
    const eventLaunchDeadline = cleanString(body.eventLaunchDeadline)
    const productionNotes = cleanString(body.productionNotes)

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
      genreKey,
      estimatedWords: cleanString(body.estimatedWords) || null,
      manuscriptStatus,
      manuscriptStatusKey,
      targetPublishDate: cleanString(body.targetPublishDate) || null,
      imprint: cleanString(body.imprint) || null,
    }

    const publishing = {
      packageConfirmation,
      audiobookInterest: audiobookInterest || null,
      audiobookInterestKey: audiobookInterestKey || null,
      acxAudiblePreference: acxAudiblePreference || null,
      w9Status: w9Status || null,
      w9StatusKey: w9StatusKey || null,
      rightsHolderConfirmed,
      rightsHolderConfirmedKey,
      multiTitleIntent: multiTitleIntent || null,
    }

    const productionSpecifications = {
      preferredPrintFormat,
      preferredPrintFormatLabel: preferredPrintFormat,
      preferredPrintFormatKey,
      preferredTrimSize,
      preferredTrimSizeLabel: preferredTrimSize,
      preferredTrimSizeKey,
      interiorColor,
      interiorColorLabel: interiorColor,
      interiorColorKey,
      paperTypePreference,
      paperTypePreferenceLabel: paperTypePreference,
      paperTypePreferenceKey,
      bindingType,
      bindingTypeLabel: bindingType,
      bindingTypeKey,
      coverFinishPreference: coverFinishPreference || null,
      coverFinishPreferenceLabel: coverFinishPreference || null,
      coverFinishPreferenceKey: coverFinishPreferenceKey || null,
      backCoverCopy: backCoverCopy || null,
      backCoverAuthorBio: backCoverAuthorBio || null,
      authorPhotoOnBackCover: authorPhotoOnBackCover || null,
      authorPhotoOnBackCoverLabel: authorPhotoOnBackCover || null,
      authorPhotoOnBackCoverKey: authorPhotoOnBackCoverKey || null,
      coverEndorsements: coverEndorsements || null,
      retailPricePreference: retailPricePreference || null,
      initialAuthorCopyNeeds: initialAuthorCopyNeeds || null,
      initialAuthorCopyNeedsKey: initialAuthorCopyNeedsKey || null,
      eventLaunchDeadline: eventLaunchDeadline || null,
      productionNotes: productionNotes || null,
    }

    const payload = {
      formType: 'author-onboarding',
      source: 'private-author-onboarding',
      division: 'publishing',
      divisionNumber: '01',
      route: '/author/onboarding',
      recipient,
      accessCodeUsed: true,
      dataverseTarget: {
        primaryTable: 'jm1pub_authoronboarding',
        relatedTitleTable: 'jm1pub_title',
        relatedProjectTable: 'jm1pub_authorproject',
      },
      author,
      book,
      publishing,
      productionSpecifications,
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
      targetPublishDate: book.targetPublishDate,
      genre,
      genreLabel: genre,
      genreKey,
      targetAudience: cleanString(body.targetAudience),
      shortDescription: cleanString(body.shortDescription),
      longDescription: cleanString(body.longDescription),
      manuscriptStatus,
      manuscriptStatusLabel: manuscriptStatus,
      manuscriptStatusKey,
      manuscriptLink: cleanString(body.manuscriptLink),
      supportingFilesLink: cleanString(body.supportingFilesLink),
      editingLevelAcknowledgment: cleanString(body.editingLevelAcknowledgment),
      authorIntentNotes: cleanString(body.authorIntentNotes),
      preferredPrintFormat,
      preferredPrintFormatLabel: preferredPrintFormat,
      preferredPrintFormatKey,
      preferredTrimSize,
      preferredTrimSizeLabel: preferredTrimSize,
      preferredTrimSizeKey,
      interiorColor,
      interiorColorLabel: interiorColor,
      interiorColorKey,
      paperTypePreference,
      paperTypePreferenceLabel: paperTypePreference,
      paperTypePreferenceKey,
      bindingType,
      bindingTypeLabel: bindingType,
      bindingTypeKey,
      coverFinishPreference: coverFinishPreference || null,
      coverFinishPreferenceLabel: coverFinishPreference || null,
      coverFinishPreferenceKey: coverFinishPreferenceKey || null,
      backCoverCopy: backCoverCopy || null,
      backCoverAuthorBio: backCoverAuthorBio || null,
      authorPhotoOnBackCover: authorPhotoOnBackCover || null,
      authorPhotoOnBackCoverLabel: authorPhotoOnBackCover || null,
      authorPhotoOnBackCoverKey: authorPhotoOnBackCoverKey || null,
      coverEndorsements: coverEndorsements || null,
      retailPricePreference: retailPricePreference || null,
      initialAuthorCopyNeeds: initialAuthorCopyNeeds || null,
      initialAuthorCopyNeedsKey: initialAuthorCopyNeedsKey || null,
      eventLaunchDeadline: eventLaunchDeadline || null,
      productionNotes: productionNotes || null,
      rightsHolderConfirmed,
      rightsHolderConfirmedKey,
      originalWorkConfirmation: rightsHolderConfirmed,
      hasCoAuthors: cleanString(body.hasCoAuthors),
      coAuthorNames: cleanString(body.coAuthorNames),
      priorPublication: cleanString(body.priorPublication),
      coverVision: cleanString(body.coverVision),
      referenceCovers: cleanString(body.referenceCovers),
      toneStylePreferences: cleanString(body.toneStylePreferences),
      publishingGoal,
      publishingGoalLabel: publishingGoal,
      publishingGoalKey,
      packageConfirmation,
      packageInterest: packageConfirmation,
      audiobookInterest: audiobookInterest || null,
      audiobookInterestLabel: audiobookInterest || null,
      audiobookInterestKey: audiobookInterestKey || null,
      acxAudiblePreference: acxAudiblePreference || null,
      w9Status: w9Status || null,
      w9StatusLabel: w9Status || null,
      w9StatusKey: w9StatusKey || null,
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
      source: 'private-author-onboarding',
      subject: `Author onboarding submitted: ${payload.authorName}`,
      routeSpecificFlowUrl: onboardingFlowUrl,
      payload,
      notificationPreview: `${payload.authorName} submitted author onboarding for "${payload.bookTitle}".`,
      internalClassification: deriveInternalClassification(genreKey),
    })

    if (!hasConfirmedNotificationDelivery(integration)) {
      const fallback = await writeAuthorOnboardingDataverseFallback(payload, integration.ingestion.detail)
      if (fallback.status === 'success') {
        return NextResponse.json({
          success: true,
          integration,
          dataverseFallback: {
            status: fallback.status,
            submissionId: fallback.submissionId,
            executionLogId: fallback.executionLogId,
            detail: fallback.detail,
          },
        })
      }

      return NextResponse.json(
        {
          error: 'We could not submit your onboarding form at this time. Please try again or contact publishing@jmerrill.one.',
          integration,
          dataverseFallback: fallback,
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

function deriveInternalClassification(genreKey: string): Jm1PubInternalClassification {
  if (genreKey === 'childrens') return 'Children'
  if (genreKey === 'poetry') return 'Poetry'
  if (genreKey === 'biography_memoir') return 'Memoir'
  if (genreKey === 'fiction') return 'Fiction'
  if (genreKey === 'business') return 'Business'
  if (genreKey === 'christian_faith' || genreKey === 'devotional' || genreKey === 'inspirational') return 'Ministry'
  return 'Other'
}
