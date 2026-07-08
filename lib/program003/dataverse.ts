import { execFileSync } from 'node:child_process'

import type {
  EditorialApprovalGateRecord,
  EditorialArtifactRecord,
  EditorialDashboardRollup,
  EditorialExceptionRecord,
  EditorialPilotRecord,
  EditorialStageRecord,
  EditorialSummaryRecord,
} from './editorial-command'
import { buildEditorialDashboardRollup } from './editorial-command'

const DEFAULT_RESOURCE_URL = 'https://jm1hq.crm.dynamics.com'
const ODATA_ANNOTATION = 'OData.Community.Display.V1.FormattedValue'

type DataverseValue = Record<string, unknown>

export async function getEditorialRecordForAsset(
  publishingAssetId: string,
): Promise<EditorialPilotRecord | null> {
  const config = getDataverseConfig()
  if (!config) return null

  const [stages, gates, summaries, artifacts, exceptions] = await Promise.all([
    queryDataverse(config, 'jm1pub_editorialstages', publishingAssetId),
    queryDataverse(config, 'jm1pub_editorialapprovalgates', publishingAssetId),
    queryDataverse(config, 'jm1pub_editorialsummaries', publishingAssetId),
    queryDataverse(config, 'jm1pub_editorialartifacts', publishingAssetId),
    queryDataverse(config, 'jm1pub_editorialexceptions', publishingAssetId),
  ])

  if (stages.length === 0) return null

  const firstStage = stages[0]
  const titleId = lookupId(firstStage, '_jm1pub_titleid_value')
  const contactId = lookupId(firstStage, '_jm1pub_contactid_value')
  const title = String(firstStage.jm1pub_projecttitle || firstStage.jm1pub_name || 'Editorial Asset')
  const authorName = String(firstStage.jm1pub_author || 'Author')

  return {
    publishingAssetId,
    titleId,
    contactId,
    title,
    authorName,
    stages: stages.map(mapStage),
    gates: gates.map(mapGate),
    summaries: summaries.map(mapSummary),
    artifacts: artifacts.map(mapArtifact),
    exceptions: exceptions.map(mapException),
  }
}

export async function getEditorialDashboardRollupForAsset(
  publishingAssetId: string,
): Promise<EditorialDashboardRollup | null> {
  const record = await getEditorialRecordForAsset(publishingAssetId)
  if (!record) return null
  return buildEditorialDashboardRollup([record])
}

export function getProgram003PilotAssetId() {
  return process.env.PROGRAM003_PILOT_ASSET_ID?.trim() || ''
}

type DataverseConfig = {
  resourceUrl: string
  webApiBaseUrl: string
  bearerToken: string
}

function getDataverseConfig(): DataverseConfig | null {
  const resourceUrl = (process.env.DATAVERSE_RESOURCE_URL || DEFAULT_RESOURCE_URL).replace(/\/+$/, '')
  const webApiBaseUrl = (
    process.env.DATAVERSE_WEB_API_BASE_URL ||
    `${resourceUrl}/api/data/v9.2`
  ).replace(/\/+$/, '')

  try {
    return {
      resourceUrl,
      webApiBaseUrl,
      bearerToken: getBearerToken(resourceUrl),
    }
  } catch {
    return null
  }
}

async function queryDataverse(config: DataverseConfig, entitySet: string, publishingAssetId: string) {
  const params = new URLSearchParams({
    $filter: `_jm1pub_publishingassetid_value eq ${publishingAssetId}`,
    $top: '200',
  })
  const response = await fetch(`${config.webApiBaseUrl}/${entitySet}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${config.bearerToken}`,
      Accept: 'application/json',
      Prefer: `odata.include-annotations="${ODATA_ANNOTATION}"`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) return []
  const json = (await response.json()) as { value?: DataverseValue[] }
  return Array.isArray(json.value) ? json.value : []
}

function mapStage(row: DataverseValue): EditorialStageRecord {
  return {
    id: String(row.jm1pub_editorialstageid),
    publishingAssetId: lookupId(row, '_jm1pub_publishingassetid_value'),
    titleId: lookupId(row, '_jm1pub_titleid_value'),
    contactId: lookupId(row, '_jm1pub_contactid_value'),
    stageType: mapStageType(formatted(row, 'jm1pub_stagetype', 'Review')),
    stageStatus: mapStageStatus(formatted(row, 'jm1pub_stagestatus', 'Not Started')),
    stageSequence: numberish(row.jm1pub_stagesequence),
    assignedEditor: stringish(row.jm1pub_assignedownereditor || row.jm1pub_assignededitorid),
    governingStyleGuide: stringish(row.jm1pub_governingstyleguide),
    healthStatus: mapHealthStatus(formatted(row, 'jm1pub_healthstatus', 'Watch')),
    authorSafeSummary: stringish(row.jm1pub_authorsafesummary || row.jm1pub_projecttitle),
    startedOn: stringish(row.jm1pub_stagestartdate || row.jm1pub_startedon),
    deliveredOn: stringish(row.jm1pub_deliveredon || row.jm1pub_authorrevisionrequesteddate),
    completedOn: stringish(row.jm1pub_stagecompletedate || row.jm1pub_completedon),
  }
}

function mapGate(row: DataverseValue): EditorialApprovalGateRecord {
  return {
    id: String(row.jm1pub_editorialapprovalgateid),
    publishingAssetId: lookupId(row, '_jm1pub_publishingassetid_value'),
    titleId: lookupId(row, '_jm1pub_titleid_value'),
    stageId: stringish(row._jm1pub_editorialstageid_value),
    gateCode: gateCode(formatted(row, 'jm1pub_gatecode', 'A1 Editorial Review Acceptance')),
    gateDomain: gateDomain(formatted(row, 'jm1pub_gatedomain', 'Editorial')),
    gateStatus: gateStatus(formatted(row, 'jm1pub_gatestatus', 'Not Ready')),
    authorDecision: authorDecision(formatted(row, 'jm1pub_authordecision', '')),
    authorResponseSummary: stringish(row.jm1pub_authorresponsesummary),
    authorDecisionOn: stringish(row.jm1pub_authordecisionon),
    nextStageAuthorized: booleanish(row.jm1pub_nextstageauthorized),
    awaitingSince: stringish(row.jm1pub_awaitingsince),
  }
}

function mapSummary(row: DataverseValue): EditorialSummaryRecord {
  return {
    id: String(row.jm1pub_editorialsummaryid),
    publishingAssetId: lookupId(row, '_jm1pub_publishingassetid_value'),
    titleId: lookupId(row, '_jm1pub_titleid_value'),
    stageId: stringish(row._jm1pub_editorialstageid_value),
    gateId: stringish(row._jm1pub_editorialapprovalgateid_value),
    summaryType: formatted(row, 'jm1pub_summarytype', 'Author Safe Current') as EditorialSummaryRecord['summaryType'],
    summaryStatus: formatted(row, 'jm1pub_summarystatus', 'Draft') as EditorialSummaryRecord['summaryStatus'],
    headline: String(row.jm1pub_summaryheadline || 'Editorial update'),
    body: String(row.jm1pub_summarybody || ''),
    nextActionLabel: stringish(row.jm1pub_nextactionlabel),
    nextActionDueOn: stringish(row.jm1pub_nextactiondueon),
    publishedToWorkspaceOn: stringish(row.jm1pub_publishedtoworkspaceon),
  }
}

function mapArtifact(row: DataverseValue): EditorialArtifactRecord {
  return {
    id: String(row.jm1pub_editorialartifactid),
    publishingAssetId: lookupId(row, '_jm1pub_publishingassetid_value'),
    titleId: lookupId(row, '_jm1pub_titleid_value'),
    stageId: lookupId(row, '_jm1pub_editorialstageid_value'),
    gateId: stringish(row._jm1pub_editorialapprovalgateid_value),
    artifactType: formatted(row, 'jm1pub_artifacttype', 'Approval Evidence'),
    visibility: formatted(row, 'jm1pub_visibility', 'Internal Only') as EditorialArtifactRecord['visibility'],
    status: formatted(row, 'jm1pub_artifactstatus', 'Draft') as EditorialArtifactRecord['status'],
    fileName: String(row.jm1pub_filename || row.jm1pub_name || 'Editorial artifact'),
    repositoryPath: String(row.jm1pub_repositorypath || ''),
    currentApprovedArtifact: booleanish(row.jm1pub_iscurrentapproved),
    deliveredOn: stringish(row.jm1pub_deliveredon),
    approvedOn: stringish(row.jm1pub_approvedon),
  }
}

function mapException(row: DataverseValue): EditorialExceptionRecord {
  return {
    id: String(row.jm1pub_editorialexceptionid),
    publishingAssetId: lookupId(row, '_jm1pub_publishingassetid_value'),
    titleId: lookupId(row, '_jm1pub_titleid_value'),
    stageId: stringish(row._jm1pub_editorialstageid_value),
    gateId: stringish(row._jm1pub_editorialapprovalgateid_value),
    exceptionType: formatted(row, 'jm1pub_exceptiontype', 'Other'),
    severity: formatted(row, 'jm1pub_severity', 'Low') as EditorialExceptionRecord['severity'],
    status: formatted(row, 'jm1pub_status', 'Open') as EditorialExceptionRecord['status'],
  }
}

function formatted(row: DataverseValue, logicalName: string, fallback: string) {
  return stringish(row[`${logicalName}@${ODATA_ANNOTATION}`]) || fallback
}

function lookupId(row: DataverseValue, field: string) {
  return stringish(row[field]) || ''
}

function stringish(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberish(value: unknown) {
  return typeof value === 'number' ? value : 0
}

function booleanish(value: unknown) {
  return value === true
}

function gateCode(label: string) {
  return (label.match(/^A[1-9]/)?.[0] || 'A1') as EditorialApprovalGateRecord['gateCode']
}

function gateDomain(label: string) {
  return (label === 'Production' || label === 'Publication' ? label : 'Editorial') as EditorialApprovalGateRecord['gateDomain']
}

function gateStatus(label: string) {
  return ([
    'Not Ready',
    'Ready for Author Review',
    'Awaiting Author Response',
    'Approved',
    'Returned for Revision',
    'Held',
    'Publisher Override',
    'Cancelled',
  ].includes(label)
    ? label
    : 'Not Ready') as EditorialApprovalGateRecord['gateStatus']
}

function authorDecision(label: string): EditorialApprovalGateRecord['authorDecision'] {
  return (
    [
      'Approve',
      'Request Revision',
      'Request Clarification',
      'Hold',
      'Decline',
      'Override Approved',
    ].includes(label)
      ? (label as EditorialApprovalGateRecord['authorDecision'])
      : undefined
  )
}

function mapStageType(label: string): EditorialStageRecord['stageType'] {
  switch (label) {
    case 'Review':
      return 'Editorial Review'
    case 'Developmental':
      return 'Developmental Editing'
    case 'Line':
      return 'Line Editing'
    case 'Copyedit':
      return 'Copyediting'
    case 'Proofread':
      return 'Proofreading'
    case 'Complete / Ready for Production Handoff':
      return 'Production Handoff Readiness'
    default:
      return 'Editorial Review'
  }
}

function mapStageStatus(label: string): EditorialStageRecord['stageStatus'] {
  switch (label) {
    case 'Not Started':
      return 'Not Started'
    case 'In Progress':
      return 'In Progress'
    case 'Plan Delivered':
      return 'Awaiting Author Review'
    case 'Plan Approved':
      return 'Approved'
    case 'Calibration Approved':
      return 'Approved'
    case 'Author Revision Requested':
      return 'Returned for Revision'
    case 'Author Revision Received':
      return 'Awaiting Internal Review'
    case 'On Hold / Blocked':
      return 'Held'
    case 'Complete':
      return 'Complete'
    default:
      return 'Not Started'
  }
}

function mapHealthStatus(label: string): EditorialStageRecord['healthStatus'] {
  switch (label) {
    case 'Healthy':
    case 'Watch':
    case 'At Risk':
    case 'Blocked':
      return label
    default:
      return 'Watch'
  }
}

function getBearerToken(resourceUrl: string) {
  return execFileSync(
    '/opt/homebrew/bin/az',
    ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'],
    { encoding: 'utf8' },
  ).trim()
}
