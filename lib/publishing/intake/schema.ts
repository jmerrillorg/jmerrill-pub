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
  email: string
  phone?: string
  bookTitle: string
  workType: WorkType
  genre: string
  wordCount: number
  manuscriptStatus: ManuscriptStatus
  manuscriptUrl?: string
  publishedBefore: PublishedBefore
  bookDescription: string
  referralSource?: ReferralSource
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
  source: 'website-join'
  route: '/join'
  formType: 'publishing-intake'
  division: 'publishing'
  divisionNumber: '01'
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
  email: { required: true },
  phone: {},
  bookTitle: { required: true, min: 1, max: 200 },
  genre: { required: true, min: 1, max: 100 },
  manuscriptUrl: {},
  bookDescription: { required: true, min: 50, max: 2000 },
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
  const publishedBefore = sanitizeString(source.publishedBefore).value
  const referralSource = sanitizeString(source.referralSource).value

  if (!isAllowed(workType, WORK_TYPE_OPTIONS)) {
    errors.push({ field: 'workType', message: 'Select a valid work type.' })
  }

  if (!isAllowed(manuscriptStatus, MANUSCRIPT_STATUS_OPTIONS)) {
    errors.push({ field: 'manuscriptStatus', message: 'Select a valid manuscript status.' })
  }

  if (!isAllowed(publishedBefore, PUBLISHED_BEFORE_OPTIONS)) {
    errors.push({ field: 'publishedBefore', message: 'Select a valid publishing history.' })
  }

  if (referralSource && !isAllowed(referralSource, REFERRAL_SOURCE_OPTIONS)) {
    errors.push({ field: 'referralSource', message: 'Select a valid referral source.' })
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

  if (errors.length) {
    return { ok: false, errors: dedupeErrors(errors) }
  }

  return {
    ok: true,
    data: {
      firstName: strings.firstName,
      lastName: strings.lastName,
      email: strings.email,
      phone: strings.phone || undefined,
      bookTitle: strings.bookTitle,
      workType: workType as WorkType,
      genre: strings.genre,
      wordCount,
      manuscriptStatus: manuscriptStatus as ManuscriptStatus,
      manuscriptUrl: strings.manuscriptUrl || undefined,
      publishedBefore: publishedBefore as PublishedBefore,
      bookDescription: strings.bookDescription,
      referralSource: referralSource ? (referralSource as ReferralSource) : undefined,
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
  return {
    ...data,
    reference,
    receivedAt,
    intakeChannel: 'INT-PUB-005 /join',
    consentTimestamp: receivedAt,
    wordCountSource: 'Intake-Reported',
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
