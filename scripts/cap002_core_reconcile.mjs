#!/usr/bin/env node

const required = [
  'DATAVERSE_TENANT_ID',
  'DATAVERSE_CLIENT_ID',
  'DATAVERSE_CLIENT_SECRET',
  'DATAVERSE_RESOURCE_URL',
  'DATAVERSE_WEB_API_BASE_URL',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  console.error(JSON.stringify({ ok: false, error: 'missing_env', missing }, null, 2))
  process.exit(1)
}

const stageId = 'a7713ff3-1e80-f111-ab0f-6045bdd69678'
const summary =
  'Line editing for Volume I has been completed internally and is ready for Jackie publisher release review. No author action is required at this time.'

const events = [
  [
    'CAP002_FULL_LINE_EDIT_COMPLETED',
    'The Intentional Leader Volume I line-edited working manuscript generated; Volume I boundary enforced; render proof completed.',
  ],
  [
    'CAP002_INTAKE_QUEUE_DISPOSITION_COMPLETED',
    'All 80 CAP-002 intake items dispositioned: 28 APPLIED WITH ADAPTATION; 52 RETAINED FOR VOICE; 0 author queries.',
  ],
  [
    'CAP002_PROJECT_STYLE_SHEET_UPDATED',
    'Project Style Sheet updated for Line Editing decisions, voice preservation, scripture/citation watch items, and Copyediting watch list.',
  ],
  [
    'CAP002_INTERNAL_PUBLISHER_QA_COMPLETED',
    'Internal Publisher QA PASS: 91 daily entries, 91 Soul Dive entries, no April content, no author package released, Copyediting not started.',
  ],
  [
    'CAP002_AUTHOR_PACKAGE_READY',
    'Author-facing Line Editing package draft prepared for Jackie release decision; package not sent and author action not surfaced.',
  ],
]

const token = await getToken()
const base = process.env.DATAVERSE_WEB_API_BASE_URL.replace(/\/$/, '')
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'OData-Version': '4.0',
  'OData-MaxVersion': '4.0',
}

await patchStage()
const eventResults = []
for (const [event, description] of events) {
  const existing = await findRecentEvent(event)
  if (existing) {
    eventResults.push({ event, action: 'existing', id: existing.jm1_executionlogid, createdon: existing.createdon })
    continue
  }
  const created = await createEvent(event, description)
  eventResults.push({ event, action: 'created', id: created.jm1_executionlogid, createdon: created.createdon })
}

const stageReadback = await dataverseGet(
  `/jm1pub_editorialstages(${stageId})?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_authorsafesummary,modifiedon`,
)

console.log(JSON.stringify({ ok: true, stageReadback, eventResults }, null, 2))

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.DATAVERSE_CLIENT_ID,
    client_secret: process.env.DATAVERSE_CLIENT_SECRET,
    resource: process.env.DATAVERSE_RESOURCE_URL.replace(/\/$/, ''),
  })
  const response = await fetch(`https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/token`, {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`)
  }
  return (await response.json()).access_token
}

async function patchStage() {
  const response = await fetch(`${base}/jm1pub_editorialstages(${stageId})`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ jm1pub_stagestatus: 100000002, jm1pub_authorsafesummary: summary }),
  })
  if (!response.ok) {
    throw new Error(`Stage patch failed: ${response.status} ${await response.text()}`)
  }
}

async function findRecentEvent(event) {
  const params = new URLSearchParams({
    $select: 'jm1_executionlogid,jm1_actiontype,createdon,jm1_sourcerecordid',
    $filter: `jm1_actiontype eq '${event}' and jm1_sourcerecordid eq '${stageId}'`,
    $orderby: 'createdon desc',
    $top: '1',
  })
  const data = await dataverseGet(`/jm1_executionlogs?${params.toString()}`)
  return data.value?.[0] || null
}

async function createEvent(event, description) {
  const response = await fetch(`${base}/jm1_executionlogs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      jm1_name: event,
      jm1_actiontype: event,
      jm1_actiondescription: description,
      jm1_sourcerecordid: stageId,
    }),
  })
  if (!response.ok) {
    throw new Error(`Execution log create failed for ${event}: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function dataverseGet(path) {
  const response = await fetch(`${base}${path}`, { headers })
  if (!response.ok) {
    throw new Error(`Dataverse GET failed: ${response.status} ${await response.text()}`)
  }
  return response.json()
}
