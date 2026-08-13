import { createHash, randomUUID } from 'crypto'
import {
  dataverseCreate,
  dataverseFirst,
  dataverseList,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from '@/lib/server/dataverse-server'
import {
  PUBLISHING_AUTHOR_EXPERIENCE_SURVEY,
  type AuthorExperienceQuestionId,
} from './author-experience-survey'

type RatingQuestionId = Exclude<AuthorExperienceQuestionId, 'open_feedback'>

export type AuthorExperienceAnswers = Record<RatingQuestionId, string> & {
  open_feedback?: string
}

export type AuthorExperienceSubmissionResult = {
  responseId: string
  responseIdentifier: string
  questionResponses: number
}

type DataverseRow = Record<string, unknown>

const REQUIRED_RATING_IDS: RatingQuestionId[] = [
  'onboarding',
  'communication',
  'clarity',
  'editorial',
  'production',
  'heard',
  'overall',
  'recommend',
]

export function validateAuthorExperienceAnswers(input: unknown) {
  if (!input || typeof input !== 'object') {
    return { ok: false as const, errors: ['Invalid request body.'] }
  }

  const body = input as Record<string, unknown>
  const answers: Partial<AuthorExperienceAnswers> = {}
  const errors: string[] = []

  for (const question of PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions) {
    const rawValue = body[question.id]

    if (question.type === 'text') {
      const text = typeof rawValue === 'string' ? rawValue.trim() : ''
      if (text.length > question.maxLength) {
        errors.push(`${question.label} must be ${question.maxLength} characters or fewer.`)
      }
      if (text) answers[question.id] = text
      continue
    }

    const value = typeof rawValue === 'number' ? String(rawValue) : typeof rawValue === 'string' ? rawValue.trim() : ''
    const numeric = Number(value)
    if (question.required && !value) {
      errors.push(`${question.label} is required.`)
      continue
    }
    if (!Number.isInteger(numeric) || numeric < question.min || numeric > question.max) {
      errors.push(`${question.label} must be between ${question.min} and ${question.max}.`)
      continue
    }
    answers[question.id] = String(numeric)
  }

  for (const id of REQUIRED_RATING_IDS) {
    if (!answers[id]) errors.push(`${id} is required.`)
  }

  if (errors.length) return { ok: false as const, errors }
  return { ok: true as const, answers: answers as AuthorExperienceAnswers }
}

export async function submitAuthorExperienceAnswers(
  answers: AuthorExperienceAnswers,
): Promise<AuthorExperienceSubmissionResult> {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_configuration_missing')

  const survey = await findSurvey(config)
  if (!survey) throw new Error('author_experience_survey_missing')

  const questions = await findQuestions(config)
  const missingQuestions = PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions.filter(
    (question) => !questions.has(question.id),
  )
  if (missingQuestions.length) {
    throw new Error(`author_experience_questions_missing:${missingQuestions.map((question) => question.id).join(',')}`)
  }

  const now = new Date().toISOString()
  const correlation = randomUUID()
  const responseIdentifier = createHash('sha256')
    .update(`${PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.sourceIdentifier}:${correlation}:${now}`)
    .digest('hex')

  const responseEntityUrl = await dataverseCreate(config, 'msfp_surveyresponses', {
    subject: `${PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.surveyName} - ${correlation}`,
    msfp_name: `${PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.version} ${correlation}`,
    msfp_sourcesurveyidentifier: PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.sourceIdentifier,
    msfp_sourceresponseidentifier: responseIdentifier,
    msfp_startdate: now,
    msfp_submitdate: now,
    msfp_responsetype: 'AnonymousWebsite',
    msfp_respondent: 'Anonymous website respondent',
    msfp_embedcontextparameters: JSON.stringify({
      source: 'jmerrill.pub/experience',
      surveyVersion: PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.version,
      contactConsent: false,
    }),
    msfp_questionresponseslist: JSON.stringify(
      PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions.map((question) => ({
        id: question.id,
        label: question.label,
      })),
    ),
    msfp_surveyresponse: JSON.stringify(answers),
    msfp_isquestionresponsegenerated: true,
    'msfp_surveyid_msfp_surveyresponse@odata.bind': `/msfp_surveies(${stringValue(survey.msfp_surveyid)})`,
  })

  const responseId = extractDataverseId(responseEntityUrl)
  if (!responseId) throw new Error('author_experience_response_id_missing')

  let questionResponses = 0
  for (const question of PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions) {
    const value = answers[question.id]
    if (!value) continue
    const questionId = questions.get(question.id)
    if (!questionId) continue

    await dataverseCreate(config, 'msfp_questionresponses', {
      msfp_name: `${question.id} - ${correlation}`,
      msfp_sourcequestionidentifier: question.id,
      msfp_sourcesurveyidentifier: PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.sourceIdentifier,
      msfp_sourceresponseidentifier: responseIdentifier,
      msfp_response: value,
      'msfp_questionid@odata.bind': `/msfp_questions(${questionId})`,
      'msfp_surveyresponseid@odata.bind': `/msfp_surveyresponses(${responseId})`,
    })
    questionResponses += 1
  }

  return { responseId, responseIdentifier, questionResponses }
}

async function findSurvey(config: DataverseServerConfig) {
  return dataverseFirst(config, 'msfp_surveies', {
    $select: 'msfp_surveyid,msfp_name,msfp_sourcesurveyidentifier',
    $filter: `msfp_sourcesurveyidentifier eq '${escapeODataText(PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.sourceIdentifier)}'`,
  })
}

async function findQuestions(config: DataverseServerConfig) {
  const rows = await dataverseList(config, 'msfp_questions', {
    $select: 'msfp_questionid,msfp_sourcequestionidentifier,msfp_sourcesurveyidentifier',
    $filter: `msfp_sourcesurveyidentifier eq '${escapeODataText(PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.sourceIdentifier)}'`,
  })

  const questions = new Map<AuthorExperienceQuestionId, string>()
  for (const row of rows as DataverseRow[]) {
    const id = stringValue(row.msfp_sourcequestionidentifier) as AuthorExperienceQuestionId
    const questionId = stringValue(row.msfp_questionid)
    if (id && questionId) questions.set(id, questionId)
  }
  return questions
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function extractDataverseId(entityUrl: string) {
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1] || ''
}
