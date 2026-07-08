#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import process from 'node:process'

const DATAVERSE_RESOURCE_URL = (process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com').replace(
  /\/+$/,
  '',
)
const DATAVERSE_API_BASE = `${DATAVERSE_RESOURCE_URL}/api/data/v9.2`
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'
const INTAKE_REFERENCE = process.env.PROGRAM003_COMMISSIONING_REFERENCE || 'JMP-INT-202607-0W5PTQ'
const TITLE_NAME = process.env.PROGRAM003_COMMISSIONING_TITLE || 'The Intentional Leader'
const TITLE_SLUG = process.env.PROGRAM003_COMMISSIONING_SLUG || 'the-intentional-leader'
const SOLUTION_UNIQUE_NAME = process.env.PROGRAM003_SOLUTION_UNIQUE_NAME || 'JM1_Publishing'

const STAGE_TYPE_REVIEW = 100000000
const STAGE_STATUS_IN_PROGRESS = 100000001
const HEALTH_HEALTHY = 196650000
const ASSET_FORMAT_OTHER = 100000006
const ASSET_STATUS_STAGED = 100000000
const DISTRIBUTION_STATUS_DRAFT = 100000000
const AUTHOR_EVIDENCE_CONFIRMED = 100000000
const CATALOG_STATUS_DRAFT = 100000000
const ARTIFACT_TYPE_MANUSCRIPT_REVIEW_COPY = 196650000
const ARTIFACT_VISIBILITY_INTERNAL = 196650001
const ARTIFACT_STATUS_DELIVERED = 196650002
const GATE_DOMAIN_EDITORIAL = 196650000
const GATE_CODE_A1 = 196650000
const GATE_STATUS_NOT_READY = 196650000
const SUMMARY_TYPE_AUTHOR_SAFE_CURRENT = 196650000
const SUMMARY_STATUS_PUBLISHED = 196650002
const EXECUTION_STATUS_SUCCESS = 835500001
const EXECUTION_BANDLEVEL = 835500000

const EDITORIAL_SUBTREE = [
  '20_Editorial',
  '20_Editorial/01_Editorial-Review',
  '20_Editorial/01_Editorial-Review/Author-Facing',
  '20_Editorial/01_Editorial-Review/Internal',
  '20_Editorial/01_Editorial-Review/Evidence',
  '20_Editorial/02_Developmental-Editing',
  '20_Editorial/02_Developmental-Editing/Author-Facing',
  '20_Editorial/02_Developmental-Editing/Internal',
  '20_Editorial/02_Developmental-Editing/Evidence',
  '20_Editorial/03_Line-Editing',
  '20_Editorial/03_Line-Editing/Author-Facing',
  '20_Editorial/03_Line-Editing/Internal',
  '20_Editorial/03_Line-Editing/Evidence',
  '20_Editorial/04_Copyediting',
  '20_Editorial/04_Copyediting/Author-Facing',
  '20_Editorial/04_Copyediting/Internal',
  '20_Editorial/04_Copyediting/Evidence',
  '20_Editorial/05_Proofreading',
  '20_Editorial/05_Proofreading/Author-Facing',
  '20_Editorial/05_Proofreading/Internal',
  '20_Editorial/05_Proofreading/Evidence',
  '20_Editorial/06_Approval-Packages',
  '20_Editorial/06_Approval-Packages/A1_Editorial-Review',
  '20_Editorial/06_Approval-Packages/A2_Developmental',
  '20_Editorial/06_Approval-Packages/A3_Line',
  '20_Editorial/06_Approval-Packages/A4_Copyediting',
  '20_Editorial/06_Approval-Packages/A5_Proofreading',
  '20_Editorial/06_Approval-Packages/A6_Cover',
  '20_Editorial/06_Approval-Packages/A7_Layout',
  '20_Editorial/06_Approval-Packages/A8_Production',
  '20_Editorial/06_Approval-Packages/A9_Release',
  '20_Editorial/07_Publisher-Review',
  '20_Editorial/08_Exceptions',
  '20_Editorial/09_Meetings',
  '20_Editorial/10_Handoff-to-Production',
  '20_Editorial/99_Archive-Superseded',
]

async function main() {
  const dataverseToken = getBearerToken(DATAVERSE_RESOURCE_URL)
  const graphToken = getBearerToken('https://graph.microsoft.com')

  const intake = await fetchSingle(
    dataverseToken,
    'jm1_publishingintakes',
    {
      $select:
        'jm1_publishingintakeid,jm1_name,jm1_intakereferencecode,jm1_projecttitle,jm1_email,jm1_firstname,jm1_lastname,jm1_manuscripturl,createdon',
      $filter: `jm1_intakereferencecode eq '${INTAKE_REFERENCE}'`,
    },
    'publishing intake',
  )

  const opportunity = await fetchSingle(
    dataverseToken,
    'opportunities',
    {
      $select:
        'opportunityid,name,_parentcontactid_value,jm1_m6authorselectedpackagecode,jm1pub_packagerecommended,jm1pub_manuscriptsubmitted,createdon',
      $filter: `contains(name,'${escapeODataText(TITLE_NAME)}')`,
    },
    'opportunity',
  )

  const contact = await fetchSingle(
    dataverseToken,
    'contacts',
    {
      $select: 'contactid,fullname,firstname,lastname,emailaddress1',
      $filter: `contactid eq ${opportunity._parentcontactid_value}`,
    },
    'contact',
  )

  const contract = await fetchOptionalSingle(dataverseToken, 'jm1pub_contracts', {
    $select: 'jm1pub_contractid,jm1pub_contractname,createdon',
    $filter: `contains(jm1pub_contractname,'${escapeODataText(INTAKE_REFERENCE)}')`,
  })

  const manuscriptItem = await resolveShareLinkToDriveItem(graphToken, intake.jm1_manuscripturl)
  const workspaceRootPath = deriveWorkspaceRootPath(manuscriptItem.parentReference.path)
  const workspaceRootItem = await getDriveItemByPath(
    graphToken,
    manuscriptItem.parentReference.siteId,
    manuscriptItem.parentReference.driveId,
    workspaceRootPath,
  )

  const createdFolders = []
  for (const relativePath of EDITORIAL_SUBTREE) {
    const item = await ensureFolderByPath(
      graphToken,
      manuscriptItem.parentReference.siteId,
      manuscriptItem.parentReference.driveId,
      `${workspaceRootPath}/${relativePath}`,
    )
    createdFolders.push({ relativePath, id: item.id, webUrl: item.webUrl })
  }

  const editorialRoot = createdFolders.find((row) => row.relativePath === '20_Editorial')
  if (!editorialRoot) throw new Error('editorial_root_missing')

  let title = await fetchOptionalSingle(dataverseToken, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_name,jm1pub_slug',
    $filter: `jm1pub_titlename eq '${escapeODataText(TITLE_NAME)}'`,
  })

  if (!title) {
    title = await createRow(dataverseToken, 'jm1pub_titles', {
      jm1pub_titlename: TITLE_NAME,
      jm1pub_name: TITLE_NAME,
      jm1pub_slug: TITLE_SLUG,
      jm1pub_publiccatalogstatus: CATALOG_STATUS_DRAFT,
      jm1pub_authorname: contact.fullname,
      jm1pub_authordisplayname: contact.fullname,
      ...(contract ? { 'jm1pub_Contract@odata.bind': `/jm1pub_contracts(${contract.jm1pub_contractid})` } : {}),
      jm1pub_publicationstatus: 'Commissioning Editorial Review',
      jm1pub_notes: `PROGRAM-003 Core commissioning anchor created from ${INTAKE_REFERENCE}.`,
    })
  }

  let asset = await fetchOptionalSingle(dataverseToken, 'jm1pub_publishingassets', {
    $select: 'jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value',
    $filter: `_jm1pub_titleid_value eq ${title.jm1pub_titleid}`,
  })

  if (!asset) {
    asset = await createRow(dataverseToken, 'jm1pub_publishingassets', {
      jm1pub_name: `${TITLE_NAME} - Commissioning Manuscript - Other - ${INTAKE_REFERENCE}`,
      jm1pub_assetformat: ASSET_FORMAT_OTHER,
      jm1pub_assetstatus: ASSET_STATUS_STAGED,
      jm1pub_distributionstatus: DISTRIBUTION_STATUS_DRAFT,
      jm1pub_authorevidencestatus: AUTHOR_EVIDENCE_CONFIRMED,
      jm1pub_iscurrentedition: true,
      jm1pub_evidencepath: editorialRoot.relativePath,
      jm1pub_evidencesource: 'INT-PUB-005; PROGRAM-003 CORE COMMISSIONING',
      jm1pub_filepackagereference: editorialRoot.webUrl,
      jm1pub_interiorfilereference: intake.jm1_manuscripturl,
      'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${title.jm1pub_titleid})`,
      ...(contract ? { 'jm1pub_ContractId@odata.bind': `/jm1pub_contracts(${contract.jm1pub_contractid})` } : {}),
    })
  } else {
    await patchRow(dataverseToken, 'jm1pub_publishingassets', asset.jm1pub_publishingassetid, {
      jm1pub_evidencepath: editorialRoot.relativePath,
      jm1pub_evidencesource: 'INT-PUB-005; PROGRAM-003 CORE COMMISSIONING',
      jm1pub_filepackagereference: editorialRoot.webUrl,
      jm1pub_interiorfilereference: intake.jm1_manuscripturl,
    })
  }

  const correlationId = `PROGRAM003-${asset.jm1pub_publishingassetid}`

  let stage = await fetchOptionalSingle(dataverseToken, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagesequence',
    $filter: `_jm1pub_publishingassetid_value eq ${asset.jm1pub_publishingassetid} and jm1pub_stagesequence eq 1`,
  })

  if (!stage) {
    stage = await createRow(dataverseToken, 'jm1pub_editorialstages', {
      jm1pub_name: `Editorial Review - ${TITLE_NAME}`,
      jm1pub_projecttitle: TITLE_NAME,
      jm1pub_author: contact.fullname,
      jm1pub_publishingintakereference: INTAKE_REFERENCE,
      jm1pub_intakereference: INTAKE_REFERENCE,
      jm1pub_opportunityreference: opportunity.opportunityid,
      jm1pub_selectedpackage: opportunity.jm1_m6authorselectedpackagecode || opportunity.jm1pub_packagerecommended || '',
      jm1pub_stagetype: STAGE_TYPE_REVIEW,
      jm1pub_stagestatus: STAGE_STATUS_IN_PROGRESS,
      jm1pub_stagesequence: 1,
      jm1pub_healthstatus: HEALTH_HEALTHY,
      jm1pub_governingstyleguide: 'CMoS',
      jm1pub_authorsafesummary:
        'Your manuscript is in Editorial Review. We are preparing your recommendation and will share the next decision step when it is ready.',
      jm1pub_internaloperationalsummary: `Commissioning stage created in JM1-Core from ${INTAKE_REFERENCE}.`,
      jm1pub_correlationid: correlationId,
      jm1pub_stagecompletedate: null,
      jm1pub_stagestartdate: new Date().toISOString(),
      jm1pub_currentartifactcount: 0,
      jm1pub_currentgatecount: 0,
      jm1pub_openexceptioncount: 0,
      'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${asset.jm1pub_publishingassetid})`,
      'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.jm1pub_titleid})`,
      'Jm1pub_Contactid@odata.bind': `/contacts(${contact.contactid})`,
      ...(contract ? { 'Jm1pub_Contractid@odata.bind': `/jm1pub_contracts(${contract.jm1pub_contractid})` } : {}),
    })
  }

  let artifact = await fetchOptionalSingle(dataverseToken, 'jm1pub_editorialartifacts', {
    $select: 'jm1pub_editorialartifactid,jm1pub_filename,jm1pub_repositoryitemid',
    $filter: `_jm1pub_publishingassetid_value eq ${asset.jm1pub_publishingassetid} and jm1pub_repositoryitemid eq '${manuscriptItem.id}'`,
  })

  if (!artifact) {
    artifact = await createRow(dataverseToken, 'jm1pub_editorialartifacts', {
      jm1pub_editorialartifactname: `Manuscript Review Copy - ${TITLE_NAME}`,
      jm1pub_filename: manuscriptItem.name,
      jm1pub_fileextension: extensionOf(manuscriptItem.name),
      jm1pub_filesizebytes: manuscriptItem.size,
      jm1pub_repositorysiteid: manuscriptItem.parentReference.siteId,
      jm1pub_repositorydriveid: manuscriptItem.parentReference.driveId,
      jm1pub_repositoryitemid: manuscriptItem.id,
      jm1pub_repositorypath: drivePathToLibraryPath(manuscriptItem.parentReference.path, manuscriptItem.name),
      jm1pub_artifacttype: ARTIFACT_TYPE_MANUSCRIPT_REVIEW_COPY,
      jm1pub_visibility: ARTIFACT_VISIBILITY_INTERNAL,
      jm1pub_artifactstatus: ARTIFACT_STATUS_DELIVERED,
      jm1pub_iscurrentapproved: true,
      jm1pub_deliveredon: new Date().toISOString(),
      jm1pub_authorvisiblefrom: null,
      jm1pub_notes: `Commissioning manuscript source registered from ${INTAKE_REFERENCE}.`,
      jm1pub_correlationid: correlationId,
      'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${asset.jm1pub_publishingassetid})`,
      'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.jm1pub_titleid})`,
      'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`,
    })
  }

  let gate = await fetchOptionalSingle(dataverseToken, 'jm1pub_editorialapprovalgates', {
    $select: 'jm1pub_editorialapprovalgateid,jm1pub_gatecode',
    $filter: `_jm1pub_publishingassetid_value eq ${asset.jm1pub_publishingassetid} and jm1pub_gatecode eq ${GATE_CODE_A1}`,
  })

  if (!gate) {
    gate = await createRow(dataverseToken, 'jm1pub_editorialapprovalgates', {
      jm1pub_editorialapprovalgatename: `A1 Editorial Review Acceptance - ${TITLE_NAME}`,
      jm1pub_gatedomain: GATE_DOMAIN_EDITORIAL,
      jm1pub_gatecode: GATE_CODE_A1,
      jm1pub_gatestatus: GATE_STATUS_NOT_READY,
      jm1pub_nextstageauthorized: false,
      jm1pub_correlationid: correlationId,
      'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${asset.jm1pub_publishingassetid})`,
      'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.jm1pub_titleid})`,
      'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`,
      'Jm1pub_Deliverableartifactid@odata.bind': `/jm1pub_editorialartifacts(${artifact.jm1pub_editorialartifactid})`,
    })
  }

  let summary = await fetchOptionalSingle(dataverseToken, 'jm1pub_editorialsummaries', {
    $select: 'jm1pub_editorialsummaryid,jm1pub_summarytype,jm1pub_summaryheadline',
    $filter: `_jm1pub_publishingassetid_value eq ${asset.jm1pub_publishingassetid} and jm1pub_summarytype eq ${SUMMARY_TYPE_AUTHOR_SAFE_CURRENT}`,
  })

  if (!summary) {
    summary = await createRow(dataverseToken, 'jm1pub_editorialsummaries', {
      jm1pub_editorialsummaryname: `Author Safe Current - ${TITLE_NAME}`,
      jm1pub_summarytype: SUMMARY_TYPE_AUTHOR_SAFE_CURRENT,
      jm1pub_summarystatus: SUMMARY_STATUS_PUBLISHED,
      jm1pub_summaryheadline: 'Editorial Review has begun.',
      jm1pub_summarybody:
        'We have your manuscript and are reviewing it now. Once the review is complete, we will prepare your recommendation and the next approval step for you.',
      jm1pub_nextactionlabel: 'Editorial Review in progress',
      jm1pub_publishedtoworkspaceon: new Date().toISOString(),
      jm1pub_approvedbyhuman: true,
      jm1pub_approvedon: new Date().toISOString(),
      jm1pub_correlationid: correlationId,
      'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${asset.jm1pub_publishingassetid})`,
      'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.jm1pub_titleid})`,
      'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`,
      'Jm1pub_Editorialapprovalgateid@odata.bind': `/jm1pub_editorialapprovalgates(${gate.jm1pub_editorialapprovalgateid})`,
      'Jm1pub_Sourceartifactid@odata.bind': `/jm1pub_editorialartifacts(${artifact.jm1pub_editorialartifactid})`,
    })
  }

  await patchRow(dataverseToken, 'jm1pub_editorialstages', stage.jm1pub_editorialstageid, {
    jm1pub_currentartifactcount: 1,
    jm1pub_currentgatecount: 1,
    jm1pub_openexceptioncount: 0,
  })

  await createExecutionLog(dataverseToken, {
    eventCode: 'EDITORIAL_STAGE_STARTED',
    sourceRecordId: asset.jm1pub_publishingassetid,
    startedOn: stage.jm1pub_stagestartdate || new Date().toISOString(),
    completedOn: new Date().toISOString(),
    summary: `Commissioning Editorial Review started for ${TITLE_NAME}.`,
  })

  await createExecutionLog(dataverseToken, {
    eventCode: 'EDITORIAL_ARTIFACT_REGISTERED',
    sourceRecordId: asset.jm1pub_publishingassetid,
    startedOn: new Date().toISOString(),
    completedOn: new Date().toISOString(),
    summary: `Commissioning manuscript review artifact registered for ${TITLE_NAME}.`,
  })

  await createExecutionLog(dataverseToken, {
    eventCode: 'EDITORIAL_SUMMARY_PUBLISHED_TO_WORKSPACE',
    sourceRecordId: asset.jm1pub_publishingassetid,
    startedOn: new Date().toISOString(),
    completedOn: new Date().toISOString(),
    summary: `Author-safe commissioning summary published for ${TITLE_NAME}.`,
  })

  console.log(
    JSON.stringify(
      {
        commissioningReference: INTAKE_REFERENCE,
        titleId: title.jm1pub_titleid,
        publishingAssetId: asset.jm1pub_publishingassetid,
        editorialStageId: stage.jm1pub_editorialstageid,
        editorialArtifactId: artifact.jm1pub_editorialartifactid,
        editorialApprovalGateId: gate.jm1pub_editorialapprovalgateid,
        editorialSummaryId: summary.jm1pub_editorialsummaryid,
        opportunityId: opportunity.opportunityid,
        contactId: contact.contactid,
        contractId: contract?.jm1pub_contractid || null,
        repository: {
          siteId: manuscriptItem.parentReference.siteId,
          driveId: manuscriptItem.parentReference.driveId,
          workspaceRootPath,
          editorialRootPath: `${workspaceRootPath}/20_Editorial`,
          manuscriptItemId: manuscriptItem.id,
          createdFolders: createdFolders.length,
        },
      },
      null,
      2,
    ),
  )
}

function getBearerToken(resourceUrl) {
  return execFileSync(
    '/opt/homebrew/bin/az',
    ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'],
    { encoding: 'utf8' },
  ).trim()
}

async function fetchSingle(token, entitySet, params, label) {
  const row = await fetchOptionalSingle(token, entitySet, params)
  if (!row) throw new Error(`${label}_not_found`)
  return row
}

async function fetchOptionalSingle(token, entitySet, params) {
  const url = `${DATAVERSE_API_BASE}/${entitySet}?${toODataParams(params)}`
  const json = await dataverseJson(token, url)
  const value = Array.isArray(json.value) ? json.value : []
  return value[0] || null
}

async function createRow(token, entitySet, body) {
  const response = await fetch(`${DATAVERSE_API_BASE}/${entitySet}`, {
    method: 'POST',
    headers: dataverseHeaders(token, {
      'Content-Type': 'application/json',
      'MSCRM.SolutionUniqueName': SOLUTION_UNIQUE_NAME,
    }),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`create_failed:${entitySet}:${response.status}:${await response.text()}`)
  }

  const entityUrl = response.headers.get('OData-EntityId') || ''
  const id = entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1]
  if (!id) throw new Error(`create_missing_id:${entitySet}`)
  return fetchSingle(token, entitySet, { $filter: `${primaryIdField(entitySet)} eq ${id}` }, `${entitySet}_created_row`)
}

async function patchRow(token, entitySet, id, body) {
  const response = await fetch(`${DATAVERSE_API_BASE}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: dataverseHeaders(token, {
      'Content-Type': 'application/json',
      'MSCRM.SolutionUniqueName': SOLUTION_UNIQUE_NAME,
    }),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`patch_failed:${entitySet}:${response.status}:${await response.text()}`)
  }
}

function primaryIdField(entitySet) {
  switch (entitySet) {
    case 'jm1pub_titles':
      return 'jm1pub_titleid'
    case 'jm1pub_publishingassets':
      return 'jm1pub_publishingassetid'
    case 'jm1pub_editorialstages':
      return 'jm1pub_editorialstageid'
    case 'jm1pub_editorialartifacts':
      return 'jm1pub_editorialartifactid'
    case 'jm1pub_editorialapprovalgates':
      return 'jm1pub_editorialapprovalgateid'
    case 'jm1pub_editorialsummaries':
      return 'jm1pub_editorialsummaryid'
    case 'jm1pub_contracts':
      return 'jm1pub_contractid'
    case 'contacts':
      return 'contactid'
    case 'opportunities':
      return 'opportunityid'
    case 'jm1_executionlogs':
      return 'jm1_executionlogid'
    default:
      throw new Error(`primary_id_unknown:${entitySet}`)
  }
}

function dataverseHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    ...extra,
  }
}

async function dataverseJson(token, url) {
  const response = await fetch(url, {
    headers: dataverseHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`dataverse_query_failed:${response.status}:${await response.text()}`)
  }
  return response.json()
}

async function resolveShareLinkToDriveItem(graphToken, sharingUrl) {
  const encoded = Buffer.from(sharingUrl).toString('base64url')
  return graphJson(graphToken, `${GRAPH_API_BASE}/shares/u!${encoded}/driveItem`)
}

function deriveWorkspaceRootPath(parentDrivePath) {
  const rootPath = parentDrivePath.split('root:')[1] || ''
  if (!rootPath.endsWith('/01_Manuscript/Original')) {
    throw new Error(`unexpected_manuscript_parent_path:${parentDrivePath}`)
  }
  return rootPath.replace(/\/01_Manuscript\/Original$/, '')
}

async function getDriveItemByPath(graphToken, siteId, driveId, path) {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
  return graphJson(graphToken, `${GRAPH_API_BASE}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`)
}

async function ensureFolderByPath(graphToken, siteId, driveId, absolutePath) {
  const root = await graphJson(graphToken, `${GRAPH_API_BASE}/sites/${siteId}/drives/${driveId}/root`)
  const segments = absolutePath.split('/').filter(Boolean)
  let parentId = root.id
  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`
    const existing = await findChildFolder(graphToken, siteId, driveId, parentId, segment)
    if (existing) {
      parentId = existing.id
      continue
    }

    const created = await graphJson(
      graphToken,
      `${GRAPH_API_BASE}/sites/${siteId}/drives/${driveId}/items/${parentId}/children`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: segment,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail',
        }),
      },
    )
    parentId = created.id
  }

  return getDriveItemByPath(graphToken, siteId, driveId, absolutePath)
}

async function findChildFolder(graphToken, siteId, driveId, parentId, name) {
  const json = await graphJson(
    graphToken,
    `${GRAPH_API_BASE}/sites/${siteId}/drives/${driveId}/items/${parentId}/children?$select=id,name,webUrl,folder`,
  )
  return (json.value || []).find((item) => item.name === name && item.folder) || null
}

async function graphJson(graphToken, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${graphToken}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`graph_request_failed:${response.status}:${await response.text()}`)
  }

  return response.json()
}

async function createExecutionLog(token, payload) {
  await createRow(token, 'jm1_executionlogs', {
    jm1_name: `${payload.eventCode} - ${TITLE_NAME}`,
    jm1_actiontype: payload.eventCode,
    jm1_actiondescription: payload.summary,
    jm1_agentname: 'PROGRAM-003 Core Commissioning',
    jm1_bandlevel: EXECUTION_BANDLEVEL,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: payload.startedOn,
    jm1_completedon: payload.completedOn,
    jm1_sourceentity: 'jm1pub_publishingasset',
    jm1_sourcerecordid: payload.sourceRecordId,
  })
}

function toODataParams(params) {
  return new URLSearchParams(params).toString()
}

function escapeODataText(value) {
  return String(value).replace(/'/g, "''")
}

function extensionOf(fileName) {
  const match = String(fileName).match(/(\.[^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

function drivePathToLibraryPath(parentDrivePath, fileName) {
  const rootPath = parentDrivePath.split('root:')[1] || ''
  return `${rootPath}/${fileName}`.replace(/\/+/g, '/')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
