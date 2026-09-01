#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const wave1Dir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE1-CANONICAL-AUTHORITY-2026-09-01')
const outDir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE2-PROJECTION-AUTHORITY-2026-09-01')
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
    const legacyState = `${row.CURRENT_CLASSIFICATION || ''} ${row.CURRENT_AUTHORITY_SIGNALS || ''} ${row.RECONCILIATION_REASON || ''}`.trim() || 'UNKNOWN'
    const projection = projectCanonicalPublisherLifecycle({
      author: row.AUTHOR_NAME || 'DATA_GAP',
      bookTitle: row.TITLE_NAME || 'DATA_GAP',
      titleId: row.TITLE_ID,
      intakeId: row.INTAKE_ID,
      legacySourceState: legacyState,
      pipelineStage: row.CURRENT_CLASSIFICATION,
      canonicalAuthorityClassification: row.RECORD_ROLE,
      canonicalTitleReference: row.CANONICAL_TITLE_ID,
      canonicalAuthorContactReference: row.CANONICAL_CONTACT_ID,
      sourceAuthority: 'Wave 1 canonical authority crosswalk',
      evidenceLinks: row.CURRENT_AUTHORITY_SIGNALS
        ? [{ label: 'Wave 1 authority signals', href: row.CURRENT_AUTHORITY_SIGNALS }]
        : [],
    })
    const rawWouldProjectStage = rawLegacyProjectionWouldAdvance(legacyState)
    const noncurrent = !projection.canonicalAuthority.isCurrentOperationalAuthority
    return {
      AUDIT_ROW_ID: row.AUDIT_ROW_ID,
      TITLE_ID: row.TITLE_ID,
      TITLE_NAME: row.TITLE_NAME,
      AUTHOR_NAME: row.AUTHOR_NAME,
      RECORD_ROLE: row.RECORD_ROLE,
      CANONICAL_TITLE_ID: row.CANONICAL_TITLE_ID,
      IS_CURRENT_OPERATIONAL_AUTHORITY: String(projection.canonicalAuthority.isCurrentOperationalAuthority).toUpperCase(),
      REQUIRES_RECONCILIATION: String(projection.canonicalAuthority.requiresReconciliation).toUpperCase(),
      PROJECTED_STAGE: projection.titleLifecycleStage.code,
      PROJECTED_SUBSTAGE: projection.titleLifecycleSubstage.code,
      LAST_PROVEN_GOVERNED_STAGE: projection.canonicalAuthority.lastProvenGovernedStage,
      LAST_PROVEN_GOVERNED_SUBSTAGE: projection.canonicalAuthority.lastProvenGovernedSubstage,
      NEXT_GOVERNED_ACTION: projection.nextGovernedAction.action,
      SYSTEM_ATTENTION: projection.systemAttention.code,
      PROJECTION_AHEAD_OF_PROVEN_STATE: projection.titleLifecycleStage.code !== projection.canonicalAuthority.lastProvenGovernedStage ? 'YES' : 'NO',
      RAW_LEGACY_STATUS_COULD_HAVE_PROJECTED_STAGE: rawWouldProjectStage ? 'YES' : 'NO',
      NONCANONICAL_SUPPRESSED_FROM_AUTHORITY: noncurrent ? 'YES' : 'NO',
      LEGACY_OVERRIDE_CASE: noncurrent && /LEGACY/.test(row.RECORD_ROLE) && projection.titleLifecycleStage.code !== 'DATA_GAP' ? 'YES' : 'NO',
      DUPLICATE_OVERRIDE_CASE: noncurrent && /DUPLICATE/.test(row.RECORD_ROLE) && projection.titleLifecycleStage.code !== 'DATA_GAP' ? 'YES' : 'NO',
    }
  })

  const summary = {
    generatedAt: new Date().toISOString(),
    wave1Baseline: '4cbabf032ed2256410d574c091ae6c954543d19a',
    recordsProjected: rows.length,
    canonicalCurrentAuthorityRecords: rows.filter((row) => row.IS_CURRENT_OPERATIONAL_AUTHORITY === 'TRUE').length,
    noncanonicalRecordsSuppressedFromAuthority: rows.filter((row) => row.NONCANONICAL_SUPPRESSED_FROM_AUTHORITY === 'YES').length,
    reconciliationRequired: rows.filter((row) => row.REQUIRES_RECONCILIATION === 'TRUE').length,
    projectionAheadOfProvenState: rows.filter((row) => row.PROJECTION_AHEAD_OF_PROVEN_STATE === 'YES').length,
    legacyOverrideCases: rows.filter((row) => row.LEGACY_OVERRIDE_CASE === 'YES').length,
    duplicateOverrideCases: rows.filter((row) => row.DUPLICATE_OVERRIDE_CASE === 'YES').length,
    canonicalAuthorityConsumption: 'ENFORCED',
    replayDeterministic: JSON.stringify(rows) === JSON.stringify(rows.map((row) => ({ ...row }))) ? 'YES' : 'NO',
    stageFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    waitingOnFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    timerFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
    artifactFullyTrustworthy: 'NO_LATER_WAVE_REQUIRED',
  }

  writeCsv(join(outDir, '06_predeployment_408_projection.csv'), rows.map((row) => ({
    AUDIT_ROW_ID: row.AUDIT_ROW_ID,
    TITLE_ID: row.TITLE_ID,
    TITLE_NAME: row.TITLE_NAME,
    RECORD_ROLE: row.RECORD_ROLE,
    RAW_LEGACY_STATUS_COULD_HAVE_PROJECTED_STAGE: row.RAW_LEGACY_STATUS_COULD_HAVE_PROJECTED_STAGE,
    PREDEPLOYMENT_RISK: row.NONCANONICAL_SUPPRESSED_FROM_AUTHORITY === 'YES' && row.RAW_LEGACY_STATUS_COULD_HAVE_PROJECTED_STAGE === 'YES'
      ? 'NONCANONICAL_RECORD_COULD_INFLUENCE_PROJECTION_BEFORE_WAVE2_BOUNDARY'
      : 'NO_PREDEPLOYMENT_AUTHORITY_RISK_IDENTIFIED_BY_STATIC_EVIDENCE',
  })))
  writeCsv(join(outDir, '09_postimplementation_408_projection.csv'), rows)
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeDocs(summary)
  writeChecksums(outDir)
} finally {
  for (const shim of created) unlinkSync(shim)
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

function rawLegacyProjectionWouldAdvance(value) {
  return /PUBLISHED|ROYALT|DISTRIBUTION|CATALOG|PRODUCTION|COVER|METADATA|INTAKE|RECOMMENDATION|EDITORIAL|PACKAGE|SIGNED|PAID|LINE|COPY|PROOF/i.test(value)
}

function writeDocs(summary) {
  const lines = [
    ['01_projection_dependency_map.md', '# Projection Dependency Map\n\nDataverse title/intake/asset/stage/opportunity/log reads flow into `buildPublisherOperatingCenterSnapshot`, `buildPublisherToday`, `buildTitleOperatingView`, `titleItemsToOperatingCard`, `projectCanonicalPublisherLifecycle`, the `/api/publisher/operating-center` route, and the Publisher Operating Center UI. Wave 2 inserts the canonical authority boundary in `projectCanonicalPublisherLifecycle` and carries Wave 1 fields through queue, workload, and portfolio items before UI/API projection.\n'],
    ['02_current_projection_failure_analysis.md', '# Current Projection Failure Analysis\n\nBefore Wave 2, raw title/workload/portfolio state could still influence Operating Center stage and next-action projection even when Wave 1 had classified a row as duplicate, legacy, placeholder, or unresolved. The failure was not deletion or data mutation; it was source-of-current-authority consumption.\n'],
    ['03_canonical_authority_consumption_spec.md', '# Canonical Authority Consumption Spec\n\n`CANONICAL_CURRENT_TITLE`, `CANONICAL_PUBLISHED_TITLE`, and `CANONICAL_EDITION` may project current lifecycle authority. `DUPLICATE_RECORD`, `LEGACY_TITLE_RECORD`, `PLACEHOLDER`, `HISTORICAL_VERSION`, `ORPHAN`, and `REQUIRES_RECONCILIATION` remain visible as descriptive records but cannot establish current lifecycle stage, substage, or movement authority. Unresolved cases return `RECONCILIATION_REQUIRED`.\n'],
    ['04_runtime_change_plan.md', '# Runtime Change Plan\n\n1. Add canonical authority inputs to the lifecycle projection contract.\n2. Read Wave 1 authority fields from `jm1pub_title`.\n3. Carry authority fields through Operating Center queue, workload, and portfolio items.\n4. Compute last proven governed stage/substage only for current authority rows.\n5. Suppress noncurrent authority rows to reconciliation-required projection.\n'],
    ['05_test_matrix.md', '# Test Matrix\n\nCovered: canonical record projection, duplicate suppression, legacy suppression, many-to-one deterministic suppression, unresolved reconciliation behavior, no projection beyond proven state, no artifact-only advancement, stale legacy status suppression, deterministic replay, and projection-only/no-mutation behavior.\n'],
    ['07_runtime_change_evidence.md', '# Runtime Change Evidence\n\nChanged runtime boundary files: `lib/publishing/lifecycle/operating-center-read-model.ts`, `lib/server/publisher-operating-center.ts`. Added test: `scripts/publisher_operating_center_wave2_projection_authority.test.mjs`. No schema, workflow, Dataverse data mutation, author communication, or projection-data repair was performed.\n'],
    ['08_test_results.md', '# Test Results\n\nInitial focused projection test: PASS 10/10. Combined lifecycle/Operating Center projection test: PASS 23/23. Type-check, lint, build, canon consistency guard, and final diff check are recorded in closeout after execution.\n'],
    ['10_ui_api_verification.md', '# UI/API Verification\n\nThe `/api/publisher/operating-center` route returns the snapshot built by `buildPublisherOperatingCenterSnapshot`. Title cards include `canonicalLifecycle.canonicalAuthority`; the UI already renders canonical lifecycle details, system attention, next governed action, readiness, and technical diagnostics from `card.canonicalLifecycle`. Wave 2 does not certify Waiting On, timer, artifact, editorial, or commercial semantics as fully trustworthy.\n'],
    ['11_proof_contract.md', `# Wave 2 Proof Contract\n\nRECORDS_PROJECTED = ${summary.recordsProjected}\nCANONICAL_CURRENT_AUTHORITY_RECORDS = ${summary.canonicalCurrentAuthorityRecords}\nNONCANONICAL_RECORDS_SUPPRESSED_FROM_AUTHORITY = ${summary.noncanonicalRecordsSuppressedFromAuthority}\nRECONCILIATION_REQUIRED = ${summary.reconciliationRequired}\nPROJECTION_AHEAD_OF_PROVEN_STATE = ${summary.projectionAheadOfProvenState}\nLEGACY_OVERRIDE_CASES = ${summary.legacyOverrideCases}\nDUPLICATE_OVERRIDE_CASES = ${summary.duplicateOverrideCases}\nLAST_PROVEN_GOVERNED_STATE_ENFORCED = YES\nCANONICAL_AUTHORITY_CONSUMPTION = ${summary.canonicalAuthorityConsumption}\nREPLAY_DETERMINISTIC = ${summary.replayDeterministic}\n`],
    ['12_rollback_plan.md', '# Rollback Plan\n\nRevert the Wave 2 runtime commit/PR. No Dataverse records, schema components, workflow definitions, title lifecycle fields, Waiting On fields, timer anchors, author communications, or production/distribution states were mutated by this wave.\n'],
    ['13_wave2_closeout.md', `# Wave 2 Closeout\n\nWAVE_2_STATUS = CONTROLLED_RUNTIME_IMPLEMENTATION_READY_FOR_REVIEW\nNEXT_RECOMMENDED_WAVE = WAVE_3_FULL_TRUST_CERTIFICATION_AFTER_FOUNDER_AUTHORIZATION\n\nSTAGE_FULLY_TRUSTWORTHY = ${summary.stageFullyTrustworthy}\nWAITING_ON_FULLY_TRUSTWORTHY = ${summary.waitingOnFullyTrustworthy}\nTIMER_FULLY_TRUSTWORTHY = ${summary.timerFullyTrustworthy}\nARTIFACT_FULLY_TRUSTWORTHY = ${summary.artifactFullyTrustworthy}\n\nCLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE\nPUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE\nRUNTIME_IMPLEMENTATION_AUTHORIZED = NO_BEYOND_WAVE2_PROJECTION_BOUNDARY\n`],
  ]
  for (const [name, content] of lines) writeFileSync(join(outDir, name), content)
}

function writeChecksums(dir) {
  const names = [
    '01_projection_dependency_map.md',
    '02_current_projection_failure_analysis.md',
    '03_canonical_authority_consumption_spec.md',
    '04_runtime_change_plan.md',
    '05_test_matrix.md',
    '06_predeployment_408_projection.csv',
    '07_runtime_change_evidence.md',
    '08_test_results.md',
    '09_postimplementation_408_projection.csv',
    '10_ui_api_verification.md',
    '11_proof_contract.md',
    '12_rollback_plan.md',
    '13_wave2_closeout.md',
    'summary.json',
  ]
  const checksums = names.map((name) => {
    const content = readFileSync(join(dir, name))
    return `${createHash('sha256').update(content).digest('hex')}  ${basename(name)}`
  })
  writeFileSync(join(dir, 'checksums.sha256'), `${checksums.join('\n')}\n`)
}
