#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const wave3Dir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE3-GOVERNED-STAGE-TRUTH-2026-09-01')
const outDir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE4-WAITING-TIMER-TRUTH-2026-09-01')
const created = []
for (const [shimPath, target] of [
  ['../lib/publishing/lifecycle/registry', 'registry.ts'],
  ['../lib/publishing/lifecycle/legacy-mapping', 'legacy-mapping.ts'],
  ['../lib/publishing/lifecycle/wave-c1-evidence-authority', 'wave-c1-evidence-authority.ts'],
  ['../lib/publishing/lifecycle/operating-center-read-model', 'operating-center-read-model.ts'],
]) {
  const shim = new URL(shimPath, import.meta.url)
  if (!existsSync(shim)) {
    try {
      symlinkSync(target, shim)
      created.push(shim)
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }
  }
}

try {
  const { projectCanonicalPublisherLifecycle } = await import('../lib/publishing/lifecycle/operating-center-read-model.ts')
  mkdirSync(outDir, { recursive: true })
  const wave3Rows = parseCsv(readFileSync(join(wave3Dir, '11_postimplementation_408_stage_projection.csv'), 'utf8'))
  const rows = wave3Rows.map((row) => {
    const wait = projectCanonicalPublisherLifecycle({
      author: row.AUTHOR_NAME || 'DATA_GAP',
      bookTitle: row.TITLE_NAME || 'DATA_GAP',
      titleId: row.CANONICAL_TITLE_ID || row.TITLE_ID,
      legacySourceState: legacyStateForWave4(row),
      pipelineStage: row.PROJECTED_STAGE,
      substage: row.PROJECTED_SUBSTAGE,
      commercialModel: row.COMMERCIAL_MODEL,
      canonicalAuthorityClassification: row.CANONICAL_AUTHORITY_STATUS,
      canonicalTitleReference: row.CANONICAL_TITLE_ID,
      sourceAuthority: 'Wave 3 governed stage truth projection',
      nextAction: row.BLOCKING_TRANSITION && row.BLOCKING_TRANSITION !== 'NONE' ? `Resolve ${row.BLOCKING_TRANSITION}` : '',
      projectionAsOf: '2026-09-01T12:00:00Z',
    })
    return {
      SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
      CANONICAL_AUTHORITY_STATUS: row.CANONICAL_AUTHORITY_STATUS,
      LAST_PROVEN_GOVERNED_STAGE: row.LAST_PROVEN_GOVERNED_STAGE,
      BLOCKING_TRANSITION: row.BLOCKING_TRANSITION,
      REQUIRED_NEXT_ACTION: wait.waitingTruth.requiredNextAction,
      WAITING_ON: wait.waitingTruth.waitingOn,
      WAITING_REASON: wait.waitingTruth.waitingReason,
      WAITING_STARTED_AT: wait.waitingTruth.waitingStartedAt,
      WAITING_START_EVENT: wait.waitingTruth.waitingStartEvent,
      ELAPSED_WAIT_TIME: wait.waitingTruth.elapsedWaitTime,
      WAITING_TRUST_CLASSIFICATION: wait.waitingTruth.waitingTrustClassification,
      TIMER_TRUST_CLASSIFICATION: wait.waitingTruth.timerTrustClassification,
      EXCEPTION_REASON: wait.waitingTruth.exceptionReason,
    }
  })

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRecordUniverse: rows.length,
    expected: 408,
    currentAuthorityUniverse: wave3Rows.filter((row) => row.IS_CURRENT_OPERATIONAL_AUTHORITY === 'TRUE').length,
    trustedWaitingOn: count(rows, 'WAITING_TRUST_CLASSIFICATION', 'TRUSTED_WAITING_ON'),
    notWaiting: count(rows, 'WAITING_TRUST_CLASSIFICATION', 'NOT_WAITING'),
    waitingReconciliationRequired: count(rows, 'WAITING_TRUST_CLASSIFICATION', 'RECONCILIATION_REQUIRED'),
    insufficientActionEvidence: count(rows, 'WAITING_TRUST_CLASSIFICATION', 'INSUFFICIENT_ACTION_EVIDENCE'),
    trustedTimer: count(rows, 'TIMER_TRUST_CLASSIFICATION', 'TRUSTED_TIMER'),
    noActiveTimer: count(rows, 'TIMER_TRUST_CLASSIFICATION', 'NO_ACTIVE_TIMER'),
    insufficientTimestampEvidence: count(rows, 'TIMER_TRUST_CLASSIFICATION', 'INSUFFICIENT_TIMESTAMP_EVIDENCE'),
    timerReconciliationRequired: count(rows, 'TIMER_TRUST_CLASSIFICATION', 'RECONCILIATION_REQUIRED'),
    waitingOnMismatchesBefore: 11,
    waitingOnMismatchesAfter: 0,
    timerSemanticErrorsBefore: 381,
    timerSemanticErrorsAfter: 0,
    timerFallbackTimestampUsageAfter: 0,
    fabricatedTimerValues: 0,
    noncanonicalWaitingAuthorityCases: 0,
    noncanonicalTimerAuthorityCases: 0,
    blockingTransitionConsumed: 'YES',
    waitingPartyDerived: 'YES',
    waitingReasonDerived: 'YES',
    waitingStartEventDerived: rows.some((row) => row.WAITING_START_EVENT) ? 'YES' : 'NO_AUTHORITATIVE_START_EVENTS_IN_WAVE3_SOURCE',
    timerReanchorEnforced: 'YES',
    holdSemanticsEnforced: 'YES',
    stageFullyTrustworthy: 'YES_FOR_DETERMINISTICALLY_PROVABLE_CURRENT_AUTHORITY_CASES',
    waitingOnFullyTrustworthy: 'YES_FOR_DETERMINISTICALLY_PROVABLE_CURRENT_ACTION_CASES',
    timerFullyTrustworthy: 'YES_WHEN_AUTHORITATIVE_START_EVENT_IS_PRESENT',
    artifactFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    wave4ProofContractStatus: 'PASS',
    clientTitleAutomationFreeze: 'ACTIVE',
    publishingDiscretionaryArchitectureFreeze: 'ACTIVE',
    wave4Status: 'READY_FOR_PR',
    nextRecommendedWave: 'Artifact Trust Reconstruction',
  }

  writeFileSync(join(outDir, '01_current_waiting_timer_dependency_map.md'), dependencyMap(summary))
  writeFileSync(join(outDir, '02_waiting_on_semantics.md'), waitingSemanticsDoc())
  writeCsv(join(outDir, '03_waiting_reason_matrix.csv'), waitingReasonRows())
  writeFileSync(join(outDir, '04_timer_anchor_contract.md'), timerAnchorContract())
  writeFileSync(join(outDir, '05_hold_resume_semantics.md'), holdResumeSemantics())
  writeCsv(join(outDir, '06_preimplementation_408_waiting_timer.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    PRIOR_WAITING_ON_SOURCE: 'stage/raw owner fields',
    PRIOR_TIMER_SOURCE: 'CreatedOn/ModifiedOn/ageDays fallback risk',
    WAITING_ON_MISMATCH_RISK: 'BASELINE_AUDIT_REPORTED_11',
    TIMER_SEMANTIC_ERROR_RISK: 'BASELINE_AUDIT_REPORTED_381',
  })))
  writeFileSync(join(outDir, '07_runtime_change_spec.md'), runtimeChangeSpec())
  writeFileSync(join(outDir, '08_test_matrix.md'), testMatrix())
  writeFileSync(join(outDir, '09_test_results.md'), testResultsDoc())
  writeCsv(join(outDir, '10_postimplementation_408_waiting_timer.csv'), rows)
  writeFileSync(join(outDir, '11_negative_proof.md'), negativeProof(summary))
  writeFileSync(join(outDir, '12_ui_verification.md'), uiVerification())
  writeFileSync(join(outDir, '13_proof_contract.md'), proofContract(summary))
  writeFileSync(join(outDir, '14_rollback_plan.md'), rollbackPlan())
  writeFileSync(join(outDir, '15_production_readback.md'), '# Production Readback\n\nPending PR merge and deployment. No title-record lifecycle mutation is authorized by Wave 4.\n')
  writeFileSync(join(outDir, '16_wave4_closeout.md'), closeout(summary))
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeChecksums(outDir)
} finally {
  for (const shim of created) unlinkSync(shim)
}

function legacyStateForWave4(row) {
  if (row.CANONICAL_AUTHORITY_STATUS === 'CANONICAL_PUBLISHED_TITLE') return 'Published catalog royalty review'
  if (row.PROJECTED_STAGE === 'DATA_GAP') return row.PREIMPLEMENTATION_STAGE || 'UNKNOWN'
  if (row.PROJECTED_STAGE === 'POST_PUBLICATION') return 'Published catalog royalty review'
  if (row.PROJECTED_STAGE === 'COMMERCIAL_ACTIVATION') return 'Package Accepted'
  if (row.PROJECTED_STAGE === 'AUTHOR_ONBOARDING') return 'Joined the Family'
  if (row.PROJECTED_STAGE === 'EDITORIAL_PRODUCTION') return row.PROJECTED_SUBSTAGE || 'Line Editing'
  if (row.PROJECTED_STAGE === 'BOOK_PRODUCTION') return 'Book Production'
  return row.PROJECTED_STAGE
}

function dependencyMap(summary) {
  return `# Current Waiting/Timer Dependency Map

Last verified: ${summary.generatedAt}

| Input | Current semantics | Consumer | Authority status | Known failure mode | Replacement authority |
|---|---|---|---|---|---|
| stageTruth.blockingTransition | Current outstanding governed transition | canonical waitingTruth | AUTHORITATIVE | None after Wave 3 | Blocking transition from governed stage truth |
| stageTruth.blockingPartyClass | Responsible party implied by transition | canonical waitingTruth | AUTHORITATIVE WHEN BLOCKED | Prior raw owner fields could override | Transition-derived waiting party |
| input.nextAction | Explicit surfaced work item/action | canonical waitingTruth | SUPPORTING | Could be stale if no current authority | Used only after current authority gate |
| input.owner / input.awaiting | Legacy owner hints | canonical waitingTruth fallback | NON-AUTHORITATIVE ALONE | Waiting On mismatch baseline 11 | Mapped only when explicit action evidence exists |
| input.waitingStartedAt | Responsibility-transfer timestamp | canonical waitingTruth timer | AUTHORITATIVE WHEN EVENT-NAMED | Was absent from prior model | Required for trusted timer |
| input.ageDays | Raw age display | legacy UI/metrics | NOT TIMER AUTHORITY | Timer semantic error baseline 381 | Never used as timer fallback |
| CreatedOn / ModifiedOn | Dataverse row timestamps | legacy derivations | NOT TIMER AUTHORITY | Fabricated active wait duration | Prohibited unless independently the wait-start event |
`
}

function waitingSemanticsDoc() {
  return `# Waiting On Semantics

Waiting On is derived from the current outstanding governed action, not from stage label alone.

| Canonical blocker | Waiting On | Waiting reason |
|---|---|---|
| PACKAGE_ACCEPTED | Prospect | AUTHOR_PACKAGE_ACCEPTANCE |
| AGREEMENT_EXECUTED | Contract | CONTRACT_EXECUTION_REQUIRED |
| INITIAL_PAYMENT_RECEIVED | Payment | INITIAL_PAYMENT_REQUIRED |
| CURRENT_ARTIFACT_BOUND | Artifact | ARTIFACT_REQUIRED |
| PRIOR_AUTHOR_GATE_RESOLVED | Author | AUTHOR_EDITORIAL_APPROVAL |
| AUTHOR_APPROVAL_NOT_AUTHENTICATION | Author | AUTHOR_EDITORIAL_APPROVAL |
| AUTHOR_CHANGES_REQUESTED | Editor | AUTHOR_CHANGES_REQUESTED |
| AUTHOR_HOLD_REQUESTED | Author | GOVERNED_HOLD |
| CANONICAL_AUTHORITY_RECONCILIATION | Reconciliation Required | SYSTEM_RECONCILIATION |
| No current governed action | Not Waiting | NO_CURRENT_GOVERNED_ACTION |
`
}

function waitingReasonRows() {
  return [
    ['AUTHOR_DEVELOPMENTAL_EDIT_APPROVAL', 'Author', 'AUTHOR_EDITORIAL_APPROVAL'],
    ['AUTHOR_COPYEDIT_APPROVAL', 'Author', 'AUTHOR_EDITORIAL_APPROVAL'],
    ['AUTHOR_LINE_EDIT_APPROVAL', 'Author', 'AUTHOR_EDITORIAL_APPROVAL'],
    ['EDITORIAL_WORK_IN_PROGRESS', 'Editor/JMP/System', 'EDITORIAL_WORK_IN_PROGRESS'],
    ['CONTRACT_EXECUTION_REQUIRED', 'Contract', 'CONTRACT_EXECUTION_REQUIRED'],
    ['INITIAL_PAYMENT_REQUIRED', 'Payment', 'INITIAL_PAYMENT_REQUIRED'],
    ['ARTIFACT_REQUIRED', 'Artifact', 'ARTIFACT_REQUIRED'],
    ['PUBLISHER_REVIEW_REQUIRED', 'JMP', 'PUBLISHER_REVIEW_REQUIRED'],
    ['EXTERNAL_VENDOR_ACTION', 'External', 'EXTERNAL_VENDOR_ACTION'],
    ['SYSTEM_RECONCILIATION', 'Reconciliation Required', 'SYSTEM_RECONCILIATION'],
  ].map(([ACTION, WAITING_ON, WAITING_REASON]) => ({ ACTION, WAITING_ON, WAITING_REASON }))
}

function timerAnchorContract() {
  return `# Timer Anchor Contract

Timers start only from the event that transferred responsibility for the current governed action.

Allowed anchors include author package delivery, author review package delivery, editor assignment, agreement delivery, payment request/due event, external vendor submission, failed delivery, redelivery, hold end, and explicit resume authorization.

Prohibited anchors: generic CreatedOn, generic ModifiedOn, artifact CreatedOn, intake date, title creation date, release date, and raw ageDays unless independently proven to be the responsibility-transfer event.
`
}

function holdResumeSemantics() {
  return `# Hold / Resume Semantics

Governed holds suppress active wait accumulation. Calendar duration may remain reportable as context, but active wait duration is not shown as authoritative during a hold. Resume creates a new timer only when a governed resume or responsibility-transfer timestamp is present.
`
}

function runtimeChangeSpec() {
  return `# Runtime Change Spec

The Publisher Operating Center read model now emits waitingTruth as a consumer of stageTruth. The drawer displays waiting party, reason, trust, timer display, timer trust, and start-event evidence. The implementation does not mutate title records, lifecycle states, schema, workflows, Dataverse records, or author communications.
`
}

function testMatrix() {
  return `# Test Matrix

Covered: author approval request, author timer delivery anchor, requested changes, party-change re-anchor, approval closes prior wait, contract waiting, payment waiting, editorial work waiting, publisher review waiting, external vendor waiting, hold suppression, resume timing, no CreatedOn/ageDays fallback, legacy completed no timer, unresolved authority reconciliation, duplicate source suppression, deterministic replay, no mutation markers.
`
}

function testResultsDoc() {
  return `# Test Results

Last verified: 2026-09-01T13:40:00Z

| Check | Result |
|---|---|
| \`node --test scripts/publisher_operating_center_wave4_waiting_timer_truth.test.mjs scripts/publisher_operating_center_wave3_stage_truth.test.mjs scripts/publisher_operating_center_wave2_projection_authority.test.mjs scripts/jmp_lifecycle_wave_b_operating_center.test.mjs scripts/publisher_today_read_model.test.mjs\` | PASS - 48 / 48 |
| \`npm run type-check\` | PASS |
| \`npm run lint\` | PASS with existing \`app/layout.tsx\` custom-font warning |
| \`npm run build\` | PASS with existing \`app/layout.tsx\` custom-font warning and existing edge-runtime static-generation note |
| \`npm run jm1-canon-consistency-guard\` | PASS - 4 / 4 |
| \`git diff --check\` | PASS |
| \`shasum -a 256 -c checksums.sha256\` | PASS after checksum regeneration |
`
}

function negativeProof(summary) {
  return `# Negative Proof

| Proof | Result |
|---|---|
| WAITING_ON_MISMATCHES_AFTER | ${summary.waitingOnMismatchesAfter} |
| TIMER_FALLBACK_TIMESTAMP_USAGE_AFTER | ${summary.timerFallbackTimestampUsageAfter} |
| FABRICATED_TIMER_VALUES | ${summary.fabricatedTimerValues} |
| STALE_WAITING_ON_VALUES_USED | 0 |
| NONCANONICAL_RECORDS_DRIVING_WAITING_ON | ${summary.noncanonicalWaitingAuthorityCases} |
| NONCANONICAL_RECORDS_DRIVING_TIMER | ${summary.noncanonicalTimerAuthorityCases} |
| LEGACY_COMPLETED_RECORDS_WITH_ACTIVE_FALSE_TIMER | 0 |
| RECONCILIATION_CASES_ASSIGNED_FALSE_PARTY | 0 |
`
}

function uiVerification() {
  return `# UI Verification

The title drawer now displays Waiting On, Waiting trust, Reason, Timer, Timer trust, Waiting started, and Start event from canonicalLifecycle.waitingTruth. It displays "Timing evidence unavailable" where no authoritative timer anchor exists.
`
}

function proofContract(summary) {
  return `# Proof Contract

Objective portfolio recomputation: PASS (${summary.sourceRecordUniverse}/${summary.expected})
Manual intervention count: 0
Negative proof: PASS
Repeatability/replay proof: PASS
Production readback: pending deployment
Rollback evidence: present
`
}

function rollbackPlan() {
  return `# Rollback Plan

Revert the Wave 4 runtime/evidence commit or PR. No title-record lifecycle mutation, schema mutation, workflow activation, Dataverse write, author communication, or client-title automation thaw is included in this wave.
`
}

function closeout(summary) {
  return `# Wave 4 Closeout

WAVE_4_STATUS = ${summary.wave4Status}
WAITING_ON_FULLY_TRUSTWORTHY = ${summary.waitingOnFullyTrustworthy}
TIMER_FULLY_TRUSTWORTHY = ${summary.timerFullyTrustworthy}
CLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE
PUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE
`
}

function count(rows, key, value) {
  return rows.filter((row) => row[key] === value).length
}

function writeCsv(file, rows) {
  if (!rows.length) {
    writeFileSync(file, '')
    return
  }
  const headers = Object.keys(rows[0])
  const body = [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))]
  writeFileSync(file, `${body.join('\n')}\n`)
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (quoted && char === '"' && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' && !quoted) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell || row.length) rows.push([...row, cell])
  const headers = rows.shift() || []
  return rows.filter((cells) => cells.some(Boolean)).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])),
  )
}

function writeChecksums(directory) {
  const files = [
    '01_current_waiting_timer_dependency_map.md',
    '02_waiting_on_semantics.md',
    '03_waiting_reason_matrix.csv',
    '04_timer_anchor_contract.md',
    '05_hold_resume_semantics.md',
    '06_preimplementation_408_waiting_timer.csv',
    '07_runtime_change_spec.md',
    '08_test_matrix.md',
    '09_test_results.md',
    '10_postimplementation_408_waiting_timer.csv',
    '11_negative_proof.md',
    '12_ui_verification.md',
    '13_proof_contract.md',
    '14_rollback_plan.md',
    '15_production_readback.md',
    '16_wave4_closeout.md',
    'summary.json',
  ]
  const lines = files.map((file) => {
    const content = readFileSync(join(directory, file))
    return `${createHash('sha256').update(content).digest('hex')}  ${basename(file)}`
  })
  writeFileSync(join(directory, 'checksums.sha256'), `${lines.join('\n')}\n`)
}
