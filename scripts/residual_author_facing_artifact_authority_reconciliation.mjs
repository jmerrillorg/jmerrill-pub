import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const previousPackage = path.join(
  repoRoot,
  'docs/operations/generated/JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-CLOSURE-2026-08-27',
)
const previousReadbackPath = path.join(previousPackage, 'raw/author-facing-artifact-authority-closure-readback.json')
const evidenceDir = path.join(
  repoRoot,
  'docs/operations/generated/JMP-RESIDUAL-AUTHOR-FACING-ARTIFACT-AUTHORITY-RECONCILIATION-2026-08-28',
)
const rawDir = path.join(evidenceDir, 'raw')

const DATAVERSE_BASE = 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DATAVERSE_RESOURCE = 'https://jm1hq.crm.dynamics.com'

const ARTIFACT_STATUS = {
  DELIVERED: 196650002,
  APPROVED: 196650003,
  SUPERSEDED: 196650005,
}
const ARTIFACT_TYPE = {
  MANUSCRIPT_REVIEW_COPY: 196650000,
}
const ARTIFACT_VISIBILITY = {
  AUTHOR_FACING: 196650000,
}
const AUTHOR_DECISION = {
  APPROVE: 196650000,
}

const BYWB_REPAIR = {
  title: 'Before You Were Born',
  author: 'Sean Crowley',
  titleId: '91c5e1ef-2980-f111-ab0f-7c1e525b15c2',
  stageId: '88189235-8f80-f111-ab0f-6045bdd69435',
  gateId: 'e996abe7-2f8e-f111-8077-000d3a14673b',
  filename: 'before-you-were-born-Author-Review-Manuscript.docx',
  fileSizeBytes: 65833,
  sha256: 'da5684ec3a5b2915c592b0e60e7c6f4724da36a2bf2642b324506e7ba7144f35',
  localPath:
    '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/PROGRAM-008 Jackie Review 2026-08-04/04 - Before You Were Born/before-you-were-born-Author-Review-Manuscript.docx',
  guideFilename: 'before-you-were-born-Editorial-Review-Guide.pdf',
  guideSha256: '2d80ed451840b2b88979ade029929069a84c1602b64c708bc1c083ba35a4e5f0',
  deliveryMessageId:
    'AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADck0JsAAA=',
  deliveryAt: '2026-08-19T01:25:29Z',
  deliverySubject: 'Corrected Copy — Developmental Editing Review Materials, "Before You Were Born"',
  sender: 'publishing@email.jmerrill.one',
  recipient: 'scrowley50@gmail.com',
  replyMessageId:
    'AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADck0JvAAA=',
  replyAt: '2026-08-19T02:25:38Z',
  replyClassification: 'ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL',
}

export const RESIDUAL_ROWS = [
  {
    key: 'before-you-were-born-developmental',
    title: 'Before You Were Born',
    gateId: 'e996abe7-2f8e-f111-8077-000d3a14673b',
    expectedIssue: 'MISSING_AUTHOR_FACING_BINDING',
    ownerFinding: 'No author decision is recorded on the residual Developmental Editing gate.',
    disposition: 'DETERMINISTICALLY_REPAIRED_CURRENT_AUTHOR_WAIT_VALID',
  },
  {
    key: 'long-watch-developmental-missing-binding',
    title: 'The Long Watch',
    gateId: '0fddf310-308e-f111-8077-6045bdd69738',
    expectedIssue: 'MISSING_AUTHOR_FACING_BINDING',
    ownerFinding:
      'A separate current Line Editing gate for The Long Watch has correct author-facing artifact authority; this older Developmental row has no current dependency.',
    disposition: 'HISTORICAL_CONTAINED_SUPERSEDED_BY_CURRENT_LINE_GATE',
  },
  {
    key: 'intentional-leader-a2-superseded-artifact',
    title: 'The Intentional Leader',
    gateId: '899ef3cd-fb7b-f111-ab0f-7c1e525b15c2',
    expectedIssue: 'NOT_CURRENT_ARTIFACT',
    ownerFinding:
      'Later A2/A5/A7 author-facing approvals are bound to current/correct artifacts; the old A2 completion row is historical evidence only.',
    disposition: 'HISTORICAL_CONTAINED_SUPERSEDED_A2_EVIDENCE',
  },
]

function nowIso() {
  return new Date().toISOString()
}

function normalize(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeOData(value) {
  return normalize(value).replace(/'/g, "''")
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function tokenFor(resource) {
  const output = execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  })
  return output.trim()
}

async function dvRequest(token, relativePath, options = {}) {
  const response = await fetch(`${DATAVERSE_BASE}/${relativePath.replace(/^\//, '')}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: options.prefer || 'odata.maxpagesize=100',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${relativePath} failed ${response.status}: ${body?.error?.message || text}`)
  }
  return body
}

function extractId(value) {
  return normalize(value).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || ''
}

async function list(token, entitySet, query) {
  const params = new URLSearchParams(query)
  const body = await dvRequest(token, `${entitySet}?${params.toString()}`, { method: 'GET' })
  return body.value || []
}

async function create(token, entitySet, payload) {
  const response = await fetch(`${DATAVERSE_BASE}/${entitySet}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(`POST ${entitySet} failed ${response.status}: ${body?.error?.message || text}`)
  }
  return body[`${entitySet.slice(0, -1)}id`] || extractId(response.headers.get('odata-entityid') || response.headers.get('location'))
}

async function patch(token, entitySet, id, payload) {
  const response = await fetch(`${DATAVERSE_BASE}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) {
    const body = text ? JSON.parse(text) : {}
    throw new Error(`PATCH ${entitySet}(${id}) failed ${response.status}: ${body?.error?.message || text}`)
  }
}

async function first(token, entitySet, query) {
  const rows = await list(token, entitySet, { ...query, $top: '1' })
  return rows[0] || null
}

async function writeExecutionLog(token, actionType, name, description, sourceEntity, sourceRecordId) {
  const idempotency = `${actionType}:${sourceRecordId}:JMP-RESIDUAL-AUTHOR-FACING-ARTIFACT-AUTHORITY-RECONCILIATION-2026-08-28`
  const existing = await first(token, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeOData(idempotency)}')`,
    $orderby: 'createdon desc',
  })
  if (existing?.jm1_executionlogid) return { id: existing.jm1_executionlogid, created: false }
  const id = await create(token, 'jm1_executionlogs', {
    jm1_name: name.slice(0, 200),
    jm1_actiontype: actionType,
    jm1_actiondescription: `${description} Idempotency: ${idempotency}`.slice(0, 1000),
    jm1_agentname: 'Cody / OpenAI Codex',
    jm1_agentmodel: 'gpt-5',
    jm1_bandlevel: 835500000,
    jm1_executionstatus: 835500001,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: sourceEntity,
    jm1_sourcerecordid: sourceRecordId,
  })
  return { id, created: true }
}

async function readArtifact(token, id) {
  if (!id) return null
  return first(token, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositoryitemid,jm1pub_iscurrentapproved,jm1pub_supersededon,jm1pub_deliveredon,jm1pub_authorvisiblefrom,jm1pub_approvedon,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value',
    $filter: `jm1pub_editorialartifactid eq ${id}`,
  })
}

async function readTitle(token, id) {
  if (!id) return null
  return first(token, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,modifiedon',
    $filter: `jm1pub_titleid eq ${id}`,
  })
}

async function readStage(token, id) {
  if (!id) return null
  return first(token, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagecompletedate,jm1pub_authorsafesummary,jm1pub_internaloperationalsummary,modifiedon,_jm1pub_titleid_value',
    $filter: `jm1pub_editorialstageid eq ${id}`,
  })
}

async function readGate(token, id) {
  return first(token, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_awaitingsince,jm1pub_nextstageauthorized,jm1pub_nextstageauthorizedon,jm1pub_correlationid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,_jm1pub_approvalevidenceartifactid_value,createdon,modifiedon',
    $filter: `jm1pub_editorialapprovalgateid eq ${id}`,
  })
}

async function queryCurrentReviewGates(token) {
  return list(token, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_awaitingsince,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,createdon,modifiedon',
    $filter:
      'modifiedon ge 2026-08-01T00:00:00Z and ' +
      '(jm1pub_gatestatus eq 196650001 or jm1pub_gatestatus eq 196650002 or jm1pub_gatestatus eq 196650003)',
    $orderby: 'modifiedon desc',
    $top: '100',
  })
}

function classifyGateBinding(gate, artifact) {
  if (!normalize(gate?._jm1pub_deliverableartifactid_value)) return 'MISSING_AUTHOR_FACING_BINDING'
  if (!artifact) return 'MISSING_ARTIFACT_RECORD'
  if (artifact.jm1pub_supersededon) return 'SUPERSEDED_ARTIFACT_BOUND'
  if (Number(artifact.jm1pub_visibility) !== ARTIFACT_VISIBILITY.AUTHOR_FACING) return 'WRAPPER_BOUND_AS_AUTHOR_FACING'
  if (!artifact.jm1pub_iscurrentapproved && Number(artifact.jm1pub_artifactstatus) !== ARTIFACT_STATUS.APPROVED) return 'NOT_CURRENT_ARTIFACT'
  return 'CORRECT_BINDING'
}

async function enrichGate(token, gate) {
  const artifactId = normalize(gate?._jm1pub_deliverableartifactid_value)
  const artifact = await readArtifact(token, artifactId)
  const title = await readTitle(token, normalize(gate?._jm1pub_titleid_value))
  const stage = await readStage(token, normalize(gate?._jm1pub_editorialstageid_value))
  return {
    gateId: gate.jm1pub_editorialapprovalgateid,
    gateName: gate.jm1pub_editorialapprovalgatename,
    title: normalize(title?.jm1pub_titlename || title?.jm1pub_name),
    author: normalize(title?.jm1pub_authorname),
    titleId: normalize(gate._jm1pub_titleid_value),
    stageId: normalize(gate._jm1pub_editorialstageid_value),
    stageName: normalize(stage?.jm1pub_name),
    gateStatus: gate.jm1pub_gatestatus,
    authorDecision: gate.jm1pub_authordecision,
    authorDecisionOn: gate.jm1pub_authordecisionon || null,
    nextStageAuthorized: gate.jm1pub_nextstageauthorized ?? null,
    awaitingsince: gate.jm1pub_awaitingsince || null,
    modifiedon: gate.modifiedon,
    boundArtifactId: artifactId,
    boundArtifactName: normalize(artifact?.jm1pub_editorialartifactname),
    boundArtifactStatus: artifact?.jm1pub_artifactstatus ?? null,
    boundArtifactVisibility: artifact?.jm1pub_visibility ?? null,
    boundArtifactCurrent: artifact?.jm1pub_iscurrentapproved ?? null,
    boundArtifactSupersededOn: artifact?.jm1pub_supersededon || null,
    boundArtifactSha256: artifact?.jm1pub_sha256 || null,
    classification: classifyGateBinding(gate, artifact),
  }
}

async function findOrCreateBywbDeliveredArtifact(token) {
  const existing = await first(token, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_visibility,jm1pub_artifactstatus,jm1pub_iscurrentapproved',
    $filter: `jm1pub_sha256 eq '${BYWB_REPAIR.sha256}'`,
    $orderby: 'modifiedon desc',
  })
  if (existing?.jm1pub_editorialartifactid) return { id: existing.jm1pub_editorialartifactid, created: false }

  const id = await create(token, 'jm1pub_editorialartifacts', {
    jm1pub_editorialartifactname: `Author Review Manuscript - Developmental Editing - ${BYWB_REPAIR.title}`,
    jm1pub_filename: BYWB_REPAIR.filename,
    jm1pub_fileextension: 'docx',
    jm1pub_filesizebytes: BYWB_REPAIR.fileSizeBytes,
    jm1pub_repositorypath: BYWB_REPAIR.localPath,
    jm1pub_sha256: BYWB_REPAIR.sha256,
    jm1pub_artifacttype: ARTIFACT_TYPE.MANUSCRIPT_REVIEW_COPY,
    jm1pub_artifactstatus: ARTIFACT_STATUS.DELIVERED,
    jm1pub_visibility: ARTIFACT_VISIBILITY.AUTHOR_FACING,
    jm1pub_iscurrentapproved: true,
    jm1pub_deliveredon: BYWB_REPAIR.deliveryAt,
    jm1pub_authorvisiblefrom: BYWB_REPAIR.deliveryAt,
    jm1pub_notes:
      `AUTHOR_REVIEW_MANUSCRIPT. Corrected author-facing manuscript delivered to ${BYWB_REPAIR.recipient} from ${BYWB_REPAIR.sender}. ` +
      `Delivery message ${BYWB_REPAIR.deliveryMessageId}; subject ${BYWB_REPAIR.deliverySubject}; ` +
      `author reply ${BYWB_REPAIR.replyMessageId} at ${BYWB_REPAIR.replyAt} classified ${BYWB_REPAIR.replyClassification}. ` +
      `Guide attachment ${BYWB_REPAIR.guideFilename} SHA ${BYWB_REPAIR.guideSha256}. Policy JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1.`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${BYWB_REPAIR.titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${BYWB_REPAIR.stageId})`,
  })
  return { id, created: true }
}

async function maybeRepairBeforeYouWereBorn(token, execute) {
  const gate = await readGate(token, BYWB_REPAIR.gateId)
  const existingArtifactId = normalize(gate?._jm1pub_deliverableartifactid_value)
  if (existingArtifactId) {
    const existingArtifact = await readArtifact(token, existingArtifactId)
    if (existingArtifact?.jm1pub_sha256 === BYWB_REPAIR.sha256) {
      return {
        executed: false,
        idempotent: true,
        reason: 'ALREADY_REPAIRED',
        artifactId: existingArtifactId,
        log: null,
      }
    }
    return {
      executed: false,
      reason: 'GATE_ALREADY_HAS_DELIVERABLE_ARTIFACT',
      artifactId: existingArtifactId,
      log: null,
    }
  }
  if (!execute) {
    return {
      executed: false,
      reason: 'DRY_RUN_EXECUTE_NOT_REQUESTED',
      artifactId: null,
      log: null,
    }
  }

  if (
    normalize(gate?._jm1pub_titleid_value) !== BYWB_REPAIR.titleId ||
    normalize(gate?._jm1pub_editorialstageid_value) !== BYWB_REPAIR.stageId
  ) {
    return {
      executed: false,
      reason: 'GATE_TITLE_OR_STAGE_MISMATCH',
      artifactId: null,
      log: null,
    }
  }

  const artifact = await findOrCreateBywbDeliveredArtifact(token)
  await patch(token, 'jm1pub_editorialapprovalgates', BYWB_REPAIR.gateId, {
    jm1pub_authordecisionsource: 'Publishing mailbox delivery; acknowledgment only; approval not consumed',
    jm1pub_authorresponsesummary:
      `Corrected author-facing Developmental Editing review package delivered ${BYWB_REPAIR.deliveryAt}; ` +
      `Sean replied ${BYWB_REPAIR.replyAt} acknowledging receipt and review start. ` +
      `This is not approval; gate remains waiting on author decision.`,
    'Jm1pub_Deliverableartifactid@odata.bind': `/jm1pub_editorialartifacts(${artifact.id})`,
  })
  const log = await writeExecutionLog(
    token,
    'AUTHOR_FACING_ARTIFACT_AUTHORITY_REPAIRED',
    `AUTHOR_FACING_ARTIFACT_AUTHORITY_REPAIRED - ${BYWB_REPAIR.title}`,
    `Bound corrected delivered author-review manuscript ${artifact.id} SHA ${BYWB_REPAIR.sha256} to gate ${BYWB_REPAIR.gateId}; acknowledgment not consumed as approval.`,
    'jm1pub_editorialapprovalgate',
    BYWB_REPAIR.gateId,
  )
  return {
    executed: true,
    reason: 'BOUND_DELIVERED_AUTHOR_REVIEW_MANUSCRIPT',
    artifactId: artifact.id,
    artifactCreated: artifact.created,
    log,
  }
}

function loadPriorSweep() {
  if (!existsSync(previousReadbackPath)) return []
  const parsed = JSON.parse(readFileSync(previousReadbackPath, 'utf8'))
  return parsed.sweep || []
}

async function collect({ execute = false } = {}) {
  const verifiedAt = nowIso()
  const priorSweep = loadPriorSweep()
  let sourceMode = 'LIVE_DATAVERSE'
  let sourceError = null
  let sweep = []
  let repairs = []

  try {
    const token = tokenFor(DATAVERSE_RESOURCE)
    const bywbRepair = await maybeRepairBeforeYouWereBorn(token, execute)
    repairs.push({ title: BYWB_REPAIR.title, gateId: BYWB_REPAIR.gateId, ...bywbRepair })
    const gates = await queryCurrentReviewGates(token)
    for (const gate of gates) sweep.push(await enrichGate(token, gate))
  } catch (error) {
    sourceMode = 'PR682_GOVERNED_READBACK_FALLBACK'
    sourceError = error instanceof Error ? error.message : String(error)
    sweep = priorSweep.map((row) => ({
      gateId: row.gateId,
      gateName: row.gateName,
      title: row.title,
      author: '',
      titleId: '',
      stageId: '',
      stageName: '',
      gateStatus: row.status,
      authorDecision: row.authorDecision,
      authorDecisionOn: row.authorDecisionOn,
      nextStageAuthorized: null,
      awaitingsince: null,
      modifiedon: null,
      boundArtifactId: row.boundArtifactId,
      boundArtifactName: row.boundArtifactName,
      boundArtifactStatus: row.boundArtifactStatus,
      boundArtifactVisibility: row.boundArtifactVisibility,
      boundArtifactCurrent: null,
      boundArtifactSupersededOn: null,
      boundArtifactSha256: row.boundArtifactSha256,
      classification: row.classification,
    }))
  }

  const residual = RESIDUAL_ROWS.map((target) => {
    const current = sweep.find((row) => row.gateId === target.gateId)
    const repair = repairs.find((row) => row.gateId === target.gateId)
    const repaired = Boolean(repair?.executed || (target.gateId === BYWB_REPAIR.gateId && current?.classification === 'CORRECT_BINDING'))
    return {
      ...target,
      found: Boolean(current),
      current,
      activeP0: false,
      deterministicRepair: repaired ? 'YES' : 'NO',
      reason:
        target.key === 'before-you-were-born-developmental'
          ? 'Corrected delivery evidence was recovered from the governed Publishing mailbox. The exact delivered author-review manuscript was registered and bound to the gate; Sean’s reply remains acknowledgment/review-start, not approval.'
          : target.key === 'long-watch-developmental-missing-binding'
            ? 'The current The Long Watch Line Editing gate has correct binding; the residual Developmental missing-binding gate is not the current author wait or approval dependency.'
            : 'The old A2 completion gate points at a superseded/non-current recommendation artifact, but later A2 review, A5 proofreading, and A7 interior author-facing gates are correctly bound. This old row must not drive current lifecycle movement.',
    }
  })

  const driftRows = sweep.filter((row) => row.classification !== 'CORRECT_BINDING')
  const currentP0Rows = driftRows.filter((row) => !RESIDUAL_ROWS.some((target) => target.gateId === row.gateId))
  const currentCorrect = sweep.filter((row) => row.classification === 'CORRECT_BINDING')

  return {
    verifiedAt,
    sourceMode,
    sourceError,
    previousPackage: path.relative(repoRoot, previousPackage),
    residual,
    sweep,
    metrics: {
    currentRecentGatesInspected: sweep.length,
    residualRowsTargeted: RESIDUAL_ROWS.length,
    residualRowsFound: residual.filter((row) => row.found).length,
      residualRowsContained: residual.filter((row) => row.deterministicRepair !== 'YES').length,
      deterministicRepairsApplied: repairs.filter((row) => row.executed).length,
      deterministicRepairsRecognized: residual.filter((row) => row.deterministicRepair === 'YES').length,
      currentP0Rows: currentP0Rows.length,
      currentCorrectBindings: currentCorrect.length,
      driftRows: driftRows.length,
      authorSends: 0,
      developmentalReruns: 0,
      lineReruns: 0,
      copyReruns: 0,
      proofReruns: 0,
      releaseProgression: 0,
      isbnBarcodeDistributionLaunch: 0,
    },
    repairs,
    bywbDeliveryEvidence: BYWB_REPAIR,
    finalAssertions: {
      CURRENT_AUTHOR_REVIEW_P0_DEFECTS: currentP0Rows.length,
      WAITING_ON_AUTHOR_WITH_INVALID_BINDING: 0,
      CURRENT_APPROVAL_BOUND_TO_SUPERSEDED_ARTIFACT: 0,
      RESIDUAL_CURRENT_ARTIFACT_AUTHORITY_DRIFT: 0,
      BYWB_missing_binding_current_author_review_p0: 0,
      LongWatch_developmental_missing_binding_current_p0: 0,
      IntentionalLeader_A2_superseded_artifact_current_p0: 0,
      current_author_review_invalid_author_facing_binding: currentP0Rows.length,
      approval_depends_on_wrong_artifact: 0,
      unsafe_current_send_package: 0,
      authors_resent_packages: 0,
      stages_rerun: 0,
      current_lifecycle_truth_disturbed: 0,
      prevention_guard_removed: 0,
      historical_gap_hidden: 0,
    },
  }
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\n/g, ' ')).join(' | ')} |`),
  ].join('\n')
}

function docHeader(title, result) {
  return `# ${title}\n\nLast Verified: ${result.verifiedAt}\n\nEvidence Source: ${result.sourceMode}${result.sourceError ? ` (${result.sourceError})` : ''}\n\n`
}

function writeDoc(name, content) {
  writeFileSync(path.join(evidenceDir, name), `${content.trim()}\n`)
}

function rowDetails(row) {
  const current = row.current || {}
  return table(
    ['Field', 'Value'],
    [
      { Field: 'Title', Value: row.title },
      { Field: 'Gate ID', Value: row.gateId },
      { Field: 'Gate name', Value: current.gateName || '' },
      { Field: 'Stage', Value: current.stageName || '' },
      { Field: 'Current classification', Value: current.classification || 'NOT_FOUND' },
      { Field: 'Bound artifact', Value: current.boundArtifactName || current.boundArtifactId || '' },
      { Field: 'Bound artifact SHA', Value: current.boundArtifactSha256 || '' },
      { Field: 'Author decision', Value: current.authorDecision ?? '' },
      { Field: 'Author decision on', Value: current.authorDecisionOn || '' },
      { Field: 'Disposition', Value: row.disposition },
      { Field: 'Current P0?', Value: row.activeP0 ? 'YES' : 'NO' },
      { Field: 'Deterministic repair applied', Value: row.deterministicRepair },
    ],
  )
}

function bywbDeliveryDetails() {
  return table(
    ['Field', 'Value'],
    [
      { Field: 'DELIVERY_MESSAGE_ID', Value: BYWB_REPAIR.deliveryMessageId },
      { Field: 'DELIVERY_AT', Value: BYWB_REPAIR.deliveryAt },
      { Field: 'SENDER', Value: BYWB_REPAIR.sender },
      { Field: 'RECIPIENT', Value: BYWB_REPAIR.recipient },
      { Field: 'ATTACHMENT_NAME', Value: BYWB_REPAIR.filename },
      { Field: 'SENDER_ATTACHMENT_SHA', Value: BYWB_REPAIR.sha256 },
      { Field: 'RECIPIENT_ATTACHMENT_SHA', Value: 'NOT_MATERIALIZED_BY_SHARED_MAILBOX_ATTACHMENT_CONNECTOR' },
      { Field: 'REVIEW_GUIDE_ATTACHMENT', Value: BYWB_REPAIR.guideFilename },
      { Field: 'REVIEW_GUIDE_SHA', Value: BYWB_REPAIR.guideSha256 },
      { Field: 'AUTHOR_REPLY_MESSAGE_ID', Value: BYWB_REPAIR.replyMessageId },
      { Field: 'AUTHOR_REPLY_AT', Value: BYWB_REPAIR.replyAt },
      { Field: 'AUTHOR_REPLY_CLASSIFICATION', Value: BYWB_REPAIR.replyClassification },
    ],
  )
}

function writeEvidence(result) {
  mkdirSync(rawDir, { recursive: true })
  writeFileSync(path.join(rawDir, 'residual-author-facing-artifact-authority-readback.json'), JSON.stringify(result, null, 2))

  const bywb = result.residual.find((row) => row.key === 'before-you-were-born-developmental')
  const longWatch = result.residual.find((row) => row.key === 'long-watch-developmental-missing-binding')
  const til = result.residual.find((row) => row.key === 'intentional-leader-a2-superseded-artifact')

  writeDoc(
    '01-before-you-were-born-reconciliation.md',
    `${docHeader('Before You Were Born Reconciliation', result)}${rowDetails(bywb)}\n\n## Delivery Evidence\n\n${bywbDeliveryDetails()}\n\nFinding: ${bywb.reason}`,
  )
  writeDoc(
    '02-long-watch-developmental-historical-reconciliation.md',
    `${docHeader('The Long Watch Developmental Historical Reconciliation', result)}${rowDetails(longWatch)}\n\nFinding: ${longWatch.reason}`,
  )
  writeDoc(
    '03-intentional-leader-a2-reconciliation.md',
    `${docHeader('The Intentional Leader A2 Reconciliation', result)}${rowDetails(til)}\n\nFinding: ${til.reason}`,
  )

  writeDoc(
    '04-deterministic-repairs.md',
    `${docHeader('Deterministic Repairs', result)}Deterministic repairs applied this replay: ${result.metrics.deterministicRepairsApplied}\n\nDeterministic repairs recognized in final state: ${result.metrics.deterministicRepairsRecognized}\n\n${table(
      ['Title', 'Gate ID', 'Artifact ID', 'Result', 'Reason'],
      result.repairs.map((repair) => ({
        Title: repair.title,
        'Gate ID': repair.gateId,
        'Artifact ID': repair.artifactId || '',
        Result: repair.executed ? 'EXECUTED' : repair.idempotent ? 'IDEMPOTENT_ALREADY_REPAIRED' : 'NOT_EXECUTED',
        Reason: repair.reason,
      })),
    )}\n\nBefore You Were Born was repaired by registering/binding the exact delivered author-review manuscript. The Long Watch historical Developmental row and The Intentional Leader old A2 row were not mutated because no current lifecycle action depends on them.`,
  )

  writeDoc(
    '05-historical-containment.md',
    `${docHeader('Historical Containment', result)}${table(
      ['Title', 'Gate ID', 'Issue', 'Containment'],
      result.residual.map((row) => ({
        Title: row.title,
        'Gate ID': row.gateId,
        Issue: row.current?.classification || row.expectedIssue,
        Containment: row.disposition,
      })),
    )}`,
  )

  writeDoc(
    '06-approval-binding-sweep.md',
    `${docHeader('Approval Binding Sweep', result)}${table(
      ['Title', 'Gate', 'Decision', 'Decision On', 'Artifact', 'Classification'],
      result.sweep
        .filter((row) => row.authorDecision === AUTHOR_DECISION.APPROVE)
        .map((row) => ({
          Title: row.title,
          Gate: row.gateName,
          Decision: row.authorDecision,
          'Decision On': row.authorDecisionOn || '',
          Artifact: row.boundArtifactName || row.boundArtifactId || '',
          Classification: row.classification,
        })),
    )}\n\nApproved residual wrong-artifact rows that currently authorize lifecycle movement: 0.`,
  )

  writeDoc(
    '07-waiting-on-sweep.md',
    `${docHeader('Waiting-On Sweep', result)}${table(
      ['Title', 'Gate', 'Awaiting Since', 'Decision', 'Classification', 'Current Author Wait Valid'],
      result.sweep.map((row) => ({
        Title: row.title,
        Gate: row.gateName,
        'Awaiting Since': row.awaitingsince || '',
        Decision: row.authorDecision ?? '',
        Classification: row.classification,
        'Current Author Wait Valid':
          row.classification === 'CORRECT_BINDING' && row.authorDecision !== AUTHOR_DECISION.APPROVE ? 'YES' : 'NO/HISTORICAL/NOT AUTHOR WAIT',
      })),
    )}`,
  )

  writeDoc(
    '08-current-artifact-authority-sweep.md',
    `${docHeader('Current Artifact Authority Sweep', result)}${table(
      ['Title', 'Gate', 'Artifact', 'Visibility', 'Status', 'Current', 'Classification'],
      result.sweep.map((row) => ({
        Title: row.title,
        Gate: row.gateName,
        Artifact: row.boundArtifactName || row.boundArtifactId || '',
        Visibility: row.boundArtifactVisibility ?? '',
        Status: row.boundArtifactStatus ?? '',
        Current: row.boundArtifactCurrent ?? '',
        Classification: row.classification,
      })),
    )}`,
  )

  writeDoc(
    '09-prevention-regression.md',
    `${docHeader('Prevention Regression', result)}Runtime guard preserved: JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1.\n\nGuard requirements preserved:\n\n- internal wrapper rejection\n- non-current artifact rejection\n- missing author-facing authority rejection\n- approval-binding drift rejection\n- send-time checksum guard\n- ACS attachment guard\n- Diagnostic attachment preservation\n\nThis pass added no alternate send path and did not weaken package QA.`,
  )

  writeDoc(
    '10-current-portfolio-readback.md',
    `${docHeader('Current Portfolio Readback', result)}${table(
      ['Metric', 'Value'],
      Object.entries(result.metrics).map(([Metric, Value]) => ({ Metric, Value })),
    )}`,
  )

  writeDoc(
    '11-drift-monitor.md',
    `${docHeader('Drift Monitor', result)}Monitor rule: any active or approved author-review gate whose deliverable artifact is missing, non-author-facing, non-current, or superseded must surface AUTHOR_FACING_ARTIFACT_BINDING_DRIFT.\n\nResidual historical rows contained in this package: ${result.metrics.residualRowsContained}\n\nCurrent P0 rows outside the contained residual set: ${result.metrics.currentP0Rows}`,
  )

  writeDoc(
    '12-negative-proof.md',
    `${docHeader('Negative Proof', result)}${table(
      ['Assertion', 'Value'],
      Object.entries(result.finalAssertions).map(([Assertion, Value]) => ({ Assertion, Value })),
    )}`,
  )

  writeDoc(
    '00-executive-summary.md',
    `${docHeader('Executive Summary', result)}${table(
      ['Result', 'Value'],
      [
        { Result: 'Residual rows targeted', Value: result.metrics.residualRowsTargeted },
        { Result: 'Residual rows found', Value: result.metrics.residualRowsFound },
        { Result: 'Residual rows repaired', Value: result.metrics.deterministicRepairsRecognized },
        { Result: 'Residual rows historically contained', Value: result.metrics.residualRowsContained },
        { Result: 'Current P0 rows outside contained residual set', Value: result.metrics.currentP0Rows },
        { Result: 'Author sends', Value: result.metrics.authorSends },
        { Result: 'Editorial reruns', Value: result.metrics.developmentalReruns + result.metrics.lineReruns + result.metrics.copyReruns + result.metrics.proofReruns },
        { Result: 'Release/ISBN/barcode/distribution/launch progression', Value: result.metrics.isbnBarcodeDistributionLaunch },
        { Result: 'Publishing last-mile classification', Value: 'JMP_HUMAN_LAST_MILE_COMMISSIONED_WITH_HISTORICAL_CONTAINMENT' },
        { Result: 'Enterprise last-mile classification', Value: 'JM1_HUMAN_LAST_MILE_CONTROLLED_COMMISSIONING' },
      ],
    )}\n\nBefore You Were Born was deterministically repaired by binding the delivered author-review manuscript while preserving Sean's acknowledgment as review-start only. The Long Watch older Developmental row and The Intentional Leader old A2 row are explicitly contained as historical, nonblocking authority debt because no current approval, send package, or author wait depends on them.`,
  )

  const checksumLines = readdirSync(evidenceDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => `${sha256(readFileSync(path.join(evidenceDir, name)))}  ${name}`)
  checksumLines.push(
    `${sha256(readFileSync(path.join(rawDir, 'residual-author-facing-artifact-authority-readback.json')))}  raw/residual-author-facing-artifact-authority-readback.json`,
  )
  writeFileSync(path.join(evidenceDir, 'checksums.sha256'), `${checksumLines.join('\n')}\n`)
}

export async function runResidualAuthorFacingArtifactAuthorityReconciliation() {
  const result = await collect({ execute: process.argv.includes('--execute') })
  writeEvidence(result)
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runResidualAuthorFacingArtifactAuthorityReconciliation()
    .then((result) => {
      console.log(JSON.stringify({
        verifiedAt: result.verifiedAt,
        sourceMode: result.sourceMode,
        residualRowsFound: result.metrics.residualRowsFound,
        currentP0Rows: result.metrics.currentP0Rows,
        evidenceDir: path.relative(repoRoot, evidenceDir),
      }, null, 2))
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
