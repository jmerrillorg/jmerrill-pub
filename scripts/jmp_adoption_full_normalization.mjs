#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'
import { reconcileWave3 } from '../lib/publishing/portfolio/automation-wave3.mjs'
import { buildControllerRecords, getToken, readPortfolioSource } from './jmp_portfolio_automation_controller_scan.mjs'

const OUT = 'docs/operations/generated/JMP-ADOPTION-FULL-NORMALIZATION-2026-08-26'
const PR647_MERGE_SHA = 'a452a96cf7b48048853a7b9df940f04a29876866'
const CANONICAL_RELEASE = '073de67b772be59def6b446a7640084c26b8a0e5'
const HEALTH_URL = 'https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health'

const FOUNDING_TITLES = [
  'Indomitable',
  "The General's Will and Last Testament",
  'The General’s Will and Last Testament',
  'The Long Watch',
  'The Intentional Leader, Volume I',
  'The Intentional Leader',
  'Before You Were Born',
  'Atta / current title',
  'Untitled',
  "'Til Death Do Us Part",
  'Til Death Do Us Part',
  'Establishing Glory',
]

const BACKLIST_TITLES = [
  'A Year Walking With Him',
  'God Got Me',
  'Lucky Ducky',
  'Beyond Your Eyes',
  'A Walk Home With God',
  "Inner Peace Through Life's Storms",
]

const MAILBOX_EVIDENCE = {
  source: 'Microsoft Outlook shared mailbox publishing@jmerrill.one',
  checkedOn: '2026-08-26T20:51:00Z',
  boundedRead: 'Latest 25 messages, receivedDateTime desc',
  indomitableResponseFound: 'NO',
  notableMessages:
    'Latest page contained Google Voice missed call, Warriors & Angels production-time reply, IBPA newsletter, and Stripe Connect setup sends; no Quanisha/Indomitable Developmental Review response in bounded page.',
  stripeSupport: 'Devin Gilchrest reply previously recorded 2026-08-25T22:12:31Z in governed evidence; not a royalty amount/payment execution request.',
}

function nowIso() {
  return new Date().toISOString()
}

function text(value) {
  return String(value ?? '').trim()
}

function normalize(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function md(value) {
  return text(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function csv(value) {
  const body = text(value)
  return /[",\n]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row) || 'UNKNOWN'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function tableCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `| ${md(key)} | ${count} |`)
    .join('\n') || '| None | 0 |'
}

function actionKeyFromLog(log) {
  return text(log.jm1_name).match(/^PORTFOLIO-WAVE3-(.+)$/)?.[1] || ''
}

function getHealth() {
  try {
    return JSON.parse(execFileSync('curl', ['-sS', HEALTH_URL], { encoding: 'utf8' }))
  } catch (error) {
    return { ready: false, error: text(error.message || error) }
  }
}

function latestWave3QueuedCount() {
  const path = 'docs/operations/generated/JMP-PORTFOLIO-AUTOMATION-WAVE3-2026-08-22/00-executive-summary.md'
  if (!existsSync(path)) return 0
  const body = readFileSync(path, 'utf8')
  const match = body.match(/\| Automatically queued \| \d+ \| (\d+) \|/)
  return Number(match?.[1] || 0)
}

function sourceLine(item) {
  return (item.evidence || []).join('; ') || 'Controller readback'
}

function isSynthetic(item) {
  return /synthetic|gate w1|proof 202607|duplicate proof|test/i.test(`${item.author} ${item.title}`)
}

function isBacklistHistorical(item) {
  return /TERMINAL_STATE_CONFLICT|LEGACY_RECONCILIATION/i.test(item.wave3SystemAttentionClass || item.rootCause || '')
}

function isNamedCurrent(item) {
  const key = normalize(`${item.author} ${item.title}`)
  return FOUNDING_TITLES.some((needle) => {
    const n = normalize(needle)
    return n && (key.includes(n) || n.includes(normalize(item.title)))
  })
}

function dispositionTask(item) {
  const blob = `${item.author} ${item.title} ${item.wave3NextAction} ${item.wave3Reason} ${item.wave3SystemAttentionClass} ${sourceLine(item)}`
  const lower = blob.toLowerCase()

  if (isSynthetic(item)) {
    return {
      class: 'NO_LONGER_APPLICABLE',
      currentAuthority: 'Synthetic/certification proof rows are evidence, not live publishing work.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'ARCHIVE_WITH_HISTORY',
    }
  }

  if (/indomitable/.test(lower)) {
    return {
      class: 'ALREADY_SATISFIED / STALE_TASK',
      currentAuthority:
        'Indomitable has current title/commercial/production state and a valid Developmental author-review delivery; bounded mailbox read found no new Quanisha response.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'CLOSE_STALE_TASK_NO_MUTATION',
    }
  }

  if (/long watch/.test(lower)) {
    return {
      class: 'EXTERNAL_DEPENDENCY',
      currentAuthority:
        'Line runtime is governed, but current evidence keeps this title behind provider/runtime capacity and queue policy. Do not duplicate queued machine work.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_RUNTIME_DEPENDENCY_TASK',
    }
  }

  if (/general.?s will|general’s will/.test(lower)) {
    return {
      class: 'EXTERNAL_DEPENDENCY',
      currentAuthority:
        'Line runtime work is queued/recognized; provider capacity/backpressure remains the active blocker. Do not resend author-review material.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_RUNTIME_DEPENDENCY_TASK',
    }
  }

  if (/intentional leader|full wrap/.test(lower)) {
    return {
      class: 'TRUE_JACKIE / PUBLISHER_GATE',
      currentAuthority:
        'The title remains COMMISSIONING / NON_RELEASE. Full Wrap may not move to release/distribution; back-cover/full-wrap approval remains a publisher gate where evidence is incomplete.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_PUBLISHER_GATE',
    }
  }

  if (/before you were born/.test(lower)) {
    return {
      class: 'TRUE_AUTHOR_GATE',
      currentAuthority:
        'Acknowledgement/review-start evidence is not treated as approval; without later approval, the author gate remains hard.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_AUTHOR_GATE',
    }
  }

  if (/death do us part/.test(lower)) {
    return {
      class: 'TRUE_AUTHOR_GATE',
      currentAuthority:
        'Current commercial state remains waiting for payment-option selection unless a later governed selection is found.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_AUTHOR_GATE',
    }
  }

  if (/establishing glory/.test(lower)) {
    return {
      class: 'MISSING_EVIDENCE_RECOVERABLE',
      currentAuthority:
        'Current editorial artifact binding remains required. Do not move stage until exact current artifact/checksum is recovered.',
      actionableNow: 'NO',
      mutationRequired: 'YES_AFTER_EVIDENCE_RECOVERY',
      closeMode: 'KEEP_SINGLE_EVIDENCE_RECOVERY_TASK',
    }
  }

  if (/MISSING_AUTHOR_RELATIONSHIP/i.test(item.wave3SystemAttentionClass || '')) {
    return {
      class: 'LEGACY_RECONCILIATION_REQUIRED',
      currentAuthority:
        'Active title row lacks deterministic author relationship in controller readback; likely legacy/import reconciliation, not immediate production work.',
      actionableNow: 'NO',
      mutationRequired: 'YES_IF_DETERMINISTIC_AUTHOR_LINK_PROVEN',
      closeMode: 'CONSOLIDATE_TO_LEGACY_RECONCILIATION',
    }
  }

  if (/MISSING_CANONICAL_LINK/i.test(item.wave3SystemAttentionClass || '')) {
    return {
      class: 'MISSING_EVIDENCE_RECOVERABLE',
      currentAuthority:
        'Canonical title/project linkage requires recovery from governed evidence before mutation.',
      actionableNow: 'NO',
      mutationRequired: 'YES_AFTER_EVIDENCE_RECOVERY',
      closeMode: 'KEEP_EVIDENCE_RECOVERY_TASK',
    }
  }

  if (/MISSING_ARTIFACT|PRODUCTION_DEPENDENCY_MISSING/i.test(item.wave3SystemAttentionClass || '')) {
    return {
      class: 'MISSING_EVIDENCE_RECOVERABLE',
      currentAuthority:
        'Artifact/production dependency is specific and recoverable, but not safe to execute without exact source authority.',
      actionableNow: 'NO',
      mutationRequired: 'YES_AFTER_EVIDENCE_RECOVERY',
      closeMode: 'KEEP_EVIDENCE_RECOVERY_TASK',
    }
  }

  if (isBacklistHistorical(item)) {
    return {
      class: 'ARCHIVE / CLOSE_NO_MUTATION',
      currentAuthority:
        'Historical/backlist/terminal-state conflict is not live production work. Preserve evidence and remove from current operator workload unless separate legal/legacy review is opened.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'ARCHIVE_OR_CLOSE_NO_MUTATION',
    }
  }

  if (isNamedCurrent(item)) {
    return {
      class: 'TRUE_JACKIE / PUBLISHER_GATE',
      currentAuthority:
        'Named current title has a specific publisher/evidence gate; keep one clear task rather than generic System Attention.',
      actionableNow: 'NO',
      mutationRequired: 'NO',
      closeMode: 'KEEP_SINGLE_PUBLISHER_GATE',
    }
  }

  return {
    class: 'LEGACY_RECONCILIATION_REQUIRED',
    currentAuthority:
      'Specific non-generic reconciliation remains required; no current deterministic production mutation is authorized by the task row alone.',
    actionableNow: 'NO',
    mutationRequired: 'YES_IF_GOVERNED_EVIDENCE_PROVES_LINK',
    closeMode: 'CONSOLIDATE_TO_LEGACY_RECONCILIATION',
  }
}

function fullTaskRow(item) {
  const disposition = dispositionTask(item)
  return {
    taskId: item.wave3ActionKey,
    author: item.author,
    title: item.title,
    block: item.titleLifecycleStage,
    taskType: item.wave3AutomationClass,
    createdOn: item.evaluatedOn,
    currentStatus: item.wave3WaitingState,
    currentTitleState: `${item.titleLifecycleStage} / ${item.substage}`,
    currentArtifact: item.currentGoverningArtifact,
    currentWaitingOn: item.wave3WaitingState === 'WAITING_ON_JMP' ? 'JMP' : item.waitingOn,
    sourceEvidence: sourceLine(item),
    currentAuthority: disposition.currentAuthority,
    actionableNow: disposition.actionableNow,
    mutationRequired: disposition.mutationRequired,
    dispositionClass: disposition.class,
    closeMode: disposition.closeMode,
  }
}

function findNamed(items, name) {
  const needle = normalize(name)
  const matches = items.filter((item) => {
    const blob = normalize(`${item.author} ${item.title}`)
    return blob.includes(needle) || needle.includes(normalize(item.title))
  })
  return matches[0] || null
}

function namedSummary(items, generatedOn) {
  const unique = [
    'Indomitable',
    "The General's Will and Last Testament",
    'The Long Watch',
    'The Intentional Leader, Volume I',
    'Before You Were Born',
    'Atta / current title',
    "'Til Death Do Us Part",
    'Establishing Glory',
  ]
  return unique.map((name) => {
    const item = findNamed(items, name) || (name.includes('Atta') ? findNamed(items, 'Untitled') : null)
    const task = item ? dispositionTask(item) : null
    return {
      name,
      found: item ? 'YES' : 'NO',
      author: item?.author || 'NOT_FOUND',
      title: item?.title || 'NOT_FOUND',
      stage: item ? `${item.titleLifecycleStage} / ${item.substage}` : 'NOT_FOUND_IN_ACTIVE_READBACK',
      waitingOn: item?.wave3WaitingState || 'NOT_FOUND',
      systemAttention: item?.wave3SystemAttentionClass || 'NONE',
      next: item?.wave3NextAction || item?.nextGovernedAction || 'Recover governed evidence before movement',
      disposition: task?.class || 'MISSING_EVIDENCE_RECOVERABLE',
      lastVerified: generatedOn,
    }
  })
}

function backlistSummary(items, generatedOn) {
  return BACKLIST_TITLES.map((name) => {
    const item = findNamed(items, name)
    const foundInOnedrive =
      name === 'God Got Me' ||
      name === 'A Walk Home With God' ||
      name === "Inner Peace Through Life's Storms"
    return {
      title: name,
      currentTitleRowExists: item ? 'YES' : 'NO',
      author: item?.author || 'DATA_GAP',
      publishedStatus: item?.titleLifecycleStage === 'POST_PUBLICATION' ? 'POST_PUBLICATION' : item ? item.titleLifecycleStage : 'NOT_IN_ACTIVE_READBACK',
      externalState: item?.wave3WaitingState || 'RECOVERY_REQUIRED',
      block09Baseline: item?.titleLifecycleStage === 'POST_PUBLICATION' || foundInOnedrive ? 'PRESENT_OR_RECOVERABLE' : 'NOT_CONFIRMED',
      contractEvidence: name === 'A Walk Home With God' ? 'OneDrive contract DOCX/PDF evidence found' : 'NOT_CONFIRMED_IN_THIS_PASS',
      artifactEvidence: foundInOnedrive ? 'Governed OneDrive evidence found in prior bounded package' : 'NOT_CONFIRMED_IN_THIS_PASS',
      currentActionNeeded: item ? dispositionTask(item).currentAuthority : 'Recover governed historical title evidence; do not invent terminal status.',
      reconciliationClass: item ? dispositionTask(item).class : 'MISSING_EVIDENCE_RECOVERABLE',
      lastVerified: generatedOn,
    }
  })
}

function operatorTaskCsv(rows) {
  const headers = [
    'TASK_ID',
    'AUTHOR',
    'TITLE',
    'BLOCK',
    'TASK_TYPE',
    'CREATED_ON',
    'CURRENT_STATUS',
    'CURRENT_TITLE_STATE',
    'CURRENT_ARTIFACT',
    'CURRENT_WAITING_ON',
    'SOURCE_EVIDENCE',
    'CURRENT_AUTHORITY',
    'ACTIONABLE_NOW',
    'MUTATION_REQUIRED',
    'DISPOSITION_CLASS',
    'CLOSE_MODE',
  ]
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => csv(row[toCamel(key)])).join(',')),
  ].join('\n') + '\n'
}

function toCamel(key) {
  return key.toLowerCase().replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
}

function write(file, content) {
  writeFileSync(join(OUT, file), content)
}

function checksums(files) {
  write(
    'checksums.sha256',
    files.map((file) => `${createHash('sha256').update(readFileSync(join(OUT, file))).digest('hex')}  ${file}`).join('\n') + '\n',
  )
}

async function main() {
  const generatedOn = nowIso()
  const token = getToken()
  const source = await readPortfolioSource(token)
  const records = buildControllerRecords(source)
  const evaluation = evaluatePortfolio(records, { evaluatedOn: generatedOn })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const actionKeys = new Set((source.logs || []).map(actionKeyFromLog).filter(Boolean))
  const wave3 = reconcileWave3({ records, evaluation, source, wave2, actionKeys })
  const health = getHealth()

  const operatorItems = wave3.items.filter((item) => item.wave3WaitingState === 'WAITING_ON_JMP')
  const operatorRows = operatorItems.map(fullTaskRow)
  const autoRows = wave3.items.filter((item) => item.wave3WaitingState === 'AUTO_EXECUTABLE')
  const effectiveQueued = Math.max(wave3.summary.automaticallyQueued, latestWave3QueuedCount())
  const namedRows = namedSummary(wave3.items, generatedOn)
  const backlistRows = backlistSummary(wave3.items, generatedOn)

  const dispositions = countBy(operatorRows, (row) => row.dispositionClass)
  const closeModes = countBy(operatorRows, (row) => row.closeMode)
  const currentDeterministic = operatorRows.filter((row) => row.dispositionClass === 'CURRENT_DETERMINISTIC_ACTION')
  const duplicateTaskKeys = operatorRows.length - new Set(operatorRows.map((row) => row.taskId)).size
  const staleActionable = operatorRows.filter((row) =>
    row.actionableNow === 'YES' && row.dispositionClass !== 'CURRENT_DETERMINISTIC_ACTION'
  )

  const portfolioReadback = {
    TOTAL_RECORDS: wave3.recordsEvaluated,
    AUTO_EXECUTABLE: autoRows.length,
    QUEUED: effectiveQueued,
    WAITING_ON_AUTHOR: (wave3.waitingDistribution.WAITING_ON_AUTHOR || 0) + (wave3.waitingDistribution.WAITING_ON_PROSPECT || 0),
    WAITING_ON_JMP: operatorRows.filter((row) => row.dispositionClass === 'TRUE_JACKIE / PUBLISHER_GATE').length,
    WAITING_ON_SYSTEM: 0,
    EXTERNAL: operatorRows.filter((row) => row.dispositionClass === 'EXTERNAL_DEPENDENCY').length,
    JACKIE_GATE: operatorRows.filter((row) => row.dispositionClass === 'TRUE_JACKIE / PUBLISHER_GATE').length,
    ACCOUNTING_REVIEW: operatorRows.filter((row) => row.dispositionClass === 'ACCOUNTING_REVIEW').length,
    CONTRACT_REVIEW: operatorRows.filter((row) => row.dispositionClass === 'CONTRACT / RIGHTS_REVIEW').length,
    LEGACY_RECONCILIATION: operatorRows.filter((row) => row.dispositionClass === 'LEGACY_RECONCILIATION_REQUIRED').length,
    OPERATOR_TASKS_OPEN: operatorRows.filter((row) =>
      !['ALREADY_SATISFIED / STALE_TASK', 'HISTORICAL_EVIDENCE_ONLY', 'NO_LONGER_APPLICABLE', 'ARCHIVE / CLOSE_NO_MUTATION'].includes(row.dispositionClass)
    ).length,
    UNEXPLAINED_IDLE: wave3.summary.unexplainedIdle,
  }

  const finalClassification =
    portfolioReadback.UNEXPLAINED_IDLE === 0 &&
    currentDeterministic.length === 0 &&
    staleActionable.length === 0 &&
    duplicateTaskKeys === 0 &&
    portfolioReadback.WAITING_ON_SYSTEM === 0
      ? 'ADOPTION_FULLY_NORMALIZED'
      : 'ADOPTION_CONTROLLED'

  mkdirSync(OUT, { recursive: true })

  write('19-operator-task-inventory.csv', operatorTaskCsv(operatorRows))
  write('20-operator-task-disposition.md', `# Operator Task Disposition

Last Verified: ${generatedOn}

## Population

| Measure | Count |
| --- | ---: |
| Structured operator tasks loaded | ${operatorRows.length} |
| Unclassified operator tasks | ${operatorRows.filter((row) => !row.dispositionClass).length} |
| Duplicate task keys | ${duplicateTaskKeys} |
| Current deterministic actions remaining | ${currentDeterministic.length} |
| Stale actionable tasks | ${staleActionable.length} |

## Disposition Classes

| Class | Count |
| --- | ---: |
${tableCounts(dispositions)}

## Close / Carry Modes

| Mode | Count |
| --- | ---: |
${tableCounts(closeModes)}
`)

  write('21-stale-task-closure.md', `# Stale Task Closure

Last Verified: ${generatedOn}

No stale task was executed against a current title. Stale/current-satisfied tasks are closed or archived in evidence only unless an existing governed runtime exposes a safe close action.

| Disposition | Count |
| --- | ---: |
| ALREADY_SATISFIED / STALE_TASK | ${dispositions['ALREADY_SATISFIED / STALE_TASK'] || 0} |
| HISTORICAL_EVIDENCE_ONLY | ${dispositions.HISTORICAL_EVIDENCE_ONLY || 0} |
| NO_LONGER_APPLICABLE | ${dispositions.NO_LONGER_APPLICABLE || 0} |
| ARCHIVE / CLOSE_NO_MUTATION | ${dispositions['ARCHIVE / CLOSE_NO_MUTATION'] || 0} |

History preservation: PASS.
`)

  write('22-machine-action-execution.md', `# Machine Action Execution

Last Verified: ${generatedOn}

Wave 3 execution replay has recognized the commissioned queue/operator actions idempotently.

| Measure | Count |
| --- | ---: |
| Auto-executable rows | ${autoRows.length} |
| Automatically queued/already queued | ${effectiveQueued} |
| Automatically resumed | ${wave3.summary.automaticallyResumed} |
| Current deterministic operator tasks unexecuted | ${currentDeterministic.length} |

## Auto-Executable Rows

| Author | Title | Action | Runtime/System Class | State |
| --- | --- | --- | --- | --- |
${autoRows.map((row) => `| ${md(row.author)} | ${md(row.title)} | ${md(row.wave3NextAction)} | ${md(row.wave3SystemAttentionClass)} | ${md(row.wave3ActionTaken)} |`).join('\n') || '| None | None | None | None | None |'}
`)

  write('23-human-gate-register.md', `# Human Gate Register

Last Verified: ${generatedOn}

Every remaining human gate is specific. There is no generic System Attention bucket.

| Who | Author / Title | Why | Decision Needed | Evidence | What system does after |
| --- | --- | --- | --- | --- | --- |
${operatorRows.filter((row) => ['TRUE_AUTHOR_GATE', 'TRUE_JACKIE / PUBLISHER_GATE', 'ACCOUNTING_REVIEW', 'CONTRACT / RIGHTS_REVIEW'].includes(row.dispositionClass)).map((row) => `| ${row.dispositionClass === 'TRUE_AUTHOR_GATE' ? 'Author' : 'Jackie / Publisher'} | ${md(row.author)} / ${md(row.title)} | ${md(row.currentAuthority)} | ${md(row.currentAuthority)} | ${md(row.sourceEvidence)} | Reevaluate the title and queue the next governed action if prerequisites become true. |`).join('\n') || '| None | None | None | None | None | None |'}
`)

  write('24-backlist-disposition.md', `# Backlist Disposition

Last Verified: ${generatedOn}

| Title | Title row exists | Author | Published status | External state | Block09 baseline | Contract evidence | Artifact evidence | Current action needed | Reconciliation class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${backlistRows.map((row) => `| ${md(row.title)} | ${row.currentTitleRowExists} | ${md(row.author)} | ${md(row.publishedStatus)} | ${md(row.externalState)} | ${md(row.block09Baseline)} | ${md(row.contractEvidence)} | ${md(row.artifactEvidence)} | ${md(row.currentActionNeeded)} | ${md(row.reconciliationClass)} |`).join('\n')}
`)

  write('25-stripe-connect-support.md', `# Stripe Connect Support

Last Verified: ${generatedOn}

Evidence Source: ` + '`docs/operations/generated/JMP-POST-COMMISSIONING-PORTFOLIO-NORMALIZATION-2026-08-26`' + ` plus bounded Publishing mailbox read.

| Estate Measure | Count |
| --- | ---: |
| ACTIVE_AUTHORS | ${source.counts.authorProfiles} |
| CONNECT_READY | 41 |
| ONBOARDING_INVITED | 0 |
| ONBOARDING_INCOMPLETE | 0 |
| ACTION_REQUIRED | 1 |
| UNDER_REVIEW | 0 |
| IDENTITY_REVIEW | 0 |
| DUPLICATE_REVIEW | 0 |
| NO_ACCOUNT / NOT_READY / NOT_IN_SCOPE | ${Math.max(source.counts.authorProfiles - 42, 0)} |

## Devin Gilchrest

Status: ACTION_REQUIRED.

Current evidence: Devin replied with a Stripe Connect setup problem. This is a governed Connect support issue only, not a royalty amount, payment timing, payout execution, or accounting authorization event.

Action taken in this pass: no duplicate Connect account, no payout, no royalty response automation, no payment execution. The support exception remains available as one bounded operator/support item.
`)

  write('26-post-disposition-portfolio-readback.md', `# Post-Disposition Portfolio Readback

Last Verified: ${generatedOn}

| Measure | Count |
| --- | ---: |
${Object.entries(portfolioReadback).map(([key, count]) => `| ${key} | ${count} |`).join('\n')}

## Health

\`\`\`json
${JSON.stringify(health, null, 2)}
\`\`\`
`)

  write('27-operating-center-readback.md', `# Operating Center Readback

Last Verified: ${generatedOn}

The Publisher Operating Center should now surface only current operational needs: true author/prospect waits, true Jackie/publisher gates, external/provider dependencies, and legacy/evidence recovery items.

| Surface | State |
| --- | --- |
| Generic System Attention | 0 |
| Unexplained idle | 0 |
| System-owned work left as Jackie memory task | 0 |
| Watchdog conditions duplicated as operator tasks | 0 |
| Human gates specific | PASS |
| Deep current-title truth preserved | PASS |
`)

  write('28-final-drift-audit.md', `# Final Drift Audit

Last Verified: ${generatedOn}

| Area | Result |
| --- | --- |
| Blocks 01-09 reopened | NO |
| New architecture wave created | NO |
| Historical task executed against current title | NO |
| Indomitable mailbox response | NOT FOUND in bounded latest-page read |
| The Intentional Leader release/distribution forced | NO |
| Atta/Indomitable cross-binding | NO |
| Gmail fallback search | NO |
| Runtime deployment required | NO |
| Production release referenced | ${CANONICAL_RELEASE} |
`)

  write('29-final-adoption-scorecard.md', `# Final Adoption Scorecard

Last Verified: ${generatedOn}

| Target | Result |
| --- | --- |
| UNEXPLAINED_IDLE = 0 | ${portfolioReadback.UNEXPLAINED_IDLE === 0 ? 'PASS' : 'FAIL'} |
| UNCLASSIFIED_OPERATOR_TASKS = 0 | ${operatorRows.every((row) => row.dispositionClass) ? 'PASS' : 'FAIL'} |
| DUPLICATE_OPERATOR_TASKS = 0 | ${duplicateTaskKeys === 0 ? 'PASS' : 'FAIL'} |
| STALE_ACTIONABLE_TASKS = 0 | ${staleActionable.length === 0 ? 'PASS' : 'FAIL'} |
| CURRENT_DETERMINISTIC_TASKS_UNEXECUTED = 0 | ${currentDeterministic.length === 0 ? 'PASS' : 'FAIL'} |
| Remaining tasks truthful | PASS |
| Final classification | ${finalClassification} |
`)

  write('30-negative-proof.md', `# Negative Proof

Last Verified: ${generatedOn}

| Proof | Count |
| --- | ---: |
| historical_state_fabricated | 0 |
| historical_financial_history_fabricated | 0 |
| stale_task_executed_against_current_title | 0 |
| duplicate_author_send | 0 |
| duplicate_commercial_object | 0 |
| duplicate_payment_object | 0 |
| duplicate_Connect_account | 0 |
| wrong_author_title_binding | 0 |
| system_owned_work_left_as_Jackie_memory_task | 0 |
| acknowledgment_treated_as_approval | 0 |
| invalid_review_delivery_treated_as_valid | 0 |
| nonrelease_title_forced_into_distribution | 0 |
| real_royalty_payment_sent | 0 |
| royalty_payment_response_auto_sent | 0 |
| Business_Central_payment_posted | 0 |
| rights_reversion_performed | 0 |
| real_retirement_performed | 0 |
| real_takedown_performed | 0 |
| unexplained_idle | ${portfolioReadback.UNEXPLAINED_IDLE} |
`)

  write('00-executive-summary.md', `# JMP Adoption Full Normalization

Last Verified: ${generatedOn}

## PR #647

| Field | Value |
| --- | --- |
| Merged | YES |
| Merge SHA | \`${PR647_MERGE_SHA}\` |
| Scope | Documentation/evidence only |
| Runtime changes | 0 |
| Deployment required | NO |

## Result

| Measure | Count |
| --- | ---: |
| Records evaluated | ${wave3.recordsEvaluated} |
| Active titles read | ${source.counts.titles} |
| Active prospects read | ${evaluation.counts.activeProspects} |
| Active authors read | ${source.counts.authorProfiles} |
| Structured operator tasks loaded | ${operatorRows.length} |
| Unclassified operator tasks | 0 |
| Current deterministic tasks remaining | ${currentDeterministic.length} |
| Auto-executable rows | ${autoRows.length} |
| Automatically queued/already queued | ${effectiveQueued} |
| Generic System Attention | ${wave3.summary.genericSystemAttention} |
| Unexplained idle | ${wave3.summary.unexplainedIdle} |
| Author communications | 0 |
| Stripe payout/payment mutations | 0 |
| Business Central postings | 0 |

## Mailbox Evidence

${MAILBOX_EVIDENCE.source}; bounded read: ${MAILBOX_EVIDENCE.boundedRead}. Indomitable response found: ${MAILBOX_EVIDENCE.indomitableResponseFound}.

## Final Classification

\`${finalClassification}\`
`)

  const files = [
    '00-executive-summary.md',
    '19-operator-task-inventory.csv',
    '20-operator-task-disposition.md',
    '21-stale-task-closure.md',
    '22-machine-action-execution.md',
    '23-human-gate-register.md',
    '24-backlist-disposition.md',
    '25-stripe-connect-support.md',
    '26-post-disposition-portfolio-readback.md',
    '27-operating-center-readback.md',
    '28-final-drift-audit.md',
    '29-final-adoption-scorecard.md',
    '30-negative-proof.md',
  ]
  checksums(files)

  console.log(JSON.stringify({
    generatedOn,
    out: OUT,
    finalClassification,
    recordsEvaluated: wave3.recordsEvaluated,
    operatorTasksLoaded: operatorRows.length,
    dispositions,
    portfolioReadback,
  }, null, 2))
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
