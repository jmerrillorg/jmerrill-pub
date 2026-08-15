// Engine: Working Title Policy
// Reusable? Y
// Stage-specific exception? N

export const WORKING_TITLE = 'Untitled'

export const TITLE_STATUS = {
  WORKING_TITLE: 'WORKING_TITLE',
  AUTHOR_PROVIDED: 'AUTHOR_PROVIDED',
  AUTHOR_SELECTED_SUGGESTION: 'AUTHOR_SELECTED_SUGGESTION',
  FINAL_TITLE_APPROVED: 'FINAL_TITLE_APPROVED',
  TITLE_CHANGE_REQUESTED: 'TITLE_CHANGE_REQUESTED',
} as const

export type TitleStatus = (typeof TITLE_STATUS)[keyof typeof TITLE_STATUS]

export type TitleRequirementProcess =
  | 'EDITORIAL_REVIEW'
  | 'DEVELOPMENTAL_EDITING'
  | 'LINE_EDITING'
  | 'COPYEDITING'
  | 'PROOFREADING'
  | 'ISBN_ASSIGNMENT'
  | 'DISTRIBUTOR_METADATA'
  | 'FINAL_COVER_PRODUCTION'
  | 'RETAILER_METADATA'
  | 'LEGAL_TITLE_SPECIFICITY'
  | 'PUBLICATION_METADATA'

export type TitleRequirementPolicy = {
  process: TitleRequirementProcess
  finalTitleRequired: boolean
  workingTitleAcceptable: boolean
  authorSelectionTask: 'NONBLOCKING' | 'REQUIRED_BEFORE_PROCESS'
}

export const TITLE_REQUIREMENT_POLICY: Record<TitleRequirementProcess, TitleRequirementPolicy> = {
  EDITORIAL_REVIEW: workingAllowed('EDITORIAL_REVIEW'),
  DEVELOPMENTAL_EDITING: workingAllowed('DEVELOPMENTAL_EDITING'),
  LINE_EDITING: workingAllowed('LINE_EDITING'),
  COPYEDITING: workingAllowed('COPYEDITING'),
  PROOFREADING: workingAllowed('PROOFREADING'),
  ISBN_ASSIGNMENT: finalRequired('ISBN_ASSIGNMENT'),
  DISTRIBUTOR_METADATA: finalRequired('DISTRIBUTOR_METADATA'),
  FINAL_COVER_PRODUCTION: finalRequired('FINAL_COVER_PRODUCTION'),
  RETAILER_METADATA: finalRequired('RETAILER_METADATA'),
  LEGAL_TITLE_SPECIFICITY: finalRequired('LEGAL_TITLE_SPECIFICITY'),
  PUBLICATION_METADATA: finalRequired('PUBLICATION_METADATA'),
}

export type WorkingTitleReadiness = {
  ok: boolean
  title: string
  status: TitleStatus
  policy: TitleRequirementPolicy
  blocker?: 'FINAL_TITLE_REQUIRED'
}

export type TitleSuggestionRequest = {
  route: {
    stageCode: 'EDITORIAL_REVIEW'
    transaction: 'editorial_diagnostic'
    preferredModelFamily: 'CLAUDE'
    fallbackAllowed: false
  }
  promptVersion: 'JM1_TITLE_SUGGESTIONS_V1'
  sourceArtifactId: string
  sourceChecksum: string
  context: {
    manuscriptTheme?: string
    centralSubject?: string
    intendedAudience?: string
    tone?: string
    genre?: string
    stage0DiagnosticSummary?: string
    authorVoice?: string
    recurringConcepts?: string[]
  }
  requiredSuggestionCount: 3
}

export type TitleSelectionTask = {
  taskType: 'AUTHOR_TITLE_SELECTION'
  titleStatus: typeof TITLE_STATUS.WORKING_TITLE
  workingTitle: typeof WORKING_TITLE
  nonblockingForEditorialApproval: true
  options: [
    'PROVIDE_MY_OWN_TITLE',
    'SELECT_SUGGESTED_TITLE',
    'KEEP_WORKING_TITLE_FOR_NOW',
  ]
  suggestedTitles: [string, string, string]
  sourceArtifactId: string
  sourceChecksum: string
  idempotencyKey: string
}

function workingAllowed(process: TitleRequirementProcess): TitleRequirementPolicy {
  return {
    process,
    finalTitleRequired: false,
    workingTitleAcceptable: true,
    authorSelectionTask: 'NONBLOCKING',
  }
}

function finalRequired(process: TitleRequirementProcess): TitleRequirementPolicy {
  return {
    process,
    finalTitleRequired: true,
    workingTitleAcceptable: false,
    authorSelectionTask: 'REQUIRED_BEFORE_PROCESS',
  }
}

export function isWorkingTitle(value: string | null | undefined) {
  const normalized = normalizeTitle(value)
  return !normalized || ['untitled', 'unknown', 'tbd', 'to be determined', 'manuscript'].includes(normalized.toLowerCase())
}

export function displayTitle(value: string | null | undefined) {
  return isWorkingTitle(value) ? WORKING_TITLE : normalizeTitle(value)
}

export function evaluateTitleReadiness(input: {
  process: TitleRequirementProcess
  title: string | null | undefined
  status?: TitleStatus | null
}): WorkingTitleReadiness {
  const policy = TITLE_REQUIREMENT_POLICY[input.process]
  const title = displayTitle(input.title)
  const status = input.status || (isWorkingTitle(input.title) ? TITLE_STATUS.WORKING_TITLE : TITLE_STATUS.AUTHOR_PROVIDED)
  if (policy.finalTitleRequired && status !== TITLE_STATUS.FINAL_TITLE_APPROVED) {
    return { ok: false, title, status, policy, blocker: 'FINAL_TITLE_REQUIRED' }
  }
  return { ok: true, title, status, policy }
}

export function buildTitleSuggestionRequest(input: Omit<TitleSuggestionRequest, 'route' | 'promptVersion' | 'requiredSuggestionCount'>): TitleSuggestionRequest {
  return {
    route: {
      stageCode: 'EDITORIAL_REVIEW',
      transaction: 'editorial_diagnostic',
      preferredModelFamily: 'CLAUDE',
      fallbackAllowed: false,
    },
    promptVersion: 'JM1_TITLE_SUGGESTIONS_V1',
    requiredSuggestionCount: 3,
    ...input,
  }
}

export function normalizeTitleSuggestions(values: string[]): [string, string, string] {
  const normalized = values.map(normalizeTitle).filter(Boolean)
  const unique = Array.from(new Set(normalized))
  if (unique.length !== 3) {
    throw new Error('TITLE_SUGGESTION_BLOCKED - EXACTLY_THREE_DISTINCT_TITLES_REQUIRED')
  }
  if (unique.some((title) => title.length > 90)) {
    throw new Error('TITLE_SUGGESTION_BLOCKED - TITLE_TOO_LONG')
  }
  return [unique[0], unique[1], unique[2]]
}

export function createTitleSelectionTask(input: {
  titleId: string
  gateId: string
  sourceArtifactId: string
  sourceChecksum: string
  suggestedTitles: string[]
}): TitleSelectionTask {
  const suggestedTitles = normalizeTitleSuggestions(input.suggestedTitles)
  return {
    taskType: 'AUTHOR_TITLE_SELECTION',
    titleStatus: TITLE_STATUS.WORKING_TITLE,
    workingTitle: WORKING_TITLE,
    nonblockingForEditorialApproval: true,
    options: [
      'PROVIDE_MY_OWN_TITLE',
      'SELECT_SUGGESTED_TITLE',
      'KEEP_WORKING_TITLE_FOR_NOW',
    ],
    suggestedTitles,
    sourceArtifactId: input.sourceArtifactId,
    sourceChecksum: input.sourceChecksum,
    idempotencyKey: [
      'author-title-selection',
      input.titleId,
      input.gateId,
      input.sourceArtifactId,
      input.sourceChecksum,
    ].join(':'),
  }
}

export function titleSelectionDecision(input: {
  currentTitle: string | null | undefined
  decision: 'PROVIDE_MY_OWN_TITLE' | 'SELECT_SUGGESTED_TITLE' | 'KEEP_WORKING_TITLE_FOR_NOW'
  providedTitle?: string
  selectedSuggestion?: string
}) {
  if (input.decision === 'KEEP_WORKING_TITLE_FOR_NOW') {
    return {
      canonicalTitleMutation: false,
      title: displayTitle(input.currentTitle),
      status: TITLE_STATUS.WORKING_TITLE,
      editorialApprovalBlocked: false,
    }
  }
  const title = normalizeTitle(input.decision === 'PROVIDE_MY_OWN_TITLE' ? input.providedTitle : input.selectedSuggestion)
  if (!title || isWorkingTitle(title)) {
    throw new Error('TITLE_SELECTION_BLOCKED - AUTHOR_TITLE_REQUIRED_FOR_SELECTION')
  }
  return {
    canonicalTitleMutation: true,
    title,
    status: input.decision === 'PROVIDE_MY_OWN_TITLE'
      ? TITLE_STATUS.AUTHOR_PROVIDED
      : TITLE_STATUS.AUTHOR_SELECTED_SUGGESTION,
    editorialApprovalBlocked: false,
  }
}

export function isUsableAuthorFacingName(value: string | null | undefined) {
  const normalized = normalizeTitle(value).toLowerCase()
  if (!normalized) return false
  return !['author', 'unknown author', 'unknown', 'tbd'].includes(normalized)
}

function normalizeTitle(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}
