import { createHash } from 'node:crypto'

export const WAVE2_CONTROLLER_VERSION = 'JMP_PORTFOLIO_AUTOMATION_WAVE2_v1.0'

export const ROOT_CAUSES = [
  'LIFECYCLE_MAPPING_CONFLICT',
  'MISSING_CANONICAL_TITLE_LINK',
  'MISSING_AUTHOR_RELATIONSHIP',
  'MISSING_ARTIFACT_AUTHORITY',
  'MISSING_NEXT_ACTION_RULE',
  'RUNTIME_NOT_COMMISSIONED',
  'RUNTIME_FAILURE',
  'LEGACY_RECORD_RECONCILIATION',
  'MISSING_COMMERCIAL_STATE',
  'MISSING_AUTHOR_DECISION',
  'MISSING_PRODUCTION_STATE',
  'MISSING_DISTRIBUTION_STATE',
  'DUPLICATE_CONFLICTING_STATE',
  'ACTUALLY_TERMINAL',
  'OTHER_EVIDENCED_CAUSE',
]

export const WAVE2_WAITING_STATES = [
  'WAITING_ON_AUTHOR',
  'WAITING_ON_PROSPECT',
  'WAITING_ON_JMP',
  'WAITING_ON_EXTERNAL',
  'SYSTEM_RECOVERY_IN_PROGRESS',
  'SYSTEM_ATTENTION_REQUIRED',
  'AUTO_EXECUTABLE',
  'TERMINAL',
]

export const SAFE_ACTION_CLASSES = new Set([
  'CREATE_MISSING_WORK_ITEM',
  'QUEUE_COMMISSIONED_JOB',
  'RETRY_IDEMPOTENT_COMMUNICATION',
  'RETRY_TRANSIENT_INTEGRATION',
  'PROVISION_GOVERNED_ENTITLEMENT',
  'GENERATE_CONTRACT_FROM_LOCKED_PRICING',
  'RUN_STATUS_RECONCILIATION',
  'CREATE_NEXT_STAGE_WHEN_APPROVAL_EXISTS',
  'QUEUE_LAYOUT_WHEN_COPY_APPROVED',
  'QUEUE_PROOF_WHEN_LAYOUT_CERTIFIED',
])

export const FOUNDER_NAMED_TITLES = [
  'A Year Walking With Him',
  'God Got Me',
  'Lucky Ducky',
  'Beyond Your Eyes',
  'A Walk Home With God',
  "Inner Peace Through Life's Storms",
  'The Intentional Leader',
  "The General's Will",
  "The General’s Will",
  'The Long Watch',
  'Before You Were Born',
  'Indomitable',
  "'Til Death Do Us Part",
  'Til Death Do Us Part',
  'Atta / Untitled',
  'Establishing Glory',
]

export function reconcileWave2({ records, evaluation, source, queuedActionKeys = new Set(), executedActionKeys = new Set(), executed = false }) {
  const duplicateGroups = duplicateTitleGroups(evaluation.items)
  const sourceIndex = buildSourceIndex(source)
  const items = evaluation.items.map((item) => reconcileItem(item, { duplicateGroups, sourceIndex, queuedActionKeys, executedActionKeys, executed }))
  const systemAttention = items.filter((item) => item.wave2WaitingState === 'SYSTEM_ATTENTION_REQUIRED')
  const autoExecutable = items.filter((item) => item.wave2WaitingState === 'AUTO_EXECUTABLE')
  const queueable = autoExecutable.filter((item) => SAFE_ACTION_CLASSES.has(item.automationClass))
  const namedTitles = mapFounderNamedTitles({ items, sourceIndex })
  const missingTitles = mapMissingOlderTitles({ sourceIndex })
  const portfolioComposition = composePortfolio(items, duplicateGroups)
  const rootCauseDistribution = countBy(items.filter((item) => item.wave1SystemAttention === 'YES'), (item) => item.rootCause)
  const autoZeroDistribution = explainZeroAutoExecutable(evaluation, items)

  return {
    controllerVersion: WAVE2_CONTROLLER_VERSION,
    wave1ControllerVersion: evaluation.controllerVersion,
    evaluatedOn: evaluation.evaluatedOn,
    recordsEvaluated: items.length,
    items,
    namedTitles,
    missingTitles,
    portfolioComposition,
    rootCauseDistribution,
    waitingDistribution: countBy(items, (item) => item.wave2WaitingState),
    automationClassDistribution: countBy(queueable, (item) => item.automationClass),
    actionTakenDistribution: countBy(items, (item) => item.actionTaken || 'NONE'),
    autoZeroDistribution,
    queueable,
    summary: {
      systemAttentionBefore: evaluation.counts.waitingOnJmp,
      systemAttentionAfter: systemAttention.length,
      autoExecutableBefore: evaluation.counts.autoExecutable,
      autoExecutableAfter: autoExecutable.length,
      automaticallyQueued: items.filter((item) => item.actionTaken === 'QUEUED_EXECUTION_LOG_CREATED' || item.actionTaken === 'QUEUE_ALREADY_PRESENT').length,
      automaticallyResumed: items.filter((item) => item.actionTaken === 'RESUME_ALREADY_PRESENT').length,
      unexplainedIdle: items.filter((item) => item.rootCause === 'OTHER_EVIDENCED_CAUSE' && item.wave2WaitingState === 'SYSTEM_ATTENTION_REQUIRED').length,
      humanWait: items.filter((item) => item.wave2WaitingState === 'WAITING_ON_AUTHOR' || item.wave2WaitingState === 'WAITING_ON_PROSPECT').length,
      recoveredMissingTitles: missingTitles.filter((item) => item.disposition !== 'INSUFFICIENT_EVIDENCE').length,
      mutations: executedActionKeys.size,
    },
  }
}

function reconcileItem(item, context) {
  const titleKey = normalizeTitle(item.title)
  const duplicateGroup = context.duplicateGroups.get(`${normalizeName(item.author)}|${titleKey}`) || []
  const namedOverride = namedTitleOverride(item, context.sourceIndex)
  const rootCause = namedOverride?.rootCause || inferRootCause(item, duplicateGroup)
  const wave2WaitingState = namedOverride?.waitingState || inferWaitingState(item, rootCause)
  const automationClass = namedOverride?.automationClass || inferAutomationClass(item, rootCause, wave2WaitingState)
  const actionKey = stableActionKey(item, automationClass)
  const queueResult = context.queuedActionKeys.has(actionKey)
    ? context.executedActionKeys.has(actionKey)
      ? 'QUEUED_EXECUTION_LOG_CREATED'
      : 'QUEUE_ALREADY_PRESENT'
    : ''
  const actionTaken = namedOverride?.actionTaken || queueResult || (wave2WaitingState === 'AUTO_EXECUTABLE' ? 'QUEUE_PENDING_EXECUTION' : 'NO_ACTION_TAKEN')
  const nextAction = namedOverride?.nextAction || refineNextAction(item, rootCause, automationClass)
  return {
    ...item,
    controllerVersion: WAVE2_CONTROLLER_VERSION,
    wave1Bucket: item.bucket,
    wave1SystemAttention: item.bucket === 'SYSTEM_ATTENTION_REQUIRED' || item.bucket === 'MAPPING_CONFLICT' ? 'YES' : 'NO',
    rootCause,
    wave2WaitingState,
    automationClass,
    actionKey,
    nextGovernedAction: nextAction,
    actionTaken,
    duplicateGroupSize: duplicateGroup.length,
  }
}

function namedTitleOverride(item, sourceIndex) {
  const title = normalizeTitle(item.title)
  const author = normalizeName(item.author)
  if (title.includes('indomitable')) {
    const commercial = sourceIndex.findCommercial('Indomitable')
    if (commercial?.agreementReadyForManualSignatureSend) {
      return {
        rootCause: 'MISSING_COMMERCIAL_STATE',
        waitingState: 'WAITING_ON_JMP',
        automationClass: 'NONE',
        nextAction: 'Manual signature send prepared; Jackie must send the validated agreement package before author wait begins',
      }
    }
    if (commercial?.paymentOptionSelected && commercial?.pricingLocked && !commercial?.agreementGenerated) {
      return {
        rootCause: 'MISSING_COMMERCIAL_STATE',
        waitingState: 'AUTO_EXECUTABLE',
        automationClass: 'GENERATE_CONTRACT_FROM_LOCKED_PRICING',
        nextAction: 'Generate governed agreement and package addendum from locked Professional commercial snapshot',
      }
    }
    if (commercial?.packageAccepted && !commercial?.paymentOptionSelected) {
      return {
        rootCause: 'MISSING_AUTHOR_DECISION',
        waitingState: 'WAITING_ON_AUTHOR',
        automationClass: 'NONE',
        nextAction: 'Await author payment-option selection',
      }
    }
  }
  if (title.includes('general') && title.includes('will')) {
    return {
      rootCause: item.runtimeAvailable === 'YES' ? 'MISSING_NEXT_ACTION_RULE' : 'RUNTIME_NOT_COMMISSIONED',
      waitingState: item.runtimeAvailable === 'YES' ? 'AUTO_EXECUTABLE' : 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: item.runtimeAvailable === 'YES' ? 'QUEUE_COMMISSIONED_JOB' : 'NONE',
      nextAction: item.runtimeAvailable === 'YES' ? 'Queue commissioned Line stage worker' : 'Confirm Line worker commissioning and Foundry capacity before retry',
    }
  }
  if (title.includes('long watch')) {
    return {
      rootCause: item.runtimeAvailable === 'YES' ? 'MISSING_NEXT_ACTION_RULE' : 'RUNTIME_NOT_COMMISSIONED',
      waitingState: item.runtimeAvailable === 'YES' ? 'AUTO_EXECUTABLE' : 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: item.runtimeAvailable === 'YES' ? 'QUEUE_COMMISSIONED_JOB' : 'NONE',
      nextAction: item.runtimeAvailable === 'YES' ? 'Queue Line stage when capacity policy permits; do not depend on Jackie memory' : 'Confirm Line readiness and worker commissioning',
    }
  }
  if (title.includes('intentional leader')) {
    return {
      rootCause: 'MISSING_PRODUCTION_STATE',
      waitingState: 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: 'NONE',
      nextAction: 'Resolve final full-wrap prerequisites: trim, binding, paper, final page count, spine, distribution route, and current cover artifact',
    }
  }
  if (title.includes('establishing glory')) {
    return {
      rootCause: item.currentGoverningArtifact === 'DATA_GAP' ? 'MISSING_ARTIFACT_AUTHORITY' : 'MISSING_NEXT_ACTION_RULE',
      waitingState: 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: 'NONE',
      nextAction: item.currentGoverningArtifact === 'DATA_GAP' ? 'Bind current editorial artifact before stage movement' : 'Classify exact next governed action from current artifact and author gate',
    }
  }
  if (title.includes('before you were born')) {
    return {
      rootCause: item.authorActionRequired === 'YES' ? 'MISSING_AUTHOR_DECISION' : 'MISSING_NEXT_ACTION_RULE',
      waitingState: item.authorActionRequired === 'YES' ? 'WAITING_ON_AUTHOR' : 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: 'NONE',
      nextAction: item.authorActionRequired === 'YES' ? item.nextGovernedAction : 'Resolve current editorial/author-review state from governed artifacts',
    }
  }
  if (author.includes('atta') || title === 'untitled' && author.includes('boateng')) {
    return {
      rootCause: item.authorActionRequired === 'YES' ? 'MISSING_AUTHOR_DECISION' : 'MISSING_NEXT_ACTION_RULE',
      waitingState: item.authorActionRequired === 'YES' ? 'WAITING_ON_AUTHOR' : 'SYSTEM_ATTENTION_REQUIRED',
      automationClass: 'NONE',
      nextAction: item.authorActionRequired === 'YES' ? item.nextGovernedAction : 'Reevaluate Atta as normal portfolio record and resume only if author gate is clear',
    }
  }
  return null
}

function inferRootCause(item, duplicateGroup) {
  if (item.bucket === 'TERMINAL') return 'ACTUALLY_TERMINAL'
  if (duplicateGroup.length > 1) return 'DUPLICATE_CONFLICTING_STATE'
  if (!item.titleId && item.recordType !== 'prospect') return 'MISSING_CANONICAL_TITLE_LINK'
  if (item.author === 'DATA_GAP') return 'MISSING_AUTHOR_RELATIONSHIP'
  if (item.currentGoverningArtifact === 'DATA_GAP' && ['EDITORIAL_PRODUCTION', 'BOOK_PRODUCTION'].includes(item.titleLifecycleStage)) return 'MISSING_ARTIFACT_AUTHORITY'
  if (item.authorActionRequired === 'YES') return 'MISSING_AUTHOR_DECISION'
  if (item.commercialLifecycleState?.includes('PACKAGE_NOT_CONFIRMED') && item.titleLifecycleStage === 'COMMERCIAL_ACTIVATION') return 'MISSING_COMMERCIAL_STATE'
  if (item.titleLifecycleStage === 'BOOK_PRODUCTION') return 'MISSING_PRODUCTION_STATE'
  if (item.titleLifecycleStage === 'DISTRIBUTION_READINESS' || item.titleLifecycleStage === 'DISTRIBUTION_RELEASE') return 'MISSING_DISTRIBUTION_STATE'
  if (item.runtimeAvailable === 'NO' && item.titleLifecycleStage !== 'DATA_GAP') return 'RUNTIME_NOT_COMMISSIONED'
  if (item.systemExecutionState === 'FAILED_ATTENTION_REQUIRED' && item.systemAttention !== 'NO_VALID_WAIT_OR_ACTION') return 'RUNTIME_FAILURE'
  if (looksLegacy(item)) return 'LEGACY_RECORD_RECONCILIATION'
  if (item.systemAttention === 'TITLE_IDENTITY_MISSING') return 'LIFECYCLE_MAPPING_CONFLICT'
  if (item.systemAttention === 'NO_VALID_WAIT_OR_ACTION' || item.titleLifecycleStage === 'DATA_GAP') return 'MISSING_NEXT_ACTION_RULE'
  return 'OTHER_EVIDENCED_CAUSE'
}

function inferWaitingState(item, rootCause) {
  if (rootCause === 'ACTUALLY_TERMINAL') return 'TERMINAL'
  if (item.bucket === 'WAITING_ON_AUTHOR') return 'WAITING_ON_AUTHOR'
  if (item.bucket === 'WAITING_ON_PROSPECT') return 'WAITING_ON_PROSPECT'
  if (item.bucket === 'WAITING_ON_EXTERNAL') return 'WAITING_ON_EXTERNAL'
  if (item.bucket === 'SYSTEM_RECOVERY_IN_PROGRESS') return 'SYSTEM_RECOVERY_IN_PROGRESS'
  if (item.bucket === 'AUTO_QUEUE_NOW' || item.bucket === 'AUTO_EXECUTE_NOW') return 'AUTO_EXECUTABLE'
  return 'SYSTEM_ATTENTION_REQUIRED'
}

function inferAutomationClass(item, rootCause, waitingState) {
  if (waitingState !== 'AUTO_EXECUTABLE') return 'NONE'
  if (item.nextGovernedAction.includes('agreement')) return 'GENERATE_CONTRACT_FROM_LOCKED_PRICING'
  if (item.nextGovernedAction.includes('Line')) return 'QUEUE_COMMISSIONED_JOB'
  if (item.nextGovernedAction.includes('Layout')) return 'QUEUE_LAYOUT_WHEN_COPY_APPROVED'
  if (item.nextGovernedAction.includes('Proof')) return 'QUEUE_PROOF_WHEN_LAYOUT_CERTIFIED'
  if (rootCause === 'RUNTIME_FAILURE') return 'RETRY_TRANSIENT_INTEGRATION'
  return 'RUN_STATUS_RECONCILIATION'
}

function refineNextAction(item, rootCause, automationClass) {
  if (automationClass !== 'NONE') return item.nextGovernedAction
  const actions = {
    LIFECYCLE_MAPPING_CONFLICT: 'Resolve conflicting lifecycle mapping before movement',
    MISSING_CANONICAL_TITLE_LINK: 'Bind canonical title/project link',
    MISSING_AUTHOR_RELATIONSHIP: 'Bind author relationship before workflow continuation',
    MISSING_ARTIFACT_AUTHORITY: 'Bind current governed artifact/checksum',
    MISSING_NEXT_ACTION_RULE: 'Classify next governed action from canonical evidence',
    RUNTIME_NOT_COMMISSIONED: 'Commission or select existing runtime before automatic movement',
    RUNTIME_FAILURE: 'Investigate failed runtime and retry only if idempotent',
    LEGACY_RECORD_RECONCILIATION: 'Reconcile legacy active row into active/post-publication/terminal disposition',
    MISSING_COMMERCIAL_STATE: 'Reconcile commercial state and surface contract/payment gap',
    MISSING_AUTHOR_DECISION: item.nextGovernedAction,
    MISSING_PRODUCTION_STATE: 'Resolve production state prerequisites',
    MISSING_DISTRIBUTION_STATE: 'Resolve distribution state prerequisites',
    DUPLICATE_CONFLICTING_STATE: 'Resolve duplicate/conflicting active records',
    ACTUALLY_TERMINAL: 'No production action; maintain stewardship only',
    OTHER_EVIDENCED_CAUSE: item.nextGovernedAction,
  }
  return actions[rootCause] || item.nextGovernedAction
}

function composePortfolio(items, duplicateGroups) {
  const duplicateIds = new Set([...duplicateGroups.values()].flat().map((item) => item.titleId || item.title))
  return {
    rawActiveTitleRecords: items.filter((item) => item.titleId).length,
    activePipeline: items.filter((item) => item.wave2WaitingState !== 'TERMINAL' && !duplicateIds.has(item.titleId || item.title) && !looksLegacy(item)).length,
    activePostPublication: items.filter((item) => item.rootCause === 'ACTUALLY_TERMINAL').length,
    legacyUnreconciled: items.filter((item) => item.rootCause === 'LEGACY_RECORD_RECONCILIATION').length,
    terminalButActive: items.filter((item) => item.rootCause === 'ACTUALLY_TERMINAL' && item.titleId).length,
    duplicatesConflicts: items.filter((item) => item.rootCause === 'DUPLICATE_CONFLICTING_STATE').length,
    dataQualityConflict: items.filter((item) => ['LIFECYCLE_MAPPING_CONFLICT', 'MISSING_CANONICAL_TITLE_LINK', 'MISSING_AUTHOR_RELATIONSHIP'].includes(item.rootCause)).length,
  }
}

function explainZeroAutoExecutable(evaluation, items) {
  if (evaluation.counts.autoExecutable > 0) return { notZero: evaluation.counts.autoExecutable }
  return {
    intentionallyDisabledWave1Execution: items.length,
    missingNextActionRules: items.filter((item) => item.rootCause === 'MISSING_NEXT_ACTION_RULE').length,
    incompleteLifecycleMappings: items.filter((item) => item.rootCause === 'LIFECYCLE_MAPPING_CONFLICT').length,
    unavailableRuntimes: items.filter((item) => item.rootCause === 'RUNTIME_NOT_COMMISSIONED').length,
    genuineHumanOrExternalGates: items.filter((item) => ['WAITING_ON_AUTHOR', 'WAITING_ON_PROSPECT', 'WAITING_ON_EXTERNAL'].includes(item.wave2WaitingState)).length,
    missingPrerequisiteData: items.filter((item) => ['MISSING_ARTIFACT_AUTHORITY', 'MISSING_COMMERCIAL_STATE', 'MISSING_PRODUCTION_STATE', 'MISSING_DISTRIBUTION_STATE'].includes(item.rootCause)).length,
    controllerImplementationDefect: 0,
  }
}

function buildSourceIndex(source) {
  const all = [
    ...source.titles.map((row) => ({ kind: 'title', row, name: row.jm1pub_titlename || row.jm1pub_name, author: row.jm1pub_authordisplayname || row.jm1pub_authorname })),
    ...source.intakes.map((row) => ({ kind: 'intake', row, name: row.jm1_projecttitle || row.jm1_name, author: [row.jm1_firstname, row.jm1_lastname].filter(Boolean).join(' ') })),
    ...source.opportunities.map((row) => ({ kind: 'opportunity', row, name: row.jm1pub_projecttitle || row.name, author: row.parentcontactidname })),
    ...source.stages.map((row) => ({ kind: 'stage', row, name: row.jm1pub_projecttitle || row.jm1pub_name, author: '' })),
    ...source.artifacts.map((row) => ({ kind: 'artifact', row, name: row.jm1pub_filename || row.jm1pub_artifacttype, author: '' })),
    ...source.logs.map((row) => ({ kind: 'executionlog', row, name: [row.jm1_name, row.jm1_actiondescription, row.jm1_sourcerecordid].filter(Boolean).join(' '), author: '' })),
  ]
  return {
    all,
    find(text) {
      const needle = normalizeTitle(text)
      return all.filter((entry) => normalizeTitle([entry.name, entry.author, JSON.stringify(entry.row)].join(' ')).includes(needle))
    },
    findCommercial(text) {
      const match = this.find(text).find((entry) => entry.kind === 'opportunity')?.row
      if (!match) return null
      const commercialText = [
        match.jm1_m6packageselectionstatus,
        match.jm1_m6paymentoptionselectionstatus,
        match.jm1_m6agreementpreparationstatus,
        match.jm1pub_contractstatus,
        match.jm1_m6firstpaymentstatus,
      ].map(clean).join(' ')
      return {
        opportunityId: match.opportunityid,
        packageAccepted: /accepted|selected/i.test(commercialText),
        paymentOptionSelected: Boolean(Number(match.jm1_m6selectedinstallmentcount || 0) || match.jm1_m6paymentselectionreceivedon),
        pricingLocked: Boolean(Number(match.jm1_m6selectedinstallmentcount || 0) || match.jm1_m6selectedpaymenttotal || match.jm1_m6selectedpaymentamount),
        agreementReadyForManualSignatureSend: /ready[_\s-]*for[_\s-]*manual[_\s-]*signature[_\s-]*send/i.test(commercialText),
        agreementGenerated: /generated|prepared|validated|ready[_\s-]*for[_\s-]*manual[_\s-]*signature[_\s-]*send|sent|executed|signed|active/i.test(commercialText),
      }
    },
  }
}

function mapFounderNamedTitles({ items, sourceIndex }) {
  return FOUNDER_NAMED_TITLES.map((requested) => {
    const matches = findItemMatches(items, requested)
    const evidenceMatches = sourceIndex.find(requested)
    const item = matches[0]
    return {
      requested,
      found: Boolean(item || evidenceMatches.length),
      activeDataverseMatches: matches.length,
      sourceMatches: evidenceMatches.length,
      stage: item?.titleLifecycleStage || (evidenceMatches.length ? 'FOUND_IN_SUPPORTING_EVIDENCE_NOT_ACTIVE_TITLE' : 'NOT_FOUND'),
      blocker: item?.rootCause || (evidenceMatches.length ? 'MISSING_CANONICAL_TITLE_LINK' : 'INSUFFICIENT_EVIDENCE'),
      nextAction: item?.nextGovernedAction || (evidenceMatches.length ? 'Recover/bind canonical active or legacy disposition' : 'Search exact governed SharePoint/mailbox path or reconstruct authority'),
      automation: item?.automationClass || 'NONE',
      actionTaken: item?.actionTaken || 'NO_ACTION_TAKEN',
      evidence: evidenceMatches.slice(0, 5).map((entry) => `${entry.kind}:${idFor(entry)}`),
    }
  })
}

function mapMissingOlderTitles({ sourceIndex }) {
  const older = [
    'A Year Walking With Him',
    'God Got Me',
    'Lucky Ducky',
    'Beyond Your Eyes',
    'A Walk Home With God',
    "Inner Peace Through Life's Storms",
    "'Til Death Do Us Part",
  ]
  return older.map((title) => {
    const matches = sourceIndex.find(title)
    const activeTitle = matches.find((entry) => entry.kind === 'title')
    return {
      title,
      foundInGovernedReadback: matches.length > 0,
      disposition: activeTitle ? 'ACTIVE_RECORD_REPAIRED' : matches.length ? 'RECOVERY_REQUIRED' : 'INSUFFICIENT_EVIDENCE',
      evidence: matches.slice(0, 6).map((entry) => `${entry.kind}:${idFor(entry)}`),
      note: activeTitle
        ? 'Active Dataverse title record exists or is discoverable in controller source.'
        : matches.length
          ? 'Supporting evidence exists but active canonical title linkage was not proven by Wave 2.'
          : 'No Dataverse/repository evidence found by Wave 2 source set; SharePoint/mailbox exact-path recovery remains required.',
    }
  })
}

function findItemMatches(items, requested) {
  const key = normalizeTitle(requested)
  return items.filter((item) => {
    const title = normalizeTitle(item.title)
    const author = normalizeName(item.author)
    return title.includes(key) || key.includes(title) || author.includes(key) || key.includes(author)
  })
}

function duplicateTitleGroups(items) {
  const groups = new Map()
  for (const item of items.filter((row) => row.titleId)) {
    const key = `${normalizeName(item.author)}|${normalizeTitle(item.title)}`
    groups.set(key, [...(groups.get(key) || []), item])
  }
  return new Map([...groups].filter(([, rows]) => rows.length > 1))
}

function looksLegacy(item) {
  return item.ageInCurrentState !== 'DATA_GAP' && Number(item.ageInCurrentState) >= 25 && item.runtimeAvailable === 'NO' && item.currentGoverningArtifact === 'DATA_GAP'
}

function stableActionKey(item, automationClass) {
  return createHash('sha256')
    .update([WAVE2_CONTROLLER_VERSION, item.titleId || item.intakeId || item.title, automationClass, item.nextGovernedAction].join('|'))
    .digest('hex')
    .slice(0, 24)
}

function idFor(entry) {
  const row = entry.row || {}
  return row.jm1pub_titleid || row.jm1_publishingintakeid || row.opportunityid || row.jm1pub_editorialstageid || row.jm1pub_editorialartifactid || row.jm1_executionlogid || 'unknown'
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function normalizeTitle(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeName(value) {
  return normalizeTitle(value)
}
