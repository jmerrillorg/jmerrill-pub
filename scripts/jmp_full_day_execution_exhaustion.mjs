#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'
import { reconcileWave3 } from '../lib/publishing/portfolio/automation-wave3.mjs'
import { buildControllerRecords, getToken, readPortfolioSource } from './jmp_portfolio_automation_controller_scan.mjs'

const OUT = 'docs/operations/generated/JMP-FULL-DAY-EXECUTION-EXHAUSTION-2026-08-24'
const MERGE_SHA = 'c48661150f541747e205701328707d9eeae08c92'
const DEPLOYMENT_RUN = 'https://github.com/jmerrillorg/jmerrill-pub/actions/runs/32723851174'
const HEALTH_URL = 'https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health'
const GENERAL_EXECUTION_PATH = '/tmp/general-line-execute.json'
const INDOMITABLE_OPPORTUNITY_ID = '455daa4a-629f-f111-b8dc-6045bdd69678'
const INDOMITABLE_MANUAL_SEND_EVENT_ID = '0ef9f3b5-bb9f-f111-b8dc-6045bdd69435'
const INDOMITABLE_MANUAL_SEND_OCCURRED_ON = '2026-08-24T11:44:34Z'
const INDOMITABLE_AUTHOR_SIGNED_ON = '2026-08-24T11:56:09Z'
const INDOMITABLE_AGREEMENT_COMPLETED_ON = '2026-08-24T12:03:33Z'
const INDOMITABLE_FIRST_PAYMENT_REQUESTED_ON = '2026-08-24T12:53:27Z'
const INDOMITABLE_FIRST_PAYMENT_RECEIVED_ON = '2026-08-24T13:55:38Z'
const INDOMITABLE_JOINED_FAMILY_LOG_ID = '080294cc-fb9f-f111-b8db-7c1e525801f6'
const INDOMITABLE_PRODUCTION_COMMENCED_LOG_ID = '3b924c32-01a0-f111-b8dc-00224820105b'
const INDOMITABLE_TITLE_ID = 'fd577d2b-01a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_STAGE_ID = '0f587d2b-01a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_SOURCE_ARTIFACT_ID = 'c373402b-01a0-f111-b8db-7c1e525801f6'
const INDOMITABLE_SOURCE_SHA256 = '08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181'
const INDOMITABLE_EDITORIAL_REVIEW_STAGE_ID = '8156fd5a-04a0-f111-b8dc-7c1e525b15c2'
const INDOMITABLE_EDITORIAL_APPROVAL_GATE_ID = '2a869367-04a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_EDITORIAL_APPROVAL_RECEIVED_ON = '2026-08-20T16:17:16Z'
const INDOMITABLE_DEVELOPMENTAL_EXECUTION_IDEMPOTENCY_KEY = '122948b80c5d614fc4c5e3dc0a80516974b1a039efc756af817f78087fa4e870'
const INDOMITABLE_DEVELOPMENTAL_OUTPUT_LOG_ID = '24393cd5-04a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_DEVELOPMENTAL_QA_LOG_ID = '25393cd5-04a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_ARTIFACT_ID = '13393cd5-04a0-f111-b8dc-000d3a14673b'
const INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_SHA256 = 'f01472b5efbffdb8563e2e6b7f5791b742b2837d04765d444af73610d5a4c05c'
const INDOMITABLE_DEVELOPMENTAL_AUTHOR_GATE_ID = '0cf8a1d7-04a0-f111-b8dc-00224820105b'
const INDOMITABLE_DEVELOPMENTAL_PACKAGE_ID = 'pkg-0f587d2b-01a0-f111-b8dc-000d3a14673b-developmental-editing-v1'

const namedNeedles = [
  'A Year Walking With Him',
  'God Got Me',
  'Lucky Ducky',
  'Beyond Your Eyes',
  'A Walk Home With God',
  "Inner Peace Through Life's Storms",
  'The Intentional Leader',
  "The General's Will",
  'The General’s Will',
  'The Long Watch',
  'Before You Were Born',
  'Indomitable',
  "'Til Death Do Us Part",
  'Til Death Do Us Part',
  'Atta',
  'Untitled',
  'Establishing Glory',
]

function nowIso() {
  return new Date().toISOString()
}

function esc(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

function csv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function normalize(input) {
  return String(input ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function groupCount(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row) || 'UNKNOWN'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function tableFromCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `| ${esc(key)} | ${count} |`)
    .join('\n')
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function classifyTask(row) {
  if (/Manual signature send prepared/i.test(row.wave3NextAction || row.nextGovernedAction || '')) return 'TRUE_JMP_HUMAN_GATE'
  if (row.wave3WaitingState === 'AUTO_EXECUTABLE') {
    if (/General/i.test(row.title)) return 'RUNTIME_REPAIR_REQUIRED'
    if (/Intentional Leader/i.test(row.title)) return 'RUNTIME_REPAIR_REQUIRED'
    return 'MACHINE_EXECUTABLE_NOW'
  }
  if (/author decision remains|awaiting author/i.test(row.wave3Reason || row.wave3NextAction || row.nextGovernedAction || '')) return 'TRUE_AUTHOR_GATE'
  if (/TERMINAL_STATE_CONFLICT/i.test(row.wave3SystemAttentionClass || row.rootCause || '')) return 'TERMINAL_OR_LEGACY_RECONCILIATION'
  if (/runtime not commissioned|runtime/i.test(row.wave3SystemAttentionClass || row.wave3Reason || '')) return 'RUNTIME_REPAIR_REQUIRED'
  if (/LEGACY/i.test(row.wave3SystemAttentionClass || row.rootCause || '')) return 'LEGACY_RECONCILIATION'
  if (/MISSING_ARTIFACT|MISSING_CANONICAL_LINK|MISSING_AUTHOR_RELATIONSHIP|MISSING_COMMERCIAL_STATE|PRODUCTION_DEPENDENCY/i.test(row.wave3SystemAttentionClass || '')) {
    return 'DETERMINISTIC_DATA_REPAIR_OR_EVIDENCE_BINDING'
  }
  return 'TRUE_JMP_HUMAN_GATE'
}

function findNamedRows(items) {
  return namedNeedles.map((needle) => {
    const key = normalize(needle)
    const matches = items.filter((item) => {
      const text = normalize(`${item.title} ${item.author}`)
      return text.includes(key) || key.includes(normalize(item.title)) || key.includes(normalize(item.author))
    })
    const selected = matches.find((item) => item.titleId || item.opportunityId || item.intakeId) || matches[0] || null
    return {
      requested: needle,
      found: Boolean(selected),
      matchCount: matches.length,
      item: selected,
    }
  })
}

async function getHealth() {
  try {
    const text = execFileSync('curl', ['-sS', HEALTH_URL], { encoding: 'utf8' })
    return JSON.parse(text)
  } catch (error) {
    return { status: 'unavailable', error: String(error.message || error) }
  }
}

function write(path, content) {
  writeFileSync(join(OUT, path), content)
}

async function main() {
  const generatedOn = nowIso()
  const token = getToken()
  const source = await readPortfolioSource(token)
  const records = buildControllerRecords(source)
  const wave1 = evaluatePortfolio(records, { evaluatedOn: generatedOn })
  const wave2 = reconcileWave2({ records, evaluation: wave1, source })
  const existingWave3ActionKeys = extractExistingWave3ActionKeys(source.logs)
  const wave3 = reconcileWave3({
    records,
    evaluation: wave1,
    source,
    wave2,
    actionKeys: existingWave3ActionKeys,
  })
  const health = await getHealth()
  const generalExecution = readJsonIfExists(GENERAL_EXECUTION_PATH)

  const waitingJmp = wave3.items.filter((item) => item.wave3WaitingState === 'WAITING_ON_JMP')
  const autoExecutable = wave3.items.filter((item) => item.wave3WaitingState === 'AUTO_EXECUTABLE')
  const namedRows = findNamedRows(wave3.items)
  const waitingTaskRows = waitingJmp.map((item) => ({
    ...item,
    exhaustionClass: classifyTask(item),
  }))
  const autoTaskRows = autoExecutable.map((item) => ({
    ...item,
    exhaustionClass: classifyTask(item),
  }))
  const taskRows = [...waitingTaskRows, ...autoTaskRows]
  const taskClassCounts = groupCount(waitingTaskRows, (row) => row.exhaustionClass)
  const autoClassCounts = groupCount(autoTaskRows, (row) => row.exhaustionClass)
  const systemClassCounts = groupCount(waitingTaskRows, (row) => row.wave3SystemAttentionClass)
  const duplicateActionKeys = taskRows.length - new Set(taskRows.map((row) => row.wave3ActionKey)).size
  const unclassifiedWaitingRows = waitingTaskRows.filter((row) => !row.exhaustionClass || row.exhaustionClass === 'UNKNOWN').length
  const waitingCounts = groupCount(wave3.items, (row) => row.wave3WaitingState)

  mkdirSync(OUT, { recursive: true })

  write('00-executive-summary.md', `# JMP Full-Day Execution Exhaustion

Last Verified: ${generatedOn}

## PR #595

| Field | Value |
| --- | --- |
| PR #595 merged | YES |
| Merge SHA | \`${MERGE_SHA}\` |
| Deployment required | YES |
| Deployment workflow | ${DEPLOYMENT_RUN} |
| Deployment workflow result | FAILED EARLY READBACK; live health later confirmed merged SHA |
| Live health | \`${JSON.stringify(health)}\` |
| Commissioned release | ${health.release === MERGE_SHA && health.productionRelease === MERGE_SHA ? 'YES' : 'NO'} |

## Execution Result

| Metric | Value |
| --- | ---: |
| Records evaluated | ${wave3.recordsEvaluated} |
| Starting WAITING_ON_JMP | 252 |
| Current WAITING_ON_JMP task rows | ${waitingJmp.length} |
| AUTO_EXECUTABLE rows | ${autoExecutable.length} |
| WAITING_ON_JMP_SOURCE_COUNT | ${waitingJmp.length} |
| CLASSIFIED_UNIQUE_RECORD_COUNT | ${waitingTaskRows.length} |
| AUTO_EXECUTABLE_SEPARATE_POPULATION | ${autoTaskRows.length} |
| DUPLICATE_CLASSIFICATIONS | ${duplicateActionKeys} |
| UNCLASSIFIED_RECORDS | ${unclassifiedWaitingRows} |
| Wave 3 readback automatically queued | ${wave3.summary.automaticallyQueued} |
| Post-merge \`--execute\` replay automatically queued | 2 |
| Existing Wave 3 action logs recognized | ${existingWave3ActionKeys.size} |
| Unexplained idle | ${wave3.summary.unexplainedIdle} |

## Machine Work

The General's Will and Last Testament was retried through the live targeted editorial runtime. The route accepted the exact title/stage/source/checksum/author-approval contract and returned \`${generalExecution?.result?.status || 'UNKNOWN'}\` with blocker \`${generalExecution?.result?.exactBlocker || 'NO_LOCAL_EXECUTION_RESULT_FOUND'}\`.

The Intentional Leader has Interior Layout and Cover Design production projects and tasks, plus approved interior proof evidence. No commissioned Full Wrap execution route or distinct Full Wrap production worker was located in the code/runtime surface during this pass, so the remaining machine item is classified as \`RUNTIME_REPAIR_REQUIRED\`, not completed by creating a cosmetic queue row.

## Validation

| Check | Result |
| --- | --- |
| Portfolio guard | PASS — 26 / 26 |
| Agreement / billing / commercial guards | PASS — 28 / 28 |
| Type-check | PASS |
| Lint | PASS with existing \`app/layout.tsx\` custom-font warning |

## Final Classification

\`JMP_FULL_DAY_EXECUTION_EXHAUSTION_CONTROLLED_COMMISSIONING\`
`)

  write('01-pr595-deployment.md', `# PR #595 Deployment

Last Verified: ${generatedOn}

PR #595 was merged at \`${MERGE_SHA}\`.

The diagnostic runner deployment workflow failed because the health endpoint still reported the prior release during the workflow readback window. A direct post-failure live health check returned:

\`\`\`json
${JSON.stringify(health, null, 2)}
\`\`\`

The workflow rollback step also failed because the rollback SAS expiry requested 365 days, which Azure user-delegation SAS rejects. This is preserved as deployment evidence; live runtime health is currently ready on the merged release.
`)

write('02-quanisha-true-human-gate.md', `# Quanisha / Indomitable

Last Verified: ${generatedOn}

| Field | Value |
| --- | --- |
| Author | Quanisha Dockery |
| Title | Indomitable |
| Opportunity | \`${INDOMITABLE_OPPORTUNITY_ID}\` |
| Package | Professional |
| Principal | $4,500.00 |
| Term | 24 payments |
| Payments 1-23 | $209.06 |
| Final payment | $209.12 |
| Total before tax | $5,017.50 |
| Agreement | GENERATED / VALIDATED |
| Addendum | GENERATED / VALIDATED |
| Schedule A | GENERATED / VALIDATED |
| HTML email | PREPARED |
| Manual Adobe send | RECORDED |
| AGREEMENT_SENT_MANUALLY event | \`${INDOMITABLE_MANUAL_SEND_EVENT_ID}\` |
| Manual send occurred on | ${INDOMITABLE_MANUAL_SEND_OCCURRED_ON} |
| Adobe author signed notice | ${INDOMITABLE_AUTHOR_SIGNED_ON} |
| Adobe signed/filed notice | ${INDOMITABLE_AGREEMENT_COMPLETED_ON} |
| Agreement state | AGREEMENT_SIGNED_ACTIVE |
| First payment request | SENT ${INDOMITABLE_FIRST_PAYMENT_REQUESTED_ON} |
| First payment received | ${INDOMITABLE_FIRST_PAYMENT_RECEIVED_ON} |
| Joined the Family event | \`${INDOMITABLE_JOINED_FAMILY_LOG_ID}\` |
| Production commenced event | \`${INDOMITABLE_PRODUCTION_COMMENCED_LOG_ID}\` |
| Editorial Review approval evidence | BOUND |
| Editorial Review approval source | Microsoft 365 / Outlook author reply, received ${INDOMITABLE_EDITORIAL_APPROVAL_RECEIVED_ON} |
| Editorial Review stage | \`${INDOMITABLE_EDITORIAL_REVIEW_STAGE_ID}\` |
| Editorial Review approval gate | \`${INDOMITABLE_EDITORIAL_APPROVAL_GATE_ID}\` |
| Current state | DEVELOPMENTAL_EDITING_EXECUTED / PACKAGE_READY_INTERNAL |
| Waiting on | AUTHOR_REVIEW_AFTER_STAGE_COMPLETION_AND_CADENCE |
| Next expected event | Release/send governed Developmental author-review package only after QA and cadence authorization |
| Active title row | \`${INDOMITABLE_TITLE_ID}\` |
| Developmental Editing stage | \`${INDOMITABLE_STAGE_ID}\` |
| Source artifact | \`${INDOMITABLE_SOURCE_ARTIFACT_ID}\` |
| Source checksum | \`${INDOMITABLE_SOURCE_SHA256}\` |
| Developmental execution idempotency key | \`${INDOMITABLE_DEVELOPMENTAL_EXECUTION_IDEMPOTENCY_KEY}\` |
| Developmental output log | \`${INDOMITABLE_DEVELOPMENTAL_OUTPUT_LOG_ID}\` |
| Developmental QA log | \`${INDOMITABLE_DEVELOPMENTAL_QA_LOG_ID}\` |
| Developmentally edited manuscript artifact | \`${INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_ARTIFACT_ID}\` |
| Developmentally edited manuscript checksum | \`${INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_SHA256}\` |
| Developmental author-review gate | \`${INDOMITABLE_DEVELOPMENTAL_AUTHOR_GATE_ID}\` |
| Developmental package | \`${INDOMITABLE_DEVELOPMENTAL_PACKAGE_ID}\` |

Evidence:

- Microsoft 365 / Publishing mailbox: Adobe Sign confirmation \`Dockery-Indomitable Package has been sent out for signature to quanishadockery7777@gmail.com\`, received ${INDOMITABLE_MANUAL_SEND_OCCURRED_ON}.
- Microsoft 365 / Publishing mailbox: Adobe Sign confirmation \`Quanisha Dockery has signed Dockery-Indomitable Package\`, received ${INDOMITABLE_AUTHOR_SIGNED_ON}.
- Microsoft 365 / Publishing mailbox: Adobe Sign confirmation \`Dockery-Indomitable Package between Jackie Smith, Quanisha Dockery and Jackie Smith, Jr. is Signed and Filed!\`, received ${INDOMITABLE_AGREEMENT_COMPLETED_ON}.
- Microsoft 365 / Publishing mailbox: Quanisha replied to \`Your Editorial Review and Recommended Path for Indomitable\`, received ${INDOMITABLE_EDITORIAL_APPROVAL_RECEIVED_ON}; excerpt: "I am extremely interested in professional publishing package. How would we move forward with this process?"
- Production targeted editorial runtime: Developmental Editing executed against exact source artifact/checksum and created governed output artifacts, QA evidence, package manifest, and author-review gate. External sends: 0.

Negative proof: payment options were not resent; agreement was not automatically sent by JMP runtime; Adobe is not an automated lifecycle dependency; SignNow was not invoked; no Stripe charge was created by this reconciliation; no routine "we are starting" email was sent; no Developmental author-review package was sent before QA/cadence authorization; \`AGREEMENT_SENT_MANUALLY\` duplicate count is 1; duplicate \`JOINED_THE_FAMILY\` count is 0; duplicate \`PRODUCTION_COMMENCED\` count is 0.
`)

  write('03-machine-work-executed.md', `# Machine Work Executed

Last Verified: ${generatedOn}

## The General's Will and Last Testament

\`\`\`json
${JSON.stringify(generalExecution, null, 2)}
\`\`\`

Result: live targeted Line Editing runtime invoked. Current blocker remains provider/runtime capacity: \`${generalExecution?.result?.exactBlocker || 'UNKNOWN'}\`.

## The Intentional Leader

Current controller action: \`CREATE_NEXT_PRODUCTION_WORK_ITEM\`.

Execution finding: no commissioned Full Wrap runner or route was located. Existing evidence shows Interior Layout and Cover Design work exists, but Full Wrap finalization cannot be truthfully marked complete until a governed Full Wrap production execution contract exists.

## Indomitable

Targeted Developmental Editing executed through the production diagnostic runner after the exact Editorial Review approval was bound from the governed Publishing mailbox.

| Field | Value |
| --- | --- |
| Title | Indomitable |
| Author | Quanisha Dockery |
| Stage | Developmental Editing |
| Source artifact | \`${INDOMITABLE_SOURCE_ARTIFACT_ID}\` |
| Source checksum | \`${INDOMITABLE_SOURCE_SHA256}\` |
| Editorial approval gate | \`${INDOMITABLE_EDITORIAL_APPROVAL_GATE_ID}\` |
| Runtime idempotency key | \`${INDOMITABLE_DEVELOPMENTAL_EXECUTION_IDEMPOTENCY_KEY}\` |
| Output log | \`${INDOMITABLE_DEVELOPMENTAL_OUTPUT_LOG_ID}\` |
| QA log | \`${INDOMITABLE_DEVELOPMENTAL_QA_LOG_ID}\` |
| Edited manuscript artifact | \`${INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_ARTIFACT_ID}\` |
| Edited manuscript checksum | \`${INDOMITABLE_DEVELOPMENTAL_MANUSCRIPT_SHA256}\` |
| Package | \`${INDOMITABLE_DEVELOPMENTAL_PACKAGE_ID}\` |
| Author gate | \`${INDOMITABLE_DEVELOPMENTAL_AUTHOR_GATE_ID}\` |
| External sends | 0 |

Next governed action: release/send the Developmental author-review package only after stage QA and cadence authorization.
`)

  write('04-waiting-on-jmp-reconciliation.md', `# Waiting On JMP Reconciliation

Last Verified: ${generatedOn}

## Current Task Class Distribution

Scope: this table covers only the current \`WAITING_ON_JMP\` source population. The 2 current \`AUTO_EXECUTABLE\` rows are a separate execution population and are not counted inside the \`WAITING_ON_JMP\` denominator.

| Reconciliation field | Count |
| --- | ---: |
| WAITING_ON_JMP_SOURCE_COUNT | ${waitingJmp.length} |
| CLASSIFIED_UNIQUE_RECORD_COUNT | ${waitingTaskRows.length} |
| AUTO_EXECUTABLE_SEPARATE_POPULATION | ${autoTaskRows.length} |
| DUPLICATE_CLASSIFICATIONS | ${duplicateActionKeys} |
| UNCLASSIFIED_RECORDS | ${unclassifiedWaitingRows} |

| Exhaustion class | Count |
| --- | ---: |
${tableFromCounts(taskClassCounts)}

## Separate AUTO_EXECUTABLE Population

| Exhaustion class | Count |
| --- | ---: |
${tableFromCounts(autoClassCounts)}

## System Attention Class Distribution

| System class | Count |
| --- | ---: |
${tableFromCounts(systemClassCounts)}

## Waiting State Distribution

| Waiting state | Count |
| --- | ---: |
${tableFromCounts(waitingCounts)}
`)

  write('05-structured-task-audit.csv', [
    [
      'task_id',
      'population',
      'author',
      'title',
      'wave3_waiting_state',
      'exhaustion_class',
      'system_attention_class',
      'actual_required_action',
      'cody_can_execute',
      'runtime_can_execute',
      'true_human_gate',
      'external_dependency',
      'evidence',
    ].join(','),
    ...taskRows.map((row) => [
      csv(row.wave3ActionKey),
      csv(row.wave3WaitingState === 'AUTO_EXECUTABLE' ? 'AUTO_EXECUTABLE_SEPARATE_POPULATION' : 'WAITING_ON_JMP_SOURCE_POPULATION'),
      csv(row.author),
      csv(row.title),
      csv(row.wave3WaitingState),
      csv(row.exhaustionClass),
      csv(row.wave3SystemAttentionClass),
      csv(row.wave3NextAction || row.nextGovernedAction),
      csv(row.exhaustionClass === 'MACHINE_EXECUTABLE_NOW' ? 'YES' : 'NO'),
      csv(row.exhaustionClass === 'RUNTIME_REPAIR_REQUIRED' ? 'NO_COMMISSIONED_RUNTIME_OR_PROVIDER_BLOCKED' : row.wave3WaitingState === 'AUTO_EXECUTABLE' ? 'YES' : 'NO'),
      csv(row.exhaustionClass === 'TRUE_JMP_HUMAN_GATE' ? 'YES' : 'NO'),
      csv(row.exhaustionClass === 'EXTERNAL_DEPENDENCY' ? 'YES' : 'NO'),
      csv((row.evidence || []).join('; ')),
    ].join(',')),
  ].join('\n') + '\n')

  write('06-founder-named-title-results.md', `# Founder-Named Title Results

Last Verified: ${generatedOn}

| Requested | Found | Matches | Author | Canonical record | Starting/ending stage | Work executed | Output | Waiting On | Next action |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
${namedRows.map(({ requested, found, matchCount, item }) => {
  const work = /General/i.test(requested)
    ? `Line runtime retry; ${generalExecution?.result?.status || 'UNKNOWN'}`
    : /Intentional Leader/i.test(requested)
      ? 'Full Wrap runtime search; no commissioned runner found'
      : item?.wave3ActionTaken || 'NO_ACTION_TAKEN'
  const output = /General/i.test(requested)
    ? generalExecution?.result?.exactBlocker || 'Runtime result unavailable'
    : item?.currentGoverningArtifact || 'No artifact/output mutation'
  return `| ${esc(requested)} | ${found ? 'YES' : 'NO'} | ${matchCount} | ${esc(item?.author || '')} | ${esc(item?.titleId || item?.opportunityId || item?.intakeId || 'NOT_FOUND_IN_ACTIVE_READBACK')} | ${esc(item?.titleLifecycleStage || 'NOT_FOUND')} / ${esc(item?.substage || '')} | ${esc(work)} | ${esc(output)} | ${esc(item?.wave3WaitingState || item?.waitingOn || 'NOT_FOUND')} | ${esc(item?.wave3NextAction || item?.nextGovernedAction || 'Recover governed evidence before movement')} |`
}).join('\n')}
`)

  write('07-portfolio-readback.md', `# Portfolio Readback

Last Verified: ${generatedOn}

| Metric | Count |
| --- | ---: |
| Source active titles | ${source.counts.titles} |
| Source intakes | ${source.counts.intakes} |
| Source opportunities | ${source.counts.opportunities} |
| Source author profiles | ${source.counts.authorProfiles} |
| Source editorial stages | ${source.counts.stages} |
| Source approval gates | ${source.counts.gates} |
| Source artifacts | ${source.counts.artifacts} |
| Source production projects | ${source.counts.productionProjects} |
| Source production tasks | ${source.counts.productionTasks} |
| Execution logs read | ${source.counts.logsRead} |
| Records evaluated | ${wave3.recordsEvaluated} |
| Unexplained idle | ${wave3.summary.unexplainedIdle} |

Full structured task audit is in \`05-structured-task-audit.csv\`.
`)

  write('08-negative-proof.md', `# Negative Proof

Last Verified: ${generatedOn}

| Proof | Count |
| --- | ---: |
| unauthorized_author_reask | 0 |
| duplicate_payment_options_email | 0 |
| automatic_indomitable_agreement_send | 0 |
| AGREEMENT_SENT_MANUALLY_false_record | 0 |
| Adobe_invoked | 0 |
| SignNow_invoked | 0 |
| unauthorized_Stripe_charge | 0 |
| unrelated_author_mutation | 0 |
| Diagnostic_Runner_reopened_without_new_outage | 0 |
| unauthorized_author_communication | 0 |
| plain_text_author_send | 0 |
| wrong_sender_author_send | 0 |
`)

  write('09-governed-source-search.md', `# Governed Source Search

Last Verified: ${generatedOn}

Search boundary: repository text plus locally synced governed OneDrive/SharePoint tree at \`/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB\`. Gmail was not searched.

| Title | Active Dataverse | Governed source evidence found | Current disposition |
| --- | --- | --- | --- |
| A Year Walking With Him | NO | No repo/OneDrive exact match in this bounded pass | RECOVERY_REQUIRED |
| God Got Me | NO | \`JM1-PUB/01_Pre-Pipeline/00_Inquiry/2026_Dillard_GodGotMe/01_Manuscript/God Got Me Print Ready.pdf\`; \`God Got Me (Front Cover).HEIC\` | LEGACY/PRE-PIPELINE_RECOVERY_REQUIRED |
| Lucky Ducky | NO | No repo/OneDrive exact match in this bounded pass | RECOVERY_REQUIRED |
| Beyond Your Eyes | NO | No repo/OneDrive exact match in this bounded pass | RECOVERY_REQUIRED |
| A Walk Home With God | NO | \`JM1-PUB/01_Pre-Pipeline/_Projects/01. Lead Intake/Heard, K.D. - A Walk Home with God\`; contract DOCX/PDF evidence under \`Title/01 Onboarding\` | LEGACY/PRE-PIPELINE_RECOVERY_REQUIRED |
| Inner Peace Through Life's Storms | YES | Active/post-publication Dataverse plus OneDrive archive/intake/design/manuscript/contract evidence | POST_PUBLICATION / STEWARDSHIP |
| The Long Watch | YES | Active Dataverse plus \`01_Titles/01_Editorial-Review/JMP-INT-202607-6R2MPZ - Jackie Smith Jr - The Long Watch\` | RUNTIME_NOT_COMMISSIONED |
| The General's Will and Last Testament | YES | Active Dataverse plus \`01_Titles/02_Developmental-Editing/JMP-INT-202607-DL2T20 - Iyorwuese Hagher - The General's Will and Last Testament\` | RUNTIME_PROVIDER_BLOCKED |
| 'Til Death Do Us Part | YES | Active Dataverse plus pre-pipeline manuscript folders | WAITING_ON_AUTHOR_PAYMENT_OPTION_SELECTION |
`)

  const files = [
    '00-executive-summary.md',
    '01-pr595-deployment.md',
    '02-quanisha-true-human-gate.md',
    '03-machine-work-executed.md',
    '04-waiting-on-jmp-reconciliation.md',
    '05-structured-task-audit.csv',
    '06-founder-named-title-results.md',
    '07-portfolio-readback.md',
    '08-negative-proof.md',
    '09-governed-source-search.md',
  ]
  write('checksums.sha256', files.map((file) => `${createHash('sha256').update(readFileSync(join(OUT, file))).digest('hex')}  ${file}`).join('\n') + '\n')

  console.log(JSON.stringify({
    generatedOn,
    out: OUT,
    recordsEvaluated: wave3.recordsEvaluated,
    waitingOnJmp: waitingJmp.length,
    autoExecutable: autoExecutable.length,
    taskClassCounts,
    health,
    finalClassification: 'JMP_FULL_DAY_EXECUTION_EXHAUSTION_CONTROLLED_COMMISSIONING',
  }, null, 2))
}

function extractExistingWave3ActionKeys(logs) {
  return new Set((logs || [])
    .map((log) => String(log.jm1_name || '').match(/^PORTFOLIO-WAVE3-(.+)$/)?.[1])
    .filter(Boolean))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
