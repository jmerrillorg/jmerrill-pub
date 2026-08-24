import { createHash } from 'node:crypto'
import { WAVE2_CONTROLLER_VERSION, reconcileWave2 } from './automation-wave2.mjs'

export const WAVE3_CONTROLLER_VERSION = 'JMP_PORTFOLIO_AUTOMATION_WAVE3_v1.0'

export const WAVE3_SYSTEM_ATTENTION_CLASSES = [
  'LIFECYCLE_MAPPING_CONFLICT',
  'MISSING_CANONICAL_LINK',
  'MISSING_ARTIFACT',
  'MISSING_AUTHOR_RELATIONSHIP',
  'MISSING_COMMERCIAL_STATE',
  'MISSING_AUTHOR_DECISION',
  'RUNTIME_NOT_COMMISSIONED',
  'RUNTIME_EXECUTION_FAILURE',
  'WORKSPACE_PROVISIONING_FAILURE',
  'COMMUNICATION_FAILURE',
  'PAYMENT_EVENT_FAILURE',
  'PRODUCTION_DEPENDENCY_MISSING',
  'DISTRIBUTION_DEPENDENCY_MISSING',
  'LEGACY_RECONCILIATION',
  'TERMINAL_STATE_CONFLICT',
  'OTHER_EVIDENCED_CAUSE',
]

export const WAVE3_SAFE_ACTION_CLASSES = new Set([
  'QUEUE_COMMISSIONED_EDITORIAL_JOB',
  'MATERIALIZE_NEXT_EDITORIAL_STAGE',
  'GENERATE_CONTRACT_FROM_LOCKED_PRICING',
  'PROVISION_AUTHOR_ENTITLEMENT',
  'RETRY_FAILED_CANONICAL_COMMUNICATION',
  'CREATE_NEXT_PRODUCTION_WORK_ITEM',
  'QUEUE_LAYOUT',
  'QUEUE_PROOF',
  'RUN_STATUS_RECONCILIATION',
  'RETRY_TRANSIENT_PROVIDER_JOB',
  'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP',
])

export const WAVE3_EVENT_REEVALUATION_POLICIES = [
  { event: 'AUTHOR_APPROVAL_RECORDED', result: 'REEVALUATE_TITLE_NOW' },
  { event: 'PRICING_LOCKED', result: 'REEVALUATE_CONTRACT_GENERATION_NOW' },
  { event: 'RUNTIME_HEALTH_RESTORED', result: 'REEVALUATE_AFFECTED_RUNTIME_CLASS_NOW' },
  { event: 'ARTIFACT_CERTIFIED', result: 'REEVALUATE_NEXT_STAGE_NOW' },
  { event: 'WORKSPACE_ENTITLEMENT_FIXED', result: 'REEVALUATE_ONBOARDING_READINESS_NOW' },
]

export const WAVE3_RETRY_POLICIES = [
  { failure: 'TRANSIENT_429', action: 'RETRY_WITH_BOUNDED_BACKOFF' },
  { failure: 'TRANSIENT_5XX', action: 'RETRY_WITH_BOUNDED_BACKOFF' },
  { failure: 'RELAY_TEMPORARY_FAILURE', action: 'RETRY_WITH_BOUNDED_BACKOFF' },
  { failure: 'GRAPH_TRANSIENT_FAILURE', action: 'RETRY_WITH_BOUNDED_BACKOFF' },
  { failure: 'STATUS_SYNC_FAILURE', action: 'RETRY_WITH_BOUNDED_BACKOFF' },
]

export function reconcileWave3({ records, evaluation, source, wave2, actionKeys = new Set(), createdActionKeys = new Set(), executed = false } = {}) {
  const base = wave2 || reconcileWave2({ records, evaluation, source })
  const beforeItems = base.items
  const beforeSystemAttention = beforeItems.filter((item) => item.wave2WaitingState === 'SYSTEM_ATTENTION_REQUIRED')
  const items = beforeItems.map((item) => reconcileWave3Item(item, { actionKeys, createdActionKeys, executed }))
  const systemAttention = items.filter((item) => item.wave3WaitingState === 'SYSTEM_ATTENTION_REQUIRED')
  const autoExecutable = items.filter((item) => item.wave3WaitingState === 'AUTO_EXECUTABLE')
  const queueable = autoExecutable.filter((item) => WAVE3_SAFE_ACTION_CLASSES.has(item.wave3AutomationClass))
  const tasked = items.filter((item) => item.wave3WaitingState === 'WAITING_ON_JMP' && item.wave3ActionTaken !== 'NO_ACTION_TAKEN')
  const namedTitles = base.namedTitles.map((row) => overlayNamedTitle(row, items))

  return {
    controllerVersion: WAVE3_CONTROLLER_VERSION,
    wave2ControllerVersion: base.controllerVersion || WAVE2_CONTROLLER_VERSION,
    wave1ControllerVersion: base.wave1ControllerVersion,
    evaluatedOn: base.evaluatedOn,
    recordsEvaluated: items.length,
    items,
    namedTitles,
    missingTitles: base.missingTitles,
    portfolioComposition: refinePortfolioComposition(items, base.portfolioComposition),
    beforeRootCauseDistribution: countBy(beforeSystemAttention, (item) => normalizeAttentionClass(item.rootCause, item)),
    afterRootCauseDistribution: countBy(systemAttention, (item) => item.wave3SystemAttentionClass),
    waitingDistribution: countBy(items, (item) => item.wave3WaitingState),
    actionClassDistribution: countBy(items.filter((item) => item.wave3AutomationClass !== 'NONE'), (item) => item.wave3AutomationClass),
    actionTakenDistribution: countBy(items, (item) => item.wave3ActionTaken || 'NONE'),
    attentionBurndown: compareDistributions(
      countBy(beforeSystemAttention, (item) => normalizeAttentionClass(item.rootCause, item)),
      countBy(systemAttention, (item) => item.wave3SystemAttentionClass),
    ),
    queueable,
    tasked,
    eventReevaluationPolicies: WAVE3_EVENT_REEVALUATION_POLICIES,
    retryPolicies: WAVE3_RETRY_POLICIES,
    summary: {
      systemAttentionBefore: base.summary.systemAttentionAfter,
      systemAttentionAfter: systemAttention.length,
      genericSystemAttention: systemAttention.filter((item) => !item.wave3SystemAttentionClass || item.wave3SystemAttentionClass === 'OTHER_EVIDENCED_CAUSE').length,
      autoExecutableBefore: base.summary.autoExecutableAfter,
      autoExecutableAfter: autoExecutable.length,
      automaticallyQueued: items.filter((item) => ['QUEUED_EXECUTION_LOG_CREATED', 'QUEUE_ALREADY_PRESENT'].includes(item.wave3ActionTaken)).length,
      automaticallyResumed: items.filter((item) => ['RESUME_EXECUTION_LOG_CREATED', 'RESUME_ALREADY_PRESENT'].includes(item.wave3ActionTaken)).length,
      retries: items.filter((item) => item.wave3AutomationClass === 'RETRY_TRANSIENT_PROVIDER_JOB' && item.wave3ActionTaken !== 'NO_ACTION_TAKEN').length,
      operatorTasks: tasked.length,
      successfulCompletions: 0,
      escalations: systemAttention.length,
      unexplainedIdle: items.filter((item) => item.unexplainedIdle === 'YES').length,
      staleDetected: items.filter((item) => item.staleDetected === 'YES').length,
      automaticallyRecovered: items.filter((item) => item.wave3ActionTaken !== 'NO_ACTION_TAKEN' && item.wave3WaitingState !== 'SYSTEM_ATTENTION_REQUIRED').length,
      humanWait: items.filter((item) => ['WAITING_ON_AUTHOR', 'WAITING_ON_PROSPECT', 'WAITING_ON_JMP', 'WAITING_ON_EXTERNAL'].includes(item.wave3WaitingState)).length,
      mutations: createdActionKeys.size,
    },
  }
}

function reconcileWave3Item(item, context) {
  const systemAttentionClass = normalizeAttentionClass(item.rootCause, item)
  const rule = determineWave3Rule(item, systemAttentionClass)
  const wave3ActionKey = stableWave3ActionKey(item, rule.automationClass, rule.nextAction)
  const alreadyKnown = context.actionKeys.has(wave3ActionKey)
  const created = context.createdActionKeys.has(wave3ActionKey)
  const actionTaken = alreadyKnown
    ? created
      ? rule.createdResult
      : rule.existingResult
    : rule.waitingState === 'AUTO_EXECUTABLE'
      ? 'QUEUE_PENDING_EXECUTION'
      : rule.waitingState === 'WAITING_ON_JMP' && rule.automationClass === 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP'
        ? 'OPERATOR_TASK_PENDING'
        : 'NO_ACTION_TAKEN'

  return {
    ...item,
    controllerVersion: WAVE3_CONTROLLER_VERSION,
    wave3SystemAttentionClass: systemAttentionClass,
    wave3WaitingState: rule.waitingState,
    wave3AutomationClass: rule.automationClass,
    wave3NextAction: rule.nextAction,
    wave3ActionKey,
    wave3ActionTaken: actionTaken,
    staleDetected: isStale(item) ? 'YES' : 'NO',
    unexplainedIdle: rule.waitingState === 'SYSTEM_ATTENTION_REQUIRED' && systemAttentionClass === 'OTHER_EVIDENCED_CAUSE' ? 'YES' : 'NO',
    wave3Reason: rule.reason,
  }
}

function determineWave3Rule(item, systemAttentionClass) {
  const titleKey = normalize(item.title)
  const nextAction = clean(item.nextGovernedAction)
  const runtimeText = [item.runtime, item.titleLifecycleStage, item.substage, item.productionState, item.currentArtifact, nextAction].map(clean).join(' ')
  const runtimeAvailable = item.runtimeAvailable === 'YES'

  if (item.wave2WaitingState === 'TERMINAL') {
    return staticRule(item.wave2WaitingState, 'NONE', nextAction, 'Terminal state remains explicit')
  }

  if (item.wave2WaitingState === 'WAITING_ON_AUTHOR' && (item.humanGateRequired === 'YES' || item.rootCause === 'MISSING_AUTHOR_DECISION')) {
    return staticRule('WAITING_ON_AUTHOR', 'NONE', nextAction || 'Await author decision', 'Author decision remains a hard human gate')
  }

  if (
    ['WAITING_ON_AUTHOR', 'WAITING_ON_PROSPECT', 'WAITING_ON_EXTERNAL'].includes(item.wave2WaitingState) &&
    !isStructuralSystemClass(systemAttentionClass)
  ) {
    return staticRule(item.wave2WaitingState, 'NONE', nextAction, 'Human/external/terminal state remains explicit')
  }

  if (item.wave2WaitingState === 'SYSTEM_RECOVERY_IN_PROGRESS') {
    return staticRule('AUTO_EXECUTABLE', 'RETRY_TRANSIENT_PROVIDER_JOB', 'Retry or monitor transient provider/system recovery with bounded backoff', 'Recoverable runtime state')
  }

  if (item.wave2WaitingState === 'AUTO_EXECUTABLE') {
    if (item.automationClass === 'GENERATE_CONTRACT_FROM_LOCKED_PRICING') {
      return queueRule('GENERATE_CONTRACT_FROM_LOCKED_PRICING', nextAction, 'Payment option/pricing lock support contract generation')
    }
    if (item.automationClass === 'QUEUE_LAYOUT_WHEN_COPY_APPROVED') {
      return queueRule('QUEUE_LAYOUT', nextAction, 'Copy approval supports layout queueing')
    }
    if (item.automationClass === 'QUEUE_PROOF_WHEN_LAYOUT_CERTIFIED') {
      return queueRule('QUEUE_PROOF', nextAction, 'Layout certification supports proof queueing')
    }
    if (item.automationClass === 'QUEUE_COMMISSIONED_JOB' || /line|copy|developmental|editorial/i.test(runtimeText)) {
      return queueRule('QUEUE_COMMISSIONED_EDITORIAL_JOB', nextAction, 'Commissioned editorial runtime supports queueing')
    }
    return queueRule('RUN_STATUS_RECONCILIATION', nextAction || 'Run governed status reconciliation', 'Safe status reconciliation')
  }

  if (systemAttentionClass === 'RUNTIME_EXECUTION_FAILURE') {
    return queueRule('RETRY_TRANSIENT_PROVIDER_JOB', 'Retry failed provider/runtime action with bounded backoff or escalate after exhaustion', 'Failure class is recoverable by policy')
  }

  if (systemAttentionClass === 'RUNTIME_NOT_COMMISSIONED') {
    return taskRule('Create structured operator task to commission/select runtime before movement', 'Runtime not commissioned requires JMP operator action')
  }

  if (systemAttentionClass === 'PRODUCTION_DEPENDENCY_MISSING') {
    if (/full wrap|intentional leader/i.test(`${titleKey} ${nextAction}`) && runtimeAvailable) {
      return queueRule('CREATE_NEXT_PRODUCTION_WORK_ITEM', 'Create/queue governed Full Wrap production work item from certified prerequisites', 'Production runtime evidence supports work-item creation')
    }
    return taskRule('Create structured operator task for exact production dependency resolution', 'Production dependency requires manual evidence binding')
  }

  if (systemAttentionClass === 'DISTRIBUTION_DEPENDENCY_MISSING') {
    return taskRule('Create structured operator task for distribution dependency resolution', 'Distribution dependency requires external/manual step')
  }

  if (systemAttentionClass === 'MISSING_CANONICAL_LINK') {
    return taskRule('Create structured operator task to bind canonical title/project link from governed evidence', 'Deterministic linkage repair needs operator confirmation before mutation')
  }

  if (systemAttentionClass === 'MISSING_ARTIFACT') {
    return taskRule(nextAction || 'Create structured operator task to bind current governed artifact/checksum', 'Artifact authority must be repaired before movement')
  }

  if (systemAttentionClass === 'MISSING_COMMERCIAL_STATE') {
    if (item.paymentOptionSelected === true && item.pricingLocked === true && item.agreementGenerated !== true) {
      return queueRule('GENERATE_CONTRACT_FROM_LOCKED_PRICING', 'Generate governed agreement and addendum from locked commercial snapshot', 'Commercial prerequisites support autonomous agreement generation')
    }
    return taskRule(nextAction || 'Create structured operator task to reconcile commercial state and payment/agreement gap', 'Commercial state gap needs deterministic binding')
  }

  if (systemAttentionClass === 'MISSING_AUTHOR_RELATIONSHIP') {
    return taskRule('Create structured operator task to bind author relationship before continuation', 'Author relationship must exist before movement')
  }

  if (systemAttentionClass === 'LEGACY_RECONCILIATION') {
    return taskRule('Create structured operator task to classify legacy active row into active/post-publication/terminal disposition', 'Legacy row requires governed disposition')
  }

  if (systemAttentionClass === 'LIFECYCLE_MAPPING_CONFLICT' || systemAttentionClass === 'TERMINAL_STATE_CONFLICT') {
    return taskRule('Create structured operator task to resolve lifecycle/terminal-state conflict', 'Conflict requires governed reconciliation')
  }

  if (systemAttentionClass === 'MISSING_AUTHOR_DECISION') {
    return staticRule('WAITING_ON_AUTHOR', 'NONE', nextAction || 'Await author decision', 'Author decision remains a hard human gate')
  }

  return taskRule(nextAction || 'Create structured operator task for evidenced system-attention condition', 'Specific evidenced issue needs operator task')
}

function isStructuralSystemClass(systemAttentionClass) {
  return [
    'LIFECYCLE_MAPPING_CONFLICT',
    'MISSING_CANONICAL_LINK',
    'MISSING_ARTIFACT',
    'MISSING_AUTHOR_RELATIONSHIP',
    'MISSING_COMMERCIAL_STATE',
    'RUNTIME_NOT_COMMISSIONED',
    'RUNTIME_EXECUTION_FAILURE',
    'WORKSPACE_PROVISIONING_FAILURE',
    'COMMUNICATION_FAILURE',
    'PRODUCTION_DEPENDENCY_MISSING',
    'DISTRIBUTION_DEPENDENCY_MISSING',
    'LEGACY_RECONCILIATION',
    'TERMINAL_STATE_CONFLICT',
  ].includes(systemAttentionClass)
}

function normalizeAttentionClass(rootCause, item) {
  const text = [rootCause, item?.nextGovernedAction, item?.bucket, item?.systemExecutionState, item?.runtime, item?.titleLifecycleStage, item?.substage].map(clean).join(' ')
  if (rootCause === 'MISSING_CANONICAL_TITLE_LINK') return 'MISSING_CANONICAL_LINK'
  if (rootCause === 'MISSING_ARTIFACT_AUTHORITY') return 'MISSING_ARTIFACT'
  if (rootCause === 'RUNTIME_FAILURE') return 'RUNTIME_EXECUTION_FAILURE'
  if (rootCause === 'MISSING_PRODUCTION_STATE') return 'PRODUCTION_DEPENDENCY_MISSING'
  if (rootCause === 'MISSING_DISTRIBUTION_STATE') return 'DISTRIBUTION_DEPENDENCY_MISSING'
  if (rootCause === 'LEGACY_RECORD_RECONCILIATION') return 'LEGACY_RECONCILIATION'
  if (rootCause === 'DUPLICATE_CONFLICTING_STATE' || rootCause === 'ACTUALLY_TERMINAL') return 'TERMINAL_STATE_CONFLICT'
  if (rootCause === 'MISSING_NEXT_ACTION_RULE') {
    if (/runtime|worker|commission|foundry/i.test(text)) return 'RUNTIME_NOT_COMMISSIONED'
    if (/production|layout|cover|full wrap|proof/i.test(text)) return 'PRODUCTION_DEPENDENCY_MISSING'
    return 'LIFECYCLE_MAPPING_CONFLICT'
  }
  if (/workspace/i.test(text)) return 'WORKSPACE_PROVISIONING_FAILURE'
  if (/mail|email|communication|author package|notification/i.test(text)) return 'COMMUNICATION_FAILURE'
  if (/payment|stripe|invoice|subscription/i.test(text)) return 'PAYMENT_EVENT_FAILURE'
  if (WAVE3_SYSTEM_ATTENTION_CLASSES.includes(rootCause)) return rootCause
  return 'OTHER_EVIDENCED_CAUSE'
}

function queueRule(automationClass, nextAction, reason) {
  return staticRule('AUTO_EXECUTABLE', automationClass, nextAction, reason)
}

function taskRule(nextAction, reason) {
  return {
    ...staticRule('WAITING_ON_JMP', 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP', nextAction, reason),
    createdResult: 'OPERATOR_TASK_CREATED',
    existingResult: 'OPERATOR_TASK_ALREADY_PRESENT',
  }
}

function staticRule(waitingState, automationClass, nextAction, reason) {
  return {
    waitingState,
    automationClass,
    nextAction,
    reason,
    createdResult: automationClass === 'RETRY_TRANSIENT_PROVIDER_JOB' ? 'RESUME_EXECUTION_LOG_CREATED' : 'QUEUED_EXECUTION_LOG_CREATED',
    existingResult: automationClass === 'RETRY_TRANSIENT_PROVIDER_JOB' ? 'RESUME_ALREADY_PRESENT' : 'QUEUE_ALREADY_PRESENT',
  }
}

function overlayNamedTitle(row, items) {
  const match = findItem(items, row.requested)
  if (!match) return row
  return {
    ...row,
    stage: match.titleLifecycleStage,
    blocker: match.wave3SystemAttentionClass,
    nextAction: match.wave3NextAction,
    automation: match.wave3AutomationClass,
    actionTaken: match.wave3ActionTaken,
    wave3WaitingState: match.wave3WaitingState,
  }
}

function findItem(items, requested) {
  const needle = normalize(requested)
  return items.find((item) => {
    const title = normalize(item.title)
    const author = normalize(item.author)
    return title.includes(needle) || needle.includes(title) || author.includes(needle) || needle.includes(author)
  })
}

function refinePortfolioComposition(items, base) {
  return {
    rawActiveTitleRecords: base.rawActiveTitleRecords,
    activePipeline: items.filter((item) => item.recordType !== 'author' && item.wave3WaitingState !== 'TERMINAL' && !looksLegacy(item) && item.wave3SystemAttentionClass !== 'TERMINAL_STATE_CONFLICT').length,
    activePostPublication: items.filter((item) => item.wave3WaitingState === 'TERMINAL').length,
    activeStewardship: items.filter((item) => item.recordType === 'author' || /stewardship|post-publication/i.test(`${item.titleLifecycleStage} ${item.authorRelationshipState}`)).length,
    legacyUnresolved: items.filter((item) => item.wave3SystemAttentionClass === 'LEGACY_RECONCILIATION').length,
    terminalButActive: items.filter((item) => item.wave3SystemAttentionClass === 'TERMINAL_STATE_CONFLICT').length,
    duplicatesConflicts: base.duplicatesConflicts,
    conflicts: items.filter((item) => ['LIFECYCLE_MAPPING_CONFLICT', 'TERMINAL_STATE_CONFLICT'].includes(item.wave3SystemAttentionClass)).length,
  }
}

function compareDistributions(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  return [...keys].sort().map((key) => ({
    class: key,
    before: before[key] || 0,
    after: after[key] || 0,
    delta: (after[key] || 0) - (before[key] || 0),
  }))
}

function stableWave3ActionKey(item, automationClass, nextAction) {
  return createHash('sha256')
    .update([WAVE3_CONTROLLER_VERSION, item.titleId || item.intakeId || item.opportunityId || item.title, automationClass, nextAction].join('|'))
    .digest('hex')
    .slice(0, 24)
}

function isStale(item) {
  const age = Number(item.ageInCurrentState)
  return Number.isFinite(age) && age >= 14 && item.wave2WaitingState !== 'TERMINAL'
}

function looksLegacy(item) {
  const age = Number(item.ageInCurrentState)
  return Number.isFinite(age) && age >= 25 && item.runtimeAvailable === 'NO' && item.currentGoverningArtifact === 'DATA_GAP'
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row) || 'UNCLASSIFIED'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
