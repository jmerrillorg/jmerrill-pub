// Engine: Stage Transition Engine
// Reusable? Y
// Stage-specific exception? N

import { NextRequest, NextResponse } from 'next/server'
import {
  buildContinuationUrl,
  createIntakeContinuationToken,
  type IntakeContinuationClaims,
} from '@/lib/publishing/intake/continuation'
import {
  classifyRecoverableFailure,
  enqueuePublishingIntakeDeadLetter,
  enqueuePublishingIntakeRecovery,
} from '@/lib/publishing/intake/deadLetter'
import { sendJoinAuthorAcknowledgment } from '@/lib/publishing/intake/authorAcknowledgment'
import {
  findPublishingIntakeByIdempotencyKey,
  markPublishingIntakeAcknowledgmentSent,
  writePublishingIntakeWithRetry,
} from '@/lib/publishing/intake/dataverse'
import { getIdempotencyReplay, rememberIdempotencyKey } from '@/lib/publishing/intake/idempotency'
import { sendJoinInternalNotification } from '@/lib/publishing/intake/internalNotification'
import {
  ensureInquiryWorkspace,
  uploadManuscriptToInquiryWorkspace,
  validateManuscriptUploadCandidate,
  verifyShareableManuscriptLink,
  type ManuscriptUploadCandidate,
} from '@/lib/publishing/intake/manuscriptUpload'
import { checkIntakeRateLimit, getClientIp } from '@/lib/publishing/intake/rateLimit'
import { generateIntakeReference } from '@/lib/publishing/intake/reference'
import {
  createNormalizedPublishingIntake,
  validatePublishingIntakeBody,
  type IntakeValidationError,
} from '@/lib/publishing/intake/schema'
import { maskEmail, maskName } from '@/lib/publishing/intake/sanitize'
import { verifyTurnstileToken } from '@/lib/publishing/intake/turnstile'
import { autoInitializeOutsideInquiryEditorialReview } from '@/lib/server/publisher-operating-center'

export const dynamic = 'force-dynamic'

type IntakeResponseBody =
  | { status: 'received'; reference: string; continuationUrl?: string }
  | { status: 'invalid'; code: 'validation_failed'; errors: IntakeValidationError[] }
  | { status: 'duplicate' }
  | { status: 'rate_limited' }
  | IntakeErrorResponse

type IntakeErrorCode =
  | 'validation_failed'
  | 'turnstile_verification_failed'
  | 'dataverse_configuration_missing'
  | 'dataverse_token_failed'
  | 'dataverse_write_failed'
  | 'dead_letter_failed'
  | 'author_acknowledgment_failed'
  | 'author_acknowledgment_writeback_failed'
  | 'sharepoint_workspace_failed'
  | 'manuscript_upload_failed'
  | 'manuscript_writeback_failed'
  | 'unexpected_exception'

type IntakeErrorResponse = {
  status: 'error'
  message: 'We could not receive your submission right now.'
  code: IntakeErrorCode
  detail: string
  reference?: string
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json(
      buildErrorResponse('unexpected_exception', 'origin_not_allowed'),
      403,
    )
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(originResult.origin),
  })
}

export async function POST(req: NextRequest) {
  try {
    return await handlePublishingIntakePost(req)
  } catch (error) {
    console.error('Publishing intake unexpected exception.', {
      reason: error instanceof Error ? error.name : 'unknown',
    })

    return json(
      buildErrorResponse('unexpected_exception', error instanceof Error ? error.name : 'unknown'),
      500,
    )
  }
}

type ParsedIntakeRequest = {
  body: Record<string, unknown>
  manuscriptFile: ManuscriptUploadCandidate | null
}

async function handlePublishingIntakePost(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json(
      buildErrorResponse('unexpected_exception', 'origin_not_allowed'),
      403,
    )
  }

  let parsedRequest: ParsedIntakeRequest

  try {
    parsedRequest = await parseIntakeRequest(req)
  } catch {
    return json(
      {
        status: 'invalid',
        code: 'validation_failed',
        errors: [{ field: 'request', message: 'Invalid request body.' }],
      },
      400,
      originResult.origin,
    )
  }

  const body = parsedRequest.body
  const manuscriptFile = parsedRequest.manuscriptFile
  const token = extractTurnstileToken(body)
  const ip = getClientIp(req.headers)
  const turnstile = await verifyTurnstileToken(token, ip)

  if (!turnstile.ok) {
    console.warn('Publishing intake blocked by Turnstile.', {
      reason: turnstile.reason,
      ip: ip === 'unknown' ? 'unknown' : '[masked-ip]',
    })

    return json(
      buildErrorResponse('turnstile_verification_failed', sanitizeDiagnosticDetail(turnstile.reason || 'unknown')),
      400,
      originResult.origin,
    )
  }

  const rateLimit = checkIntakeRateLimit(ip)
  if (!rateLimit.allowed) {
    return json(
      { status: 'rate_limited' },
      429,
      originResult.origin,
      rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : undefined,
    )
  }

  const validation = validatePublishingIntakeBody(body)
  if (!validation.ok) {
    return json(
      {
        status: 'invalid',
        code: 'validation_failed',
        errors: validation.errors,
      },
      400,
      originResult.origin,
    )
  }

  if (manuscriptFile) {
    const uploadValidation = validateManuscriptUploadCandidate(manuscriptFile)
    if (!uploadValidation.ok) {
      return json(
        {
          status: 'invalid',
          code: 'validation_failed',
          errors: [{ field: 'manuscriptFile', message: uploadValidation.message }],
        },
        400,
        originResult.origin,
      )
    }
  }

  const submittedManuscriptUrl = validation.data.manuscriptUrl
  if (validation.data.manuscriptSubmissionChoice === 'now' && !manuscriptFile && !submittedManuscriptUrl) {
    return json(
      {
        status: 'invalid',
        code: 'validation_failed',
        errors: [{ field: 'manuscriptSubmissionChoice', message: 'Upload a manuscript file or provide a manuscript link, or choose to send the manuscript later.' }],
      },
      400,
      originResult.origin,
    )
  }

  if (submittedManuscriptUrl && !manuscriptFile) {
    const linkVerification = await verifyShareableManuscriptLink(submittedManuscriptUrl)
    if (linkVerification.status !== 'usable') {
      return json(
        {
          status: 'invalid',
          code: 'validation_failed',
          errors: [{ field: 'manuscriptUrl', message: manuscriptLinkError(linkVerification.reason) }],
        },
        400,
        originResult.origin,
      )
    }
  }

  const replay = getIdempotencyReplay(validation.data.idempotencyKey)
  if (replay) {
    return json({ status: 'received', reference: replay.reference }, 201, originResult.origin)
  }

  const durableReplay = await findPublishingIntakeByIdempotencyKey(validation.data.idempotencyKey)
  if (durableReplay.status === 'found') {
    rememberIdempotencyKey(validation.data.idempotencyKey, durableReplay.reference)
    return json({ status: 'received', reference: durableReplay.reference }, 201, originResult.origin)
  }

  if (durableReplay.status === 'failed' && process.env.NODE_ENV === 'production') {
    console.error('Publishing intake idempotency lookup failed before acceptance.', {
      reason: durableReplay.reason,
    })

    return json(
      buildErrorResponse('dataverse_write_failed', sanitizeDiagnosticDetail(durableReplay.reason)),
      durableReplay.retryable ? 503 : 500,
      originResult.origin,
    )
  }

  const reference = generateIntakeReference()
  const intake = createNormalizedPublishingIntake(validation.data, reference)
  let acceptedIntake = intake

  try {
    if (manuscriptFile) {
      const workspace = await uploadManuscriptToInquiryWorkspace(intake, manuscriptFile)
      if (workspace.status === 'failed' || workspace.status === 'skipped') {
        console.error('Publishing intake manuscript upload failed before intake acceptance.', {
          reason: workspace.reason,
          reference,
        })

        return json(
          buildErrorResponse('manuscript_upload_failed', sanitizeDiagnosticDetail(workspace.reason), reference),
          500,
          originResult.origin,
        )
      }

      acceptedIntake = {
        ...intake,
        manuscriptUrl: workspace.manuscriptUrl,
        manuscriptReceived: true,
        manuscriptLifecycleState: workspace.reviewFlag === 'normalization_required'
          ? 'NORMALIZATION_PENDING'
          : 'UPLOADED',
        prospectState: workspace.reviewFlag === 'normalization_required'
          ? 'NORMALIZATION_PENDING'
          : 'MANUSCRIPT_RECEIVED',
        waitingOn: workspace.reviewFlag === 'normalization_required' ? 'JMP/System' : 'JMP',
        workspaceUrl: workspace.workspaceUrl,
        workspaceFolderId: workspace.workspaceFolderId,
      }
    } else if (submittedManuscriptUrl) {
      const workspace = await ensureInquiryWorkspace(intake)
      acceptedIntake = {
        ...intake,
        manuscriptReceived: true,
        manuscriptLifecycleState: 'UPLOADED',
        prospectState: 'MANUSCRIPT_RECEIVED',
        waitingOn: 'JMP',
        workspaceUrl: workspace.status === 'created' ? workspace.workspaceUrl : undefined,
        workspaceFolderId: workspace.status === 'created' ? workspace.workspaceFolderId : undefined,
      }
    } else {
      const workspace = await ensureInquiryWorkspace(intake)
      acceptedIntake = {
        ...intake,
        workspaceUrl: workspace.status === 'created' ? workspace.workspaceUrl : undefined,
        workspaceFolderId: workspace.status === 'created' ? workspace.workspaceFolderId : undefined,
      }
    }
  } catch (error) {
    console.error('Publishing intake workspace/upload step threw before intake acceptance.', {
      reason: error instanceof Error ? error.name : 'unknown',
      reference,
    })

    return json(
      buildErrorResponse(
        'manuscript_upload_failed',
        sanitizeDiagnosticDetail(error instanceof Error ? error.message : 'unknown'),
        reference,
      ),
      500,
      originResult.origin,
    )
  }

  const dataverse = await writePublishingIntakeWithRetry(acceptedIntake)
  if (dataverse.status === 'success' || dataverse.status === 'skipped') {
    rememberIdempotencyKey(acceptedIntake.idempotencyKey, reference)
    const continuation = dataverse.status === 'success' && dataverse.recordId && acceptedIntake.manuscriptSubmissionChoice === 'later'
      ? buildContinuation(dataverse.recordId, acceptedIntake.reference)
      : null
    const acceptedWithContinuation = continuation
      ? { ...acceptedIntake, continuationUrl: continuation.url }
      : acceptedIntake

    const notification = await sendJoinInternalNotification(
      acceptedWithContinuation,
      dataverse.status === 'success' ? { recordId: dataverse.recordId } : undefined,
    )
    if (notification.status !== 'sent') {
      const notificationFailure = notification.status === 'failed'
        ? notification.reason
        : `notification_${notification.reason}`
      const recovery = await enqueuePublishingIntakeRecovery({
        intakeReference: acceptedIntake.reference,
        dataverseRecordId: dataverse.status === 'success' ? dataverse.recordId : undefined,
        workspaceFolderId: acceptedIntake.workspaceFolderId,
        correlationId: acceptedIntake.idempotencyKey,
        failedOperationType: 'PUBLISHING_NOTIFICATION',
        failureClassification: classifyRecoverableFailure(notificationFailure),
        safeErrorCode: notificationFailure,
      })

      console.warn('Publishing intake internal notification did not send after intake acceptance.', {
        status: notification.status,
        reason: notification.reason,
        recoveryStatus: recovery.status,
        reference,
      })
    }

    const acknowledgment = await sendJoinAuthorAcknowledgment(acceptedWithContinuation)
    if (acknowledgment.status !== 'sent') {
      const acknowledgmentFailure = acknowledgment.status === 'failed'
        ? acknowledgment.reason
        : `acknowledgment_${acknowledgment.reason}`
      const recovery = await enqueuePublishingIntakeRecovery({
        intakeReference: acceptedIntake.reference,
        dataverseRecordId: dataverse.status === 'success' ? dataverse.recordId : undefined,
        workspaceFolderId: acceptedIntake.workspaceFolderId,
        correlationId: acceptedIntake.idempotencyKey,
        failedOperationType: 'AUTHOR_ACKNOWLEDGMENT',
        failureClassification: classifyRecoverableFailure(acknowledgmentFailure),
        safeErrorCode: acknowledgmentFailure,
      })

      console.warn('Publishing intake author acknowledgment did not send after intake acceptance.', {
        status: acknowledgment.status,
        reason: acknowledgment.reason,
        recoveryStatus: recovery.status,
        reference,
      })
    } else if (dataverse.status === 'success') {
      const acknowledgmentWriteback = await markPublishingIntakeAcknowledgmentSent(dataverse.recordId)
      if (acknowledgmentWriteback.status !== 'success') {
        const writebackFailure = acknowledgmentWriteback.status === 'failed'
          ? acknowledgmentWriteback.reason
          : `acknowledgment_writeback_${acknowledgmentWriteback.reason}`
        const recovery = await enqueuePublishingIntakeRecovery({
          intakeReference: acceptedIntake.reference,
          dataverseRecordId: dataverse.recordId,
          workspaceFolderId: acceptedIntake.workspaceFolderId,
          correlationId: acceptedIntake.idempotencyKey,
          failedOperationType: 'ACKNOWLEDGMENT_WRITEBACK',
          failureClassification: classifyRecoverableFailure(writebackFailure),
          safeErrorCode: writebackFailure,
        })

        console.warn('Publishing intake author acknowledgment writeback did not complete after intake acceptance.', {
          status: acknowledgmentWriteback.status,
          reason: acknowledgmentWriteback.reason,
          recoveryStatus: recovery.status,
          reference,
        })
      }
    }

    if (
      dataverse.status === 'success' &&
      dataverse.recordId &&
      (acceptedIntake.manuscriptReceived === true || Boolean(acceptedIntake.manuscriptUrl))
    ) {
      try {
        const orchestration = await autoInitializeOutsideInquiryEditorialReview({
          intakeId: dataverse.recordId,
          correlationId: acceptedIntake.idempotencyKey,
        })

        if (orchestration.status !== 'dispatched') {
          const recovery = await enqueuePublishingIntakeRecovery({
            intakeReference: acceptedIntake.reference,
            dataverseRecordId: dataverse.recordId,
            workspaceFolderId: acceptedIntake.workspaceFolderId,
            correlationId: acceptedIntake.idempotencyKey,
            failedOperationType: 'PIPELINE_ORCHESTRATION',
            failureClassification: classifyRecoverableFailure(`orchestration_${orchestration.blocker}`),
            safeErrorCode: `orchestration_${orchestration.blocker}`,
          })

          console.warn('Publishing intake orchestration did not complete after intake acceptance.', {
            status: orchestration.status,
            blocker: orchestration.blocker,
            recoveryStatus: recovery.status,
            reference,
          })
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown'
        const recovery = await enqueuePublishingIntakeRecovery({
          intakeReference: acceptedIntake.reference,
          dataverseRecordId: dataverse.recordId,
          workspaceFolderId: acceptedIntake.workspaceFolderId,
          correlationId: acceptedIntake.idempotencyKey,
          failedOperationType: 'PIPELINE_ORCHESTRATION',
          failureClassification: classifyRecoverableFailure(`orchestration_exception:${reason}`),
          safeErrorCode: `orchestration_exception:${reason}`,
        })

        console.warn('Publishing intake orchestration threw after intake acceptance.', {
          reason: error instanceof Error ? error.name : 'unknown',
          recoveryStatus: recovery.status,
          reference,
        })
      }
    }

    return json(
      {
        status: 'received',
        reference,
        ...(continuation ? { continuationUrl: continuation.url } : {}),
      },
      201,
      originResult.origin,
    )
  }

  const deadLetter = await enqueuePublishingIntakeDeadLetter(acceptedIntake, dataverse.reason)
  if (deadLetter.status === 'enqueued') {
    console.error('Publishing intake Dataverse write failed; recovery message enqueued.', {
      reason: dataverse.reason,
      reference,
      firstName: maskName(intake.firstName),
      email: maskEmail(intake.email),
    })
  }

  console.error('Publishing intake failed without Dataverse write or dead-letter.', {
    dataverseReason: dataverse.reason,
    deadLetterStatus: deadLetter.status,
    reference,
    firstName: maskName(intake.firstName),
    email: maskEmail(intake.email),
  })

  const diagnostics = buildFailureDiagnostics(dataverse.reason)
  return json(
    buildErrorResponse(diagnostics.code, diagnostics.detail, reference),
    diagnostics.httpStatus,
    originResult.origin,
  )
}

function buildContinuation(intakeId: string, reference: string): { claims: IntakeContinuationClaims; url: string } | null {
  const token = createIntakeContinuationToken({ intakeId, reference })
  const verification = token ? buildContinuationUrl(token) : ''
  if (!verification) return null
  const parsed = token.split('.')[1]
  const claims = parsed
    ? JSON.parse(Buffer.from(parsed, 'base64url').toString('utf8')) as IntakeContinuationClaims
    : null
  return claims ? { claims, url: verification } : null
}

async function parseIntakeRequest(req: NextRequest): Promise<ParsedIntakeRequest> {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const body: Record<string, unknown> = {}
    let manuscriptFile: ManuscriptUploadCandidate | null = null

    for (const [key, value] of formData.entries()) {
      if (key === 'manuscriptFile' && isFileLike(value) && value.size > 0) {
        manuscriptFile = {
          fileName: value.name,
          contentType: value.type,
          size: value.size,
          bytes: await value.arrayBuffer(),
        }
        continue
      }

      if (typeof value === 'string') {
        body[key] = coerceMultipartValue(key, value)
      }
    }

    return { body, manuscriptFile }
  }

  const body = await req.json()
  if (!isRecord(body)) throw new Error('invalid_json_body')
  return { body, manuscriptFile: null }
}

function coerceMultipartValue(key: string, value: string): unknown {
  if (key === 'wordCount') return Number.parseInt(value, 10)
  if ([
    'consent',
    'serviceCommunicationConsent',
    'rightsAttestation',
    'marketingConsent',
    'billingSameAsMailing',
    'referred',
  ].includes(key)) {
    return value === 'true'
  }
  return value
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(
  body: IntakeResponseBody,
  status: number,
  origin?: string | null,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  })
}

function extractTurnstileToken(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return ''
  const value = (body as Record<string, unknown>).turnstileToken
  return typeof value === 'string' ? value : ''
}

function manuscriptLinkError(reason: string) {
  if (reason === 'link_check_timeout') {
    return 'We could not confirm this manuscript link before the request timed out. Please upload the file or provide a reachable share link.'
  }

  return 'Provide a reachable manuscript link, or upload a .docx, .doc, .pages, .rtf, or .pdf file.'
}

function buildErrorResponse(code: IntakeErrorCode, detail: string, reference?: string): IntakeErrorResponse {
  return {
    status: 'error',
    message: 'We could not receive your submission right now.',
    code,
    detail: sanitizeDiagnosticDetail(detail),
    ...(reference ? { reference } : {}),
  }
}

function buildFailureDiagnostics(reason: string): {
  code: IntakeErrorCode
  detail: string
  httpStatus: number
} {
  const detail = sanitizeDiagnosticDetail(reason)

  if (reason.startsWith('dataverse_configuration_missing:')) {
    return { code: 'dataverse_configuration_missing', detail, httpStatus: 500 }
  }

  if (reason.startsWith('dataverse_write_exception:dataverse_token_failed:')) {
    return { code: 'dataverse_token_failed', detail, httpStatus: 502 }
  }

  if (reason.startsWith('dataverse_write_failed:')) {
    const status = Number.parseInt(reason.split(':')[1] || '', 10)
    const httpStatus = status === 401 || status === 403 ? 502 : status >= 500 ? 503 : 502
    return { code: 'dataverse_write_failed', detail, httpStatus }
  }

  if (reason.startsWith('dataverse_write_exception:')) {
    return { code: 'dataverse_write_failed', detail, httpStatus: 503 }
  }

  return { code: 'dead_letter_failed', detail, httpStatus: 500 }
}

function sanitizeDiagnosticDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted-token]')
    .replace(/secret[=:][^,;\s]+/gi, 'secret=[redacted-secret]')
    .slice(0, 240)
}

function validateOrigin(origin: string | null): { allowed: true; origin: string | null } | { allowed: false } {
  if (!origin && process.env.NODE_ENV !== 'production') {
    return { allowed: true, origin: null }
  }

  if (!origin) return { allowed: false }

  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.has(origin)
    ? { allowed: true, origin }
    : { allowed: false }
}

function getAllowedOrigins() {
  const configured = process.env.INTAKE_ALLOWED_ORIGINS
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const defaults = [
    'https://jmerrill.pub',
    'https://www.jmerrill.pub',
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000']
      : []),
  ]

  return new Set([...defaults, ...(configured || [])])
}

function corsHeaders(origin?: string | null) {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
