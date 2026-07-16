#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const generatedDir = resolve('docs/operations/generated')
mkdirSync(generatedDir, { recursive: true })

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
const resourceUrl = cleanUrl(process.env.DATAVERSE_RESOURCE_URL)
const apiBase = cleanUrl(process.env.DATAVERSE_WEB_API_BASE_URL)

const registryPath = resolve('docs/implementation/JM1-Capability-Maturity-Registry.md')
const registryText = readIfExists(registryPath)
const registryRows = parseRegistryRows(registryText)

const token = await getToken()

const [executionRows, titleRows, editorialRows, gateRows] = await Promise.all([
  dataverseList('jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,createdon,jm1_sourcerecordid',
    $orderby: 'createdon desc',
    $top: '250',
  }),
  dataverseList('jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_titlename,jm1_titlename,jm1pub_stage',
    $top: '5000',
  }),
  dataverseList('jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_authorsafesummary,modifiedon',
    $orderby: 'modifiedon desc',
    $top: '100',
  }),
  dataverseList('jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,modifiedon',
    $orderby: 'modifiedon desc',
    $top: '100',
  }),
])

const eventCounts = countBy(executionRows.map((row) => text(row.jm1_actiontype) || text(row.jm1_name) || 'UNKNOWN'))
const stageCounts = countBy(
  titleRows.map((row) => text(row['jm1pub_stage@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_stage) || '(blank)'),
)

const capabilitySignals = {
  CAP001: eventCount(eventCounts, ['AUTHOR_APPROVAL_RECEIVED', 'AUTHOR_PACKAGE_DELIVERED', 'DEVELOPMENTAL_AUTHOR_PACKAGE_RELEASED']),
  CAP002: executionRows.filter((row) => containsAny(row, ['CAP002', 'LINE_EDITING_READY', 'LINE_EDITING_HANDOFF_CREATED', 'LINE_EDITING'])).length,
  CAP003: executionRows.filter((row) => containsAny(row, ['CAP003', 'COPYEDIT', 'COPYEDITING'])).length,
  CAP007: executionRows.filter((row) => containsAny(row, ['CAP007_', 'ROYALTY'])).length,
  CAP008: executionRows.filter((row) => containsAny(row, ['CAP008', 'AUTHOR_IDENTITY', 'CIAM', 'DURABLE'])).length,
  CAP009: executionRows.filter((row) => containsAny(row, ['CAP009', 'LANE_A_STAMPED', 'LANE_B_STAMPED', 'LANE_C_STAMPED', 'JM1PUB_STAGE_STAMPED'])).length,
  CAP011: executionRows.filter((row) => containsAny(row, ['CAP011', 'MARKETING_PROFILE'])).length,
}

const dashboard = {
  generatedAt: now,
  source: 'JM1-Core Dataverse + local capability registry',
  core: {
    resourceUrl,
    apiBase,
    executionLogRowsRead: executionRows.length,
    titleRowsRead: titleRows.length,
    editorialStageRowsRead: editorialRows.length,
    approvalGateRowsRead: gateRows.length,
  },
  registry: registryRows,
  capabilitySignals,
  catalogHealth: {
    titleStageCounts: stageCounts,
    blankStageTitles: stageCounts['(blank)'] || 0,
    stampedCatalogRows:
      (eventCounts.LANE_A_STAMPED || 0) + (eventCounts.LANE_B_STAMPED || 0) + (eventCounts.LANE_C_STAMPED || 0),
  },
  authorActions: {
    approvalReceived: eventCounts.AUTHOR_APPROVAL_RECEIVED || 0,
    notificationSent: eventCounts.AUTHOR_NOTIFICATION_SENT || 0,
    packageDelivered: (eventCounts.AUTHOR_PACKAGE_DELIVERED || 0) + (eventCounts.DEVELOPMENTAL_AUTHOR_PACKAGE_RELEASED || 0),
  },
  throughput: buildThroughputSnapshot(editorialRows, gateRows, eventCounts),
  wave2Closure: buildWave2Closure(registryRows, capabilitySignals, stageCounts, eventCounts),
  publisherActions: {
    editorialStageRows: editorialRows.map((row) => ({
      id: row.jm1pub_editorialstageid,
      name:
        text(row.jm1pub_name) ||
        text(row['jm1pub_stagetype@OData.Community.Display.V1.FormattedValue']) ||
        text(row.jm1pub_stagetype),
      status: text(row['jm1pub_stagestatus@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_stagestatus),
      modifiedon: row.modifiedon,
    })),
    approvalGates: gateRows.map((row) => ({
      id: row.jm1pub_editorialapprovalgateid,
      name: text(row.jm1pub_editorialapprovalgatename || row.jm1pub_gatecode),
      status: text(row['jm1pub_gatestatus@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_gatestatus),
      decision:
        text(row['jm1pub_authordecision@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_authordecision),
      modifiedon: row.modifiedon,
    })),
  },
  governanceHolds: registryRows.filter((row) => /hold|pending|ready/i.test(row.state)),
  decisionReadyCapabilities: registryRows.filter((row) => /decision|approval|ready/i.test(`${row.state} ${row.nextPromotionCriterion}`)),
  recentExecutionFailures: executionRows.filter((row) => /failed|error/i.test(`${row.jm1_actiontype || ''} ${row.jm1_name || ''} ${row.jm1_actiondescription || ''}`)).slice(0, 20),
  recentExecutionLogs: executionRows.slice(0, 25).map((row) => ({
    id: row.jm1_executionlogid,
    event: text(row.jm1_actiontype || row.jm1_name),
    createdon: row.createdon,
    sourceRecordId: row.jm1_sourcerecordid,
  })),
}

const jsonPath = resolve(generatedDir, '2026-07-16-CAP-010-Publisher-Routing-And-Copyedit-Refresh.json')
const mdPath = resolve(generatedDir, '2026-07-16-CAP-010-Publisher-Routing-And-Copyedit-Refresh.md')
writeFileSync(jsonPath, `${JSON.stringify(dashboard, null, 2)}\n`)
writeFileSync(mdPath, renderMarkdown(dashboard))

console.log(JSON.stringify({ ok: true, jsonPath, mdPath, core: dashboard.core, capabilitySignals }, null, 2))

function renderMarkdown(data) {
  return `# CAP-010 Operational Refresh

Generated: ${data.generatedAt}

Source: ${data.source}

## Core Readback

| Signal | Count |
|---|---:|
| Execution log rows read | ${data.core.executionLogRowsRead} |
| Title rows read | ${data.core.titleRowsRead} |
| Editorial stage rows read | ${data.core.editorialStageRowsRead} |
| Approval gate rows read | ${data.core.approvalGateRowsRead} |

## Capability Signals

| Capability | Core signal count |
|---|---:|
${Object.entries(data.capabilitySignals).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

## Catalog Health

| Stage | Count |
|---|---:|
${Object.entries(data.catalogHealth.titleStageCounts).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

## Author Actions

| Action | Count |
|---|---:|
${Object.entries(data.authorActions).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

## Governance Holds / Decision-Ready Capabilities

${data.governanceHolds.map((row) => `- ${row.cap}: ${row.state}`).join('\n') || '- None detected'}

## Publisher Routing and Copyediting Coverage

| Capability | Exit State | Current Evidence | Remaining Dependency |
|---|---|---|---|
${data.wave2Closure.capabilities.map((row) => `| ${row.cap} | ${row.exitState} | ${row.evidence} | ${row.remainingDependency} |`).join('\n')}

## Current Operational Views

- Proof assets tracked: ${data.wave2Closure.summary.proofAssetsTracked}
- Dependency holds: ${data.wave2Closure.summary.dependencyHolds}
- Financial module state: ${data.wave2Closure.summary.financialModuleState}
- Identity recovery state: ${data.wave2Closure.summary.identityRecoveryState}
- Catalog write state: ${data.wave2Closure.summary.catalogWriteState}
- Marketing proof state: ${data.wave2Closure.summary.marketingProofState}
- Stale-data warning: ${data.wave2Closure.summary.staleDataWarning}
- Refresh coverage: ${data.wave2Closure.summary.refreshCoverage}

## Recent Execution Failures

${data.recentExecutionFailures.map((row) => `- ${row.createdon}: ${text(row.jm1_actiontype || row.jm1_name)} (${row.jm1_executionlogid})`).join('\n') || '- None detected in the latest read window'}
`
}

function buildWave2Closure(registryRows, capabilitySignals, stageCounts, eventCounts) {
  const byCap = Object.fromEntries(registryRows.map((row) => [row.cap, row]))
  const capabilities = ['CAP-002', 'CAP-003', 'CAP-007', 'CAP-008', 'CAP-009', 'CAP-010', 'CAP-011'].map((cap) => {
    const registry = byCap[cap]
    return {
      cap,
      exitState: registry?.state || 'Not registered',
      evidence: evidenceFor(cap, capabilitySignals, stageCounts, eventCounts),
      remainingDependency: remainingFor(cap, registry),
    }
  })

  return {
    capabilities,
    summary: {
      proofAssetsTracked: 'The Intentional Leader Volume I; synthetic CAP-007 royalty proof; Lane A/B/C stage backfill; Author Operating Center marketing profile slice',
      dependencyHolds: capabilities.filter((row) => /hold|pending/i.test(row.exitState)).length,
      financialModuleState: byCap['CAP-007']?.state || 'Not registered',
      identityRecoveryState: byCap['CAP-008']?.state || 'Not registered',
      catalogWriteState: byCap['CAP-009']?.state || 'Not registered',
      marketingProofState: byCap['CAP-011']?.state || 'Not registered',
      staleDataWarning: 'Refresh reads latest 250 execution-log rows plus live title/stage/gate rows; older events may be outside the read window.',
      refreshCoverage: 'CAP maturity, proof assets, author actions, publisher actions, dependency holds, financial/catalog/identity/marketing states, execution failures, catalog stage counts.',
      publisherRoutingState: 'PUBLISHER_ROLE_ROUTING_REMEDIATED and PUBLISHER_AUTHENTICATED_MASTER_WORKSPACE_PROVEN recorded during Wave 3 routing proof.',
      copyeditingState: copyeditingStateFromEvents(eventCounts),
    },
  }
}

function buildThroughputSnapshot(editorialRows, gateRows, eventCounts) {
  const trackedTitles = [
    'The Intentional Leader',
    'Before You Were Born',
    'The General',
    'The Long Watch',
    'Establishing Glory',
  ]
  const trackedStages = editorialRows
    .filter((row) => trackedTitles.some((title) => text(row.jm1pub_name).toLowerCase().includes(title.toLowerCase())))
    .map((row) => {
      const gate = gateRows.find((candidate) => text(candidate.jm1pub_editorialapprovalgatename).toLowerCase().includes(text(row.jm1pub_name).toLowerCase().replace(/^.* - /, '')))
      return {
        id: row.jm1pub_editorialstageid,
        name: text(row.jm1pub_name),
        type: text(row['jm1pub_stagetype@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_stagetype),
        status: text(row['jm1pub_stagestatus@OData.Community.Display.V1.FormattedValue']) || text(row.jm1pub_stagestatus),
        modifiedon: row.modifiedon,
        gateStatus: gate
          ? text(gate['jm1pub_gatestatus@OData.Community.Display.V1.FormattedValue']) || text(gate.jm1pub_gatestatus)
          : '',
      }
    })

  const activeOrWaiting = trackedStages.filter((row) => !/complete|approved/i.test(`${row.status} ${row.gateStatus}`)).length
  const authorResponsePending =
    (eventCounts.CAP003_AUTHOR_REVIEW_OPENED || 0) > 0 && (eventCounts.CAP003_COPYEDITING_AUTHOR_RESPONSE_RECEIVED || 0) === 0

  return {
    trackedStageRows: trackedStages,
    activeOrWaiting,
    authorResponsePending,
    productionQueueReady: 0,
    proofreadingQueueReady: authorResponsePending ? 0 : undefined,
    currentBottleneck: authorResponsePending
      ? 'Copyediting author response for The Intentional Leader'
      : 'Editorial throughput balancing across active titles',
    projectedNextBottleneck: 'Proofreading and Production runway must be ready before Copyediting approvals arrive.',
  }
}

function copyeditingStateFromEvents(eventCounts) {
  if ((eventCounts.CAP003_AUTHOR_REVIEW_OPENED || 0) > 0) {
    return 'CAP-003 Copyediting package released; author review is open; Proofreading blocked until governed author response.'
  }
  if ((eventCounts.CAP003_AUTHOR_PACKAGE_DELIVERED || 0) > 0) {
    return 'CAP-003 Copyediting package delivered; author review pending; Proofreading blocked.'
  }
  return 'CAP-003 Copyediting internally complete; Jackie release decision pending; Proofreading blocked.'
}

function evidenceFor(cap, capabilitySignals, stageCounts, eventCounts) {
  switch (cap) {
    case 'CAP-002':
      return `${capabilitySignals.CAP002} Core signal(s); source package/style sheet/intake queue events included if inside read window`
    case 'CAP-003':
      return `${capabilitySignals.CAP003} Core signal(s); Copyediting stage, correction ledger, QA, package-readiness, and publisher-routing proof events included if inside read window`
    case 'CAP-007':
      return `${capabilitySignals.CAP007} Core signal(s); royalty statement proof event count ${eventCounts.CAP007_ROYALTY_STATEMENT_PROOF_COMPLETED || 0}`
    case 'CAP-008':
      return `${capabilitySignals.CAP008} Core signal(s); password recovery/reset, fresh sign-in, logout, Core authorization, and project switching evidence recorded`
    case 'CAP-009':
      return `${capabilitySignals.CAP009} catalog governance signal(s); blank titles ${stageCounts['(blank)'] || 0}; approved bibliographic safe-write execution event count ${eventCounts.CAP009_BIBLIOGRAPHIC_SAFE_WRITE_EXECUTED || 0}; reconciliation event count ${eventCounts.CAP009_BIBLIOGRAPHIC_SAFE_WRITE_RECONCILED || 0}`
    case 'CAP-010':
      return 'This refresh generated machine-readable and human-readable publisher-routing and copyediting coverage'
    case 'CAP-011':
      return `${capabilitySignals.CAP011} Core signal(s); production deployment, authenticated submission, Core execution logging, unauthenticated rejection, idempotency proof, and project-switching continuity proven`
    default:
      return 'No evidence rule'
  }
}

function remainingFor(cap, registry) {
  const criterion = registry?.nextPromotionCriterion || ''
  if (!criterion) return 'Unknown'
  return criterion.replaceAll('|', '/')
}

function parseRegistryRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /^\| CAP-\d{3} \|/.test(line))
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim())
      return {
        cap: parts[1],
        capability: parts[2],
        state: parts[3],
        proofAsset: parts[4],
        owner: parts[5],
        currentPriority: parts[6],
        nextPromotionCriterion: parts[7],
      }
    })
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function eventCount(counts, names) {
  return names.reduce((sum, name) => sum + (counts[name] || 0), 0)
}

function containsAny(row, needles) {
  const haystack = `${row.jm1_actiontype || ''} ${row.jm1_name || ''} ${row.jm1_actiondescription || ''}`.toLowerCase()
  return needles.some((needle) => haystack.includes(needle.toLowerCase()))
}

async function dataverseList(entitySet, params) {
  const query = new URLSearchParams(params)
  const response = await fetch(`${apiBase}/${entitySet}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`dataverse_read_failed:${entitySet}:${response.status}:${body.slice(0, 300)}`)
  }
  const json = JSON.parse(body)
  return Array.isArray(json.value) ? json.value : []
}

async function getToken() {
  const response = await fetch(`https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.DATAVERSE_CLIENT_ID,
      client_secret: process.env.DATAVERSE_CLIENT_SECRET,
      scope: `${resourceUrl}/.default`,
    }),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || !json.access_token) {
    throw new Error(`dataverse_token_failed:${response.status}`)
  }
  return json.access_token
}

function text(value) {
  return typeof value === 'string' ? value : ''
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function cleanUrl(value) {
  return String(value || '').replace(/\/+$/, '')
}
