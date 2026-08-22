export const CONTROLLER_VERSION = 'JMP_PORTFOLIO_AUTOMATION_CONTROLLER_v1.0'

export const VALID_WAITING_ON = new Set([
  'Prospect',
  'Author',
  'JMP',
  'External',
  'None',
])

export const SYSTEM_EXECUTION_STATES = new Set([
  'QUEUED',
  'PROCESSING',
  'RETRYING',
  'BACKPRESSURE',
  'RECOVERING',
  'FAILED_ATTENTION_REQUIRED',
  'NONE',
])

export const OPERATIONAL_BUCKETS = new Set([
  'AUTO_EXECUTE_NOW',
  'AUTO_QUEUE_NOW',
  'WAITING_ON_AUTHOR',
  'WAITING_ON_PROSPECT',
  'WAITING_ON_JMP_DECISION',
  'WAITING_ON_EXTERNAL',
  'SYSTEM_RECOVERY_IN_PROGRESS',
  'SYSTEM_ATTENTION_REQUIRED',
  'MAPPING_CONFLICT',
  'TERMINAL',
])

export const ACTION_LEVELS = {
  AUTONOMOUS: 'AUTONOMOUS',
  HUMAN_GATE: 'HUMAN_GATE',
  OPERATOR_EXCEPTION: 'OPERATOR_EXCEPTION',
  EXTERNAL_WAIT: 'EXTERNAL_WAIT',
  NOT_COMMISSIONED: 'NOT_COMMISSIONED',
}

const SLA_DAYS = {
  WAITING_ON_AUTHOR: 7,
  WAITING_ON_PROSPECT: 7,
  WAITING_ON_JMP_DECISION: 2,
  WAITING_ON_EXTERNAL: 7,
  SYSTEM_ATTENTION_REQUIRED: 0,
  SYSTEM_RECOVERY_IN_PROGRESS: 1,
  AUTO_QUEUE_NOW: 0,
  AUTO_EXECUTE_NOW: 0,
}

export function evaluatePortfolio(records, options = {}) {
  const evaluatedOn = options.evaluatedOn || new Date().toISOString()
  const items = records.map((record) => evaluatePortfolioRecord(record, { evaluatedOn }))
  return {
    controllerVersion: CONTROLLER_VERSION,
    evaluatedOn,
    counts: summarizePortfolio(items, records),
    items,
    unexplainedIdleCount: items.filter((item) => item.bucket === 'MAPPING_CONFLICT').length,
    autoExecutable: items.filter((item) => item.bucket === 'AUTO_EXECUTE_NOW' || item.bucket === 'AUTO_QUEUE_NOW'),
    waitingOnAuthor: items.filter((item) => item.bucket === 'WAITING_ON_AUTHOR'),
    waitingOnProspect: items.filter((item) => item.bucket === 'WAITING_ON_PROSPECT'),
    waitingOnJmp: items.filter((item) => item.bucket === 'WAITING_ON_JMP_DECISION'),
    waitingOnExternal: items.filter((item) => item.bucket === 'WAITING_ON_EXTERNAL'),
    systemAttention: items.filter((item) => item.bucket === 'SYSTEM_ATTENTION_REQUIRED' || item.bucket === 'MAPPING_CONFLICT'),
  }
}

export function evaluatePortfolioRecord(record, options = {}) {
  const title = clean(record.title) || clean(record.projectTitle) || 'Untitled'
  const stageText = [
    record.titleStage,
    record.lifecycleStage,
    record.editorialStage,
    record.editorialStatus,
    record.opportunityState,
    record.packageState,
    record.productionState,
    record.notes,
  ]
    .map(clean)
    .filter(Boolean)
    .join(' | ')
  const normalized = normalize(stageText)
  const ageDays = ageInDays(record.lastTransitionOn || record.modifiedOn || record.createdOn, options.evaluatedOn)
  const commercial = inferCommercialState(record)
  const authorGate = inferAuthorGate(record, normalized)
  const runtime = inferRuntime(record, normalized, commercial, authorGate)
  const classification = classifyRecord(record, normalized, commercial, authorGate, runtime)
  const waitingOn = normalizeWaitingOn(classification.waitingOn)
  const systemExecutionState = normalizeSystemExecutionState(classification.systemExecutionState)
  const machineExecutable = classification.actionLevel === ACTION_LEVELS.AUTONOMOUS
  const humanGateRequired = classification.actionLevel === ACTION_LEVELS.HUMAN_GATE
  const dueState = computeDueState(classification.bucket, ageDays)

  return {
    controllerVersion: CONTROLLER_VERSION,
    evaluatedOn: options.evaluatedOn || new Date().toISOString(),
    author: clean(record.author) || 'DATA_GAP',
    title,
    titleId: clean(record.titleId),
    intakeId: clean(record.intakeId),
    opportunityId: clean(record.opportunityId),
    commercialLifecycleState: commercial.summary,
    authorRelationshipState: clean(record.authorRelationshipState) || commercial.relationshipState,
    titleLifecycleStage: classification.lifecycleStage,
    substage: classification.substage,
    legacySystemState: stageText || 'DATA_GAP',
    currentGoverningArtifact: clean(record.currentArtifact) || 'DATA_GAP',
    checksum: clean(record.checksum) || 'DATA_GAP',
    packageScope: clean(record.packageScope) || clean(record.packageState) || 'DATA_GAP',
    waitingOn,
    systemExecutionState,
    systemAttention: classification.systemAttention,
    authorActionRequired: authorGate.required ? 'YES' : 'NO',
    jmpHumanActionRequired: humanGateRequired || waitingOn === 'JMP' ? 'YES' : 'NO',
    nextGovernedAction: classification.nextAction,
    machineExecutable: machineExecutable ? 'YES' : 'NO',
    humanGateRequired: humanGateRequired ? 'YES' : 'NO',
    runtimeAvailable: runtime.available ? 'YES' : 'NO',
    runtime: runtime.name,
    actionLevel: classification.actionLevel,
    bucket: classification.bucket,
    ageInCurrentState: Number.isFinite(ageDays) ? ageDays : 'DATA_GAP',
    slaOverdue: dueState,
    priority: classification.priority,
    evidence: record.evidence || [],
  }
}

export function buildWorkQueue(evaluation) {
  return evaluation.items
    .filter((item) => item.bucket === 'AUTO_QUEUE_NOW' || item.bucket === 'AUTO_EXECUTE_NOW')
    .sort(compareQueuePriority)
    .map((item, index) => ({
      jobId: stableJobId(item),
      titleId: item.titleId || item.intakeId || item.title,
      stage: item.titleLifecycleStage,
      action: item.nextGovernedAction,
      sourceArtifactChecksum: item.checksum,
      prerequisiteSnapshot: {
        waitingOn: item.waitingOn,
        machineExecutable: item.machineExecutable,
        humanGateRequired: item.humanGateRequired,
        runtimeAvailable: item.runtimeAvailable,
      },
      status: item.bucket === 'AUTO_EXECUTE_NOW' ? 'READY_TO_EXECUTE' : 'QUEUED',
      attempts: 0,
      nextRetry: '',
      createdOn: item.evaluatedOn,
      startedOn: '',
      completedOn: '',
      result: 'READ_ONLY_WAVE_1_NO_MUTATION',
      queuePosition: index + 1,
    }))
}

function classifyRecord(record, normalized, commercial, authorGate, runtime) {
  if (isTerminal(record, normalized)) {
    return classification('TERMINAL', 'None', 'NONE', 'NONE', 'Post-publication stewardship or terminal record', 'TERMINAL', 'POST_PUBLICATION', 'TERMINAL', ACTION_LEVELS.EXTERNAL_WAIT, 'P4')
  }
  if (!clean(record.title) && !clean(record.projectTitle)) {
    return classification('MAPPING_CONFLICT', 'JMP', 'FAILED_ATTENTION_REQUIRED', 'TITLE_IDENTITY_MISSING', 'Resolve missing title/project identity', 'MAPPING_CONFLICT', 'DATA_GAP', 'DATA_GAP', ACTION_LEVELS.OPERATOR_EXCEPTION, 'P0')
  }
  if (authorGate.required) {
    return classification('WAITING_ON_AUTHOR', 'Author', 'NONE', 'NONE', authorGate.action, 'AUTHOR_GATE', inferStage(normalized), authorGate.substage, ACTION_LEVELS.HUMAN_GATE, 'P2')
  }
  if (commercial.packageAccepted && !commercial.paymentOptionSelected) {
    return classification('WAITING_ON_AUTHOR', 'Author', 'NONE', 'NONE', 'Await author payment-option selection', 'AUTHOR_PAYMENT_SELECTION_REQUIRED', 'COMMERCIAL_ACTIVATION', 'PAYMENT_OPTION_SELECTION', ACTION_LEVELS.HUMAN_GATE, 'P1')
  }
  if (commercial.paymentOptionSelected && commercial.pricingLocked && !commercial.agreementGenerated) {
    const action = runtime.agreementGenerationSafe
      ? 'Generate governed agreement/addendum from locked commercial snapshot'
      : 'Repair agreement-generation runtime or generate through governed operator path'
    return classification(
      runtime.agreementGenerationSafe ? 'AUTO_QUEUE_NOW' : 'SYSTEM_ATTENTION_REQUIRED',
      runtime.agreementGenerationSafe ? 'None' : 'JMP',
      runtime.agreementGenerationSafe ? 'QUEUED' : 'FAILED_ATTENTION_REQUIRED',
      runtime.agreementGenerationSafe ? 'NONE' : 'AGREEMENT_GENERATION_RUNTIME_UNCONFIRMED',
      action,
      runtime.agreementGenerationSafe ? 'AGREEMENT_QUEUE_ELIGIBLE' : 'CONTRACT_GAP_SURFACED',
      'COMMERCIAL_ACTIVATION',
      'AGREEMENT_GENERATION',
      runtime.agreementGenerationSafe ? ACTION_LEVELS.AUTONOMOUS : ACTION_LEVELS.OPERATOR_EXCEPTION,
      'P0',
    )
  }
  if (commercial.agreementExecuted && commercial.initialPaymentReceived && !commercial.joinedFamily) {
    return classification(
      runtime.available ? 'AUTO_QUEUE_NOW' : 'SYSTEM_ATTENTION_REQUIRED',
      runtime.available ? 'None' : 'JMP',
      runtime.available ? 'QUEUED' : 'FAILED_ATTENTION_REQUIRED',
      runtime.available ? 'NONE' : 'JOINED_FAMILY_RUNTIME_UNCONFIRMED',
      runtime.available
        ? 'Evaluate Joined-the-Family consequence and workspace/onboarding provisioning'
        : 'Confirm/recover Joined-the-Family runtime before autonomous workspace/onboarding provisioning',
      runtime.available ? 'JOINED_FAMILY_ELIGIBLE' : 'JOINED_FAMILY_ACTION_KNOWN_RUNTIME_UNCONFIRMED',
      'AUTHOR_ONBOARDING',
      'JOINED_THE_FAMILY',
      runtime.available ? ACTION_LEVELS.AUTONOMOUS : ACTION_LEVELS.OPERATOR_EXCEPTION,
      'P0',
    )
  }
  if (normalized.includes('BACKPRESSURE') || normalized.includes('429') || normalized.includes('CAPACITY')) {
    return classification('SYSTEM_RECOVERY_IN_PROGRESS', 'External', 'BACKPRESSURE', 'PROVIDER_BACKPRESSURE', 'Retry automatically when provider capacity is available', 'PROVIDER_BACKPRESSURE', inferStage(normalized), 'PROVIDER_WAIT', ACTION_LEVELS.EXTERNAL_WAIT, 'P1')
  }
  if (normalized.includes('LINE') && normalized.includes('READY')) {
    return classification('AUTO_QUEUE_NOW', 'None', 'QUEUED', 'NONE', 'Queue commissioned Line stage worker', 'LINE_READY', 'EDITORIAL_PRODUCTION', 'LINE_EDITING', ACTION_LEVELS.AUTONOMOUS, 'P1')
  }
  if (normalized.includes('COPY') && (normalized.includes('APPROVED') || normalized.includes('COMPLETE'))) {
    return classification('AUTO_QUEUE_NOW', 'None', 'QUEUED', 'NONE', 'Queue Layout work item after Copy approval', 'COPY_APPROVED_LAYOUT_ELIGIBLE', 'BOOK_PRODUCTION', 'INTERIOR_LAYOUT', ACTION_LEVELS.AUTONOMOUS, 'P1')
  }
  if (normalized.includes('FULL WRAP') && normalized.includes('READY')) {
    return classification('AUTO_QUEUE_NOW', 'None', 'QUEUED', 'NONE', 'Queue Full Wrap production work', 'FULL_WRAP_READY', 'DISTRIBUTION_READINESS', 'FULL_WRAP', ACTION_LEVELS.AUTONOMOUS, 'P1')
  }
  if (runtime.available && normalized.includes('FAILED')) {
    return classification('SYSTEM_RECOVERY_IN_PROGRESS', 'None', 'RETRYING', 'AUTOMATIC_RETRY_AVAILABLE', 'Retry failed commissioned runtime action', 'RETRY_ELIGIBLE', inferStage(normalized), 'RETRY', ACTION_LEVELS.AUTONOMOUS, 'P0')
  }
  if (clean(record.waitingOn) === 'Prospect') {
    return classification('WAITING_ON_PROSPECT', 'Prospect', 'NONE', 'NONE', clean(record.nextAction) || 'Await prospect response', 'PROSPECT_WAIT', inferStage(normalized), 'PROSPECT_RESPONSE', ACTION_LEVELS.HUMAN_GATE, 'P2')
  }
  if (clean(record.waitingOn) === 'External') {
    return classification('WAITING_ON_EXTERNAL', 'External', 'NONE', 'NONE', clean(record.nextAction) || 'Track external dependency', 'EXTERNAL_WAIT', inferStage(normalized), 'EXTERNAL_DEPENDENCY', ACTION_LEVELS.EXTERNAL_WAIT, 'P2')
  }
  if (normalized.includes('DATA GAP') || normalized.includes('CONFLICT') || normalized.includes('MISSING')) {
    return classification('SYSTEM_ATTENTION_REQUIRED', 'JMP', 'FAILED_ATTENTION_REQUIRED', 'DATA_GAP', clean(record.nextAction) || 'Resolve lifecycle evidence gap', 'DATA_GAP', inferStage(normalized), 'DATA_GAP', ACTION_LEVELS.OPERATOR_EXCEPTION, 'P0')
  }
  return classification('SYSTEM_ATTENTION_REQUIRED', 'JMP', 'FAILED_ATTENTION_REQUIRED', 'NO_VALID_WAIT_OR_ACTION', clean(record.nextAction) || 'Classify next governed action', 'UNEXPLAINED_IDLE_PREVENTED', inferStage(normalized), 'DATA_GAP', ACTION_LEVELS.OPERATOR_EXCEPTION, 'P0')
}

function inferCommercialState(record) {
  const text = normalize([record.packageState, record.commercialState, record.opportunityState, record.notes].map(clean).join(' | '))
  const selectedInstallments = Number(record.selectedInstallments || 0)
  const paymentOptionSelected = Boolean(record.paymentOptionSelected || selectedInstallments > 0 || text.includes('PAYMENT OPTION SELECTED'))
  const pricingLocked = Boolean(record.pricingLocked || text.includes('PRICING LOCKED') || text.includes('LOCKED'))
  const agreementGenerated = Boolean(record.agreementGenerated || record.agreementExecuted || text.includes('AGREEMENT GENERATED') || text.includes('CONTRACT GENERATED'))
  const agreementExecuted = Boolean(record.agreementExecuted || text.includes('AGREEMENT EXECUTED') || text.includes('SIGNED'))
  const initialPaymentReceived = Boolean(record.initialPaymentReceived || text.includes('INITIAL PAYMENT') || text.includes('FIRST PAYMENT') || text.includes('PAYMENT RECEIVED'))
  const packageAccepted = Boolean(record.packageAccepted || paymentOptionSelected || text.includes('PACKAGE ACCEPTED'))
  const joinedFamily = Boolean(record.joinedFamily || text.includes('JOINED THE FAMILY'))
  const relationshipState = joinedFamily || agreementExecuted ? 'ACTIVE_OR_CONVERTING_AUTHOR' : packageAccepted ? 'PROSPECT' : 'DATA_GAP'
  return {
    packageAccepted,
    paymentOptionSelected,
    pricingLocked,
    agreementGenerated,
    agreementExecuted,
    initialPaymentReceived,
    joinedFamily,
    relationshipState,
    summary: [
      packageAccepted ? 'PACKAGE_ACCEPTED' : 'PACKAGE_NOT_CONFIRMED',
      paymentOptionSelected ? 'PAYMENT_OPTION_SELECTED' : 'PAYMENT_OPTION_NOT_SELECTED',
      pricingLocked ? 'PRICING_LOCKED' : 'PRICING_NOT_LOCKED',
      agreementGenerated ? 'AGREEMENT_PRESENT' : 'AGREEMENT_MISSING',
      initialPaymentReceived ? 'INITIAL_PAYMENT_RECEIVED' : 'INITIAL_PAYMENT_NOT_CONFIRMED',
      joinedFamily ? 'JOINED_THE_FAMILY' : 'NOT_JOINED_THE_FAMILY',
    ].join(' / '),
  }
}

function inferAuthorGate(record, normalized) {
  if (record.authorGateRequired) {
    return {
      required: true,
      action: clean(record.authorAction) || 'Await author response',
      substage: clean(record.substage) || 'AUTHOR_REVIEW',
    }
  }
  if (normalized.includes('AWAITING AUTHOR') || normalized.includes('AUTHOR REVIEW') || normalized.includes('AUTHOR APPROVAL')) {
    return {
      required: true,
      action: clean(record.authorAction) || 'Await author approval/revision response',
      substage: 'AUTHOR_REVIEW',
    }
  }
  return { required: false, action: 'No author action', substage: clean(record.substage) || 'DATA_GAP' }
}

function inferRuntime(record, normalized, commercial) {
  const runtimeText = normalize([record.runtime, record.executionMode, record.notes].map(clean).join(' | '))
  const commissioned = runtimeText.includes('COMMISSIONED') || runtimeText.includes('ACTIVE') || runtimeText.includes('AUTOMATIC')
  return {
    available: Boolean(record.runtimeAvailable || commissioned || normalized.includes('READY')),
    name: clean(record.runtime) || (commissioned ? 'Commissioned runtime' : 'Not proven for this action'),
    agreementGenerationSafe: Boolean(record.agreementGenerationSafe || commercial.paymentOptionSelected && commercial.pricingLocked && normalize(record.notes).includes('AGREEMENT RUNTIME SAFE')),
  }
}

function classification(bucket, waitingOn, systemExecutionState, systemAttention, nextAction, reason, lifecycleStage, substage, actionLevel, priority) {
  if (!OPERATIONAL_BUCKETS.has(bucket)) throw new Error(`invalid_bucket:${bucket}`)
  return {
    bucket,
    waitingOn,
    systemExecutionState,
    systemAttention,
    nextAction,
    reason,
    lifecycleStage,
    substage,
    actionLevel,
    priority,
  }
}

function isTerminal(record, normalized) {
  return Boolean(record.terminal || normalized.includes('TERMINAL') || normalized.includes('RELEASED') || normalized.includes('PUBLISHED'))
}

function inferStage(normalized) {
  if (normalized.includes('INTAKE')) return 'INQUIRY_INTAKE'
  if (normalized.includes('CLASSIFICATION')) return 'CLASSIFICATION'
  if (normalized.includes('REVIEW') || normalized.includes('RECOMMENDATION')) return 'EDITORIAL_REVIEW_RECOMMENDATION'
  if (normalized.includes('PACKAGE') || normalized.includes('PAYMENT') || normalized.includes('AGREEMENT') || normalized.includes('CONTRACT')) return 'COMMERCIAL_ACTIVATION'
  if (normalized.includes('ONBOARD')) return 'AUTHOR_ONBOARDING'
  if (normalized.includes('LINE') || normalized.includes('COPY') || normalized.includes('DEVELOPMENTAL')) return 'EDITORIAL_PRODUCTION'
  if (normalized.includes('BOOK PRODUCTION') || normalized.includes('LAYOUT') || normalized.includes('PROOF')) return 'BOOK_PRODUCTION'
  if (normalized.includes('COVER') || normalized.includes('METADATA') || normalized.includes('FULL WRAP')) return 'DISTRIBUTION_READINESS'
  if (normalized.includes('DISTRIBUTION') || normalized.includes('RELEASE')) return 'DISTRIBUTION_RELEASE'
  if (normalized.includes('ROYALTY') || normalized.includes('POST')) return 'POST_PUBLICATION'
  return 'DATA_GAP'
}

function normalizeWaitingOn(value) {
  const cleanValue = clean(value)
  if (VALID_WAITING_ON.has(cleanValue)) return cleanValue
  if (/author/i.test(cleanValue)) return 'Author'
  if (/prospect/i.test(cleanValue)) return 'Prospect'
  if (/external|provider|stripe|graph|foundry|distributor/i.test(cleanValue)) return 'External'
  if (/none|automation|system/i.test(cleanValue)) return cleanValue === 'JMP/System' ? 'JMP' : 'None'
  return 'JMP'
}

function normalizeSystemExecutionState(value) {
  const cleanValue = clean(value).replace(/ /g, '_').toUpperCase()
  if (SYSTEM_EXECUTION_STATES.has(cleanValue)) return cleanValue
  if (/BACKPRESSURE|CAPACITY/.test(cleanValue)) return 'BACKPRESSURE'
  if (/RETRY/.test(cleanValue)) return 'RETRYING'
  if (/FAIL|ATTENTION/.test(cleanValue)) return 'FAILED_ATTENTION_REQUIRED'
  if (/QUEUE/.test(cleanValue)) return 'QUEUED'
  return 'NONE'
}

function summarizePortfolio(items, records) {
  return {
    activeTitles: records.filter((record) => record.recordType === 'title').length,
    activeProspects: records.filter((record) => record.recordType === 'prospect').length,
    activeAuthors: records.filter((record) => record.recordType === 'author').length,
    postPublication: items.filter((item) => item.titleLifecycleStage === 'POST_PUBLICATION' || item.bucket === 'TERMINAL').length,
    autoExecutable: items.filter((item) => item.machineExecutable === 'YES').length,
    waitingOnAuthor: items.filter((item) => item.bucket === 'WAITING_ON_AUTHOR').length,
    waitingOnJmp: items.filter((item) => item.bucket === 'WAITING_ON_JMP_DECISION' || item.bucket === 'SYSTEM_ATTENTION_REQUIRED' || item.bucket === 'MAPPING_CONFLICT').length,
    waitingOnExternal: items.filter((item) => item.bucket === 'WAITING_ON_EXTERNAL' || item.bucket === 'SYSTEM_RECOVERY_IN_PROGRESS').length,
    unexplainedIdle: items.filter((item) => item.bucket === 'MAPPING_CONFLICT').length,
  }
}

function computeDueState(bucket, ageDays) {
  if (!Number.isFinite(ageDays)) return 'DATA_GAP'
  const sla = SLA_DAYS[bucket]
  if (sla === undefined) return 'NO_SLA'
  if (sla === 0 && ageDays > 0) return 'OVERDUE'
  if (ageDays > sla) return 'OVERDUE'
  if (ageDays === sla) return 'DUE'
  return 'CURRENT'
}

function compareQueuePriority(a, b) {
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }
  const byPriority = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
  if (byPriority) return byPriority
  const aAge = typeof a.ageInCurrentState === 'number' ? a.ageInCurrentState : 0
  const bAge = typeof b.ageInCurrentState === 'number' ? b.ageInCurrentState : 0
  return bAge - aAge
}

function stableJobId(item) {
  return [
    'JMPAC',
    slug(item.titleId || item.intakeId || item.title).slice(0, 24),
    slug(item.titleLifecycleStage).slice(0, 18),
    slug(item.nextGovernedAction).slice(0, 24),
  ].join('-')
}

function ageInDays(value, evaluatedOn) {
  if (!value) return Number.NaN
  const start = new Date(value)
  const end = new Date(evaluatedOn || Date.now())
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return Number.NaN
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000))
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function normalize(value) {
  return clean(value).toUpperCase()
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}
