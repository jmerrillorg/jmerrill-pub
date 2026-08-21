import {
  MANUSCRIPT_STATUS_OPTIONS,
  PUBLISHED_BEFORE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  WORK_TYPE_OPTIONS,
  type ManuscriptStatus,
  type PublishedBefore,
  type ReferralSource,
  type WorkType,
} from './options'
import { hasHtml, sanitizeString } from './sanitize'

export type IntakeValidationError = {
  field: string
  message: string
}

export type PublishingIntakeInput = {
  firstName: string
  lastName: string
  preferredName?: string
  publishingName?: string
  penName?: string
  email: string
  phone?: string
  preferredCommunication?: string
  timezone?: string
  returningAuthor?: string
  streetAddress: string
  addressLine2?: string
  city: string
  stateProvince: string
  postalCode: string
  country: string
  billingSameAsMailing: boolean
  billingStreetAddress?: string
  billingAddressLine2?: string
  billingCity?: string
  billingStateProvince?: string
  billingPostalCode?: string
  billingCountry?: string
  bookTitle: string
  subtitle?: string
  workType: WorkType
  genre: string
  wordCount: number
  manuscriptStatus: ManuscriptStatus
  manuscriptSubmissionChoice: 'now' | 'later'
  manuscriptUrl?: string
  publishedBefore: PublishedBefore
  intendedAudience?: string
  bookGoals?: string
  desiredTimeline?: string
  priorPublishingHistory?: string
  bookDescription: string
  referred: boolean
  referrerName?: string
  referrerEmail?: string
  referrerRelationship?: string
  referrerNotes?: string
  referralSource?: ReferralSource
  heardAboutJmp?: ReferralSource
  whyJmp?: string
  publishingPartnerHope?: string
  authorPlatform?: string
  accessibilityNotes?: string
  rightsAttestation: true
  thirdPartyMaterialDisclosure?: string
  aiDisclosure?: string
  sensitiveContentDisclosure?: string
  serviceCommunicationConsent: true
  marketingConsent: boolean
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  landingPage?: string
  referrerUrl?: string
  campaignId?: string
  additionalNotes?: string
  consent: true
  turnstileToken: string
  idempotencyKey: string
}

export type NormalizedPublishingIntake = PublishingIntakeInput & {
  email: string
  reference: string
  receivedAt: string
  intakeChannel: 'INT-PUB-005 /join'
  consentTimestamp: string
  wordCountSource: 'Intake-Reported'
  payloadVersion: 'JMP_JOIN_INTAKE_V2'
  manuscriptLifecycleState: 'PENDING_UPLOAD' | 'UPLOADED' | 'NORMALIZATION_PENDING'
  prospectState: 'NEW' | 'MANUSCRIPT_PENDING' | 'MANUSCRIPT_RECEIVED' | 'NORMALIZATION_PENDING'
  waitingOn: 'Prospect' | 'JMP' | 'JMP/System'
  notificationState: 'NOTIFICATION_PENDING'
  submittedOn: string
  addressCapturedOn: string
  source: 'website-join'
  route: '/join'
  formType: 'publishing-intake'
  division: 'publishing'
  divisionNumber: '01'
  manuscriptReceived?: boolean
  workspaceUrl?: string
  workspaceFolderId?: string
}

type FieldSpec = {
  required?: boolean
  min?: number
  max?: number
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TEXT_FIELDS: Record<string, FieldSpec> = {
  firstName: { required: true, min: 1, max: 60 },
  lastName: { required: true, min: 1, max: 60 },
  preferredName: { max: 60 },
  publishingName: { max: 120 },
  penName: { max: 120 },
  email: { required: true },
  phone: {},
  preferredCommunication: { max: 40 },
  timezone: { max: 80 },
  returningAuthor: { max: 20 },
  streetAddress: { required: true, min: 1, max: 160 },
  addressLine2: { max: 160 },
  city: { required: true, min: 1, max: 100 },
  stateProvince: { required: true, min: 1, max: 100 },
  postalCode: { required: true, min: 1, max: 30 },
  country: { required: true, min: 1, max: 80 },
  billingStreetAddress: { max: 160 },
  billingAddressLine2: { max: 160 },
  billingCity: { max: 100 },
  billingStateProvince: { max: 100 },
  billingPostalCode: { max: 30 },
  billingCountry: { max: 80 },
  bookTitle: { required: true, min: 1, max: 200 },
  subtitle: { max: 200 },
  genre: { required: true, min: 1, max: 100 },
  manuscriptUrl: {},
  intendedAudience: { max: 500 },
  bookGoals: { max: 500 },
  desiredTimeline: { max: 160 },
  priorPublishingHistory: { max: 500 },
  bookDescription: { required: true, min: 50, max: 2000 },
  referrerName: { max: 120 },
  referrerEmail: {},
  referrerRelationship: { max: 120 },
  referrerNotes: { max: 500 },
  whyJmp: { max: 500 },
  publishingPartnerHope: { max: 500 },
  authorPlatform: { max: 1000 },
  accessibilityNotes: { max: 500 },
  thirdPartyMaterialDisclosure: { max: 800 },
  aiDisclosure: { max: 800 },
  sensitiveContentDisclosure: { max: 800 },
  utmSource: { max: 120 },
  utmMedium: { max: 120 },
  utmCampaign: { max: 160 },
  utmContent: { max: 160 },
  landingPage: { max: 300 },
  referrerUrl: { max: 300 },
  campaignId: { max: 160 },
  additionalNotes: { max: 1000 },
  turnstileToken: { required: true, min: 1 },
  idempotencyKey: { required: true },
}

export function validatePublishingIntakeBody(body: unknown): {
  ok: true
  data: Omit<PublishingIntakeInput, 'reference' | 'receivedAt'>
} | {
  ok: false
  errors: IntakeValidationError[]
} {
  const source = isRecord(body) ? body : {}
  const errors: IntakeValidationError[] = []
  const strings: Record<string, string> = {}

  for (const [field, spec] of Object.entries(TEXT_FIELDS)) {
    const original = source[field]
    const sanitized = sanitizeString(original)

    if (sanitized.rejected) {
      errors.push({ field, message: 'Remove unsupported characters.' })
      continue
    }

    if (hasHtml(original)) {
      errors.push({ field, message: 'HTML is not allowed.' })
      continue
    }

    strings[field] = field === 'email' ? sanitized.value.toLowerCase() : sanitized.value

    if (spec.required && !strings[field]) {
      errors.push({ field, message: 'This field is required.' })
      continue
    }

    if (strings[field] && spec.min && strings[field].length < spec.min) {
      errors.push({ field, message: `Must be at least ${spec.min} characters.` })
    }

    if (strings[field] && spec.max && strings[field].length > spec.max) {
      errors.push({ field, message: `Must be ${spec.max} characters or fewer.` })
    }
  }

  if (strings.email && !EMAIL_PATTERN.test(strings.email)) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' })
  }

  if (strings.manuscriptUrl && isPlaceholderUrl(strings.manuscriptUrl)) {
    strings.manuscriptUrl = ''
  }

  if (strings.manuscriptUrl && !isValidUrl(strings.manuscriptUrl)) {
    errors.push({ field: 'manuscriptUrl', message: 'Enter a valid shareable URL.' })
  }

  if (strings.idempotencyKey && !UUID_V4_PATTERN.test(strings.idempotencyKey)) {
    errors.push({ field: 'idempotencyKey', message: 'Invalid submission key.' })
  }

  const workType = sanitizeString(source.workType).value
  const manuscriptStatus = sanitizeString(source.manuscriptStatus).value
  const manuscriptSubmissionChoice = sanitizeString(source.manuscriptSubmissionChoice).value
  const publishedBefore = sanitizeString(source.publishedBefore).value
  const referralSource = sanitizeString(source.referralSource).value
  const heardAboutJmp = sanitizeString(source.heardAboutJmp).value

  if (!isAllowed(workType, WORK_TYPE_OPTIONS)) {
    errors.push({ field: 'workType', message: 'Select a valid work type.' })
  }

  if (!isAllowed(manuscriptStatus, MANUSCRIPT_STATUS_OPTIONS)) {
    errors.push({ field: 'manuscriptStatus', message: 'Select a valid manuscript status.' })
  }

  if (manuscriptSubmissionChoice !== 'now' && manuscriptSubmissionChoice !== 'later') {
    errors.push({ field: 'manuscriptSubmissionChoice', message: 'Choose whether you want to submit your manuscript now or later.' })
  }

  if (!isAllowed(publishedBefore, PUBLISHED_BEFORE_OPTIONS)) {
    errors.push({ field: 'publishedBefore', message: 'Select a valid publishing history.' })
  }

  if (referralSource && !isAllowed(referralSource, REFERRAL_SOURCE_OPTIONS)) {
    errors.push({ field: 'referralSource', message: 'Select a valid referral source.' })
  }

  if (heardAboutJmp && !isAllowed(heardAboutJmp, REFERRAL_SOURCE_OPTIONS)) {
    errors.push({ field: 'heardAboutJmp', message: 'Select a valid discovery source.' })
  }

  if (strings.referrerEmail && !EMAIL_PATTERN.test(strings.referrerEmail)) {
    errors.push({ field: 'referrerEmail', message: 'Enter a valid referrer email address.' })
  }

  const billingSameAsMailing = source.billingSameAsMailing !== false
  if (!billingSameAsMailing) {
    for (const field of ['billingStreetAddress', 'billingCity', 'billingStateProvince', 'billingPostalCode', 'billingCountry']) {
      if (!strings[field]) errors.push({ field, message: 'Billing address is required when it differs from mailing address.' })
    }
  }

  const wordCount = typeof source.wordCount === 'number'
    ? source.wordCount
    : Number.parseInt(sanitizeString(source.wordCount).value, 10)

  if (!Number.isFinite(wordCount)) {
    errors.push({ field: 'wordCount', message: 'Enter an estimated word count.' })
  } else if (wordCount < 100 || wordCount > 500000) {
    errors.push({ field: 'wordCount', message: 'Word count must be between 100 and 500,000.' })
  }

  if (source.consent !== true) {
    errors.push({ field: 'consent', message: 'Consent is required.' })
  }

  if (source.serviceCommunicationConsent !== true) {
    errors.push({ field: 'serviceCommunicationConsent', message: 'Service communication consent is required.' })
  }

  if (source.rightsAttestation !== true) {
    errors.push({ field: 'rightsAttestation', message: 'Rights attestation is required.' })
  }

  if (errors.length) {
    return { ok: false, errors: dedupeErrors(errors) }
  }

  return {
    ok: true,
    data: {
      firstName: strings.firstName,
      lastName: strings.lastName,
      preferredName: strings.preferredName || undefined,
      publishingName: strings.publishingName || undefined,
      penName: strings.penName || undefined,
      email: strings.email,
      phone: strings.phone || undefined,
      preferredCommunication: strings.preferredCommunication || undefined,
      timezone: strings.timezone || undefined,
      returningAuthor: strings.returningAuthor || undefined,
      streetAddress: strings.streetAddress,
      addressLine2: strings.addressLine2 || undefined,
      city: strings.city,
      stateProvince: strings.stateProvince,
      postalCode: strings.postalCode,
      country: strings.country,
      billingSameAsMailing,
      billingStreetAddress: strings.billingStreetAddress || undefined,
      billingAddressLine2: strings.billingAddressLine2 || undefined,
      billingCity: strings.billingCity || undefined,
      billingStateProvince: strings.billingStateProvince || undefined,
      billingPostalCode: strings.billingPostalCode || undefined,
      billingCountry: strings.billingCountry || undefined,
      bookTitle: strings.bookTitle,
      subtitle: strings.subtitle || undefined,
      workType: workType as WorkType,
      genre: strings.genre,
      wordCount,
      manuscriptStatus: manuscriptStatus as ManuscriptStatus,
      manuscriptSubmissionChoice: manuscriptSubmissionChoice as 'now' | 'later',
      manuscriptUrl: strings.manuscriptUrl || undefined,
      publishedBefore: publishedBefore as PublishedBefore,
      intendedAudience: strings.intendedAudience || undefined,
      bookGoals: strings.bookGoals || undefined,
      desiredTimeline: strings.desiredTimeline || undefined,
      priorPublishingHistory: strings.priorPublishingHistory || undefined,
      bookDescription: strings.bookDescription,
      referred: source.referred === true,
      referrerName: strings.referrerName || undefined,
      referrerEmail: strings.referrerEmail || undefined,
      referrerRelationship: strings.referrerRelationship || undefined,
      referrerNotes: strings.referrerNotes || undefined,
      referralSource: referralSource ? (referralSource as ReferralSource) : undefined,
      heardAboutJmp: heardAboutJmp ? (heardAboutJmp as ReferralSource) : undefined,
      whyJmp: strings.whyJmp || undefined,
      publishingPartnerHope: strings.publishingPartnerHope || undefined,
      authorPlatform: strings.authorPlatform || undefined,
      accessibilityNotes: strings.accessibilityNotes || undefined,
      rightsAttestation: true,
      thirdPartyMaterialDisclosure: strings.thirdPartyMaterialDisclosure || undefined,
      aiDisclosure: strings.aiDisclosure || undefined,
      sensitiveContentDisclosure: strings.sensitiveContentDisclosure || undefined,
      serviceCommunicationConsent: true,
      marketingConsent: source.marketingConsent === true,
      utmSource: strings.utmSource || undefined,
      utmMedium: strings.utmMedium || undefined,
      utmCampaign: strings.utmCampaign || undefined,
      utmContent: strings.utmContent || undefined,
      landingPage: strings.landingPage || undefined,
      referrerUrl: strings.referrerUrl || undefined,
      campaignId: strings.campaignId || undefined,
      additionalNotes: strings.additionalNotes || undefined,
      consent: true,
      turnstileToken: strings.turnstileToken,
      idempotencyKey: strings.idempotencyKey,
    },
  }
}

export function createNormalizedPublishingIntake(
  data: PublishingIntakeInput,
  reference: string,
  receivedAt = new Date().toISOString(),
): NormalizedPublishingIntake {
  const manuscriptLifecycleState = data.manuscriptSubmissionChoice === 'later'
    ? 'PENDING_UPLOAD'
    : data.manuscriptUrl
      ? 'UPLOADED'
      : 'NORMALIZATION_PENDING'

  return {
    ...data,
    reference,
    receivedAt,
    intakeChannel: 'INT-PUB-005 /join',
    consentTimestamp: receivedAt,
    wordCountSource: 'Intake-Reported',
    payloadVersion: 'JMP_JOIN_INTAKE_V2',
    manuscriptLifecycleState,
    prospectState: data.manuscriptSubmissionChoice === 'later' ? 'MANUSCRIPT_PENDING' : 'NEW',
    waitingOn: data.manuscriptSubmissionChoice === 'later' ? 'Prospect' : 'JMP',
    notificationState: 'NOTIFICATION_PENDING',
    submittedOn: receivedAt,
    addressCapturedOn: receivedAt,
    source: 'website-join',
    route: '/join',
    formType: 'publishing-intake',
    division: 'publishing',
    divisionNumber: '01',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAllowed<T extends readonly string[]>(value: string, options: T): value is T[number] {
  return options.includes(value)
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isPlaceholderUrl(value: string) {
  return /^https?:\/\/\.{3}\/?$/i.test(value.trim())
}

function dedupeErrors(errors: IntakeValidationError[]) {
  const seen = new Set<string>()
  return errors.filter((error) => {
    const key = `${error.field}:${error.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
