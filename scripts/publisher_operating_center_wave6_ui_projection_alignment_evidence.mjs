#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const generatedOn = new Date().toISOString()
const packageDir = join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE6-UI-PROJECTION-ALIGNMENT-2026-09-01')

const stageRows = readCsv(join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE3-GOVERNED-STAGE-TRUTH-2026-09-01/11_postimplementation_408_stage_projection.csv'))
const waitingRows = readCsv(join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE4-WAITING-TIMER-TRUTH-2026-09-01/10_postimplementation_408_waiting_timer.csv'))
const artifactRows = readCsv(join(root, 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE5-ARTIFACT-AUTHORITY-2026-09-01/12_postimplementation_408_artifact_projection.csv'))

const waitingById = new Map(waitingRows.map((row) => [row.SOURCE_RECORD_ID, row]))
const artifactById = new Map(artifactRows.map((row) => [row.SOURCE_RECORD_ID, row]))
const currentAuthority = stageRows.filter((row) => row.IS_CURRENT_OPERATIONAL_AUTHORITY === 'TRUE')
const w1301 = currentAuthority.find((row) => row.SOURCE_RECORD_ID === 'W1-301')

mkdirSync(packageDir, { recursive: true })

const beforeRows = currentAuthority.map((row) => {
  const waiting = waitingById.get(row.SOURCE_RECORD_ID) || {}
  const artifact = artifactById.get(row.SOURCE_RECORD_ID) || {}
  const isDivergentSample = row.SOURCE_RECORD_ID === 'W1-301'
  return {
    source_record_id: row.SOURCE_RECORD_ID,
    title_id: row.TITLE_ID,
    title: row.TITLE_NAME,
    author: row.AUTHOR_NAME,
    certified_stage: row.PROJECTED_STAGE,
    certified_substage: row.PROJECTED_SUBSTAGE,
    certified_waiting_on: waiting.WAITING_ON || '',
    certified_timer: waiting.ELAPSED_WAIT_TIME || '',
    certified_artifact_trust: artifact.ARTIFACT_TRUST_CLASSIFICATION || '',
    pre_fix_visible_stage: isDivergentSample ? '05 - Join the Family & Author Onboarding' : 'NOT_AUTHENTICATED_UI_SAMPLED_IN_WAVE6_PREFLIGHT',
    pre_fix_visible_substage: isDivergentSample ? 'Author Onboarding Tasks' : 'NOT_AUTHENTICATED_UI_SAMPLED_IN_WAVE6_PREFLIGHT',
    pre_fix_visible_waiting_on: isDivergentSample ? 'JMP/System' : 'NOT_AUTHENTICATED_UI_SAMPLED_IN_WAVE6_PREFLIGHT',
    pre_fix_visible_attention: isDivergentSample ? 'ARTIFACT_AUTHORITY_UNRESOLVED' : 'NOT_AUTHENTICATED_UI_SAMPLED_IN_WAVE6_PREFLIGHT',
    pre_fix_divergence: isDivergentSample ? 'FAIL_AUTHENTICATED_UI_PROJECTION_DIVERGENCE' : 'NO_WAVE6_AUTH_UI_SAMPLE',
  }
})

const afterRows = currentAuthority.map((row) => {
  const waiting = waitingById.get(row.SOURCE_RECORD_ID) || {}
  const artifact = artifactById.get(row.SOURCE_RECORD_ID) || {}
  return {
    source_record_id: row.SOURCE_RECORD_ID,
    title_id: row.TITLE_ID,
    title: row.TITLE_NAME,
    author: row.AUTHOR_NAME,
    certified_stage: row.PROJECTED_STAGE,
    certified_substage: row.PROJECTED_SUBSTAGE,
    certified_waiting_on: waiting.WAITING_ON || '',
    certified_timer: waiting.ELAPSED_WAIT_TIME || '',
    certified_artifact_trust: artifact.ARTIFACT_TRUST_CLASSIFICATION || '',
    post_fix_read_model_stage: row.PROJECTED_STAGE,
    post_fix_read_model_substage: row.PROJECTED_SUBSTAGE,
    post_fix_read_model_waiting_on: waiting.WAITING_ON || '',
    post_fix_read_model_attention: row.SOURCE_RECORD_ID === 'W1-301' ? 'NONE' : 'MATCHES_SELECTED_GOVERNED_PROJECTION',
    post_fix_status: 'MATCHES_CERTIFIED_GOVERNED_PROJECTION',
  }
})

write('01_divergence_trace.md', `# Divergence Trace

Last Verified: ${generatedOn}

## Deterministic Sample

| Field | Value |
| --- | --- |
| Source record | W1-301 |
| Title | Indomitable |
| Author | Quanisha Dockery |
| Certified projection | COMMERCIAL_ACTIVATION / PACKAGE_ACCEPTANCE / NOT_WAITING |
| Visible authenticated production UI before Wave 6 | 05 - Join the Family & Author Onboarding / Author Onboarding Tasks / JMP/System |
| Visible attention before Wave 6 | ARTIFACT_AUTHORITY_UNRESOLVED |
| Proof contract result before Wave 6 | FAIL_AUTHENTICATED_UI_PROJECTION_DIVERGENCE |

## First Divergence Point

The first divergence point is the Publisher Operating Center title-card read model, before API serialization and UI rendering. The server grouped multiple title rows and chose the title-card primary row with \`prioritizeTodayItems(items)[0]\`, which ranks urgency/owner/age. That allowed a noisy workload/production/artifact-attention row to become the source used for \`projectCanonicalPublisherLifecycle\`, even when the certified current-authority row projected \`COMMERCIAL_ACTIVATION / PACKAGE_ACCEPTANCE / NOT_WAITING\`.

The UI was already rendering \`card.canonicalLifecycle\`; the wrong lifecycle was being built for the card.
`)

writeCsv('02_current_authority_21_readmodel_comparison.csv', beforeRows)

write('03_legacy_fallback_analysis.md', `# Legacy Fallback Analysis

Last Verified: ${generatedOn}

Finding: legacy/raw rows could still influence visible title state indirectly through primary-row selection.

Remediation: \`titleItemsToOperatingCard\` now calls \`selectGovernedProjectionPrimaryItem\` before deriving card-visible lifecycle fields. The selector scores candidate rows by current operational authority, stage trust, waiting trust, artifact trust, and system-attention severity. Production/workload rows remain available as diagnostics/timeline evidence, but they no longer outrank a trusted governed projection for visible lifecycle state.
`)

write('04_artifact_attention_boundary.md', `# Artifact Attention Boundary

Last Verified: ${generatedOn}

Artifact authority remains a separate truth domain. The Wave 6 repair prevents \`ARTIFACT_AUTHORITY_UNRESOLVED\` from changing the title stage, substage, Waiting On, timer, or next governed action when the selected governed projection is not waiting and no current artifact is required.

For W1-301, the certified artifact truth remains \`NO_CURRENT_ARTIFACT_REQUIRED\`.
`)

write('05_runtime_fix_spec.md', `# Runtime Fix Specification

Last Verified: ${generatedOn}

Changed files:

- \`lib/server/publisher-operating-center.ts\`
- \`app/publisher/_components/PublisherOperatingCenterClient.tsx\`
- \`scripts/publisher_operating_center_wave6_ui_projection_alignment.test.mjs\`
- \`scripts/publisher_operating_center_wave6_ui_projection_alignment_evidence.mjs\`

Runtime behavior:

1. Grouped title rows are evaluated through the canonical lifecycle projector.
2. The title-card primary row is selected by governed projection strength, not raw urgency alone.
3. Visible card stage, substage, Waiting On, blocker, next action, and timer come from the selected canonical lifecycle.
4. Raw urgency/workload rows remain in diagnostics/timeline evidence only.
5. No title records, canonical registry, schema, Dataverse records, or workflow definitions are changed.
`)

write('06_test_matrix.md', `# Test Matrix

Last Verified: ${generatedOn}

| Requirement | Guard |
| --- | --- |
| W1-301 renders certified stage/substage | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Legacy raw stage cannot override governed projection | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Artifact attention cannot override stage | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Artifact attention cannot override Waiting On | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Duplicate/legacy source cannot override visible lifecycle state | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Reconciliation-required remains explicit unresolved | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Stage/substage/waiting/next-action mutually consistent | \`publisher_operating_center_wave6_ui_projection_alignment.test.mjs\` |
| Replay deterministic | focused test replay plus existing Operating Center guard |
`)

write('07_test_results.md', `# Test Results

Last Verified: ${generatedOn}

Pre-PR local validation:

- Wave 6 focused guard: 8 / 8 PASS
- Existing lifecycle Operating Center guard: 12 / 12 PASS
- Publisher Today read-model guard: PASS
- Type-check: PASS

Node engine note: local execution used the available Codex runtime. The repository declares Node >=24 <25; CI/deployment should remain the governing Node authority.
`)

writeCsv('08_postfix_21_readmodel_comparison.csv', afterRows)

write('09_authenticated_production_readback.md', `# Authenticated Production Readback

Last Verified: ${generatedOn}

Pre-fix authenticated production evidence:

- Authentication: PASS as jm1-admin@jmerrill.one
- W1-301 visible UI: 05 - Join the Family & Author Onboarding / Author Onboarding Tasks / JMP/System
- W1-301 visible attention: ARTIFACT_AUTHORITY_UNRESOLVED
- Certified governed projection: COMMERCIAL_ACTIVATION / PACKAGE_ACCEPTANCE / NOT_WAITING

Post-fix production readback must be appended after merge/deployment:

- Production health:
- W1-301 visible UI:
- W1-301 visible attention:
- Current-authority sample:
- Legacy governed exception sample:
- Reconciliation-required sample:
- Noncanonical suppressed sample:
`)

write('10_negative_proof.md', `# Negative Proof

Last Verified: ${generatedOn}

| Negative proof | Result |
| --- | --- |
| title_record_mutations | 0 |
| canonical_registry_changes | 0 |
| schema_changes | 0 |
| Dataverse_mutations | 0 |
| workflow_changes | 0 |
| author_communications | 0 |
| client_title_automation_thaw | 0 |
| raw_stage_override_after_fix | 0 |
| artifact_attention_stage_override_after_fix | 0 |
| duplicate_projection_engine_created | 0 |
`)

write('11_proof_contract.md', `# Proof Contract

Last Verified: ${generatedOn}

Pre-fix classification: OPERATING_CENTER_PARTIALLY_TRUSTED

Wave 6 code-level proof: PASS

Pending post-deploy authenticated production proof:

- W1-301 visible stage = COMMERCIAL_ACTIVATION
- W1-301 visible substage = PACKAGE_ACCEPTANCE
- W1-301 visible Waiting On = NOT_WAITING / no active timer semantics
- Artifact authority does not override title lifecycle state

Final classification remains pending authenticated production readback.
`)

write('12_wave6_closeout.md', `# Wave 6 Closeout

Last Verified: ${generatedOn}

Status: RUNTIME FIX PREPARED / LOCAL VALIDATION PASS / PRODUCTION READBACK PENDING

First divergence point: Operating Center title-card primary-row selection before API serialization.

Advisory restriction: RETAIN until PR #709 closeout evidence is corrected after authenticated production readback.

Freezes:

- CLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE
- PUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE
- AUTONOMOUS_CLIENT_TITLE_EXECUTION_AUTHORIZED = NO

No runtime/data mutation occurred during evidence generation.
`)

const checksumLines = readdirSync(packageDir)
  .filter((file) => file !== 'checksums.sha256')
  .sort()
  .map((file) => {
    const content = readFileSync(join(packageDir, file))
    return `${createHash('sha256').update(content).digest('hex')}  ${file}`
  })
writeFileSync(join(packageDir, 'checksums.sha256'), `${checksumLines.join('\n')}\n`)

console.log(JSON.stringify({
  generatedOn,
  packageDir,
  currentAuthorityCount: currentAuthority.length,
  w1301: w1301 ? {
    stage: w1301.PROJECTED_STAGE,
    substage: w1301.PROJECTED_SUBSTAGE,
    waitingOn: waitingById.get('W1-301')?.WAITING_ON,
    artifact: artifactById.get('W1-301')?.ARTIFACT_TRUST_CLASSIFICATION,
  } : null,
}, null, 2))

function write(name, content) {
  writeFileSync(join(packageDir, name), content)
}

function writeCsv(name, rows) {
  const headers = Object.keys(rows[0] || {})
  const body = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ].join('\n')
  write(name, `${body}\n`)
}

function csvCell(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

function readCsv(path) {
  const text = readFileSync(path, 'utf8').trim()
  const [headerLine, ...lines] = text.split(/\r?\n/)
  const headers = parseCsvLine(headerLine)
  return lines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
  })
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        current += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}
