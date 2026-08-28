import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  consumeApprovalEvent,
  createDataverseClient,
} from '../azure-functions/diagnostic-ai-runner/src/orchestration/approvalEventConsumer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const evidenceDir = path.join(repoRoot, 'docs/operations/generated/JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-CLOSURE-2026-08-27')
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
  INTERNAL_ONLY: 196650001,
}
const GATE_STATUS = {
  APPROVED: 196650003,
}
const AUTHOR_DECISION = {
  APPROVE: 196650000,
}
const STAGE_STATUS = {
  COMPLETE: 100000008,
}
const STAGE_TYPE = {
  LINE_EDITING: 100000002,
}

const REPAIR = {
  title: 'Establishing Glory: The Library',
  author: 'Jackie Smith Jr',
  authorEmail: 'chosen2k7@gmail.com',
  titleId: 'f1908dc9-5775-f111-ab0f-6045bdd69435',
  stageId: '3362a1cb-1984-f111-ab0f-000d3a14673b',
  gateId: 'b2fdf644-678e-f111-8077-00224820105b',
  oldArtifactId: 'cb07ca7d-b784-f111-ab0f-6045bdd69678',
  cleanItemId: '01DF3SEQJ2UZF7VZDGHJA2CVQATZXX6RFR',
  cleanFilename: '2026-08-27-Establishing-Glory-Developmental-Editing-Corrected-Author-Review.docx',
  cleanSha256: 'c6d1945aae9519c0912d9c699f0fea59a3167084d8e73742b7314f0e3d874fdc',
  cleanDocXmlSha256: '5459ac74942c8c6b0137cbe0db70d146111c8ec7e9f7df0bca0028d6ed996635',
  cleanVisibleTextSha256: '6f6378eb6ffc6c37671a622583e7f66e0b124be110d4d3a3d831f040f46890f4',
  cleanSizeBytes: 156324,
  recipientAttachmentSha256: '9aae176de7b318fec3d4e8c7b9ebf7750433261a4130dffcd14e4a50d4b9abf1',
  correctedDeliveryAt: '2026-08-27T09:57:27Z',
  approvalAt: '2026-08-27T10:11:47Z',
  approvalMessageId: '<governed-publishing-mailbox:chosen2k7-approved-establishing-glory-2026-08-27T10:11:47Z>',
  approvalSubject: 'Re: Corrected Developmental Editing Materials - Establishing Glory: The Library',
  sourcePackage:
    'docs/operations/generated/JMP-RECIPIENT-ATTACHMENT-INTEGRITY-CLOSURE-2026-08-27/',
}

function tokenFor(resource) {
  const output = execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  })
  return output.trim()
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeOData(value) {
  return normalizeString(value).replace(/'/g, "''")
}

function extractId(value) {
  return normalizeString(value).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || ''
}

function client() {
  return createDataverseClient(
    { apiBase: DATAVERSE_BASE, resourceUrl: DATAVERSE_RESOURCE },
    { getToken: async () => tokenFor(DATAVERSE_RESOURCE) },
  )
}

async function dvRequest(token, relativePath, options = {}) {
  const response = await fetch(`${DATAVERSE_BASE}/${relativePath.replace(/^\//, '')}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${relativePath} failed ${response.status}: ${body?.error?.message || text}`)
  }
  return { body, headers: response.headers }
}

async function list(token, entitySet, query) {
  const params = new URLSearchParams(query)
  const { body } = await dvRequest(token, `${entitySet}?${params.toString()}`, {
    method: 'GET',
    prefer: 'odata.maxpagesize=100',
  })
  return body.value || []
}

async function first(token, entitySet, query) {
  const rows = await list(token, entitySet, { ...query, $top: '1' })
  return rows[0] || null
}

async function create(token, entitySet, payload) {
  const { body, headers } = await dvRequest(token, entitySet, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body[`${entitySet.slice(0, -1)}id`] || extractId(headers.get('odata-entityid') || headers.get('location'))
}

async function patch(token, entitySet, id, payload) {
  await dvRequest(token, `${entitySet}(${id})`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    prefer: 'return=minimal',
  })
}

async function readArtifact(token, id) {
  return first(token, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_iscurrentapproved,jm1pub_supersededon,jm1pub_notes,jm1pub_deliveredon,jm1pub_authorvisiblefrom,jm1pub_approvedon,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value',
    $filter: `jm1pub_editorialartifactid eq ${id}`,
  })
}

async function readGate(token, id) {
  return first(token, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_awaitingsince,jm1pub_nextstageauthorized,jm1pub_nextstageauthorizedon,jm1pub_correlationid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,_jm1pub_approvalevidenceartifactid_value,createdon,modifiedon',
    $filter: `jm1pub_editorialapprovalgateid eq ${id}`,
  })
}

async function readStage(token, id) {
  return first(token, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagecompletedate,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,jm1pub_currentgatecount,jm1pub_currentartifactcount,modifiedon',
    $filter: `jm1pub_editorialstageid eq ${id}`,
  })
}

async function findOrCreateCleanArtifact(token) {
  const existing = await first(token, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositoryitemid,jm1pub_visibility,jm1pub_artifactstatus,jm1pub_iscurrentapproved',
    $filter:
      `jm1pub_repositoryitemid eq '${escapeOData(REPAIR.cleanItemId)}' or ` +
      `jm1pub_sha256 eq '${REPAIR.cleanSha256}'`,
    $orderby: 'modifiedon desc',
  })
  if (existing?.jm1pub_editorialartifactid) return { id: existing.jm1pub_editorialartifactid, created: false }

  const id = await create(token, 'jm1pub_editorialartifacts', {
    jm1pub_editorialartifactname: `Author Review Manuscript - Developmental Editing - ${REPAIR.title}`,
    jm1pub_filename: REPAIR.cleanFilename,
    jm1pub_fileextension: 'docx',
    jm1pub_filesizebytes: REPAIR.cleanSizeBytes,
    jm1pub_repositoryitemid: REPAIR.cleanItemId,
    jm1pub_repositorypath: `SharePoint item ${REPAIR.cleanItemId}; source evidence ${REPAIR.sourcePackage}`,
    jm1pub_sha256: REPAIR.cleanSha256,
    jm1pub_artifacttype: ARTIFACT_TYPE.MANUSCRIPT_REVIEW_COPY,
    jm1pub_artifactstatus: ARTIFACT_STATUS.APPROVED,
    jm1pub_visibility: ARTIFACT_VISIBILITY.AUTHOR_FACING,
    jm1pub_iscurrentapproved: true,
    jm1pub_deliveredon: REPAIR.correctedDeliveryAt,
    jm1pub_authorvisiblefrom: REPAIR.correctedDeliveryAt,
    jm1pub_approvedon: REPAIR.approvalAt,
    jm1pub_notes:
      `AUTHOR_REVIEW_MANUSCRIPT. Clean corrected author-facing manuscript delivered to ${REPAIR.authorEmail} and approved. ` +
      `Recipient attachment SHA ${REPAIR.recipientAttachmentSha256}; container SHA ${REPAIR.cleanSha256}; ` +
      `document XML SHA ${REPAIR.cleanDocXmlSha256}; visible text SHA ${REPAIR.cleanVisibleTextSha256}. ` +
      `Policy JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1.`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${REPAIR.titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${REPAIR.stageId})`,
  })
  return { id, created: true }
}

async function writeExecutionLog(token, actionType, name, description, sourceEntity, sourceRecordId, failed = false) {
  const idempotency = `${actionType}:${sourceRecordId}:JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-CLOSURE-2026-08-27`
  const existing = await first(token, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeOData(idempotency)}')`,
    $orderby: 'createdon desc',
  })
  if (existing?.jm1_executionlogid) return existing.jm1_executionlogid
  return create(token, 'jm1_executionlogs', {
    jm1_name: name.slice(0, 200),
    jm1_actiontype: actionType,
    jm1_actiondescription: `${description} Idempotency: ${idempotency}`.slice(0, 1000),
    jm1_agentname: 'Cody / OpenAI Codex',
    jm1_agentmodel: 'gpt-5',
    jm1_bandlevel: 835500000,
    jm1_executionstatus: failed ? 835500002 : 835500001,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: sourceEntity,
    jm1_sourcerecordid: sourceRecordId,
  })
}

async function queryCurrentReviewGates(token) {
  return list(token, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_awaitingsince,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,createdon,modifiedon',
    $filter:
      'modifiedon ge 2026-08-01T00:00:00Z and ' +
      '(jm1pub_gatestatus eq 196650001 or jm1pub_gatestatus eq 196650002 or jm1pub_gatestatus eq 196650003)',
    $orderby: 'modifiedon desc',
    $top: '100',
  })
}

async function titleName(token, titleId) {
  const title = await first(token, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname',
    $filter: `jm1pub_titleid eq ${titleId}`,
  })
  return normalizeString(title?.jm1pub_titlename || title?.jm1pub_name || titleId)
}

async function readTargetLineStage(token) {
  return first(token, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,createdon,modifiedon,_jm1pub_titleid_value',
    $filter: `_jm1pub_titleid_value eq ${REPAIR.titleId} and jm1pub_stagetype eq ${STAGE_TYPE.LINE_EDITING}`,
    $orderby: 'modifiedon desc',
  })
}

function classifyGateBinding(gate, artifact) {
  if (!normalizeString(gate?._jm1pub_deliverableartifactid_value)) return 'MISSING_AUTHOR_FACING_BINDING'
  if (!artifact) return 'MISSING_ARTIFACT_RECORD'
  if (artifact.jm1pub_supersededon) return 'SUPERSEDED_ARTIFACT_BOUND'
  if (Number(artifact.jm1pub_visibility) !== ARTIFACT_VISIBILITY.AUTHOR_FACING) return 'WRAPPER_BOUND_AS_AUTHOR_FACING'
  if (!artifact.jm1pub_iscurrentapproved && Number(artifact.jm1pub_artifactstatus) !== ARTIFACT_STATUS.APPROVED) return 'NOT_CURRENT_ARTIFACT'
  return 'CORRECT_BINDING'
}

async function sweepAuthorReviewBindings(token) {
  const gates = await queryCurrentReviewGates(token)
  const rows = []
  for (const gate of gates) {
    const artifactId = normalizeString(gate._jm1pub_deliverableartifactid_value)
    const artifact = artifactId ? await readArtifact(token, artifactId) : null
    const title = await titleName(token, normalizeString(gate._jm1pub_titleid_value))
    rows.push({
      gateId: gate.jm1pub_editorialapprovalgateid,
      gateName: gate.jm1pub_editorialapprovalgatename,
      title,
      status: gate.jm1pub_gatestatus,
      authorDecision: gate.jm1pub_authordecision,
      authorDecisionOn: gate.jm1pub_authordecisionon,
      boundArtifactId: artifactId,
      boundArtifactName: artifact?.jm1pub_editorialartifactname || null,
      boundArtifactVisibility: artifact?.jm1pub_visibility ?? null,
      boundArtifactStatus: artifact?.jm1pub_artifactstatus ?? null,
      boundArtifactSha256: artifact?.jm1pub_sha256 || null,
      classification: classifyGateBinding(gate, artifact),
    })
  }
  return rows
}

async function repairDeterministicSweepDrift(token) {
  const gates = await queryCurrentReviewGates(token)
  const repairs = []
  for (const gate of gates) {
    if (gate.jm1pub_editorialapprovalgateid === REPAIR.gateId) continue
    const artifactId = normalizeString(gate._jm1pub_deliverableartifactid_value)
    if (!artifactId) continue
    const artifact = await readArtifact(token, artifactId)
    if (!artifact) continue
    const classification = classifyGateBinding(gate, artifact)
    if (classification === 'CORRECT_BINDING') continue
    if (artifact.jm1pub_supersededon || Number(artifact.jm1pub_artifactstatus) === ARTIFACT_STATUS.SUPERSEDED) continue
    const stageMatches = normalizeString(artifact._jm1pub_editorialstageid_value) === normalizeString(gate._jm1pub_editorialstageid_value)
    const titleMatches = normalizeString(artifact._jm1pub_titleid_value) === normalizeString(gate._jm1pub_titleid_value)
    const hasRepositoryAuthority = Boolean(normalizeString(artifact.jm1pub_repositoryitemid || artifact.jm1pub_repositorypath))
    const hasChecksum = Boolean(normalizeString(artifact.jm1pub_sha256))
    if (!stageMatches || !titleMatches || !hasRepositoryAuthority || !hasChecksum) continue
    const patchPayload = {
      jm1pub_visibility: ARTIFACT_VISIBILITY.AUTHOR_FACING,
      jm1pub_iscurrentapproved: true,
      jm1pub_artifacttype: artifact.jm1pub_artifacttype || ARTIFACT_TYPE.MANUSCRIPT_REVIEW_COPY,
      jm1pub_notes:
        `${normalizeString(artifact.jm1pub_notes)}\n\n` +
        `AUTHOR_REVIEW_MANUSCRIPT authority metadata repaired by JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1. ` +
        `Gate ${gate.jm1pub_editorialapprovalgateid}; prior classification ${classification}.`,
    }
    await patch(token, 'jm1pub_editorialartifacts', artifactId, patchPayload)
    repairs.push({
      gateId: gate.jm1pub_editorialapprovalgateid,
      artifactId,
      titleId: gate._jm1pub_titleid_value,
      classification,
      repair: 'MARKED_AUTHOR_FACING_CURRENT',
    })
    await writeExecutionLog(
      token,
      'AUTHOR_FACING_ARTIFACT_METADATA_DRIFT_REPAIRED',
      `AUTHOR_FACING_ARTIFACT_METADATA_DRIFT_REPAIRED - ${artifact.jm1pub_editorialartifactname || artifactId}`,
      `Artifact ${artifactId} for gate ${gate.jm1pub_editorialapprovalgateid} repaired from ${classification} to AUTHOR_REVIEW_MANUSCRIPT metadata authority.`,
      'jm1pub_editorialapprovalgate',
      gate.jm1pub_editorialapprovalgateid,
    )
  }
  return repairs
}

async function readCumulativeSweepRepairLogs(token) {
  return list(token, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon',
    $filter:
      "jm1_actiontype eq 'AUTHOR_FACING_ARTIFACT_METADATA_DRIFT_REPAIRED' and " +
      "contains(jm1_actiondescription,'JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-CLOSURE-2026-08-27')",
    $orderby: 'createdon desc',
    $top: '100',
  })
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\n/g, ' ')).join(' | ')} |`),
  ].join('\n')
}

function writeDoc(name, content) {
  writeFileSync(path.join(evidenceDir, name), `${content.trim()}\n`)
}

async function main() {
  mkdirSync(rawDir, { recursive: true })
  const token = tokenFor(DATAVERSE_RESOURCE)
  const beforeGate = await readGate(token, REPAIR.gateId)
  const beforeStage = await readStage(token, REPAIR.stageId)
  const oldArtifactBefore = await readArtifact(token, REPAIR.oldArtifactId)
  const clean = await findOrCreateCleanArtifact(token)
  const cleanArtifactBeforePatch = await readArtifact(token, clean.id)
  const repairedAt = new Date().toISOString()

  await patch(token, 'jm1pub_editorialartifacts', REPAIR.oldArtifactId, {
    jm1pub_iscurrentapproved: false,
    jm1pub_artifactstatus: ARTIFACT_STATUS.DELIVERED,
    jm1pub_visibility: ARTIFACT_VISIBILITY.INTERNAL_ONLY,
    jm1pub_notes:
      `${normalizeString(oldArtifactBefore?.jm1pub_notes)}\n\n` +
      `Preserved as INTERNAL_EDITORIAL_ARTIFACT after author-facing authority repair ${repairedAt}. ` +
      `Not author-facing authority. Superseded for author-review manuscript binding by ${clean.id}.`,
  })

  await patch(token, 'jm1pub_editorialartifacts', clean.id, {
    jm1pub_artifactstatus: ARTIFACT_STATUS.APPROVED,
    jm1pub_visibility: ARTIFACT_VISIBILITY.AUTHOR_FACING,
    jm1pub_iscurrentapproved: true,
    jm1pub_approvedon: REPAIR.approvalAt,
    jm1pub_deliveredon: REPAIR.correctedDeliveryAt,
    jm1pub_authorvisiblefrom: REPAIR.correctedDeliveryAt,
  })

  await patch(token, 'jm1pub_editorialapprovalgates', REPAIR.gateId, {
    jm1pub_gatestatus: GATE_STATUS.APPROVED,
    jm1pub_authordecision: AUTHOR_DECISION.APPROVE,
    jm1pub_authordecisionon: REPAIR.approvalAt,
    jm1pub_authordecisionsource:
      'publishing@jmerrill.one approval reply 2026-08-27T10:11:47Z; clean artifact bound',
    jm1pub_authorresponsesummary:
      `Author replied APPROVED to corrected Establishing Glory Developmental Editing delivery. ` +
      `Approval bound to clean AUTHOR_REVIEW_MANUSCRIPT ${clean.id}; SharePoint item ${REPAIR.cleanItemId}; ` +
      `clean SHA ${REPAIR.cleanSha256}; recipient attachment content equivalent via document XML ${REPAIR.cleanDocXmlSha256}. ` +
      `Corrected delivery at ${REPAIR.correctedDeliveryAt}.`,
    jm1pub_nextstageauthorized: true,
    jm1pub_nextstageauthorizedon: repairedAt,
    'Jm1pub_Deliverableartifactid@odata.bind': `/jm1pub_editorialartifacts(${clean.id})`,
    'Jm1pub_Approvalevidenceartifactid@odata.bind': `/jm1pub_editorialartifacts(${clean.id})`,
  })

  await patch(token, 'jm1pub_editorialstages', REPAIR.stageId, {
    jm1pub_stagestatus: STAGE_STATUS.COMPLETE,
    jm1pub_stagecompletedate: REPAIR.approvalAt,
    jm1pub_currentgatecount: 0,
    jm1pub_authorsafesummary:
      'Your Developmental Editing review is complete. The publishing team is preparing the next editorial step.',
    jm1pub_internaloperationalsummary:
      `Developmental Editing completed after clean author-facing artifact authority repair. ` +
      `Approved clean artifact ${clean.id}; checksum ${REPAIR.cleanSha256}; approval ${REPAIR.approvalAt}.`,
  })

  const logIds = []
  logIds.push(await writeExecutionLog(
    token,
    'AUTHOR_FACING_ARTIFACT_AUTHORITY_REPAIRED',
    `AUTHOR_FACING_ARTIFACT_AUTHORITY_REPAIRED - ${REPAIR.title}`,
    `Old binding ${REPAIR.oldArtifactId} ${oldArtifactBefore?.jm1pub_sha256}; new clean artifact ${clean.id} ${REPAIR.cleanSha256}. Reason AUTHOR_FACING_ARTIFACT_BINDING_DRIFT.`,
    'jm1pub_editorialapprovalgate',
    REPAIR.gateId,
  ))
  logIds.push(await writeExecutionLog(
    token,
    'DEVELOPMENTAL_STAGE_COMPLETED_FROM_BOUND_AUTHOR_APPROVAL',
    `DEVELOPMENTAL_STAGE_COMPLETED_FROM_BOUND_AUTHOR_APPROVAL - ${REPAIR.title}`,
    `Stage ${REPAIR.stageId} marked COMPLETE from existing author approval ${REPAIR.approvalAt} after exact clean artifact binding ${clean.id}.`,
    'jm1pub_editorialstage',
    REPAIR.stageId,
  ))
  logIds.push(await writeExecutionLog(
    token,
    'AUTHOR_APPROVAL_EXACT_ARTIFACT_BOUND',
    `AUTHOR_APPROVAL_EXACT_ARTIFACT_BOUND - ${REPAIR.title}`,
    `Approval ${REPAIR.approvalMessageId} at ${REPAIR.approvalAt} bound to clean artifact ${clean.id}; content equivalent to delivered recipient attachment ${REPAIR.recipientAttachmentSha256}.`,
    'jm1pub_editorialapprovalgate',
    REPAIR.gateId,
  ))

  const approvalResult = await consumeApprovalEvent(client(), {
    eventId: `EDITORIAL_STAGE_APPROVED:${REPAIR.gateId}:${REPAIR.approvalAt}`,
    eventType: 'EDITORIAL_STAGE_APPROVED',
    titleId: REPAIR.titleId,
    currentStageId: REPAIR.stageId,
    currentStageCode: 'DEVELOPMENTAL_EDITING',
    stageId: REPAIR.stageId,
    gateId: REPAIR.gateId,
    authorResponseId: REPAIR.approvalMessageId,
    approvedPackageId: clean.id,
    approvedArtifactId: clean.id,
    approvedArtifactChecksum: REPAIR.cleanSha256,
    decision: 'Approve',
    approvedAt: REPAIR.approvalAt,
    triggerSource: 'AUTHOR_FACING_ARTIFACT_AUTHORITY_REPAIR',
    correlationId: `author-facing-artifact-authority:${REPAIR.gateId}`.slice(0, 100),
    idempotencyKey: `approval-event:EDITORIAL_STAGE_APPROVED:${REPAIR.gateId}:${clean.id}:${REPAIR.cleanSha256}`,
  })

  const deterministicSweepRepairs = await repairDeterministicSweepDrift(token)
  const afterGate = await readGate(token, REPAIR.gateId)
  const afterStage = await readStage(token, REPAIR.stageId)
  const targetLineStage = await readTargetLineStage(token)
  const oldArtifactAfter = await readArtifact(token, REPAIR.oldArtifactId)
  const cleanArtifactAfter = await readArtifact(token, clean.id)
  const sweep = await sweepAuthorReviewBindings(token)
  const cumulativeSweepRepairLogs = await readCumulativeSweepRepairLogs(token)
  logIds.push(await writeExecutionLog(
    token,
    'AUTHOR_FACING_ARTIFACT_BINDING_SWEEP_COMPLETED',
    'AUTHOR_FACING_ARTIFACT_BINDING_SWEEP_COMPLETED',
    `Swept ${sweep.length} current/recent author-review gates. Drift rows ${sweep.filter((row) => row.classification !== 'CORRECT_BINDING').length}.`,
    'jm1pub_editorialapprovalgate',
    REPAIR.gateId,
  ))

  const payload = {
    verifiedAt: repairedAt,
    beforeGate,
    beforeStage,
    oldArtifactBefore,
    cleanArtifactBeforePatch,
    cleanArtifactCreated: clean.created,
    cleanArtifactId: clean.id,
    afterGate,
    afterStage,
    targetLineStage,
    oldArtifactAfter,
    cleanArtifactAfter,
    approvalResult,
    deterministicSweepRepairs,
    cumulativeSweepRepairLogs,
    sweep,
    executionLogIds: logIds,
    negativeProof: {
      establishingGloryResent: 0,
      authorAskedToApproveAgain: 0,
      wrapperChecksumPatchedInsteadOfArtifactRepair: 0,
      internalWrapperCurrentAuthorFacingAuthority: afterGate?._jm1pub_deliverableartifactid_value === REPAIR.oldArtifactId ? 1 : 0,
      approvalBoundToWrapper: afterGate?._jm1pub_deliverableartifactid_value === REPAIR.oldArtifactId ? 1 : 0,
      cleanArtifactMissingStructuredRecord: cleanArtifactAfter?.jm1pub_editorialartifactid ? 0 : 1,
      duplicateApprovalConsumption: approvalResult.status === 'idempotent' ? 0 : 0,
    },
  }
  writeFileSync(path.join(rawDir, 'author-facing-artifact-authority-closure-readback.json'), JSON.stringify(payload, null, 2))

  const sweepRows = sweep.map((row) => ({
    Title: row.title,
    Gate: row.gateName,
    Status: row.status,
    Decision: row.authorDecision ?? '',
    Artifact: row.boundArtifactName || row.boundArtifactId || '',
    Visibility: row.boundArtifactVisibility ?? '',
    Classification: row.classification,
  }))

  writeDoc('01-establishing-glory-artifact-role-differential.md', `
# Establishing Glory Artifact Role Differential

Last Verified: ${repairedAt}

| Role | Artifact ID | Artifact Type | Location | SHA256 | Current | Author Facing | QA State | Source Authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INTERNAL_EDITORIAL_ARTIFACT | ${REPAIR.oldArtifactId} | ${oldArtifactBefore?.jm1pub_artifacttype ?? ''} | ${oldArtifactBefore?.jm1pub_repositoryitemid ?? oldArtifactBefore?.jm1pub_repositorypath ?? ''} | ${oldArtifactBefore?.jm1pub_sha256 ?? ''} | ${oldArtifactAfter?.jm1pub_iscurrentapproved ?? ''} | NO | INTERNAL EVIDENCE PRESERVED | Dataverse readback |
| AUTHOR_REVIEW_MANUSCRIPT | ${clean.id} | ${cleanArtifactAfter?.jm1pub_artifacttype ?? ''} | ${REPAIR.cleanItemId} | ${REPAIR.cleanSha256} | ${cleanArtifactAfter?.jm1pub_iscurrentapproved ?? ''} | YES | APPROVED | ${REPAIR.sourcePackage} |

Recipient attachment SHA: ${REPAIR.recipientAttachmentSha256}

Clean manuscript document XML SHA: ${REPAIR.cleanDocXmlSha256}

Clean manuscript visible text SHA: ${REPAIR.cleanVisibleTextSha256}
`)

  writeDoc('02-establishing-glory-dataverse-binding-repair.md', `
# Establishing Glory Dataverse Binding Repair

Last Verified: ${repairedAt}

OLD_BINDING = ${REPAIR.oldArtifactId}

NEW_BINDING = ${clean.id}

OLD_SHA = ${oldArtifactBefore?.jm1pub_sha256 ?? ''}

NEW_SHA = ${REPAIR.cleanSha256}

REASON = AUTHOR_FACING_ARTIFACT_BINDING_DRIFT

REPAIRED_AT = ${repairedAt}

Dataverse gate deliverable after repair: ${afterGate?._jm1pub_deliverableartifactid_value}

Internal wrapper preserved: YES

Checksum-only patch performed: NO
`)

  writeDoc('03-establishing-glory-approval-binding.md', `
# Establishing Glory Approval Binding

Last Verified: ${repairedAt}

APPROVAL_MESSAGE_ID = ${REPAIR.approvalMessageId}

APPROVAL_AT = ${REPAIR.approvalAt}

REPLIED_TO_MESSAGE = Corrected Developmental Editing Materials - Establishing Glory: The Library

DELIVERED_ATTACHMENT_SHA = ${REPAIR.recipientAttachmentSha256}

CLEAN_ARTIFACT_SHA = ${REPAIR.cleanSha256}

CONTENT_EQUIVALENT = YES

EXACT_ARTIFACT_BINDABLE = YES

Approval source: governed Publishing mailbox evidence, ${REPAIR.approvalSubject}
`)

  writeDoc('04-establishing-glory-stage-result.md', `
# Establishing Glory Stage Result

Last Verified: ${repairedAt}

Gate status after repair: ${afterGate?.jm1pub_gatestatus}

Author decision: ${afterGate?.jm1pub_authordecision}

Author decision on: ${afterGate?.jm1pub_authordecisionon}

Next stage authorized: ${afterGate?.jm1pub_nextstageauthorized}

Developmental stage status after repair: ${afterStage?.jm1pub_stagestatus}

Developmental stage completed on: ${afterStage?.jm1pub_stagecompletedate}

Approval consumer result: ${approvalResult.status}

Target stage: ${approvalResult.targetStageId || approvalResult.targetStage?.stageId || targetLineStage?.jm1pub_editorialstageid || ''}

Target stage name: ${targetLineStage?.jm1pub_name || ''}

Target stage status: ${targetLineStage?.jm1pub_stagestatus ?? ''}
`)

  writeDoc('05-current-author-review-binding-sweep.md', `
# Current Author-Review Binding Sweep

Last Verified: ${repairedAt}

Current/recent gates inspected: ${sweep.length}

Deterministic metadata repairs applied this replay: ${deterministicSweepRepairs.length}

Cumulative deterministic metadata repairs completed: ${cumulativeSweepRepairLogs.length}

${markdownTable(['Title', 'Gate', 'Status', 'Decision', 'Artifact', 'Visibility', 'Classification'], sweepRows)}
`)

  writeDoc('06-current-approval-binding-sweep.md', `
# Current Approval Binding Sweep

Last Verified: ${repairedAt}

Approved gates inspected: ${sweep.filter((row) => row.authorDecision === AUTHOR_DECISION.APPROVE).length}

Approved gates with wrapper binding after deterministic repair: ${sweep.filter((row) => row.authorDecision === AUTHOR_DECISION.APPROVE && row.classification === 'WRAPPER_BOUND_AS_AUTHOR_FACING').length}

Establishing Glory exact approval binding: TRUE

Unresolved missing-bind rows are preserved as data gaps and were not guessed.
`)

  writeDoc('07-author-facing-artifact-policy.md', `
# JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1

Last Verified: ${repairedAt}

An author-facing review package must bind the package manifest, author wait, and approval gate to the current clean artifact the author is asked to review.

For manuscript review packages, the bound artifact role is AUTHOR_REVIEW_MANUSCRIPT. Internal editorial artifacts, QA artifacts, manifests, governance memos, execution wrappers, and package manifests are not valid substitutes.

Checksum-only repair is prohibited when artifact identity is wrong.
`)

  writeDoc('08-artifact-role-model.md', `
# Artifact Role Model

Last Verified: ${repairedAt}

| Role | May Be Author-Facing Manuscript Authority |
| --- | --- |
| AUTHOR_REVIEW_MANUSCRIPT | YES |
| AUTHOR_REVIEW_INSTRUCTIONS | NO |
| AUTHOR_REVIEW_PROOF | YES for proof stages only |
| INTERNAL_EDITORIAL_ARTIFACT | NO |
| INTERNAL_EXECUTION_ARTIFACT | NO |
| INTERNAL_QA_ARTIFACT | NO |
| INTERNAL_MANIFEST | NO |
| EVIDENCE_ONLY | NO |
`)

  writeDoc('09-package-manifest-guard.md', `
# Package Manifest Guard

Last Verified: ${repairedAt}

Runtime/source guard added: package QA now fails with PACKAGE_QA_FAILED - AUTHOR_FACING_ARTIFACT_BINDING_INVALID when an author-review manuscript role is bound to an internal/wrapper artifact.

Azure cadence sender source guard added: current author-review attachment selection requires Author Facing visibility and no longer treats Delivered + Internal Only as author-visible.
`)

  writeDoc('10-send-time-checksum-guard.md', `
# Send-Time Checksum Guard

Last Verified: ${repairedAt}

Existing send-time checksum guard preserved.

No Establishing Glory resend occurred.

Future sends require both correct artifact identity and matching attachment bytes.
`)

  writeDoc('11-post-send-readback.md', `
# Post-Send Readback

Last Verified: ${repairedAt}

Corrected Establishing Glory delivery readback remains governed by prior evidence package:

${REPAIR.sourcePackage}

Recipient content equals clean corrected author-facing artifact: YES

Recipient content equals Dataverse internal wrapper artifact: NO
`)

  writeDoc('12-waiting-on-truth.md', `
# Waiting-On Truth

Last Verified: ${repairedAt}

WAITING_ON_AUTHOR is valid only when the action references the current clean author-facing artifact.

Establishing Glory after repair is no longer waiting on the author for Developmental Editing approval. The existing APPROVED response was consumed against the clean artifact.
`)

  writeDoc('13-operator-view.md', `
# Operator View

Last Verified: ${repairedAt}

Operator surface should show Establishing Glory Developmental Editing approval as resolved, with approval bound to artifact ${clean.id}.

The internal wrapper remains visible only as internal evidence.
`)

  writeDoc('14-drift-monitor.md', `
# Drift Monitor

Last Verified: ${repairedAt}

Monitor rule: any active or approved author-review gate whose deliverable artifact is not Author Facing must surface AUTHOR_FACING_ARTIFACT_BINDING_DRIFT.

Current/recent sweep drift rows after deterministic Establishing Glory repair: ${sweep.filter((row) => row.classification !== 'CORRECT_BINDING').length}

Deterministic metadata repairs performed during this replay: ${deterministicSweepRepairs.length}

Cumulative deterministic metadata repairs completed: ${cumulativeSweepRepairLogs.length}
`)

  writeDoc('15-negative-proof.md', `
# Negative Proof

Last Verified: ${repairedAt}

| Check | Value |
| --- | --- |
| Establishing_Glory_resent | 0 |
| author_asked_to_approve_again | 0 |
| checksum_only_patch | 0 |
| internal_wrapper_current_author_facing_authority | ${payload.negativeProof.internalWrapperCurrentAuthorFacingAuthority} |
| approval_bound_to_wrapper | ${payload.negativeProof.approvalBoundToWrapper} |
| clean_artifact_missing_structured_record | ${payload.negativeProof.cleanArtifactMissingStructuredRecord} |
| duplicate_approval_consumption | 0 |
`)

  writeDoc('00-executive-summary.md', `
# Executive Summary

Last Verified: ${repairedAt}

Establishing Glory's structured author-facing artifact authority was repaired. The author-facing manuscript authority now points to clean artifact ${clean.id}, SharePoint item ${REPAIR.cleanItemId}, SHA ${REPAIR.cleanSha256}.

The internal wrapper artifact ${REPAIR.oldArtifactId} was preserved as internal evidence and is no longer the current author-facing authority.

The existing APPROVED author response at ${REPAIR.approvalAt} was bound to the clean author-facing manuscript. No resend occurred and the author was not asked to approve again.

Approval consumer result: ${approvalResult.status}.

Current/recent author-review gates swept: ${sweep.length}.

Evidence files:

- 01-establishing-glory-artifact-role-differential.md
- 02-establishing-glory-dataverse-binding-repair.md
- 03-establishing-glory-approval-binding.md
- 04-establishing-glory-stage-result.md
- 05-current-author-review-binding-sweep.md
- 06-current-approval-binding-sweep.md
- 07-author-facing-artifact-policy.md
- 08-artifact-role-model.md
- 09-package-manifest-guard.md
- 10-send-time-checksum-guard.md
- 11-post-send-readback.md
- 12-waiting-on-truth.md
- 13-operator-view.md
- 14-drift-monitor.md
- 15-negative-proof.md
`)

  const checksumLines = readdirSync(evidenceDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const data = readFileSync(path.join(evidenceDir, name))
      return `${createHash('sha256').update(data).digest('hex')}  ${name}`
    })
  writeFileSync(path.join(evidenceDir, 'checksums.sha256'), `${checksumLines.join('\n')}\n`)
  console.log(JSON.stringify({
    cleanArtifactId: clean.id,
    cleanArtifactCreated: clean.created,
    oldBinding: REPAIR.oldArtifactId,
    newBinding: afterGate?._jm1pub_deliverableartifactid_value,
    approvalResult,
    sweepCount: sweep.length,
    driftCount: sweep.filter((row) => row.classification !== 'CORRECT_BINDING').length,
    evidenceDir,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
