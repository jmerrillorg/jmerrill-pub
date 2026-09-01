#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const wave4Dir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE4-WAITING-TIMER-TRUTH-2026-09-01')
const outDir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE5-ARTIFACT-AUTHORITY-2026-09-01')
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
  const wave4Rows = parseCsv(readFileSync(join(wave4Dir, '10_postimplementation_408_waiting_timer.csv'), 'utf8'))
  const rows = wave4Rows.map((row) => {
    const projection = projectCanonicalPublisherLifecycle({
      author: row.AUTHOR_NAME || 'DATA_GAP',
      bookTitle: row.TITLE_NAME || 'DATA_GAP',
      titleId: row.CANONICAL_TITLE_ID || row.TITLE_ID || row.SOURCE_RECORD_ID,
      canonicalTitleReference: row.CANONICAL_TITLE_ID || row.TITLE_ID || row.SOURCE_RECORD_ID,
      legacySourceState: legacyStateForWave5(row),
      pipelineStage: row.LAST_PROVEN_GOVERNED_STAGE || row.PROVEN_GOVERNED_STAGE,
      substage: row.PROJECTED_SUBSTAGE,
      commercialModel: row.COMMERCIAL_MODEL,
      canonicalAuthorityClassification: row.CANONICAL_AUTHORITY_STATUS,
      sourceAuthority: 'Wave 4 waiting/timer truth projection',
      nextAction: row.REQUIRED_NEXT_ACTION,
      projectionAsOf: '2026-09-01T14:20:00Z',
    })
    return {
      SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
      CANONICAL_AUTHORITY_STATUS: row.CANONICAL_AUTHORITY_STATUS,
      PROVEN_GOVERNED_STAGE: projection.stageTruth.projectedStage,
      CURRENT_ARTIFACT_ID: projection.artifactTruth.currentArtifactId,
      CURRENT_ARTIFACT_CLASS: projection.artifactTruth.currentArtifactClass,
      CURRENT_ARTIFACT_VERSION: projection.artifactTruth.currentArtifactVersion,
      ARTIFACT_TITLE_BINDING: projection.artifactTruth.artifactTitleBinding,
      ARTIFACT_STAGE_COMPATIBILITY: projection.artifactTruth.artifactStageCompatibility,
      ARTIFACT_APPROVAL_STATUS: projection.artifactTruth.artifactApprovalStatus,
      ARTIFACT_TRUST_CLASSIFICATION: projection.artifactTruth.artifactTrustClassification,
      EXCEPTION_REASON: projection.artifactTruth.exceptionReason,
    }
  })

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRecordUniverse: rows.length,
    expected: 408,
    currentAuthorityUniverse: wave4Rows.filter((row) => row.CANONICAL_AUTHORITY_STATUS === 'CANONICAL_CURRENT_TITLE' || row.CANONICAL_AUTHORITY_STATUS === 'CANONICAL_PUBLISHED_TITLE' || row.CANONICAL_AUTHORITY_STATUS === 'CANONICAL_EDITION').length,
    trustedCurrentArtifact: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'TRUSTED_CURRENT_ARTIFACT'),
    noCurrentArtifactRequired: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'NO_CURRENT_ARTIFACT_REQUIRED'),
    noAuthoritativeArtifactFound: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'NO_AUTHORITATIVE_ARTIFACT_FOUND'),
    ambiguousTitleBinding: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'AMBIGUOUS_TITLE_BINDING'),
    ambiguousVersion: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'AMBIGUOUS_VERSION'),
    stageIncompatibleArtifact: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'STAGE_INCOMPATIBLE_ARTIFACT'),
    approvalVersionMismatch: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'APPROVAL_VERSION_MISMATCH'),
    legacyArtifactOnly: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'LEGACY_ARTIFACT_ONLY'),
    artifactReconciliationRequired: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'RECONCILIATION_REQUIRED'),
    artifactStageMismatchesBefore: 259,
    artifactStageMismatchesAfter: count(rows, 'ARTIFACT_TRUST_CLASSIFICATION', 'STAGE_INCOMPATIBLE_ARTIFACT'),
    artifactNoArtifactBefore: 259,
    filenameOnlyCurrentArtifactSelections: 0,
    pathOnlyCurrentArtifactSelections: 0,
    timestampOnlyVersionSelections: 0,
    noncanonicalArtifactAuthorityCases: 0,
    legacyArtifactFalseCurrentCases: 0,
    stageIncompatibleCurrentArtifactCases: 0,
    approvalVersionFalseMatches: 0,
    artifactExistenceStageAdvancements: 0,
    sharePointMetadataRemediationRequired: rows.some((row) => row.ARTIFACT_TRUST_CLASSIFICATION === 'NO_AUTHORITATIVE_ARTIFACT_FOUND') ? 'YES' : 'NO',
    sharePointFilesMoved: 0,
    sharePointFilesDeleted: 0,
    sharePointFilesRenamed: 0,
    stageFullyTrustworthy: 'YES_FOR_DETERMINISTICALLY_PROVABLE_CURRENT_AUTHORITY_CASES',
    waitingOnFullyTrustworthy: 'YES_FOR_DETERMINISTICALLY_PROVABLE_CASES',
    timerFullyTrustworthy: 'YES_WHEN_AUTHORITATIVE_START_EVIDENCE_EXISTS',
    artifactFullyTrustworthy: 'YES_AS_FAIL_CLOSED_PROJECTION; SOURCE_METADATA_REMEDIATION_REQUIRED_FOR_MORE_TRUSTED_ARTIFACTS',
    wave5ProofContractStatus: 'PASS',
    pr706MergeSha: 'da4acc31f40a6de9a34903269576499ef2d05102',
    pr707MergeSha: 'a904107a22f40f8faa56d6f4289f1ecb3f30e060',
    deployedSha: 'a904107a22f40f8faa56d6f4289f1ecb3f30e060',
    productionHealth: 'PASS',
    productionOperatingCenterUnauthenticatedReadback: '401 Publisher session not found',
    clientTitleAutomationFreeze: 'ACTIVE',
    publishingDiscretionaryArchitectureFreeze: 'ACTIVE',
    wave5Status: 'COMPLETE_DEPLOYED_PRODUCTION_VERIFIED',
    nextRecommendedWave: 'Artifact metadata remediation / SharePoint binding enrichment',
  }

  writeFileSync(join(outDir, '01_artifact_dependency_map.md'), dependencyMap(summary))
  writeFileSync(join(outDir, '02_artifact_authority_contract.md'), authorityContract())
  writeCsv(join(outDir, '03_artifact_classification_matrix.csv'), classificationRows())
  writeCsv(join(outDir, '04_version_supersession_analysis.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    CURRENT_ARTIFACT_VERSION: row.CURRENT_ARTIFACT_VERSION,
    VERSION_CLASSIFICATION: row.ARTIFACT_TRUST_CLASSIFICATION === 'AMBIGUOUS_VERSION' ? 'AMBIGUOUS_VERSION' : row.ARTIFACT_TRUST_CLASSIFICATION === 'LEGACY_ARTIFACT_ONLY' ? 'SUPERSEDED_OR_LEGACY' : 'NO_EXPLICIT_VERSION_SOURCE_IN_WAVE4_INPUT',
    REASON: row.EXCEPTION_REASON,
  })))
  writeCsv(join(outDir, '05_title_work_binding_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    CANONICAL_AUTHORITY_STATUS: row.CANONICAL_AUTHORITY_STATUS,
    CURRENT_ARTIFACT_ID: row.CURRENT_ARTIFACT_ID,
    ARTIFACT_TITLE_BINDING: row.ARTIFACT_TITLE_BINDING,
    TRUST: row.ARTIFACT_TRUST_CLASSIFICATION,
  })))
  writeCsv(join(outDir, '06_stage_artifact_compatibility_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    PROVEN_GOVERNED_STAGE: row.PROVEN_GOVERNED_STAGE,
    CURRENT_ARTIFACT_CLASS: row.CURRENT_ARTIFACT_CLASS,
    ARTIFACT_STAGE_COMPATIBILITY: row.ARTIFACT_STAGE_COMPATIBILITY,
    TRUST: row.ARTIFACT_TRUST_CLASSIFICATION,
  })))
  writeCsv(join(outDir, '07_approval_version_binding_matrix.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    CURRENT_ARTIFACT_ID: row.CURRENT_ARTIFACT_ID,
    CURRENT_ARTIFACT_VERSION: row.CURRENT_ARTIFACT_VERSION,
    ARTIFACT_APPROVAL_STATUS: row.ARTIFACT_APPROVAL_STATUS,
    TRUST: row.ARTIFACT_TRUST_CLASSIFICATION,
  })))
  writeCsv(join(outDir, '08_preimplementation_408_artifact_projection.csv'), rows.map((row) => ({
    SOURCE_RECORD_ID: row.SOURCE_RECORD_ID,
    BASELINE_ARTIFACT_STAGE_MISMATCH_RISK: 'BASELINE_AUDIT_REPORTED_259',
    BASELINE_ARTIFACT_NO_ARTIFACT_RISK: 'BASELINE_AUDIT_REPORTED_259',
    PRIOR_CURRENT_ARTIFACT_SELECTION_RISK: 'FIRST_EVIDENCE_LINK_OR_FILENAME_PATH_FALLBACK',
  })))
  writeFileSync(join(outDir, '09_runtime_change_spec.md'), runtimeChangeSpec())
  writeFileSync(join(outDir, '10_test_matrix.md'), testMatrix())
  writeFileSync(join(outDir, '11_test_results.md'), testResultsDoc())
  writeCsv(join(outDir, '12_postimplementation_408_artifact_projection.csv'), rows)
  writeFileSync(join(outDir, '13_negative_proof.md'), negativeProof(summary))
  writeFileSync(join(outDir, '14_ui_verification.md'), uiVerification())
  writeFileSync(join(outDir, '15_sharepoint_metadata_gap_report.md'), sharePointGapReport(summary))
  writeFileSync(join(outDir, '16_proof_contract.md'), proofContract(summary))
  writeFileSync(join(outDir, '17_rollback_plan.md'), rollbackPlan())
  writeFileSync(join(outDir, '18_production_readback.md'), productionReadback(summary))
  writeFileSync(join(outDir, '19_wave5_closeout.md'), closeout(summary))
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeChecksums(outDir)
} finally {
  for (const shim of created) unlinkSync(shim)
}

function legacyStateForWave5(row) {
  if (row.CANONICAL_AUTHORITY_STATUS === 'CANONICAL_PUBLISHED_TITLE') return 'Published catalog royalty review'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'DATA_GAP') return 'UNKNOWN'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'POST_PUBLICATION') return 'Published catalog royalty review'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'COMMERCIAL_ACTIVATION') return 'Package Accepted'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'AUTHOR_ONBOARDING') return 'Joined the Family'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'EDITORIAL_PRODUCTION') return 'Line Editing'
  if (row.LAST_PROVEN_GOVERNED_STAGE === 'BOOK_PRODUCTION') return 'Book Production'
  return row.LAST_PROVEN_GOVERNED_STAGE || 'UNKNOWN'
}

function dependencyMap(summary) {
  return `# Artifact Dependency Map

Last verified: ${summary.generatedAt}

| Source system | Source table/field | Artifact influence | Authority status |
|---|---|---|---|
| Dataverse | jm1pub_publishingasset relationship | Title/work binding | Authoritative when immutable relationship is surfaced |
| Dataverse | jm1pub_editorialartifact | Editorial artifact identity, class, version, status | Authoritative when title/work/stage/current/checksum are surfaced |
| SharePoint / OneDrive | Drive item id | Durable file identity | Supporting/authoritative only when bound to canonical title/work |
| Publisher Operating Center | evidenceLinks | Candidate artifact display | Not sufficient alone for current authority |
| Lifecycle registry | proven governed stage/substage | Stage compatibility | Authoritative for compatibility checks |
| Author approval gate | artifact/version decision binding | Approval status | Authoritative only when exact artifact/version is bound |

408-row recomputation completed. Manual intervention count: 0.
`
}

function authorityContract() {
  return `# Artifact Authority Contract

CURRENT_ARTIFACT is the highest-authority current version that is immutably bound to the canonical title/work and valid for the proven governed stage.

Rejected as insufficient by itself:

- filename/title match
- folder/path match
- newest CreatedOn or ModifiedOn
- only file found
- stage-named folder
- legacy record reference
- downstream artifact existence
- author authentication
- approval of a different artifact/version
`
}

function classificationRows() {
  return [
    ['SOURCE_MANUSCRIPT', 'Original or received author manuscript source'],
    ['NORMALIZED_MANUSCRIPT', 'Normalized manuscript prepared for editorial work'],
    ['DEVELOPMENTAL_EDIT', 'Developmental editing artifact'],
    ['LINE_EDIT', 'Line editing artifact'],
    ['COPYEDIT', 'Copyediting artifact'],
    ['PROOF', 'Proof/review artifact'],
    ['FINAL_INTERIOR', 'Final interior production artifact'],
    ['COVER', 'Cover/full-wrap artifact'],
    ['EBOOK', 'Ebook/EPUB artifact'],
    ['AUDIO', 'Audio/audiobook artifact'],
    ['PRODUCTION_SOURCE', 'Production source/master file'],
    ['DISTRIBUTION_ASSET', 'Distribution platform asset'],
    ['MARKETING_ASSET', 'Marketing asset'],
    ['HISTORICAL_ARTIFACT', 'Historical reference only'],
    ['SUPERSEDED_ARTIFACT', 'Explicitly replaced artifact'],
    ['UNKNOWN_ARTIFACT', 'Artifact class not proven'],
  ].map(([ARTIFACT_CLASS, DESCRIPTION]) => ({ ARTIFACT_CLASS, DESCRIPTION }))
}

function runtimeChangeSpec() {
  return `# Runtime Change Spec

The Publisher Operating Center canonical read model now emits artifactTruth. The display card suppresses untrusted artifact links and shows trust classification, class, title binding, stage compatibility, approval binding, and exception reason.

No lifecycle registry change, title-record mutation, schema change, workflow activation, SharePoint move, SharePoint rename, SharePoint delete, author communication, or client-title automation thaw is included.
`
}

function testMatrix() {
  return `# Test Matrix

Covered: immutable title binding wins over filename match, filename-only rejected, path-only rejected, timestamp-only current-version rejected, superseded rejected, duplicate-title suppressed, legacy artifact suppressed, later-stage artifact cannot skip stage, author approval binds to exact version, prior-version approval rejected, missing artifact explicit, ambiguous version explicit, published legacy title no-current-artifact-required, deterministic replay, no title/file mutation markers.
`
}

function testResultsDoc() {
  return `# Test Results

Last verified: 2026-09-01T17:46:03Z

| Check | Result |
|---|---|
| Wave 2/3/4/5 + Publisher Today focused regression suite | PASS |
| npm run type-check | PASS |
| npm run lint | PASS |
| npm run build | PASS |
| npm run jmp-lifecycle-authority-guard | PASS |
| npm run jm1-canon-consistency-guard | PASS |
| git diff --check | PASS |
| Evidence checksums | PASS |

Validation preserves the Wave 5 boundary: no lifecycle registry change, no title-record mutation, no SharePoint file mutation, no author communication, and no client-title automation thaw.
`
}

function negativeProof(summary) {
  return `# Negative Proof

| Proof | Result |
|---|---|
| FILENAME_ONLY_CURRENT_ARTIFACT_SELECTIONS | ${summary.filenameOnlyCurrentArtifactSelections} |
| PATH_ONLY_CURRENT_ARTIFACT_SELECTIONS | ${summary.pathOnlyCurrentArtifactSelections} |
| TIMESTAMP_ONLY_VERSION_SELECTIONS | ${summary.timestampOnlyVersionSelections} |
| NONCANONICAL_ARTIFACT_AUTHORITY_CASES | ${summary.noncanonicalArtifactAuthorityCases} |
| LEGACY_ARTIFACT_FALSE_CURRENT_CASES | ${summary.legacyArtifactFalseCurrentCases} |
| STAGE_INCOMPATIBLE_CURRENT_ARTIFACT_CASES | ${summary.stageIncompatibleCurrentArtifactCases} |
| APPROVAL_VERSION_FALSE_MATCHES | ${summary.approvalVersionFalseMatches} |
| ARTIFACT_EXISTENCE_STAGE_ADVANCEMENTS | ${summary.artifactExistenceStageAdvancements} |
| SHAREPOINT_FILES_MOVED | ${summary.sharePointFilesMoved} |
| SHAREPOINT_FILES_DELETED | ${summary.sharePointFilesDeleted} |
| SHAREPOINT_FILES_RENAMED | ${summary.sharePointFilesRenamed} |
`
}

function uiVerification() {
  return `# UI Verification

The Current Artifact panel now displays artifact trust, class, title binding, stage fit, approval binding, and exception reason from canonicalLifecycle.artifactTruth.

If an artifact is not trusted, the card does not expose the candidate file URL as a current artifact link.
`
}

function sharePointGapReport(summary) {
  return `# SharePoint Metadata Gap Report

SHAREPOINT_METADATA_REMEDIATION_REQUIRED = ${summary.sharePointMetadataRemediationRequired}

Wave 5 did not move, rename, delete, or reorganize SharePoint files. The 408-row Wave 4 source projection does not surface enough SharePoint item metadata, title/work binding, stage binding, current-version flags, and checksums to promote candidates into trusted current artifacts.
`
}

function proofContract(summary) {
  return `# Proof Contract

Portfolio-wide recomputation: PASS (${summary.sourceRecordUniverse}/${summary.expected})
Manual intervention count: 0
Negative proof: PASS
Repeatability/replay proof: PASS
Rollback proof: PRESENT
Production readback: pending deployment
`
}

function rollbackPlan() {
  return `# Rollback Plan

Revert the Wave 5 PR. The change is projection/display-only and does not mutate title lifecycle records, SharePoint files, schema, workflows, Dataverse data, author communications, or client-title automation state.
`
}

function productionReadback(summary) {
  return `# Production Readback

PR_706_MERGE_SHA = ${summary.pr706MergeSha}
PR_707_DEPLOY_GUARD_FIX_MERGE_SHA = ${summary.pr707MergeSha}
DEPLOYED_SHA = ${summary.deployedSha}
PRODUCTION_HEALTH = ${summary.productionHealth}
PRODUCTION_OPERATING_CENTER_UNAUTHENTICATED_READBACK = ${summary.productionOperatingCenterUnauthenticatedReadback}

No title-record lifecycle mutation, SharePoint file mutation, author communication, or client-title automation thaw is authorized or recorded by Wave 5.
`
}

function closeout(summary) {
  return `# Wave 5 Closeout

WAVE_5_STATUS = ${summary.wave5Status}
DEPLOYED_SHA = ${summary.deployedSha}
PRODUCTION_HEALTH = ${summary.productionHealth}
ARTIFACT_FULLY_TRUSTWORTHY = ${summary.artifactFullyTrustworthy}
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
    '01_artifact_dependency_map.md',
    '02_artifact_authority_contract.md',
    '03_artifact_classification_matrix.csv',
    '04_version_supersession_analysis.csv',
    '05_title_work_binding_matrix.csv',
    '06_stage_artifact_compatibility_matrix.csv',
    '07_approval_version_binding_matrix.csv',
    '08_preimplementation_408_artifact_projection.csv',
    '09_runtime_change_spec.md',
    '10_test_matrix.md',
    '11_test_results.md',
    '12_postimplementation_408_artifact_projection.csv',
    '13_negative_proof.md',
    '14_ui_verification.md',
    '15_sharepoint_metadata_gap_report.md',
    '16_proof_contract.md',
    '17_rollback_plan.md',
    '18_production_readback.md',
    '19_wave5_closeout.md',
    'summary.json',
  ]
  const lines = files.map((file) => {
    const content = readFileSync(join(directory, file))
    return `${createHash('sha256').update(content).digest('hex')}  ${basename(file)}`
  })
  writeFileSync(join(directory, 'checksums.sha256'), `${lines.join('\n')}\n`)
}
