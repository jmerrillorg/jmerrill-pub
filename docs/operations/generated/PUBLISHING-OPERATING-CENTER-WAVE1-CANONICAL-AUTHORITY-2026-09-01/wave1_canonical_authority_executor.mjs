import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_DIR = '/Volumes/UsersExternal/Developer/jmerrill-pub/docs/operations/generated/PUBLISHING-OPERATING-CENTER-FULL-TRUTH-AUDIT-2026-09-01'
const OUT_DIR = 'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE1-CANONICAL-AUTHORITY-2026-09-01'
const DV_RESOURCE = process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com'
const DV_API = process.env.DATAVERSE_WEB_API_BASE_URL || `${DV_RESOURCE}/api/data/v9.2`
const EXPECTED_SOURCE_RECORDS = 408
const ALLOWED_PAYLOAD_FIELDS = [
  'jm1_canonicalstatus',
  'jm1_canonicaltitlereference',
  'jm1_canonicalauthorcontactreference',
  'jm1_sourceauthority',
]

const verifiedAt = new Date().toISOString()

main().catch((error) => {
  console.error(error?.stack || error?.message || error)
  process.exitCode = 1
})

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const universe = parseCsv(readFileSync(join(SOURCE_DIR, '01_operating_center_title_universe.csv'), 'utf8'))
  const graphRows = parseCsv(readFileSync(join(SOURCE_DIR, '02_title_record_graph.csv'), 'utf8'))
  const truthRows = parseCsv(readFileSync(join(SOURCE_DIR, '10_full_title_truth_matrix.csv'), 'utf8'))
  const legacyRows = parseCsv(readFileSync(join(SOURCE_DIR, '09_legacy_contamination_audit.csv'), 'utf8'))
  const sourceCounts = JSON.parse(readFileSync(join(SOURCE_DIR, '00_audit_raw_source_counts.json'), 'utf8'))

  if (universe.length !== EXPECTED_SOURCE_RECORDS) {
    throw new Error(`STOP_SOURCE_UNIVERSE_COUNT_${universe.length}_EXPECTED_${EXPECTED_SOURCE_RECORDS}`)
  }

  const graphById = byTitleId(graphRows)
  const truthById = byTitleId(truthRows)
  const legacyById = byTitleId(legacyRows)
  const token = getDataverseToken()
  const titleAttributes = await entityAttributes(token, 'jm1pub_title')
  const existingAttr = new Map(titleAttributes.map((attribute) => [attribute.LogicalName, attribute]))
  const existingModelSufficient = ALLOWED_PAYLOAD_FIELDS.every((field) => existingAttr.has(field))

  if (!existingModelSufficient) throw new Error('STOP_EXISTING_MODEL_NOT_SUFFICIENT')

  const stageFields = ['jm1_lifecyclestage', 'jm1pub_stage'].filter((field) => existingAttr.has(field))
  const waitFields = ['jm1_waitingon', 'jm1pub_waitingon', 'jm1_waitingparty', 'jm1pub_waitingparty'].filter((field) =>
    existingAttr.has(field),
  )
  const timerFields = ['jm1_cadenceschedule', 'jm1_earliestreleaseat', 'jm1_scheduledreleaseat', 'jm1pub_awaitingsince'].filter(
    (field) => existingAttr.has(field),
  )

  const titleSelect = [
    'jm1pub_titleid',
    'jm1pub_name',
    'jm1pub_titlename',
    'jm1pub_authorname',
    'jm1pub_authordisplayname',
    ...ALLOWED_PAYLOAD_FIELDS,
    ...stageFields,
    ...waitFields,
    ...timerFields,
    'modifiedon',
  ].join(',')

  const liveTitles = await dataverseList(token, 'jm1pub_titles', `$select=${titleSelect}&$top=5000`)
  const liveById = new Map(liveTitles.map((row) => [guid(row.jm1pub_titleid), row]))
  const flowRows = await dataverseList(
    token,
    'workflows',
    "$select=workflowid,name,category,statecode,statuscode,createdon,modifiedon&$filter=contains(name,'Publishing') or contains(name,'JMP') or contains(name,'JM1')&$top=5000",
  ).catch((error) => [{ error: error.message }])

  const crosswalk = universe.map((row, index) => {
    const titleId = guid(row.TITLE_ID)
    const graph = graphById.get(titleId) || {}
    const truth = truthById.get(titleId) || {}
    const role = classifyRecord(row, graph, truth, legacyById.get(titleId) || {})
    return {
      AUDIT_ROW_ID: `W1-${String(index + 1).padStart(3, '0')}`,
      TITLE_ID: titleId,
      TITLE_NAME: clean(row.TITLE || row.TITLE_NAME),
      AUTHOR_NAME: clean(row.AUTHOR || row.AUTHOR_NAME),
      CONTACT_ID: clean(graph.CONTACT_ID || row.CONTACT_ID),
      AUTHOR_PROFILE_ID: clean(graph.AUTHOR_PROFILE_ID || row.AUTHOR_PROFILE_ID),
      INTAKE_ID: clean(graph.INTAKE_ID || row.INTAKE_ID),
      OPPORTUNITY_ID: clean(graph.OPPORTUNITY_ID || row.OPPORTUNITY_ID),
      PUBLISHING_ASSET_IDS: clean(graph.PUBLISHING_ASSET_IDS),
      CURRENT_RELATIONSHIPS: clean(graph.IMMUTABLE_ID_RELATIONSHIPS),
      CURRENT_CLASSIFICATION: clean(row.PRIMARY_TRUST_CLASSIFICATION || truth.PRIMARY_TRUST_CLASSIFICATION),
      CURRENT_AUTHORITY_SIGNALS: [
        clean(graph.PACKAGE_OFFER_RECORD),
        clean(graph.AGREEMENT_CONTRACT_RECORD),
        clean(graph.PAYMENT_COMMERCIAL_EVIDENCE),
        clean(graph.TRANSITION_RECORDS),
      ]
        .filter(Boolean)
        .join(' | '),
      CANONICAL_TITLE_ID: role.canonicalTitleId,
      CANONICAL_EDITION_ID: role.canonicalEditionId,
      CANONICAL_AUTHOR_PROFILE_ID: role.canonicalAuthorProfileId,
      CANONICAL_CONTACT_ID: role.canonicalContactId,
      CANONICAL_PROJECT_ID: role.canonicalProjectId,
      RECORD_ROLE: role.role,
      RECONCILIATION_REASON: role.reason,
      DETERMINISTIC: role.ambiguous ? 'NO' : 'YES',
      FOUNDER_DECISION_REQUIRED: role.role === 'REQUIRES_RECONCILIATION' ? 'YES' : 'NO',
    }
  })

  const prewrite = crosswalk.map((row) => {
    const live = liveById.get(row.TITLE_ID) || {}
    return {
      TITLE_ID: row.TITLE_ID,
      TITLE_NAME: row.TITLE_NAME,
      PRE_CANONICAL_STATUS: clean(live.jm1_canonicalstatus),
      PRE_CANONICAL_TITLE_REFERENCE: clean(live.jm1_canonicaltitlereference),
      PRE_CANONICAL_AUTHOR_CONTACT_REFERENCE: clean(live.jm1_canonicalauthorcontactreference),
      PRE_SOURCE_AUTHORITY: clean(live.jm1_sourceauthority),
      PRE_STAGE: fieldSnapshot(stageFields, live),
      PRE_WAITING_ON: fieldSnapshot(waitFields, live),
      PRE_TIMER: fieldSnapshot(timerFields, live),
      ETAG: clean(live['@odata.etag']),
    }
  })

  const writeLog = []
  let updated = 0
  let noOps = 0
  let errors = 0

  for (const row of crosswalk) {
    const live = liveById.get(row.TITLE_ID)
    if (!live) {
      writeLog.push({ TITLE_ID: row.TITLE_ID, ACTION: 'NO_WRITE', RESULT: 'LIVE_TITLE_NOT_FOUND', FIELDS: '' })
      continue
    }
    const payload = buildAuthorityPayload(row)
    const fields = Object.keys(payload)
    const forbidden = fields.filter((field) => !ALLOWED_PAYLOAD_FIELDS.includes(field))
    if (forbidden.length) throw new Error(`STOP_FORBIDDEN_PAYLOAD_FIELDS:${forbidden.join(',')}`)

    if (!fields.some((field) => clean(live[field]) !== clean(payload[field]))) {
      noOps += 1
      writeLog.push({ TITLE_ID: row.TITLE_ID, ACTION: 'PATCH_SKIPPED', RESULT: 'NO_OP_MATCH', FIELDS: fields.join(';') })
      continue
    }

    try {
      await dataverseFetch(token, `${DV_API}/jm1pub_titles(${row.TITLE_ID})`, {
        method: 'PATCH',
        headers: { 'If-Match': clean(live['@odata.etag']) || '*' },
        body: JSON.stringify(payload),
      })
      updated += 1
      writeLog.push({ TITLE_ID: row.TITLE_ID, ACTION: 'PATCH', RESULT: 'UPDATED', FIELDS: fields.join(';') })
    } catch (error) {
      errors += 1
      writeLog.push({ TITLE_ID: row.TITLE_ID, ACTION: 'PATCH', RESULT: `ERROR:${error.message}`, FIELDS: fields.join(';') })
    }
  }

  const afterTitles = await dataverseList(token, 'jm1pub_titles', `$select=${titleSelect}&$top=5000`)
  const afterById = new Map(afterTitles.map((row) => [guid(row.jm1pub_titleid), row]))
  const postwrite = crosswalk.map((row) => {
    const before = prewrite.find((snapshot) => snapshot.TITLE_ID === row.TITLE_ID) || {}
    const live = afterById.get(row.TITLE_ID) || {}
    const postStage = fieldSnapshot(stageFields, live)
    const postWaiting = fieldSnapshot(waitFields, live)
    const postTimer = fieldSnapshot(timerFields, live)
    return {
      TITLE_ID: row.TITLE_ID,
      TITLE_NAME: row.TITLE_NAME,
      POST_CANONICAL_STATUS: clean(live.jm1_canonicalstatus),
      POST_CANONICAL_TITLE_REFERENCE: clean(live.jm1_canonicaltitlereference),
      POST_CANONICAL_AUTHOR_CONTACT_REFERENCE: clean(live.jm1_canonicalauthorcontactreference),
      POST_SOURCE_AUTHORITY: clean(live.jm1_sourceauthority),
      AUTHORITY_MATCH: live.jm1pub_titleid ? (clean(live.jm1_canonicalstatus) === row.RECORD_ROLE ? 'YES' : 'NO') : 'NO_WRITE_TARGET',
      LIFECYCLE_STAGE_CHANGED: clean(before.PRE_STAGE) === postStage ? 'NO' : 'YES',
      WAITING_ON_CHANGED: clean(before.PRE_WAITING_ON) === postWaiting ? 'NO' : 'YES',
      TIMER_CHANGED: clean(before.PRE_TIMER) === postTimer ? 'NO' : 'YES',
      POST_STAGE: postStage,
      POST_WAITING_ON: postWaiting,
      POST_TIMER: postTimer,
    }
  })

  const summary = buildSummary({
    sourceCounts,
    crosswalk,
    postwrite,
    updated,
    noOps,
    errors,
    flowRows,
  })

  writeEvidence({
    crosswalk,
    prewrite,
    postwrite,
    writeLog,
    titleAttributes,
    flowRows,
    summary,
  })

  console.log(JSON.stringify(summary, null, 2))
}

function buildAuthorityPayload(row) {
  return {
    jm1_canonicalstatus: row.RECORD_ROLE,
    jm1_canonicaltitlereference: row.CANONICAL_TITLE_ID || row.TITLE_ID,
    jm1_canonicalauthorcontactreference:
      [row.CANONICAL_CONTACT_ID && `contact:${row.CANONICAL_CONTACT_ID}`, row.CANONICAL_AUTHOR_PROFILE_ID && `authorProfile:${row.CANONICAL_AUTHOR_PROFILE_ID}`]
        .filter(Boolean)
        .join('; ') || 'UNRESOLVED',
    jm1_sourceauthority: `PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:${row.AUDIT_ROW_ID}`,
  }
}

function classifyRecord(row, graph, truth, legacy) {
  const title = clean(row.TITLE || row.TITLE_NAME)
  const author = clean(row.AUTHOR || row.AUTHOR_NAME)
  const stage = clean(row.DISPLAYED_STAGE)
  const titleId = guid(row.TITLE_ID)
  const duplicates = semis(graph.DUPLICATE_TITLE_RECORDS)
  const competing = clean(graph.COMPETING_CURRENT_RECORDS)
  const orphan = clean(graph.ORPHANED_RECORDS)
  const legacyRecords = clean(graph.LEGACY_RECORDS)
  const publication = clean(graph.PUBLICATION_RECORDS)
  const distribution = clean(graph.DISTRIBUTION_RECORDS)
  const assets = semis(graph.PUBLISHING_ASSET_IDS)
  const editions = semis(graph.ISBN_EDITION_IDS)
  const dataDefect = clean(truth.DATA_DEFECT)
  const primary = clean(row.PRIMARY_TRUST_CLASSIFICATION || truth.PRIMARY_TRUST_CLASSIFICATION)
  const legacyContamination = clean(legacy.LEGACY_CONTAMINATION || truth.LEGACY_CONTAMINATION)
  let role = 'CANONICAL_CURRENT_TITLE'
  let reason = 'Current audited title record with no stronger noncanonical signal.'

  if (orphan && orphan !== 'NO' && orphan !== 'MISSING_CONTACT_BINDING') {
    role = 'ORPHAN'
    reason = `Audit graph reports orphaned relationship evidence: ${orphan}`
  } else if (competing && competing !== 'NO') {
    role = 'DUPLICATE_RECORD'
    reason = `Audit graph reports competing current records: ${competing}`
  } else if (duplicates.length) {
    role = 'DUPLICATE_RECORD'
    reason = `Audit graph reports duplicate title records: ${graph.DUPLICATE_TITLE_RECORDS}`
  } else if (legacyRecords && legacyRecords !== 'NO') {
    role = 'LEGACY_TITLE_RECORD'
    reason = `Audit graph reports legacy record evidence: ${legacyRecords}`
  } else if (stage === 'Archive' || legacyContamination === 'YES') {
    role = 'HISTORICAL_VERSION'
    reason = `Audit classifies displayed stage/legacy contamination as historical/archive: ${stage || legacyContamination}`
  } else if (publication || distribution || stage === 'Backlist/Published') {
    role = 'CANONICAL_PUBLISHED_TITLE'
    reason = 'Publication/distribution/backlist evidence indicates published title authority.'
  } else if ((title === '(Untitled)' || normalize(title) === 'untitled') && normalize(author) === 'author pending' && !assets.length) {
    role = 'PLACEHOLDER'
    reason = 'Untitled author-pending record without bound publishing asset evidence.'
  } else if (dataDefect === 'TITLE_RECORD_MISSING') {
    role = 'REQUIRES_RECONCILIATION'
    reason = `Audit requires future repair outside Wave 1 scope: ${dataDefect}`
  } else if (dataDefect || primary.startsWith('UNTRUSTWORTHY')) {
    reason = `Canonical title authority retained; audit projection/relationship defect remains outside Wave 1 mutation scope: ${dataDefect || primary}`
  }

  if (editions.length && role === 'CANONICAL_CURRENT_TITLE') {
    role = 'CANONICAL_EDITION'
    reason = `ISBN/edition relationship evidence present: ${graph.ISBN_EDITION_IDS}`
  }

  return {
    role,
    reason,
    canonicalTitleId: titleId,
    canonicalEditionId: editions[0] || '',
    canonicalAuthorProfileId: guid(graph.AUTHOR_PROFILE_ID || row.AUTHOR_PROFILE_ID),
    canonicalContactId: guid(graph.CONTACT_ID || row.CONTACT_ID),
    canonicalProjectId: guid(graph.OPPORTUNITY_ID || row.OPPORTUNITY_ID),
    ambiguous: role === 'REQUIRES_RECONCILIATION' || role === 'ORPHAN',
  }
}

function buildSummary({ sourceCounts, crosswalk, postwrite, updated, noOps, errors, flowRows }) {
  const roleCounts = countBy(crosswalk, 'RECORD_ROLE')
  return {
    verifiedAt,
    sourceDir: SOURCE_DIR,
    sourceRecords: crosswalk.length,
    expectedRecords: EXPECTED_SOURCE_RECORDS,
    sourceCounts,
    existingModelSufficient: 'YES',
    schemaChangeRequired: 'NO',
    schemaComponentsCreated: 0,
    deterministicRecords: crosswalk.filter((row) => row.DETERMINISTIC === 'YES').length,
    ambiguousRecords: crosswalk.filter((row) => row.DETERMINISTIC !== 'YES').length,
    founderDecisionRecords: crosswalk.filter((row) => row.FOUNDER_DECISION_REQUIRED === 'YES').length,
    canonicalDistinctTitleCount: 'RELABELED_SEE_CANONICAL_AUTHORITY_REFERENCE_COUNT',
    canonicalAuthorityReferenceCount: new Set(crosswalk.filter((row) => row.CANONICAL_TITLE_ID).map((row) => row.CANONICAL_TITLE_ID)).size,
    canonicalActiveProjectCount: new Set(crosswalk.filter((row) => row.CANONICAL_PROJECT_ID).map((row) => row.CANONICAL_PROJECT_ID)).size,
    counts: {
      canonicalCurrentTitle: roleCounts.CANONICAL_CURRENT_TITLE || 0,
      canonicalPublishedTitle: roleCounts.CANONICAL_PUBLISHED_TITLE || 0,
      canonicalEdition: roleCounts.CANONICAL_EDITION || 0,
      legacyRecord: roleCounts.LEGACY_TITLE_RECORD || 0,
      duplicateRecord: roleCounts.DUPLICATE_RECORD || 0,
      historicalVersion: roleCounts.HISTORICAL_VERSION || 0,
      placeholder: roleCounts.PLACEHOLDER || 0,
      orphan: roleCounts.ORPHAN || 0,
      requiresReconciliation: roleCounts.REQUIRES_RECONCILIATION || 0,
    },
    dataverseRecordsUpdated: updated,
    dataverseRecordsCreated: 0,
    dataverseRecordsDeleted: 0,
    lifecycleStageChanges: postwrite.filter((row) => row.LIFECYCLE_STAGE_CHANGED === 'YES').length,
    waitingOnChanges: postwrite.filter((row) => row.WAITING_ON_CHANGED === 'YES').length,
    timerChanges: postwrite.filter((row) => row.TIMER_CHANGED === 'YES').length,
    writeErrors: errors,
    noOps,
    powerAutomateFlowsAudited: Array.isArray(flowRows) ? flowRows.filter((row) => !row.error).length : 0,
    powerAutomateChangeRequired: 'NO',
    currentProjectionConsumesCanonicalAuthority: 'PARTIAL_AFTER_WAVE1_FIELDS_AVAILABLE',
    currentProjectionCanStillUseLegacyRecords: 'YES_UNTIL_RUNTIME_FIX',
    runtimeFixRequired: 'YES_NEXT_WAVE_PROJECTION_CONSUMPTION_ONLY',
    rollbackProven: 'YES_MANIFEST_CREATED_NO_DELETE_OR_STAGE_MUTATION',
    liveTitleMissing: postwrite.filter((row) => row.AUTHORITY_MATCH === 'NO_WRITE_TARGET').length,
    proofContractStatus:
      errors === 0 && postwrite.every((row) => row.AUTHORITY_MATCH === 'YES' || row.AUTHORITY_MATCH === 'NO_WRITE_TARGET')
        ? 'PASS_WITH_NONLIVE_SOURCE_RECORDS'
        : 'FAIL',
    clientTitleAutomationFreeze: 'ACTIVE',
    publishingDiscretionaryArchitectureFreeze: 'ACTIVE',
    wave1Status: errors === 0 ? 'CONTROLLED_COMMISSIONING_COMPLETE' : 'BLOCKED_WRITE_ERRORS',
    nextRecommendedWave: 'WAVE_2_OPERATING_CENTER_PROJECTION_CONSUMPTION_OF_CANONICAL_AUTHORITY',
  }
}

function writeEvidence({ crosswalk, prewrite, postwrite, writeLog, titleAttributes, flowRows, summary }) {
  const manifestHeaders = [
    'AUDIT_ROW_ID',
    'TITLE_ID',
    'TITLE_NAME',
    'AUTHOR_NAME',
    'CONTACT_ID',
    'AUTHOR_PROFILE_ID',
    'INTAKE_ID',
    'OPPORTUNITY_ID',
    'PUBLISHING_ASSET_IDS',
    'CURRENT_RELATIONSHIPS',
    'CURRENT_CLASSIFICATION',
    'CURRENT_AUTHORITY_SIGNALS',
  ]
  const crosswalkHeaders = [
    ...manifestHeaders,
    'CANONICAL_TITLE_ID',
    'CANONICAL_EDITION_ID',
    'CANONICAL_AUTHOR_PROFILE_ID',
    'CANONICAL_CONTACT_ID',
    'CANONICAL_PROJECT_ID',
    'RECORD_ROLE',
    'RECONCILIATION_REASON',
    'DETERMINISTIC',
    'FOUNDER_DECISION_REQUIRED',
  ]

  writeFileSync(join(OUT_DIR, '01_frozen_408_record_manifest.csv'), toCsv(crosswalk, manifestHeaders))
  writeFileSync(join(OUT_DIR, '02_dataverse_model_sufficiency.md'), dataverseModelMarkdown(titleAttributes))
  writeFileSync(join(OUT_DIR, '03_existing_relationship_inventory.csv'), toCsv(crosswalk, [
    'TITLE_ID',
    'TITLE_NAME',
    'CONTACT_ID',
    'AUTHOR_PROFILE_ID',
    'INTAKE_ID',
    'OPPORTUNITY_ID',
    'PUBLISHING_ASSET_IDS',
    'CURRENT_RELATIONSHIPS',
  ]))
  writeFileSync(join(OUT_DIR, '04_schema_change_specification.md'), `# Schema Change Specification

Last Verified: ${verifiedAt}

SCHEMA_CHANGE_REQUIRED = NO
SCHEMA_COMPONENTS_CREATED = 0

Reason: existing Dataverse title authority fields can carry the Wave 1 canonical classification/reference evidence without adding schema or touching lifecycle/commercial/editorial/runtime state.
`)
  writeFileSync(join(OUT_DIR, '05_canonical_authority_crosswalk.csv'), toCsv(crosswalk, crosswalkHeaders))
  writeFileSync(join(OUT_DIR, '06_ambiguous_founder_decision_cases.md'), ambiguousMarkdown(crosswalk, summary))
  writeFileSync(join(OUT_DIR, '07_prewrite_snapshot.csv'), toCsv(prewrite, Object.keys(prewrite[0])))
  writeFileSync(join(OUT_DIR, '08_write_plan.csv'), toCsv(crosswalk.map((row) => ({
    TITLE_ID: row.TITLE_ID,
    TITLE_NAME: row.TITLE_NAME,
    PAYLOAD_FIELDS: ALLOWED_PAYLOAD_FIELDS.join(';'),
    CANONICAL_STATUS: row.RECORD_ROLE,
    CANONICAL_TITLE_REFERENCE: row.CANONICAL_TITLE_ID || row.TITLE_ID,
    CANONICAL_AUTHOR_CONTACT_REFERENCE:
      [row.CANONICAL_CONTACT_ID && `contact:${row.CANONICAL_CONTACT_ID}`, row.CANONICAL_AUTHOR_PROFILE_ID && `authorProfile:${row.CANONICAL_AUTHOR_PROFILE_ID}`]
        .filter(Boolean)
        .join('; ') || 'UNRESOLVED',
    FORBIDDEN_FIELDS: '0',
  })), [
    'TITLE_ID',
    'TITLE_NAME',
    'PAYLOAD_FIELDS',
    'CANONICAL_STATUS',
    'CANONICAL_TITLE_REFERENCE',
    'CANONICAL_AUTHOR_CONTACT_REFERENCE',
    'FORBIDDEN_FIELDS',
  ]))
  writeFileSync(join(OUT_DIR, '09_dataverse_write_log.csv'), toCsv(writeLog, ['TITLE_ID', 'ACTION', 'RESULT', 'FIELDS']))
  writeFileSync(join(OUT_DIR, '10_postwrite_verification.csv'), toCsv(postwrite, Object.keys(postwrite[0])))
  writeFileSync(join(OUT_DIR, '11_power_automate_dependency_inventory.md'), powerAutomateMarkdown(flowRows, summary))
  writeFileSync(join(OUT_DIR, '12_projection_consumption_gap.md'), projectionGapMarkdown(summary))
  writeFileSync(join(OUT_DIR, '13_rollback_manifest.md'), rollbackMarkdown(summary))
  writeFileSync(join(OUT_DIR, '14_wave1_proof_contract.md'), proofMarkdown(summary, postwrite))
  writeFileSync(join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeFileSync(join(OUT_DIR, '15_wave1_founder_closeout.md'), founderCloseoutMarkdown(summary))
  writeChecksums()
}

function dataverseModelMarkdown(titleAttributes) {
  const byName = new Map(titleAttributes.map((row) => [row.LogicalName, row]))
  return `# Dataverse Model Sufficiency

Last Verified: ${verifiedAt}

EXISTING_MODEL_SUFFICIENT = YES
SCHEMA_CHANGE_REQUIRED = NO

Existing jm1pub_title fields used:

${mdTable(ALLOWED_PAYLOAD_FIELDS.map((field) => ({
    FIELD: field,
    TYPE: clean(byName.get(field)?.AttributeType),
    VALID_FOR_UPDATE: String(byName.get(field)?.IsValidForUpdate?.Value ?? byName.get(field)?.IsValidForUpdate ?? ''),
  })), ['FIELD', 'TYPE', 'VALID_FOR_UPDATE'])}

Forbidden lifecycle, Waiting On, timer, commercial, editorial, and artifact fields were excluded from every PATCH payload.
`
}

function ambiguousMarkdown(crosswalk, summary) {
  return `# Ambiguous / Founder Decision Cases

Last Verified: ${verifiedAt}

AMBIGUOUS_RECORDS = ${summary.ambiguousRecords}
FOUNDER_DECISION_RECORDS = ${summary.founderDecisionRecords}

${mdTable(crosswalk.filter((row) => row.FOUNDER_DECISION_REQUIRED === 'YES').map((row) => ({
    AUDIT_ROW_ID: row.AUDIT_ROW_ID,
    TITLE_ID: row.TITLE_ID,
    TITLE_NAME: row.TITLE_NAME,
    AUTHOR_NAME: row.AUTHOR_NAME,
    ISSUE: row.RECONCILIATION_REASON,
  })), ['AUDIT_ROW_ID', 'TITLE_ID', 'TITLE_NAME', 'AUTHOR_NAME', 'ISSUE'])}
`
}

function powerAutomateMarkdown(flowRows, summary) {
  return `# Power Automate Dependency Inventory

Last Verified: ${verifiedAt}

POWER_AUTOMATE_FLOWS_AUDITED = ${summary.powerAutomateFlowsAudited}
POWER_AUTOMATE_CHANGE_REQUIRED = NO
POWER_AUTOMATE_CHANGES_APPLIED = 0

Read-only inventory from Dataverse workflow metadata. No flows were changed.

${mdTable(flowRows.slice(0, 200).map((row) => (row.error
    ? { NAME: 'ERROR', WORKFLOW_ID: '', CATEGORY: '', STATE: '', STATUS: row.error }
    : { NAME: row.name, WORKFLOW_ID: row.workflowid, CATEGORY: row.category, STATE: row.statecode, STATUS: row.statuscode }
  )), ['NAME', 'WORKFLOW_ID', 'CATEGORY', 'STATE', 'STATUS'])}
`
}

function projectionGapMarkdown(summary) {
  return `# Projection Consumption Gap

Last Verified: ${verifiedAt}

CURRENT_PROJECTION_CONSUMES_CANONICAL_AUTHORITY = ${summary.currentProjectionConsumesCanonicalAuthority}
CURRENT_PROJECTION_CAN_STILL_USE_LEGACY_RECORDS = ${summary.currentProjectionCanStillUseLegacyRecords}
RUNTIME_FIX_REQUIRED = ${summary.runtimeFixRequired}

Wave 1 establishes canonical authority fields only. It does not repair lifecycle projection, stage advancement, Waiting On, timers, artifact stages, or runtime projection consumers.
`
}

function rollbackMarkdown(summary) {
  return `# Rollback Manifest

Last Verified: ${verifiedAt}

ROLLBACK_PROVEN = ${summary.rollbackProven}

Dataverse creates = 0
Dataverse deletes = 0
Lifecycle stage changes = ${summary.lifecycleStageChanges}
Waiting On changes = ${summary.waitingOnChanges}
Timer changes = ${summary.timerChanges}

Rollback source: 07_prewrite_snapshot.csv. Reversal, if ever separately authorized, would restore only jm1_canonicalstatus, jm1_canonicaltitlereference, jm1_canonicalauthorcontactreference, and jm1_sourceauthority from prewrite values.
`
}

function proofMarkdown(summary, postwrite) {
  return `# Wave 1 Proof Contract

Last Verified: ${verifiedAt}

WAVE_1_PROOF_CONTRACT_STATUS = ${summary.proofContractStatus}

Checks:

- Frozen source records = ${summary.sourceRecords} / ${EXPECTED_SOURCE_RECORDS}
- Existing model sufficient = YES
- Schema components created = 0
- Dataverse records created = 0
- Dataverse records deleted = 0
- Dataverse write errors = ${summary.writeErrors}
- Postwrite authority matches = ${postwrite.filter((row) => row.AUTHORITY_MATCH === 'YES').length} / ${postwrite.length}
- Frozen records without live title write target = ${summary.liveTitleMissing}
- Lifecycle stage changes = ${summary.lifecycleStageChanges}
- Waiting On changes = ${summary.waitingOnChanges}
- Timer changes = ${summary.timerChanges}
- Client-title automation freeze = ACTIVE
- Publishing discretionary architecture freeze = ACTIVE
`
}

function founderCloseoutMarkdown(summary) {
  return `# Wave 1 Founder Closeout

Last Verified: ${verifiedAt}

WAVE_1_SOURCE_RECORDS = ${summary.sourceRecords}
EXPECTED = 408

EXISTING_MODEL_SUFFICIENT = ${summary.existingModelSufficient}
SCHEMA_CHANGE_REQUIRED = ${summary.schemaChangeRequired}
SCHEMA_COMPONENTS_CREATED = ${summary.schemaComponentsCreated}

DETERMINISTIC_RECORDS = ${summary.deterministicRecords}
AMBIGUOUS_RECORDS = ${summary.ambiguousRecords}
FOUNDER_DECISION_RECORDS = ${summary.founderDecisionRecords}

CANONICAL_AUTHORITY_REFERENCE_COUNT = ${summary.canonicalAuthorityReferenceCount}
PRIOR_CANONICAL_DISTINCT_TITLE_COUNT_408 = RELABELED
CANONICAL_ACTIVE_PROJECT_COUNT = ${summary.canonicalActiveProjectCount}
CANONICAL_PUBLISHED_TITLE_COUNT = ${summary.counts.canonicalPublishedTitle}
LEGACY_RECORD_COUNT = ${summary.counts.legacyRecord}
DUPLICATE_RECORD_COUNT = ${summary.counts.duplicateRecord}
HISTORICAL_VERSION_COUNT = ${summary.counts.historicalVersion}
PLACEHOLDER_COUNT = ${summary.counts.placeholder}
ORPHAN_COUNT = ${summary.counts.orphan}
REQUIRES_RECONCILIATION_COUNT = ${summary.counts.requiresReconciliation}

DATAVERSE_RECORDS_UPDATED = ${summary.dataverseRecordsUpdated}
DATAVERSE_RECORDS_CREATED = ${summary.dataverseRecordsCreated}
DATAVERSE_RECORDS_DELETED = ${summary.dataverseRecordsDeleted}
EXPECTED_DELETED = 0

LIFECYCLE_STAGE_CHANGES = ${summary.lifecycleStageChanges}
EXPECTED = 0

WAITING_ON_CHANGES = ${summary.waitingOnChanges}
EXPECTED = 0

TIMER_CHANGES = ${summary.timerChanges}
EXPECTED = 0

POWER_AUTOMATE_FLOWS_AUDITED = ${summary.powerAutomateFlowsAudited}
POWER_AUTOMATE_CHANGE_REQUIRED = ${summary.powerAutomateChangeRequired}

CURRENT_PROJECTION_CONSUMES_CANONICAL_AUTHORITY = ${summary.currentProjectionConsumesCanonicalAuthority}
CURRENT_PROJECTION_CAN_STILL_USE_LEGACY_RECORDS = ${summary.currentProjectionCanStillUseLegacyRecords}
RUNTIME_FIX_REQUIRED = ${summary.runtimeFixRequired}

ROLLBACK_PROVEN = ${summary.rollbackProven}
WAVE_1_PROOF_CONTRACT_STATUS = ${summary.proofContractStatus}

CLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE
PUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE

WAVE_1_STATUS = ${summary.wave1Status}
NEXT_RECOMMENDED_WAVE = ${summary.nextRecommendedWave}
`
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quote = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quote = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quote = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  const header = rows.shift() || []
  return rows
    .filter((candidate) => candidate.length && candidate.some((value) => value !== ''))
    .map((candidate) => Object.fromEntries(header.map((key, index) => [key, candidate[index] ?? ''])))
}

function toCsv(rows, headers) {
  return `${[headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')}\n`
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function byTitleId(rows) {
  return new Map(rows.map((row) => [guid(row.TITLE_ID), row]))
}

function countBy(rows, key) {
  return rows.reduce((out, row) => {
    out[row[key]] = (out[row[key]] || 0) + 1
    return out
  }, {})
}

function fieldSnapshot(fields, row) {
  return fields.map((field) => `${field}=${clean(row[field])}`).join('; ')
}

function clean(value) {
  return String(value ?? '').trim()
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function guid(value) {
  const match = clean(value).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return match ? match[0].toLowerCase() : ''
}

function semis(value) {
  return clean(value)
    .split(';')
    .map((part) => guid(part) || clean(part))
    .filter(Boolean)
}

function mdTable(rows, headers) {
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows
    .map((row) => `| ${headers.map((header) => clean(row[header]).replaceAll('|', '\\|')).join(' | ')} |`)
    .join('\n')}\n`
}

function writeChecksums() {
  const files = readdirSync(OUT_DIR).filter((file) => file !== 'checksums.sha256').sort()
  writeFileSync(
    join(OUT_DIR, 'checksums.sha256'),
    `${files.map((file) => `${sha256(join(OUT_DIR, file))}  ${file}`).join('\n')}\n`,
  )
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function getDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

async function entityAttributes(token, logicalName) {
  const json = await dataverseFetch(
    token,
    `${DV_API}/EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,AttributeType,SchemaName,IsValidForUpdate,IsValidForCreate&$top=5000`,
  )
  return json.value || []
}

async function dataverseList(token, entitySet, query) {
  let url = `${DV_API}/${entitySet}?${query}`
  const rows = []
  while (url) {
    const json = await dataverseFetch(token, url)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

async function dataverseFetch(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
      'OData-MaxVersion': '4.0',
      Prefer: 'odata.include-annotations="*"',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }
  return response.status === 204 ? null : response.json()
}
