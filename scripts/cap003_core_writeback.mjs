#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const requiredEnv = [
  'DATAVERSE_TENANT_ID',
  'DATAVERSE_CLIENT_ID',
  'DATAVERSE_CLIENT_SECRET',
  'DATAVERSE_RESOURCE_URL',
  'DATAVERSE_WEB_API_BASE_URL',
]

const missingEnv = requiredEnv.filter((key) => !process.env[key])
if (missingEnv.length) {
  console.error(JSON.stringify({ ok: false, error: 'missing_env', missingEnv }, null, 2))
  process.exit(1)
}

const now = new Date().toISOString()
const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL.replace(/\/$/, '')
const resourceUrl = process.env.DATAVERSE_RESOURCE_URL.replace(/\/$/, '')
const stageId = 'cf06664b-ce80-f111-ab0f-7c1e525b15c2'
const publishingAssetId = 'c9dc862e-da7a-f111-ab0f-000d3a14673b'
const correlationId = `CAP003-COPYEDIT-${now.replace(/[:.]/g, '-')}`
const successStatus = 835500001

const manifestPath = resolve('docs/operations/generated/2026-07-16-The-Intentional-Leader-Volume-I-CAP003-Source-and-Integrity-Manifest.json')
const qaPath = resolve('docs/operations/generated/2026-07-16-The-Intentional-Leader-Volume-I-CAP003-Internal-Publisher-QA.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const qa = JSON.parse(readFileSync(qaPath, 'utf8'))

const token = await getToken()

const beforeStage = await dataverseGet(`/jm1pub_editorialstages(${stageId})`)

await dataversePatch(`/jm1pub_editorialstages(${stageId})`, {
  jm1pub_stagestatus: 100000008,
  jm1pub_stagestartdate: beforeStage.jm1pub_stagestartdate || now,
  jm1pub_stagecompletedate: now,
  jm1pub_authorsafesummary:
    'Copyediting for Volume I is internally complete. No author action is required until the publishing team releases the copyediting review package.',
  jm1pub_internaloperationalsummary:
    `CAP-003 Copyediting internally complete. QA result ${qa.result}. Corrections ${qa.corrections.total}. ` +
    `Author queries ${qa.author_queries}. Factual/rights flags ${qa.factual_consistency_flags_requiring_decision}. ` +
    `Output checksum ${manifest.output_sha256}. Correlation ${correlationId}.`,
  jm1pub_currentartifactcount: 11,
  jm1pub_openexceptioncount: 0,
  jm1pub_exceptionpresent: false,
  jm1pub_publisherreviewrequired: true,
  jm1pub_editorialdeliverableurl: manifest.output_manuscript,
  jm1pub_stylesheeturl: manifest.project_style_sheet,
  jm1pub_correlationid: correlationId,
  jm1pub_executionlogcorrelationreference: correlationId,
})

const eventDefinitions = [
  ['PUBLISHER_ROLE_ROUTING_REMEDIATED', 'Publisher role precedence now routes authorized workforce identities to the Publisher Operating Center before author relationship evaluation. Production proof confirmed jm1-admin@jmerrill.one selected jm1-publisher-operating-center and landed on /publisher/operating-center.'],
  ['PUBLISHER_AUTHENTICATED_MASTER_WORKSPACE_PROVEN', 'Authenticated Publisher Operating Center proof loaded jm1-admin@jmerrill.one, master workload metrics, live Core-backed title queue, Switch to Author View control, and bounded publisher workspace shell.'],
  ['CAP003_COPYEDITING_STARTED', `CAP-003 Copyediting started from locked author-approved line-edited source ${manifest.source_sha256}. Existing Copyediting stage ${stageId} and entry artifact ${manifest.copyediting_entry_artifact_id} used; no stage recreated.`],
  ['CAP003_CONTROLLED_SAMPLE_COMPLETED', 'Controlled Copyediting sample completed for January 1 daily devotional and Soul Dive segment. Scope discipline, style-sheet enforcement, author voice preservation, query handling, and line-editing regression checks passed.'],
  ['CAP003_FULL_COPYEDIT_COMPLETED', `Full Volume I Copyediting completed. Daily entries ${qa.coverage.daily_entries}; Soul Dive entries ${qa.coverage.soul_dive_entries}; corrections ${qa.corrections.total}; output checksum ${manifest.output_sha256}.`],
  ['CAP003_CORRECTION_LEDGER_COMPLETED', `Copyediting correction ledger completed with ${qa.corrections.total} tracked correction(s), zero author queries, and zero factual/rights flags requiring decision.`],
  ['CAP003_PROJECT_STYLE_SHEET_UPDATED', `Project Style Sheet updated for Copyediting-enforced decisions, retained voice exceptions, scripture/citation watch items, and proofreading watch items. Artifact: ${manifest.project_style_sheet}.`],
  ['CAP003_INTERNAL_PUBLISHER_QA_COMPLETED', `Internal Publisher QA completed with result ${qa.result}. Proofreading remains blocked; author-facing release is not authorized until Jackie decision.`],
  ['CAP003_AUTHOR_PACKAGE_READY', 'Author-facing Copyediting package draft prepared internally for Jackie release decision. No author notification sent and no author task surfaced.'],
  ['CAP010_PUBLISHER_ROUTING_AND_COPYEDIT_REFRESH_COMPLETED', 'CAP-010 refresh updated from live routing proof and CAP-003 evidence package. Publisher routing health and Copyediting release-decision metrics refreshed.'],
]

const createdEvents = []
for (const [eventType, description] of eventDefinitions) {
  const event = await createExecutionLog(eventType, description)
  createdEvents.push(event)
}

const afterStage = await dataverseGet(`/jm1pub_editorialstages(${stageId})`)
const readbackLogs = await dataverseGet(
  `/jm1_executionlogs?$select=jm1_executionlogid,jm1_actiontype,jm1_name,createdon,jm1_sourcerecordid&$filter=contains(jm1_actiondescription,'${correlationId}')&$orderby=createdon desc&$top=20`,
)

const result = {
  ok: true,
  correlationId,
  beforeStage: summarizeStage(beforeStage),
  afterStage: summarizeStage(afterStage),
  createdEvents,
  readbackLogCount: readbackLogs.value.length,
  readbackLogs: readbackLogs.value,
}

const outputPath = resolve('docs/operations/generated/2026-07-16-The-Intentional-Leader-Volume-I-CAP003-Core-Writeback-Result.json')
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, outputPath, correlationId, eventCount: createdEvents.length, afterStage: result.afterStage }, null, 2))

async function getToken() {
  const response = await fetch(`https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.DATAVERSE_CLIENT_ID,
      client_secret: process.env.DATAVERSE_CLIENT_SECRET,
      resource: resourceUrl,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`)
  }

  const payload = await response.json()
  return payload.access_token
}

async function dataverseGet(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="*"',
    },
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function dataversePatch(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`PATCH ${path} failed: ${response.status} ${text}`)
}

async function dataversePost(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`POST ${path} failed: ${response.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function createExecutionLog(eventType, description) {
  const event = await dataversePost('/jm1_executionlogs', {
    jm1_name: `${eventType} - The Intentional Leader, Volume I`,
    jm1_actiontype: eventType,
    jm1_actiondescription: `${description} Correlation: ${correlationId}. Stage: ${stageId}. Publishing asset: ${publishingAssetId}.`,
    jm1_executionstatus: successStatus,
    jm1_agentname: 'Cody / CAP-003 Copyediting',
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: 'jm1pub_editorialstage',
    jm1_sourcerecordid: stageId,
  })

  return {
    eventType,
    id: event?.jm1_executionlogid,
    createdon: event?.createdon,
  }
}

function summarizeStage(stage) {
  return {
    id: stage.jm1pub_editorialstageid,
    name: stage.jm1pub_name,
    status: stage['jm1pub_stagestatus@OData.Community.Display.V1.FormattedValue'] || stage.jm1pub_stagestatus,
    statusValue: stage.jm1pub_stagestatus,
    start: stage.jm1pub_stagestartdate,
    complete: stage.jm1pub_stagecompletedate,
    authorSafeSummary: stage.jm1pub_authorsafesummary,
    publisherReviewRequired: stage.jm1pub_publisherreviewrequired,
    currentArtifactCount: stage.jm1pub_currentartifactcount,
    correlationId: stage.jm1pub_correlationid,
  }
}
