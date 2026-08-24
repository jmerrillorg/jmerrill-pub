#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const DATAVERSE_BASE = process.env.DATAVERSE_WEB_API_BASE_URL || 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com'
const OPPORTUNITY_ID = '455daa4a-629f-f111-b8dc-6045bdd69678'
const CONTACT_ID = '5bb796dc-cd95-f111-8076-7c1e525b15c2'
const INTAKE_ID = '74719cd6-cd95-f111-8076-6045bdd69678'
const DIAGNOSTIC_ID = '572a89ef-cd95-f111-8076-7c1e525b15c2'
const TITLE = 'Indomitable'
const SUBMITTED_TITLE = 'Indomitable Indomitable Escaping Witchcraft and Finding My Identity in Christ'
const AUTHOR = 'Quanisha Dockery'
const INTAKE_REFERENCE = 'JMP-INT-202608-0AOS7L'
const SOURCE_URL = 'https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared Documents/01_Pre-Pipeline/00_Inquiry/JMP-INT-202608-0AOS7L - Quanisha Dockery - Indomitable Indomitable Escaping Witchcraft and Finding My Identity in Christ/01_Manuscript/Original/Indomitable_Compiled_Batch1_2.docx?web=1'
const GRAPH_WEB_URL = 'https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?sourcedoc=%7B99326A50-505E-4500-9A96-F2950CFDDA93%7D&file=Indomitable_Compiled_Batch1_2.docx&action=default&mobileredirect=true'
const SOURCE_FILENAME = 'Indomitable_Compiled_Batch1_2.docx'
const SOURCE_SIZE_BYTES = 44420
const SOURCE_DRIVE_ID = 'b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se'
const SOURCE_ITEM_ID = '01DF3SEQKQNIZJSXSQABCZVFXSSUGP3WUT'
const SOURCE_SHA256 = '08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181'
const FIRST_PAYMENT_ON = '2026-08-24T13:55:38Z'
const FIRST_PAYMENT_DATE = '2026-08-24'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  ESCALATED: 835500003,
}

const TITLE_STAGE = {
  EDITORIAL: 100000006,
}

const TITLE_LIFECYCLE = {
  EDITING: 835500001,
}

const TITLE_STATUS = {
  DEV_EDIT: 835500002,
}

const STAGE_TYPE = {
  DEVELOPMENTAL: 100000001,
}

const STAGE_STATUS = {
  NOT_STARTED: 100000000,
}

const STAGE_PHASE = {
  EXECUTION: 100000001,
}

const HEALTH_STATUS = {
  HEALTHY: 196650000,
}

const ARTIFACT_TYPE = {
  MANUSCRIPT_REVIEW_COPY: 196650000,
}

const ARTIFACT_STATUS = {
  APPROVED: 196650003,
}

async function main() {
  const token = getToken()
  const startedAt = new Date().toISOString()
  const opportunity = await readOpportunity(token)
  assertCommercialGate(opportunity)

  const title = await ensureTitle(token)
  const stage = await ensureDevelopmentalStage(token, title.jm1pub_titleid)
  const artifact = await ensureSourceArtifact(token, title.jm1pub_titleid, stage.jm1pub_editorialstageid)

  await patchOpportunity(token)
  await patchIntake(token)

  const logs = []
  logs.push(await ensureExecutionLog(token, {
    name: `PRODUCTION-COMMENCED-${OPPORTUNITY_ID}`,
    actionType: 'PRODUCTION_COMMENCED',
    description: [
      `Production commenced for ${AUTHOR} / ${TITLE}.`,
      `Gate satisfied by executed agreement plus first Stripe payment received at ${FIRST_PAYMENT_ON}.`,
      `PaymentIntent pi_3U7xLSJCiOVFpgYu1ABnQR6G; charge ch_3U7xLSJCiOVFpgYu1VuBLXtf; invoice in_1U7xLRJCiOVFpgYu1SKo9kgC / QXKWX2LC-0001; Stripe event evt_1U7yLhJCiOVFpgYusvcMXT3j.`,
      'No duplicate charge, duplicate invoice, payment-options resend, agreement regeneration, Business Central posting, or author communication occurred.',
    ].join(' '),
    sourceEntity: 'opportunity',
    sourceRecordId: OPPORTUNITY_ID,
    completedOn: FIRST_PAYMENT_ON,
    status: EXECUTION_STATUS.SUCCESS,
  }))
  logs.push(await ensureExecutionLog(token, {
    name: `EDITORIAL-SOURCE-BOUND-${title.jm1pub_titleid}`,
    actionType: 'EDITORIAL_SOURCE_ARTIFACT_BOUND',
    description: [
      `Bound governed source manuscript for ${AUTHOR} / ${TITLE}.`,
      `Source artifact ${artifact.jm1pub_editorialartifactid}; diagnostic ${DIAGNOSTIC_ID}; intake ${INTAKE_REFERENCE}.`,
      `Filename ${SOURCE_FILENAME}; sha256 ${SOURCE_SHA256}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_title',
    sourceRecordId: title.jm1pub_titleid,
    completedOn: startedAt,
    status: EXECUTION_STATUS.SUCCESS,
  }))
  logs.push(await ensureExecutionLog(token, {
    name: `DEVELOPMENTAL-EDITING-STAGE-MATERIALIZED-${title.jm1pub_titleid}`,
    actionType: 'DEVELOPMENTAL_EDITING_STAGE_MATERIALIZED',
    description: [
      `Developmental Editing stage materialized for ${AUTHOR} / ${TITLE}.`,
      `Professional package includes governed light Developmental Editing.`,
      `Stage ${stage.jm1pub_editorialstageid}; source artifact ${artifact.jm1pub_editorialartifactid}.`,
      'Runtime execution is held until the exact Editorial Review/author-approval boundary is bound; no author approval was fabricated.',
    ].join(' '),
    sourceEntity: 'jm1pub_editorialstage',
    sourceRecordId: stage.jm1pub_editorialstageid,
    completedOn: startedAt,
    status: EXECUTION_STATUS.SUCCESS,
  }))
  logs.push(await ensureExecutionLog(token, {
    name: `DEVELOPMENTAL-EDITING-EXECUTION-BLOCKED-${stage.jm1pub_editorialstageid}`,
    actionType: 'DEVELOPMENTAL_EDITING_EXECUTION_BLOCKED_EXACT_GATE',
    description: [
      `Developmental Editing worker not invoked for ${AUTHOR} / ${TITLE}.`,
      'The targeted editorial runtime requires exact upstream author approval bound to the source artifact before Developmental Editing execution.',
      `Current source artifact ${artifact.jm1pub_editorialartifactid}; checksum ${SOURCE_SHA256}.`,
      'Production has commenced commercially; next system task is to bind or recover the exact Editorial Review approval evidence, then allow the commissioned worker to run.',
    ].join(' '),
    sourceEntity: 'jm1pub_editorialstage',
    sourceRecordId: stage.jm1pub_editorialstageid,
    completedOn: startedAt,
    status: EXECUTION_STATUS.ESCALATED,
  }))

  const readback = await readbackState(token, title.jm1pub_titleid, stage.jm1pub_editorialstageid, artifact.jm1pub_editorialartifactid)
  console.log(JSON.stringify({
    ok: true,
    titleId: title.jm1pub_titleid,
    stageId: stage.jm1pub_editorialstageid,
    sourceArtifactId: artifact.jm1pub_editorialartifactid,
    sourceChecksum: SOURCE_SHA256,
    logs,
    readback,
  }, null, 2))
}

function getToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DATAVERSE_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

async function readOpportunity(token) {
  return dataverseGet(token, `opportunities(${OPPORTUNITY_ID})?$select=opportunityid,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,jm1pub_contractstatus,jm1_m6agreementpreparationstatus,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal`)
}

function assertCommercialGate(opportunity) {
  if (Number(opportunity.jm1_m6firstpaymentstatus) !== 835510002) throw new Error('FIRST_PAYMENT_NOT_CONFIRMED')
  if (Number(opportunity.jm1pub_contractstatus) !== 196650003) throw new Error('AGREEMENT_NOT_SIGNED')
}

async function ensureTitle(token) {
  const existing = await dataverseList(token, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_name',
    $filter: `jm1pub_titlename eq '${escapeOData(TITLE)}' and jm1pub_authordisplayname eq '${escapeOData(AUTHOR)}'`,
    $top: '1',
  })
  if (existing[0]) return existing[0]
  return dataverseCreate(token, 'jm1pub_titles', {
    jm1pub_titlename: TITLE,
    jm1pub_name: `${TITLE} - ${AUTHOR}`,
    jm1_titlename: TITLE,
    jm1_subtitle: SUBMITTED_TITLE === TITLE ? undefined : SUBMITTED_TITLE,
    jm1pub_authordisplayname: AUTHOR,
    jm1pub_authorname: AUTHOR,
    jm1pub_stage: TITLE_STAGE.EDITORIAL,
    jm1_lifecyclestage: TITLE_LIFECYCLE.EDITING,
    jm1pub_status: TITLE_STATUS.DEV_EDIT,
    jm1_sourceauthority: `Opportunity ${OPPORTUNITY_ID}; intake ${INTAKE_REFERENCE}; diagnostic ${DIAGNOSTIC_ID}`,
    jm1_sourceeffectivedate: FIRST_PAYMENT_DATE,
    'jm1_PrimaryAuthor@odata.bind': `/contacts(${CONTACT_ID})`,
  })
}

async function ensureDevelopmentalStage(token, titleId) {
  const existing = await dataverseList(token, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus',
    $filter: `_jm1pub_titleid_value eq ${titleId} and jm1pub_stagetype eq ${STAGE_TYPE.DEVELOPMENTAL}`,
    $orderby: 'modifiedon desc',
    $top: '1',
  })
  if (existing[0]) return existing[0]
  return dataverseCreate(token, 'jm1pub_editorialstages', {
    jm1pub_name: `Developmental Editing - ${TITLE}`,
    jm1pub_projecttitle: TITLE,
    jm1pub_author: AUTHOR,
    jm1pub_intakereference: INTAKE_REFERENCE,
    jm1pub_opportunityreference: OPPORTUNITY_ID,
    jm1pub_stagetype: STAGE_TYPE.DEVELOPMENTAL,
    jm1pub_stagestatus: STAGE_STATUS.NOT_STARTED,
    jm1pub_phase: STAGE_PHASE.EXECUTION,
    jm1pub_healthstatus: HEALTH_STATUS.HEALTHY,
    jm1pub_stagesequence: 1,
    jm1pub_authorsafesummary: 'Your book has moved into production. The next editorial step is Developmental Editing.',
    jm1pub_blockerreason: 'Developmental Editing queued after first payment; exact Editorial Review approval evidence must be bound before worker execution.',
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${titleId})`,
    'Jm1pub_Contactid@odata.bind': `/contacts(${CONTACT_ID})`,
  })
}

async function ensureSourceArtifact(token, titleId, stageId) {
  const existing = await dataverseList(token, 'jm1pub_editorialartifacts', {
    $select: 'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_sha256',
    $filter: `_jm1pub_titleid_value eq ${titleId} and jm1pub_sha256 eq '${SOURCE_SHA256}'`,
    $orderby: 'modifiedon desc',
    $top: '1',
  })
  if (existing[0]) return existing[0]
  return dataverseCreate(token, 'jm1pub_editorialartifacts', {
    jm1pub_editorialartifactname: `Governed Source Manuscript - ${TITLE}`,
    jm1pub_filename: SOURCE_FILENAME,
    jm1pub_fileextension: 'docx',
    jm1pub_filesizebytes: SOURCE_SIZE_BYTES,
    jm1pub_repositorydriveid: SOURCE_DRIVE_ID,
    jm1pub_repositoryitemid: SOURCE_ITEM_ID,
    jm1pub_repositorypath: GRAPH_WEB_URL || SOURCE_URL,
    jm1pub_sha256: SOURCE_SHA256,
    jm1pub_artifacttype: ARTIFACT_TYPE.MANUSCRIPT_REVIEW_COPY,
    jm1pub_artifactstatus: ARTIFACT_STATUS.APPROVED,
    jm1pub_iscurrentapproved: true,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${stageId})`,
  })
}

async function patchOpportunity(token) {
  await dataversePatch(token, 'opportunities', OPPORTUNITY_ID, {
    jm1_m6paymentselectionevidencelog: 'FIRST_PAYMENT_RECEIVED / PRODUCTION_COMMENCED / DEV_EDIT_READY',
  })
}

async function patchIntake(token) {
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

async function readbackState(token, titleId, stageId, artifactId) {
  const [title, stage, artifact, opportunity, logs] = await Promise.all([
    dataverseGet(token, `jm1pub_titles(${titleId})?$select=jm1pub_titleid,jm1pub_titlename,jm1pub_stage,jm1_lifecyclestage,jm1pub_status,jm1pub_authordisplayname`),
    dataverseGet(token, `jm1pub_editorialstages(${stageId})?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_phase,jm1pub_healthstatus,jm1pub_blockerreason,_jm1pub_titleid_value`),
    dataverseGet(token, `jm1pub_editorialartifacts(${artifactId})?$select=jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_iscurrentapproved,_jm1pub_titleid_value,_jm1pub_editorialstageid_value`),
    dataverseGet(token, `opportunities(${OPPORTUNITY_ID})?$select=opportunityid,jm1_m6paymentselectionevidencelog,jm1_m6firstpaymentstatus,jm1pub_contractstatus`),
    dataverseList(token, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_executionstatus,jm1_completedon,createdon',
      $filter: `jm1_sourcerecordid eq '${OPPORTUNITY_ID}' or jm1_sourcerecordid eq '${titleId}' or jm1_sourcerecordid eq '${stageId}'`,
      $orderby: 'createdon desc',
      $top: '30',
    }),
  ])
  return { title, stage, artifact, opportunity, logs }
}

async function dataverseGet(token, path) {
  const res = await fetch(`${DATAVERSE_BASE.replace(/\/$/, '')}/${path}`, {
    headers: dataverseHeaders(token),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`dataverse_get_failed:${res.status}:${JSON.stringify(body).slice(0, 1000)}`)
  return body
}

async function dataverseList(token, entitySet, params) {
  const url = new URL(`${DATAVERSE_BASE.replace(/\/$/, '')}/${entitySet}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
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
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

function escapeOData(value) {
  return String(value || '').replace(/'/g, "''")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
