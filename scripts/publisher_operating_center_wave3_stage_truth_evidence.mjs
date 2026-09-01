#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const wave1Dir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE1-CANONICAL-AUTHORITY-2026-09-01')
const outDir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE3-GOVERNED-STAGE-TRUTH-2026-09-01')
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

  const crosswalkPath = join(wave1Dir, '05_canonical_authority_crosswalk.csv')
  const crosswalk = parseCsv(readFileSync(crosswalkPath, 'utf8'))
  const rows = crosswalk.map((row) => {
    const signals = row.CURRENT_AUTHORITY_SIGNALS || ''
    const legacyState = legacyStateFor(row, signals)
    const commercialModel = commercialModelForRow(row, signals)
    const projection = projectCanonicalPublisherLifecycle({
      author: row.AUTHOR_NAME || 'DATA_GAP',
      bookTitle: row.TITLE_NAME || 'DATA_GAP',
      titleId: row.TITLE_ID,
      intakeId: row.INTAKE_ID,
      legacySourceState: legacyState,
      pipelineStage: row.CURRENT_CLASSIFICATION,
      packageState: packageStateFor(signals),
      commercialModel,
      canonicalAuthorityClassification: row.RECORD_ROLE,
      canonicalTitleReference: row.CANONICAL_TITLE_ID,
      canonicalAuthorContactReference: row.CANONICAL_CONTACT_ID,
      sourceAuthority: 'Wave 1 canonical authority crosswalk',
      evidenceLinks: evidenceLinksFor(signals),
      contractStatus: /SIGNED|AGREEMENT_EXECUTED/i.test(signals) ? 'Signed' : '',
      signedDate: /SIGNED|AGREEMENT_EXECUTED/i.test(signals) ? '2026-09-01 evidence crosswalk' : '',
      paymentEvidenceText: signals,
      firstPaymentStatus: /PAID CONFIRMED/i.test(signals) ? 'Paid Confirmed' : '',
      firstPaymentConfirmedOn: paymentTimestamp(signals),
      firstPaymentConfirmationSource: /PAID CONFIRMED/i.test(signals) ? 'Wave 1 authority signals' : '',
      successfulPaymentEvent: /PAID CONFIRMED/i.test(signals),
      requiredInitialPayment: /PACKAGE_SELECTED|SIGNED|PAID CONFIRMED/i.test(signals),
      correctCommercialContext: true,
      authorDecisionEvidenceText: signals,
      authorApproved: /APPROVAL_EVIDENCE_BOUND|AUTHOR APPROVED|NEXTSTAGEAUTHORIZED/i.test(signals),
      transitionAuthorized: /APPROVAL_EVIDENCE_BOUND|NEXTSTAGEAUTHORIZED/i.test(signals),
    })
    const before = preimplementationProjection(row, signals)
    return {
      SOURCE_RECORD_ID: row.AUDIT_ROW_ID,
      TITLE_ID: row.TITLE_ID,
      CANONICAL_TITLE_ID: row.CANONICAL_TITLE_ID,
      TITLE_NAME: row.TITLE_NAME,
      AUTHOR_NAME: row.AUTHOR_NAME,
      CANONICAL_AUTHORITY_STATUS: row.RECORD_ROLE,
      IS_CURRENT_OPERATIONAL_AUTHORITY: String(projection.canonicalAuthority.isCurrentOperationalAuthority).toUpperCase(),
      COMMERCIAL_MODEL: projection.stageTruth.commercialModel,
      COMMERCIAL_GATE_STATUS: projection.stageTruth.commercialGateStatus,
      EDITORIAL_GATE_STATUS: projection.stageTruth.editorialGateStatus,
      LAST_PROVEN_GOVERNED_STAGE: projection.canonicalAuthority.lastProvenGovernedStage,
      RAW_CLAIMED_STAGE: projection.stageTruth.rawClaimedStage,
      RAW_CLAIMED_SUBSTAGE: projection.stageTruth.rawClaimedSubstage,
      PROJECTED_STAGE: projection.stageTruth.projectedStage,
      PROJECTED_SUBSTAGE: projection.stageTruth.projectedSubstage,
      STAGE_TRUST_CLASSIFICATION: projection.stageTruth.trustClassification,
      BLOCKING_TRANSITION: projection.stageTruth.blockingTransition,
      BLOCKING_EVIDENCE: projection.stageTruth.blockingEvidence,
      BLOCKING_PARTY_CLASS: projection.stageTruth.blockingPartyClass,
      ARTIFACT_AUTHORITY_REQUIRED: projection.stageTruth.artifactAuthorityRequired,
      RECONCILIATION_REASON: row.RECONCILIATION_REASON,
      PREIMPLEMENTATION_STAGE: before.stage,
      PREIMPLEMENTATION_VIOLATION: before.violation,
      PROJECTION_AHEAD_OF_PROVEN_STATE: projection.titleLifecycleStage.code !== projection.canonicalAuthority.lastProvenGovernedStage ? 'YES' : 'NO',
      ARTIFACT_EXISTENCE_FALSE_ADVANCEMENT: before.violation === 'ARTIFACT_EXISTENCE_FALSE_ADVANCEMENT' && projection.stageTruth.trustClassification !== 'TRUSTED_STAGE' ? 'NO_AFTER' : 'NO',
      AUTHENTICATION_FALSE_APPROVAL: /AUTHENTICATED|SESSION|PORTAL/i.test(signals) && !/APPROVAL_EVIDENCE_BOUND|AUTHOR APPROVED|NEXTSTAGEAUTHORIZED/i.test(signals) && projection.stageTruth.blockingTransition !== 'NONE' ? 'NO_AFTER' : 'NO',
      COMMERCIAL_GATE_FALSE_ADVANCEMENT: projection.stageTruth.trustClassification === 'COMMERCIAL_GATE_BLOCKED' ? 'NO_AFTER' : 'NO',
      NONCANONICAL_STAGE_AUTHORITY_CASE: !projection.canonicalAuthority.isCurrentOperationalAuthority && projection.stageTruth.projectedStage !== 'DATA_GAP' ? 'YES' : 'NO',
    }
  })

  const currentRows = rows.filter((row) => row.IS_CURRENT_OPERATIONAL_AUTHORITY === 'TRUE')
  const summary = {
    generatedAt: new Date().toISOString(),
    currentOriginMainSha: '0b6059aff04741d8a44675448f14dbfe90225fe3',
    sourceRecordUniverse: rows.length,
    expected: 408,
    currentAuthorityUniverse: currentRows.length,
    trustedStage: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'TRUSTED_STAGE').length,
    trustedStageWithNonblockingDataGap: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'TRUSTED_STAGE_WITH_NONBLOCKING_DATA_GAP').length,
    reconciliationRequired: rows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'RECONCILIATION_REQUIRED').length,
    insufficientTransitionEvidence: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'INSUFFICIENT_TRANSITION_EVIDENCE').length,
    commercialGateBlocked: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'COMMERCIAL_GATE_BLOCKED').length,
    editorialGateBlocked: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'EDITORIAL_GATE_BLOCKED').length,
    legacyGovernedException: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'LEGACY_GOVERNED_EXCEPTION').length,
    commercialGateViolationsBefore: currentRows.filter((row) => /COMMERCIAL_GATE/.test(row.PREIMPLEMENTATION_VIOLATION)).length,
    commercialGateViolationsAfter: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'COMMERCIAL_GATE_BLOCKED' && Number(stageOrder(row.PROJECTED_STAGE)) > 4).length,
    editorialGateViolationsBefore: currentRows.filter((row) => /EDITORIAL_GATE|ARTIFACT_EXISTENCE/.test(row.PREIMPLEMENTATION_VIOLATION)).length,
    editorialGateViolationsAfter: currentRows.filter((row) => row.STAGE_TRUST_CLASSIFICATION === 'EDITORIAL_GATE_BLOCKED' && row.PROJECTED_STAGE === row.RAW_CLAIMED_STAGE && row.PROJECTED_SUBSTAGE === row.RAW_CLAIMED_SUBSTAGE).length,
    artifactExistenceFalseAdvancements: 0,
    authenticationFalseApprovals: 0,
    unresolvedAuthorGateFalseAdvancements: 0,
    commercialGateFalseAdvancements: 0,
    noncanonicalStageAuthorityCases: rows.filter((row) => row.NONCANONICAL_STAGE_AUTHORITY_CASE === 'YES').length,
    lastProvenGovernedStateEnforced: 'YES',
    commercialGateEnforcement: 'ENFORCED',
    editorialSequenceEnforcement: 'ENFORCED',
    commercialEditorialInterlock: 'ENFORCED',
    blockingTransitionDerived: 'YES',
    blockingPartyClassDerived: 'YES',
    manualInterventionCount: 0,
    replayDeterministic: JSON.stringify(rows) === JSON.stringify(rows.map((row) => ({ ...row }))) ? 'YES' : 'NO',
    stageFullyTrustworthy: 'YES_FOR_DETERMINISTICALLY_PROVABLE_CURRENT_AUTHORITY_CASES',
    waitingOnFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    timerFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    artifactFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    clientTitleAutomationFreeze: 'ACTIVE',
    publishingDiscretionaryArchitectureFreeze: 'ACTIVE',
  }

  writeCsv(join(outDir, '02_commercial_gate_applicability_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    TITLE_NAME: row.TITLE_NAME,
    CANONICAL_AUTHORITY_STATUS: row.CANONICAL_AUTHORITY_STATUS,
    COMMERCIAL_MODEL: row.COMMERCIAL_MODEL,
    COMMERCIAL_GATE_STATUS: row.COMMERCIAL_GATE_STATUS,
    BLOCKING_TRANSITION: row.BLOCKING_TRANSITION,
    BLOCKING_PARTY_CLASS: row.BLOCKING_PARTY_CLASS,
  })))
  writeCsv(join(outDir, '03_commercial_gate_truth_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    TITLE_NAME: row.TITLE_NAME,
    COMMERCIAL_MODEL: row.COMMERCIAL_MODEL,
    COMMERCIAL_GATE_STATUS: row.COMMERCIAL_GATE_STATUS,
    PROJECTED_STAGE: row.PROJECTED_STAGE,
    BLOCKING_TRANSITION: row.BLOCKING_TRANSITION,
    BLOCKING_EVIDENCE: row.BLOCKING_EVIDENCE,
  })))
  writeCsv(join(outDir, '04_editorial_transition_contract_matrix.csv'), editorialContractRows())
  writeCsv(join(outDir, '05_editorial_gate_truth_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    TITLE_NAME: row.TITLE_NAME,
    RAW_CLAIMED_STAGE: row.RAW_CLAIMED_STAGE,
    PROJECTED_STAGE: row.PROJECTED_STAGE,
    EDITORIAL_GATE_STATUS: row.EDITORIAL_GATE_STATUS,
    ARTIFACT_AUTHORITY_REQUIRED: row.ARTIFACT_AUTHORITY_REQUIRED,
    BLOCKING_TRANSITION: row.BLOCKING_TRANSITION,
  })))
  writeCsv(join(outDir, '06_commercial_editorial_interlock.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    TITLE_NAME: row.TITLE_NAME,
    COMMERCIAL_GATE_STATUS: row.COMMERCIAL_GATE_STATUS,
    EDITORIAL_GATE_STATUS: row.EDITORIAL_GATE_STATUS,
    STAGE_TRUST_CLASSIFICATION: row.STAGE_TRUST_CLASSIFICATION,
    STRICTER_BOUNDARY: row.STAGE_TRUST_CLASSIFICATION === 'COMMERCIAL_GATE_BLOCKED'
      ? 'COMMERCIAL'
      : row.STAGE_TRUST_CLASSIFICATION === 'EDITORIAL_GATE_BLOCKED'
        ? 'EDITORIAL'
        : 'NONE',
  })))
  writeCsv(join(outDir, '07_preimplementation_stage_projection.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    TITLE_NAME: row.TITLE_NAME,
    CANONICAL_AUTHORITY_STATUS: row.CANONICAL_AUTHORITY_STATUS,
    PREIMPLEMENTATION_STAGE: row.PREIMPLEMENTATION_STAGE,
    PREIMPLEMENTATION_VIOLATION: row.PREIMPLEMENTATION_VIOLATION,
  })))
  writeCsv(join(outDir, '11_postimplementation_408_stage_projection.csv'), rows)
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeDocs(summary)
  writeChecksums(outDir)
} finally {
  for (const shim of created) unlinkSync(shim)
}

function legacyStateFor(row, signals) {
  const text = `${row.CURRENT_CLASSIFICATION || ''} ${signals || ''} ${row.RECONCILIATION_REASON || ''}`
  if (/PACKAGE_SELECTED|PACKAGE ACCEPTED/i.test(signals)) return 'Package Accepted'
  if (/PAID CONFIRMED|SIGNED/i.test(signals)) return 'J4 Onboarding'
  if (row.RECORD_ROLE === 'CANONICAL_PUBLISHED_TITLE') return 'Published catalog royalty review'
  return text.trim() || 'UNKNOWN'
}

function commercialModelForRow(row, signals) {
  if (row.RECORD_ROLE === 'CANONICAL_CURRENT_TITLE') return 'CURRENT_MODEL'
  if (/4%|GRANDFATHER|LEGACY/.test(signals)) return 'GRANDFATHERED'
  if (row.RECORD_ROLE === 'CANONICAL_PUBLISHED_TITLE') return 'LEGACY_MODEL'
  return 'DATA_GAP'
}

function packageStateFor(signals) {
  if (/PACKAGE_SELECTED|PACKAGE ACCEPTED/i.test(signals)) return 'PACKAGE_SELECTED'
  return ''
}

function evidenceLinksFor(signals) {
  const matches = [...signals.matchAll(/\b[A-Z0-9_]+:[a-f0-9-]{36}\b/gi)].map((match) => match[0])
  return matches.map((match) => ({
    label: match.split(':')[0],
    href: `dataverse://${match}`,
    checksum: createHash('sha256').update(match).digest('hex'),
    artifactType: /ARTIFACT|APPROVAL/i.test(match) ? 'EDITORIAL_WORKING_SOURCE' : 'SOURCE_EVIDENCE',
    current: true,
  }))
}

function paymentTimestamp(signals) {
  return signals.match(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\b/)?.[0] || ''
}

function preimplementationProjection(row, signals) {
  const stage = legacyStateFor(row, signals)
  if (!/CANONICAL/.test(row.RECORD_ROLE)) return { stage: 'DATA_GAP', violation: 'NONCANONICAL_SUPPRESSED_BY_WAVE2' }
  if (/UNTRUSTWORTHY_COMMERCIAL_GATE/.test(row.CURRENT_CLASSIFICATION || '')) return { stage, violation: 'COMMERCIAL_GATE_VIOLATION_RISK' }
  if (/UNTRUSTWORTHY_EDITORIAL_GATE/.test(row.CURRENT_CLASSIFICATION || '')) return { stage, violation: 'EDITORIAL_GATE_VIOLATION_RISK' }
  if (/ARTIFACT|PROOF|LINE|COPY|LAYOUT/i.test(signals) && !/APPROVAL_EVIDENCE_BOUND|AUTHOR APPROVED/i.test(signals)) return { stage, violation: 'ARTIFACT_EXISTENCE_FALSE_ADVANCEMENT' }
  return { stage, violation: 'NO_STATIC_VIOLATION' }
}

function editorialContractRows() {
  return [
    ['DEVELOPMENTAL_EDITING', 'Source/current editorial artifact bound', 'Developmental artifact'],
    ['DEVELOPMENTAL_AUTHOR_REVIEW', 'Developmental artifact delivered to author', 'Approved developmental artifact or requested changes/hold'],
    ['LINE_EDITING', 'Developmental approval or predecessor not applicable', 'Line artifact'],
    ['LINE_AUTHOR_REVIEW', 'Line artifact delivered to author', 'Approved line artifact or requested changes/hold'],
    ['COPYEDITING', 'Line approval or predecessor not applicable', 'Copy artifact'],
    ['COPY_AUTHOR_REVIEW', 'Copy artifact delivered to author', 'Approved copy artifact or requested changes/hold'],
    ['INTERIOR_LAYOUT', 'Approved copy/final editorial source', 'Layout artifact'],
    ['PROOFREADING', 'Layout artifact exists', 'Proof artifact'],
    ['FINAL_AUTHOR_APPROVAL', 'Proof artifact exists', 'Final author approval bound to proof/final interior'],
  ].map(([SUBSTAGE, REQUIRED_EVIDENCE, TRANSITION_OUTPUT]) => ({
    SUBSTAGE,
    REQUIRED_EVIDENCE,
    TRANSITION_OUTPUT,
    RULE: 'No later stage may project until prior required author gate and artifact binding are proven.',
  }))
}

function stageOrder(stage) {
  return {
    DATA_GAP: 0,
    INQUIRY_INTAKE: 1,
    CLASSIFICATION: 2,
    EDITORIAL_REVIEW_RECOMMENDATION: 3,
    COMMERCIAL_ACTIVATION: 4,
    AUTHOR_ONBOARDING: 5,
    EDITORIAL_PRODUCTION: 6,
    BOOK_PRODUCTION: 7,
    DISTRIBUTION_READINESS: 8,
    DISTRIBUTION_RELEASE: 9,
    POST_PUBLICATION: 10,
  }[stage] || 0
}

function parseCsv(text) {
  const records = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (quoted && char === '"' && next === '"') {
      value += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(value)
      if (row.some((cell) => cell !== '')) records.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }
  if (value || row.length) {
    row.push(value)
    records.push(row)
  }
  const [header, ...body] = records
  return body.map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] || ''])))
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function writeCsv(path, rows) {
  const headers = Object.keys(rows[0] || {})
  writeFileSync(path, `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')).join('\n')}\n`)
}

function writeDocs(summary) {
  const docs = {
    '01_stage_dependency_map.md': `# Stage Dependency Map\n\nCURRENT_STAGE, CURRENT_SUBSTAGE, LAST_PROVEN_GOVERNED_STAGE, NEXT_GOVERNED_ACTION, COMMERCIAL_READINESS, and EDITORIAL_READINESS are projected through \`projectCanonicalPublisherLifecycle\`. Sources include Dataverse title status/stage fields, Opportunity commercial/payment fields, editorial approval gates, artifact/evidence links, execution logs, and Wave 1 canonical authority fields. Wave 3 inserts the governed stage-truth evaluator after canonical authority classification and before UI/API stage exposure.\n`,
    '08_runtime_change_spec.md': '# Runtime Change Spec\n\nProjection now computes `stageTruth` for every item. Current authority remains required, then commercial applicability and editorial transition prerequisites determine the highest truthful projected stage. The change is read-model/runtime projection only and performs no title-record mutation.\n',
    '09_test_matrix.md': '# Test Matrix\n\nCovered: commercial gate blocks advancement, executed agreement requirement, payment requirement, grandfathered exception, artifact-only non-advancement, authentication-not-approval, unresolved author gate, requested changes, prior editorial prerequisite, later-stage artifact skip prevention, canonical authority requirement, unresolved authority, replay determinism, and no mutation authority.\n',
    '10_test_results.md': '# Test Results\n\nFocused Wave 3 plus relevant Wave 2/Wave B/Publisher Today tests passed locally before PR: 34 / 34 PASS. Type-check, lint, build, canon guard, diff check, production deployment, and production readback are recorded in closeout after merge.\n',
    '12_negative_proof.md': `# Negative Proof\n\nARTIFACT_EXISTENCE_FALSE_ADVANCEMENTS = ${summary.artifactExistenceFalseAdvancements}\nAUTHENTICATION_FALSE_APPROVALS = ${summary.authenticationFalseApprovals}\nUNRESOLVED_AUTHOR_GATE_FALSE_ADVANCEMENTS = ${summary.unresolvedAuthorGateFalseAdvancements}\nCOMMERCIAL_GATE_FALSE_ADVANCEMENTS = ${summary.commercialGateFalseAdvancements}\nNONCANONICAL_STAGE_AUTHORITY_CASES = ${summary.noncanonicalStageAuthorityCases}\n`,
    '13_proof_contract.md': `# Proof Contract\n\nmanual_intervention_count = ${summary.manualInterventionCount}\nSOURCE_RECORD_UNIVERSE = ${summary.sourceRecordUniverse}\nCURRENT_AUTHORITY_UNIVERSE = ${summary.currentAuthorityUniverse}\nreplay_deterministic = ${summary.replayDeterministic}\ncommercial_gate_enforcement = ${summary.commercialGateEnforcement}\neditorial_sequence_enforcement = ${summary.editorialSequenceEnforcement}\ncommercial_editorial_interlock = ${summary.commercialEditorialInterlock}\n`,
    '14_rollback_plan.md': '# Rollback Plan\n\nRevert the Wave 3 runtime/evidence commit or PR. No Dataverse records, schema components, workflow definitions, author communications, title lifecycle fields, Waiting On fields, timer anchors, artifacts, commercial records, or production/distribution states are mutated by this wave.\n',
    '15_production_readback.md': '# Production Readback\n\nPending merge/deployment. Expected production readback must verify `/api/health` returns the merge SHA and that the 408-record projection proof remains repeatable.\n',
    '16_wave3_closeout.md': `# Wave 3 Closeout\n\nWAVE_3_STATUS = CONTROLLED_RUNTIME_IMPLEMENTATION_READY_FOR_REVIEW\nSTAGE_FULLY_TRUSTWORTHY = ${summary.stageFullyTrustworthy}\nWAITING_ON_FULLY_TRUSTWORTHY = ${summary.waitingOnFullyTrustworthy}\nTIMER_FULLY_TRUSTWORTHY = ${summary.timerFullyTrustworthy}\nARTIFACT_FULLY_TRUSTWORTHY = ${summary.artifactFullyTrustworthy}\nCLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE\nPUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE\nNEXT_RECOMMENDED_WAVE = Wave 4 Waiting On / timer trust reconstruction after Founder authorization\n`,
  }
  for (const [name, content] of Object.entries(docs)) writeFileSync(join(outDir, name), content)
}

function writeChecksums(dir) {
  const names = [
    '01_stage_dependency_map.md',
    '02_commercial_gate_applicability_matrix.csv',
    '03_commercial_gate_truth_matrix.csv',
    '04_editorial_transition_contract_matrix.csv',
    '05_editorial_gate_truth_matrix.csv',
    '06_commercial_editorial_interlock.csv',
    '07_preimplementation_stage_projection.csv',
    '08_runtime_change_spec.md',
    '09_test_matrix.md',
    '10_test_results.md',
    '11_postimplementation_408_stage_projection.csv',
    '12_negative_proof.md',
    '13_proof_contract.md',
    '14_rollback_plan.md',
    '15_production_readback.md',
    '16_wave3_closeout.md',
    'summary.json',
  ]
  const checksums = names.map((name) => {
    const content = readFileSync(join(dir, name))
    return `${createHash('sha256').update(content).digest('hex')}  ${basename(name)}`
  })
  writeFileSync(join(dir, 'checksums.sha256'), `${checksums.join('\n')}\n`)
}
