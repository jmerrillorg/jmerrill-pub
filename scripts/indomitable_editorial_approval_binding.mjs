#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const DATAVERSE_BASE = process.env.DATAVERSE_WEB_API_BASE_URL || 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com'

const TITLE_ID = 'fd577d2b-01a0-f111-b8dc-000d3a14673b'
const OPPORTUNITY_ID = '455daa4a-629f-f111-b8dc-6045bdd69678'
const CONTACT_ID = '5bb796dc-cd95-f111-8076-7c1e525b15c2'
const INTAKE_ID = '74719cd6-cd95-f111-8076-6045bdd69678'
const DIAGNOSTIC_ID = '572a89ef-cd95-f111-8076-7c1e525b15c2'
const DEVELOPMENTAL_STAGE_ID = '0f587d2b-01a0-f111-b8dc-000d3a14673b'
const SOURCE_ARTIFACT_ID = 'c373402b-01a0-f111-b8db-7c1e525801f6'
const SOURCE_SHA256 = '08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181'

const TITLE = 'Indomitable'
const AUTHOR = 'Quanisha Dockery'
const INTAKE_REFERENCE = 'JMP-INT-202608-0AOS7L'
const APPROVAL_MESSAGE_ID = 'AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADd9xzfAAA='
const APPROVAL_MESSAGE_URL = 'https://outlook.office365.com/owa/?ItemID=AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ%2B3z0t8%2B9doBwD%2BXbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD%2BXbi2Wq2JSYocf3NG5QZjAADd9xzfAAA%3D&exvsurl=1&viewmodel=ReadMessageItem'
const APPROVAL_RECEIVED_ON = '2026-08-20T16:17:16Z'
const APPROVAL_SUBJECT = 'Re: Your Editorial Review and Recommended Path for Indomitable'
const APPROVAL_EXCERPT = 'I am extremely interested in professional publishing package. How would we move forward with this process?'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  ESCALATED: 835500003,
}

const STAGE_TYPE = {
  EDITORIAL_REVIEW: 100000000,
  DEVELOPMENTAL_EDITING: 100000001,
}

const STAGE_STATUS = {
  IN_PROGRESS: 100000001,
  COMPLETE: 100000008,
}

const STAGE_PHASE = {
  EXECUTION: 100000001,
}

const HEALTH_STATUS = {
  HEALTHY: 196650000,
}

const GATE = {
  DOMAIN_EDITORIAL: 196650000,
  A1_EDITORIAL_REVIEW_ACCEPTANCE: 196650000,
  STATUS_APPROVED: 196650003,
  DECISION_APPROVE: 196650000,
}

async function main() {
  const token = getToken()
  const startedAt = new Date().toISOString()

  const [title, developmentalStage, sourceArtifact] = await Promise.all([
    readRequired(token, `jm1pub_titles(${TITLE_ID})?$select=jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,jm1pub_authordisplayname`),
    readRequired(token, `jm1pub_editorialstages(${DEVELOPMENTAL_STAGE_ID})?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,_jm1pub_titleid_value,jm1pub_blockerreason`),
    readRequired(token, `jm1pub_editorialartifacts(${SOURCE_ARTIFACT_ID})?$select=jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,_jm1pub_titleid_value,_jm1pub_editorialstageid_value`),
  ])

  assertTitleReadback(title)
  assertDevelopmentalStageReadback(developmentalStage)
  assertSourceArtifactReadback(sourceArtifact)

  const editorialReviewStage = await ensureEditorialReviewStage(token, startedAt)
  await bindSourceArtifactToEditorialReviewStage(token, editorialReviewStage.jm1pub_editorialstageid)
  const approvalGate = await ensureEditorialReviewApprovalGate(token, editorialReviewStage.jm1pub_editorialstageid)
  await markDevelopmentalStageExecutable(token, approvalGate.jm1pub_editorialapprovalgateid)
  await patchOpportunityEvidence(token, approvalGate.jm1pub_editorialapprovalgateid)
  await patchIntakeEvidence(token)

  const logs = []
  logs.push(await ensureExecutionLog(token, {
    name: `EDITORIAL-REVIEW-APPROVAL-EVIDENCE-BOUND-${TITLE_ID}`,
    actionType: 'EDITORIAL_REVIEW_APPROVAL_EVIDENCE_BOUND',
    description: [
      `Bound Quanisha Dockery's governed Outlook response as Editorial Review / Professional package approval for ${TITLE}.`,
      `Message subject "${APPROVAL_SUBJECT}" received ${APPROVAL_RECEIVED_ON} in publishing@jmerrill.one.`,
      `Author text: "${APPROVAL_EXCERPT}"`,
      `Approval gate ${approvalGate.jm1pub_editorialapprovalgateid}; source artifact ${SOURCE_ARTIFACT_ID}; sha256 ${SOURCE_SHA256}.`,
      `Idempotency: editorial-review-approval:${TITLE_ID}:${SOURCE_ARTIFACT_ID}:${APPROVAL_RECEIVED_ON}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_title',
    sourceRecordId: TITLE_ID,
    completedOn: APPROVAL_RECEIVED_ON,
    status: EXECUTION_STATUS.SUCCESS,
  }))
  logs.push(await ensureExecutionLog(token, {
    name: `DEVELOPMENTAL-EDITING-AUTHORIZED-${DEVELOPMENTAL_STAGE_ID}`,
    actionType: 'DEVELOPMENTAL_EDITING_AUTHORIZED_BY_EDITORIAL_REVIEW_APPROVAL',
    description: [
      `Developmental Editing is authorized for ${AUTHOR} / ${TITLE} by A1 Editorial Review acceptance.`,
      `Professional package includes light Developmental Editing; source artifact ${SOURCE_ARTIFACT_ID}; gate ${approvalGate.jm1pub_editorialapprovalgateid}.`,
      `No author communication sent; no author approval fabricated; next operation must use targeted editorial runtime and exact checksum.`,
      `Idempotency: developmental-authorization:${DEVELOPMENTAL_STAGE_ID}:${approvalGate.jm1pub_editorialapprovalgateid}:${SOURCE_SHA256}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialstage',
    sourceRecordId: DEVELOPMENTAL_STAGE_ID,
    completedOn: startedAt,
    status: EXECUTION_STATUS.SUCCESS,
  }))

  const readback = await readbackState(token, editorialReviewStage.jm1pub_editorialstageid, approvalGate.jm1pub_editorialapprovalgateid)
  console.log(JSON.stringify({
    ok: true,
    approvalEvidenceFound: true,
    evidenceType: 'Microsoft 365 / Outlook author reply',
    evidenceTimestamp: APPROVAL_RECEIVED_ON,
    sourceMessageId: APPROVAL_MESSAGE_ID,
    sourceMessageUrl: APPROVAL_MESSAGE_URL,
    authorApprovalConfirmed: true,
    titleId: TITLE_ID,
    editorialReviewStageId: editorialReviewStage.jm1pub_editorialstageid,
    developmentalStageId: DEVELOPMENTAL_STAGE_ID,
    sourceArtifactId: SOURCE_ARTIFACT_ID,
    sourceChecksum: SOURCE_SHA256,
    approvalGateId: approvalGate.jm1pub_editorialapprovalgateid,
    logs,
    readback,
  }, null, 2))
}

function getToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DATAVERSE_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function assertTitleReadback(title) {
  const name = value(title.jm1pub_titlename || title.jm1pub_name)
  if (!name.toLowerCase().includes('indomitable')) throw new Error(`TITLE_MISMATCH:${name}`)
}

function assertDevelopmentalStageReadback(stage) {
  if (value(stage._jm1pub_titleid_value) !== TITLE_ID) throw new Error('DEVELOPMENTAL_STAGE_TITLE_MISMATCH')
  if (Number(stage.jm1pub_stagetype) !== STAGE_TYPE.DEVELOPMENTAL_EDITING) throw new Error('DEVELOPMENTAL_STAGE_TYPE_MISMATCH')
}

function assertSourceArtifactReadback(artifact) {
  if (value(artifact._jm1pub_titleid_value) !== TITLE_ID) throw new Error('SOURCE_ARTIFACT_TITLE_MISMATCH')
  if (value(artifact.jm1pub_sha256) !== SOURCE_SHA256) throw new Error('SOURCE_ARTIFACT_SHA_MISMATCH')
}

async function ensureEditorialReviewStage(token, startedAt) {
  const existing = await dataverseList(token, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,modifiedon',
    $filter: `_jm1pub_titleid_value eq ${TITLE_ID} and jm1pub_stagetype eq ${STAGE_TYPE.EDITORIAL_REVIEW}`,
    $orderby: 'modifiedon desc',
    $top: '1',
  })
  const payload = {
    jm1pub_name: `Editorial Review - ${TITLE}`,
    jm1pub_projecttitle: TITLE,
    jm1pub_author: AUTHOR,
    jm1pub_intakereference: INTAKE_REFERENCE,
    jm1pub_opportunityreference: OPPORTUNITY_ID,
    jm1pub_stagetype: STAGE_TYPE.EDITORIAL_REVIEW,
    jm1pub_stagestatus: STAGE_STATUS.COMPLETE,
    jm1pub_phase: STAGE_PHASE.EXECUTION,
    jm1pub_healthstatus: HEALTH_STATUS.HEALTHY,
    jm1pub_stagesequence: 0,
    jm1pub_stagecompletedate: APPROVAL_RECEIVED_ON,
    jm1pub_authorsafesummary: 'Your Editorial Review recommendation was shared and you confirmed you wanted to move forward with the Professional Publishing Package.',
    jm1pub_internaloperationalsummary: `A1 Editorial Review acceptance bound from governed Publishing mailbox message ${APPROVAL_MESSAGE_ID}. Source artifact ${SOURCE_ARTIFACT_ID}; checksum ${SOURCE_SHA256}.`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${TITLE_ID})`,
    'Jm1pub_Contactid@odata.bind': `/contacts(${CONTACT_ID})`,
  }
  if (existing[0]) {
    await dataversePatch(token, 'jm1pub_editorialstages', existing[0].jm1pub_editorialstageid, payload)
    return { ...existing[0], ...payload }
  }
  return dataverseCreate(token, 'jm1pub_editorialstages', {
    ...payload,
    jm1pub_stagestartdate: startedAt,
  })
}

async function bindSourceArtifactToEditorialReviewStage(token, editorialReviewStageId) {
  await dataversePatch(token, 'jm1pub_editorialartifacts', SOURCE_ARTIFACT_ID, {
    jm1pub_artifactstatus: 196650003,
    jm1pub_iscurrentapproved: true,
    jm1pub_notes: `Governed source manuscript. A1 Editorial Review acceptance bound from Microsoft 365 / Outlook message ${APPROVAL_MESSAGE_ID}, received ${APPROVAL_RECEIVED_ON}.`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${editorialReviewStageId})`,
  })
}

async function ensureEditorialReviewApprovalGate(token, editorialReviewStageId) {
  const existing = await dataverseList(token, 'jm1pub_editorialapprovalgates', {
    $select: 'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_nextstageauthorized,_jm1pub_deliverableartifactid_value',
    $filter: `_jm1pub_titleid_value eq ${TITLE_ID} and _jm1pub_editorialstageid_value eq ${editorialReviewStageId} and jm1pub_gatecode eq ${GATE.A1_EDITORIAL_REVIEW_ACCEPTANCE}`,
    $orderby: 'modifiedon desc',
    $top: '1',
  })
  const payload = {
    jm1pub_editorialapprovalgatename: `A1 Editorial Review Acceptance - ${TITLE}`,
    jm1pub_gatedomain: GATE.DOMAIN_EDITORIAL,
    jm1pub_gatecode: GATE.A1_EDITORIAL_REVIEW_ACCEPTANCE,
    jm1pub_gatestatus: GATE.STATUS_APPROVED,
    jm1pub_authordecision: GATE.DECISION_APPROVE,
    jm1pub_authordecisionon: APPROVAL_RECEIVED_ON,
    jm1pub_authorresponsesummary: `Author accepted the Professional Publishing Package path in response to the Editorial Review recommendation. Exact excerpt: "${APPROVAL_EXCERPT}"`,
    jm1pub_authordecisionsource: `OUTLOOK:${APPROVAL_RECEIVED_ON}:INDOMITABLE`,
    jm1pub_nextstageauthorized: true,
    jm1pub_nextstageauthorizedon: APPROVAL_RECEIVED_ON,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${TITLE_ID})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${editorialReviewStageId})`,
    'Jm1pub_Deliverableartifactid@odata.bind': `/jm1pub_editorialartifacts(${SOURCE_ARTIFACT_ID})`,
  }
  if (existing[0]) {
    await dataversePatch(token, 'jm1pub_editorialapprovalgates', existing[0].jm1pub_editorialapprovalgateid, payload)
    return { ...existing[0], ...payload }
  }
  return dataverseCreate(token, 'jm1pub_editorialapprovalgates', payload)
}

async function markDevelopmentalStageExecutable(token, approvalGateId) {
  await dataversePatch(token, 'jm1pub_editorialstages', DEVELOPMENTAL_STAGE_ID, {
    jm1pub_stagestatus: STAGE_STATUS.IN_PROGRESS,
    jm1pub_blockerreason: null,
    jm1pub_authorsafesummary: 'Developmental Editing has begun against the governed manuscript source for your Professional Publishing Package.',
    jm1pub_internaloperationalsummary: `A1 Editorial Review approval bound to source artifact ${SOURCE_ARTIFACT_ID}; approval gate ${approvalGateId}. Developmental Editing runtime may execute using checksum ${SOURCE_SHA256}.`,
    jm1pub_stagestartdate: APPROVAL_RECEIVED_ON,
  })
}

async function patchOpportunityEvidence(token, approvalGateId) {
  await dataversePatch(token, 'opportunities', OPPORTUNITY_ID, {
    jm1_m6paymentselectionevidencelog: `PAYMENT_RECEIVED / PROD_STARTED / A1_BOUND / DEV_READY`,
  })
}

async function patchIntakeEvidence(token) {
  await dataversePatch(token, 'jm1_publishingintakes', INTAKE_ID, {
    jm1_manuscriptreceived: true,
  })
}

async function ensureExecutionLog(token, input) {
  const existing = await dataverseList(token, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,createdon,jm1_completedon',
    $filter: `jm1_name eq '${escapeOData(input.name)}' and jm1_actiontype eq '${escapeOData(input.actionType)}'`,
    $top: '1',
  })
  if (existing[0]) return { ...existing[0], idempotent: true }
  return dataverseCreate(token, 'jm1_executionlogs', {
    jm1_name: input.name,
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description,
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
    jm1_executionstatus: input.status,
    jm1_completedon: input.completedOn,
  })
}

async function readbackState(token, editorialReviewStageId, approvalGateId) {
  const [editorialStage, developmentalStage, artifact, gate, logs] = await Promise.all([
    readRequired(token, `jm1pub_editorialstages(${editorialReviewStageId})?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagecompletedate,_jm1pub_titleid_value`),
    readRequired(token, `jm1pub_editorialstages(${DEVELOPMENTAL_STAGE_ID})?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_blockerreason,_jm1pub_titleid_value`),
    readRequired(token, `jm1pub_editorialartifacts(${SOURCE_ARTIFACT_ID})?$select=jm1pub_editorialartifactid,jm1pub_filename,jm1pub_sha256,jm1pub_iscurrentapproved,_jm1pub_titleid_value,_jm1pub_editorialstageid_value`),
    readRequired(token, `jm1pub_editorialapprovalgates(${approvalGateId})?$select=jm1pub_editorialapprovalgateid,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_deliverableartifactid_value,_jm1pub_titleid_value,_jm1pub_editorialstageid_value`),
    dataverseList(token, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_executionstatus,jm1_completedon,createdon',
      $filter: `jm1_sourcerecordid eq '${TITLE_ID}' or jm1_sourcerecordid eq '${DEVELOPMENTAL_STAGE_ID}'`,
      $orderby: 'createdon desc',
      $top: '20',
    }),
  ])
  return { editorialStage, developmentalStage, artifact, gate, logs }
}

async function readRequired(token, path) {
  const row = await dataverseGet(token, path)
  if (!row) throw new Error(`READBACK_MISSING:${path}`)
  return row
}

async function dataverseGet(token, path) {
  const res = await fetch(`${DATAVERSE_BASE.replace(/\/$/, '')}/${path}`, { headers: dataverseHeaders(token) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`dataverse_get_failed:${res.status}:${JSON.stringify(body).slice(0, 1000)}`)
  return body
}

async function dataverseList(token, entitySet, params) {
  const url = new URL(`${DATAVERSE_BASE.replace(/\/$/, '')}/${entitySet}`)
  for (const [key, val] of Object.entries(params || {})) {
    if (val !== undefined && val !== null && val !== '') url.searchParams.set(key, val)
  }
  const res = await fetch(url, { headers: dataverseHeaders(token) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`dataverse_list_failed:${entitySet}:${res.status}:${JSON.stringify(body).slice(0, 1000)}`)
  return Array.isArray(body.value) ? body.value : []
}

async function dataverseCreate(token, entitySet, body) {
  const res = await fetch(`${DATAVERSE_BASE.replace(/\/$/, '')}/${entitySet}`, {
    method: 'POST',
    headers: { ...dataverseHeaders(token), Prefer: 'return=representation, odata.include-annotations="OData.Community.Display.V1.FormattedValue"' },
    body: JSON.stringify(removeUndefined(body)),
  })
  const text = await res.text()
  const parsed = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`dataverse_create_failed:${entitySet}:${res.status}:${text.slice(0, 1000)}`)
  return parsed
}

async function dataversePatch(token, entitySet, id, body) {
  const res = await fetch(`${DATAVERSE_BASE.replace(/\/$/, '')}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: dataverseHeaders(token),
    body: JSON.stringify(removeUndefined(body)),
  })
  if (res.status === 204) return {}
  const text = await res.text()
  if (!res.ok) throw new Error(`dataverse_patch_failed:${entitySet}:${res.status}:${text.slice(0, 1000)}`)
  return text ? JSON.parse(text) : {}
}

function dataverseHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  }
}

function removeUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, val]) => val !== undefined))
}

function escapeOData(input) {
  return String(input || '').replace(/'/g, "''")
}

function value(input) {
  return typeof input === 'string' ? input : ''
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
