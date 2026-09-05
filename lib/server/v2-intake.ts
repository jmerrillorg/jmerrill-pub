import 'server-only'

import { randomUUID } from 'node:crypto'

import type { AuthorPortalSession } from './author-portal-access'
import {
  dataverseAction,
  dataverseFirst,
  dataverseList,
  getV2DataverseServerConfig,
  stringValue,
} from './dataverse-server'

export const V2_INTAKE_AUTHORITY = {
  authorName: 'Jackie Smith Jr.',
  authorContactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
  authorProfileId: '1f0188ca-71a5-f111-b8de-7c1e525b15c2',
  canonicalWorkId: 'e797232b-da7a-f111-ab0f-00224820105b',
  engagementId: '58c74caf-17a9-f111-aaac-70a8a5b27793',
  lifecycleInstanceId: 'ea66a6b1-17a9-f111-aaab-70a8a59b112b',
  intakeSubmissionId: '6368e4bc-17a9-f111-aaac-70a8a5b27793',
  sharePointWorkspaceId: '01DF3SEQPE2CYM7TA5JFD2LPUMHLK5L2CE',
  title: 'The Intentional Leader, Volume I',
  stageCode: '02_INTAKE',
  stageLabel: '02 Intake',
} as const

export const V2_INTAKE_QUESTIONS = [
  { code: 'TARGET_AUDIENCE', prompt: 'Who is the intended audience for this book?' },
  {
    code: 'RIGHTS_PROVENANCE',
    prompt: 'Do you own or control the manuscript and its included material, and are there any third-party permissions JMP should know about?',
  },
  {
    code: 'SENSITIVE_CONTENT',
    prompt: 'Does the manuscript contain sensitive material JMP should account for during editorial or production handling?',
  },
  {
    code: 'ACCESSIBILITY_INFORMATION',
    prompt: 'Are there accessibility considerations JMP should know about for this title?',
  },
  { code: 'SERIES_INFORMATION', prompt: 'Is this book part of a series? If yes, provide the series information.' },
] as const

export type V2IntakeQuestionCode = (typeof V2_INTAKE_QUESTIONS)[number]['code']
export type V2IntakeAnswers = Partial<Record<V2IntakeQuestionCode, string>>

export type V2IntakeReadback = {
  title: string
  author: string
  stage: '02 Intake'
  status: 'Additional Information Required' | 'Intake Submitted'
  waitingOn: 'Author' | 'Publisher'
  waitReason: 'OUTSTANDING_INTAKE_INFORMATION' | 'INTAKE_SUBMITTED'
  nextAction: 'Complete Intake' | 'Publisher review'
  timer: 'None'
  environment: string
  manuscript: { filename: string; checksum: string; validationStatus: string }
  questions: Array<{ code: V2IntakeQuestionCode; prompt: string; answer: string; complete: boolean }>
  outstandingCount: number
  submitted: boolean
  completeness: string
  completenessReasons: string[]
  lastUpdatedAt: string
}

export async function getAuthorV2IntakeReadback(session: AuthorPortalSession) {
  assertAuthorizedAuthor(session)
  return getV2IntakeReadback()
}

export async function getPublisherV2IntakeReadback() {
  try {
    return await getV2IntakeReadback()
  } catch (error) {
    console.error('V2 Intake publisher readback failed:', error)
    return null
  }
}

export async function saveAuthorV2Intake(
  session: AuthorPortalSession,
  answers: V2IntakeAnswers,
  mode: 'SAVE' | 'SUBMIT',
) {
  assertAuthorizedAuthor(session)
  const config = requireConfig()
  const cleanAnswers = normalizeAnswers(answers)
  const correlationId = `V2-INTAKE-${randomUUID()}`

  const result = await dataverseAction(config, 'jmpv2_SaveIntakeResponses', {
    AuthorContactId: V2_INTAKE_AUTHORITY.authorContactId,
    PublishingEngagementId: V2_INTAKE_AUTHORITY.engagementId,
    LifecycleInstanceId: V2_INTAKE_AUTHORITY.lifecycleInstanceId,
    IntakeSubmissionId: V2_INTAKE_AUTHORITY.intakeSubmissionId,
    ResponsesJson: JSON.stringify(cleanAnswers),
    Mode: mode,
    AuthorityContext: 'AUTHOR_OPERATING_CENTER_V2_INTAKE',
    V2CorrelationId: correlationId,
  })

  if (result.Accepted !== true) {
    throw new Error(stringValue(result.ReasonCode) || 'V2_INTAKE_COMMAND_REJECTED')
  }

  return { correlationId, readback: await getV2IntakeReadback() }
}

async function getV2IntakeReadback(): Promise<V2IntakeReadback> {
  const config = requireConfig()
  const [inquiry, lifecycle, intake, manuscript, responses, environment] = await Promise.all([
    dataverseFirst(config, 'jmpv2_inquiries', {
      $select: 'jmpv2_inquiryid,jmpv2_inquirykey,jmpv2_prospectname,jmpv2_workingtitle,jmpv2_lifecycleid',
      $filter: `jmpv2_inquiryid eq ${V2_INTAKE_AUTHORITY.engagementId}`,
    }),
    dataverseFirst(config, 'jmpv2_lifecycleinstances', {
      $select: 'jmpv2_lifecycleinstanceid,jmpv2_currentstagecode,jmpv2_isactive',
      $filter: `jmpv2_lifecycleinstanceid eq ${V2_INTAKE_AUTHORITY.lifecycleInstanceId}`,
    }),
    dataverseFirst(config, 'jmpv2_intakesubmissions', {
      $select: 'jmpv2_intakesubmissionid,jmpv2_intakekey,jmpv2_inquirykey,jmpv2_lifecycleid,jmpv2_fullname,jmpv2_workingtitle,jmpv2_completenessstatus,jmpv2_completenessreasons,jmpv2_submittedat,modifiedon',
      $filter: `jmpv2_intakesubmissionid eq ${V2_INTAKE_AUTHORITY.intakeSubmissionId}`,
    }),
    dataverseFirst(config, 'jmpv2_manuscriptbindings', {
      $select: 'jmpv2_filename,jmpv2_checksum,jmpv2_validationstatus,jmpv2_intakekey',
      $filter: "jmpv2_intakekey eq 'TILV1-20260905105058-5767708b-intake'",
    }),
    dataverseList(config, 'jmpv2_intakeresponses', {
      $select: 'jmpv2_questioncode,jmpv2_responsevalue,jmpv2_updatedat,jmpv2_submissionstatus',
      $filter: `jmpv2_intakesubmissionid eq '${V2_INTAKE_AUTHORITY.intakeSubmissionId}'`,
      $top: '10',
    }),
    dataverseFirst(config, 'jmpv2_environmentauthorities', {
      $select: 'jmpv2_environmentname,jmpv2_organizationid,jmpv2_classification,jmpv2_isactive',
      $filter: 'jmpv2_isactive eq true',
    }),
  ])

  if (!inquiry || !lifecycle || !intake || !manuscript || !environment) throw new Error('V2_INTAKE_AUTHORITY_INCOMPLETE')
  if (stringValue(lifecycle.jmpv2_currentstagecode) !== V2_INTAKE_AUTHORITY.stageCode) throw new Error('V2_INTAKE_NOT_AT_STAGE_02')
  if (stringValue(inquiry.jmpv2_lifecycleid).toLowerCase() !== V2_INTAKE_AUTHORITY.lifecycleInstanceId) throw new Error('V2_ENGAGEMENT_LIFECYCLE_MISMATCH')
  if (stringValue(intake.jmpv2_lifecycleid).toLowerCase() !== V2_INTAKE_AUTHORITY.lifecycleInstanceId) throw new Error('V2_INTAKE_LIFECYCLE_MISMATCH')
  if (stringValue(inquiry.jmpv2_workingtitle) !== V2_INTAKE_AUTHORITY.title) throw new Error('V2_TITLE_AUTHORITY_MISMATCH')

  const responseMap = new Map(
    responses.map((row) => [stringValue(row.jmpv2_questioncode), stringValue(row.jmpv2_responsevalue)]),
  )
  const questions = V2_INTAKE_QUESTIONS.map((question) => {
    const answer = responseMap.get(question.code)?.trim() || ''
    return { ...question, answer, complete: Boolean(answer) }
  })
  const outstandingCount = questions.filter((question) => !question.complete).length
  const submitted = stringValue(intake.jmpv2_completenessstatus) === 'COMPLETE' && outstandingCount === 0

  return {
    title: V2_INTAKE_AUTHORITY.title,
    author: V2_INTAKE_AUTHORITY.authorName,
    stage: V2_INTAKE_AUTHORITY.stageLabel,
    status: submitted ? 'Intake Submitted' : 'Additional Information Required',
    waitingOn: submitted ? 'Publisher' : 'Author',
    waitReason: submitted ? 'INTAKE_SUBMITTED' : 'OUTSTANDING_INTAKE_INFORMATION',
    nextAction: submitted ? 'Publisher review' : 'Complete Intake',
    timer: 'None',
    environment: stringValue(environment.jmpv2_environmentname),
    manuscript: {
      filename: stringValue(manuscript.jmpv2_filename),
      checksum: stringValue(manuscript.jmpv2_checksum),
      validationStatus: stringValue(manuscript.jmpv2_validationstatus),
    },
    questions,
    outstandingCount,
    submitted,
    completeness: stringValue(intake.jmpv2_completenessstatus),
    completenessReasons: stringValue(intake.jmpv2_completenessreasons).split(';').filter(Boolean),
    lastUpdatedAt: stringValue(intake.modifiedon),
  }
}

function assertAuthorizedAuthor(session: AuthorPortalSession) {
  if (session.scope !== 'relationship') throw new Error('V2_INTAKE_RELATIONSHIP_ACCESS_REQUIRED')
  if (session.contactId?.toLowerCase() !== V2_INTAKE_AUTHORITY.authorContactId) {
    throw new Error('V2_INTAKE_AUTHOR_NOT_AUTHORIZED')
  }
}

function normalizeAnswers(answers: V2IntakeAnswers) {
  const allowed = new Set<string>(V2_INTAKE_QUESTIONS.map((question) => question.code))
  return Object.fromEntries(
    Object.entries(answers)
      .filter(([code]) => allowed.has(code))
      .map(([code, value]) => [code, typeof value === 'string' ? value.trim().slice(0, 4000) : '']),
  )
}

function requireConfig() {
  const config = getV2DataverseServerConfig()
  if (!config) throw new Error('V2_COMMISSIONING_DATA_SOURCE_NOT_CONFIGURED')
  return config
}
