import {
  dataverseCreate,
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'

const TITLE_STAGE_EDITORIAL = 100000006
const ASSET_STATUS_STAGED = 100000000
const ASSET_FORMAT_OTHER = 100000006
const DISTRIBUTION_STATUS_DRAFT = 100000000
const EXECUTION_STATUS_SUCCESS = 835500001
const BAND_LEVEL_1 = 835500000
const STAGE_TYPE_REVIEW = 100000000
const STAGE_STATUS_IN_PROGRESS = 100000001
const HEALTH_HEALTHY = 196650000

export type PublisherActionId =
  | 'review_intake'
  | 'verify_manuscript'
  | 'initialize_editorial_review'
  | 'initialize_developmental_editing'
  | 'request_missing_information'
  | 'return_for_correction'
  | 'place_evidence_hold'
  | 'remove_evidence_hold'
  | 'retry_failed_operation'
  | 'view_only'

export type PublisherQueueItem = {
  key: string
  intakeId: string
  intakeReference: string
  authorName: string
  authorEmail: string
  contactId: string
  relationshipId?: string
  title: string
  titleId?: string
  assetId?: string
  opportunityId?: string
  contractStatus: string
  paymentStatus: string
  rightsStatus: string
  currentStage: string
  editorialStage: string
  capability: string
  sourceLocation: string
  submissionDate: string
  currentBlocker: string
  recommendedNextAction: string
  actionOwner: 'publisher' | 'author' | 'system' | 'external'
  holdReason: string
  ageDays: number
  ageBucket: '0-2 days' | '3-7 days' | '8-14 days' | '15-30 days' | 'Over 30 days'
  overdueState: 'current' | 'watch' | 'overdue' | 'stalled'
  duplicateRisk: string
  latestExecutionEvidence?: string
  sharePointLink?: string
  authorizedActions: Array<{
    id: PublisherActionId
    label: string
    entryConditions: string[]
    authorFacingConsequence: string
  }>
}

export type PublisherWorkloadState =
  | 'Editorial Review'
  | 'Developmental Editing - Not Started'
  | 'Developmental Editing - In Progress'
  | 'Developmental Editing - Author Review'
  | 'Line Editing - Not Started'
  | 'Line Editing - In Progress'
  | 'Line Editing - Internal QA'
  | 'Line Editing - Release Decision Ready'
  | 'Line Editing - Author Review'
  | 'Copyediting Ready'
  | 'Copyediting In Progress'
  | 'Copyediting - Release Decision Ready'
  | 'Proofreading Ready'
  | 'Production Ready'
  | 'Blocked'
  | 'External Hold'

export type PublisherWorkloadItem = {
  key: string
  title: string
  author: string
  contactId: string
  relationshipId: string
  intake: string
  titleId: string
  assetId: string
  pipelineStage: string
  editorialStage: string
  editorialSubstage: string
  workloadState: PublisherWorkloadState
  activeCapability: string
  currentOwner: 'Cody' | 'Jackie' | 'Author' | 'External'
  nextAction: string
  targetDate: string
  ageDays: number
  authorAction: string
  publisherAction: string
  internalQaState: string
  packageReadiness: string
  holdReason: string
  restartCondition: string
  downstreamCapacityRisk: 'none' | 'watch' | 'blocked'
  readinessGuard: {
    status: 'pass' | 'watch' | 'blocked'
    message: string
  }
  latestExecutionEvidence: string
}

export type PublisherOperatingCenterSnapshot = {
  generatedAt: string
  status: 'core-live' | 'unavailable'
  operator: {
    role: 'Publisher'
    authorization: 'Internal Entra workforce allowlist'
  }
  metrics: {
    newSubmissionsAwaitingReview: number
    unlinkedAssets: number
    editorialReviewQueue: number
    publisherActionsPending: number
    authorActionsPending: number
    contractPaymentHolds: number
    failedTransitions: number
    stalledAssets: number
    assetsWaitingReview: number
    assetsOnHold: number
    developmentalQueue: number
    averageQueueAgeDays: number
    oldestWaitingAsset: string
    publisherActionsDueToday: number
    assetsMovedToday: number
    assetsMovedThisWeek: number
    titlesAwaitingDevelopmentalEditing: number
    titlesInDevelopmentalEditing: number
    titlesAwaitingLineEditing: number
    titlesInLineEditing: number
    titlesAwaitingCopyediting: number
    titlesAwaitingCopyeditingRelease: number
    packagesHeldByReadinessGuard: number
    downstreamCapacityWarnings: number
  }
  queues: {
    enterprise: PublisherQueueItem[]
    proofAssets: PublisherQueueItem[]
    workload: PublisherWorkloadItem[]
  }
}

type DataverseRow = Record<string, unknown>

export async function buildPublisherOperatingCenterSnapshot(): Promise<PublisherOperatingCenterSnapshot> {
  const config = getDataverseServerConfig()
  if (!config) {
    return {
      generatedAt: new Date().toISOString(),
      status: 'unavailable',
      operator: {
        role: 'Publisher',
        authorization: 'Internal Entra workforce allowlist',
      },
      metrics: emptyMetrics(),
      queues: { enterprise: [], proofAssets: [], workload: [] },
    }
  }

  const [intakes, titles, assets, editorialStages, opportunities, logs] = await Promise.all([
    getRecentIntakes(config),
    getRecentTitles(config),
    getRecentAssets(config),
    getRecentEditorialStages(config),
    getRecentOpportunities(config),
    getRecentExecutionLogs(config),
  ])

  const queue = intakes
    .map((intake) => buildQueueItem(intake, titles, assets, editorialStages, opportunities, logs))
    .filter((item) => item.intakeReference)

  const proofAssets = queue
    .filter((item) =>
      ['before you were born', 'the general’s will and last testament', "the general's will and last testament"].includes(
        normalizeTitle(item.title),
      ),
    )
    .slice(0, 2)
  const workload = buildWorkloadItems(titles, assets, editorialStages, intakes, logs)

  return {
    generatedAt: new Date().toISOString(),
    status: 'core-live',
    operator: {
      role: 'Publisher',
      authorization: 'Internal Entra workforce allowlist',
    },
    metrics: buildMetrics(queue, logs, workload),
    queues: {
      enterprise: queue,
      proofAssets,
      workload,
    },
  }
}

export async function initializePublisherIntakeReview(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_manuscripturl,jm1_manuscriptreceived,jm1_workspacestatus,jm1_stage0handoffstatus,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $filter: `jm1_publishingintakeid eq ${input.intakeId}`,
  })

  if (!intake) throw new Error('intake_not_found')
  if (!stringValue(intake.jm1_projecttitle)) throw new Error('intake_missing_title')
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
  if (intake.jm1_manuscriptreceived !== true && !stringValue(intake.jm1_manuscripturl)) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`
  const title = await findOrCreateTitle(config, intake)
  const asset = await findOrCreateAsset(config, intake, title.id)

  await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_INTAKE_REVIEW_INITIALIZED',
    name: `PUBLISHER_INTAKE_REVIEW_INITIALIZED - ${title.name}`,
    description: [
      `Publisher Operating Center initialized intake review for ${title.name}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Title ${title.id}; asset ${asset.id}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    titleId: title.id,
    assetId: asset.id,
    titleCreated: title.created,
    assetCreated: asset.created,
  }
}

export async function verifyPublisherManuscript(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  if (!manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-MANUSCRIPT-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  if (manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    await dataversePatch(config, 'jm1_publishingintakes', input.intakeId, {
      jm1_manuscriptreceived: true,
    })
  }

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_MANUSCRIPT_VERIFIED',
    name: `PUBLISHER_MANUSCRIPT_VERIFIED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center verified manuscript evidence for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function clearPublisherEvidenceHold(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  if (!manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-CLEAR-HOLD-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_EVIDENCE_HOLD_CLEARED',
    name: `PUBLISHER_EVIDENCE_HOLD_CLEARED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center cleared evidence hold after manuscript verification for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function initializePublisherEditorialReview(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  if (!stringValue(intake.jm1_projecttitle)) throw new Error('intake_missing_title')
  if (intake.jm1_manuscriptreceived !== true && !stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-EDITORIAL-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`
  const title = await findOrCreateTitle(config, intake)
  const asset = await findOrCreateAsset(config, intake, title.id)
  const stage = await findOrCreateEditorialReviewStage(config, intake, title, asset.id, correlationId)

  await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED',
    name: `PUBLISHER_EDITORIAL_REVIEW_INITIALIZED - ${title.name}`,
    description: [
      `Publisher Operating Center initialized Editorial Review for ${title.name}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Title ${title.id}; asset ${asset.id}; stage ${stage.id}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    titleId: title.id,
    assetId: asset.id,
    editorialStageId: stage.id,
    stageCreated: stage.created,
  }
}

export async function placePublisherEvidenceHold(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_intakereferencecode,jm1_projecttitle,jm1_manuscripturl,jm1_manuscriptreceived,_jm1_linkedcontact_value',
    $filter: `jm1_publishingintakeid eq ${input.intakeId}`,
  })

  if (!intake) throw new Error('intake_not_found')
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
  if (intake.jm1_manuscriptreceived === true || stringValue(intake.jm1_manuscripturl)) {
    throw new Error('intake_has_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-HOLD-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED',
    name: `PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center placed intake evidence hold for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function logPublisherOperationalAction(input: {
  intakeId: string
  operatorEmail: string
  action: Exclude<
    PublisherActionId,
    | 'review_intake'
    | 'verify_manuscript'
    | 'initialize_editorial_review'
    | 'place_evidence_hold'
    | 'remove_evidence_hold'
    | 'view_only'
  >
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const actionType = publisherActionToEvent(input.action)
  const logId = await writePublisherExecutionLog(config, {
    actionType,
    name: `${actionType} - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center recorded bounded action ${input.action} for ${String(
        intake.jm1_projecttitle || input.intakeId,
      )}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

async function getPublisherIntakeForAction(config: DataverseServerConfig, intakeId: string) {
  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_manuscripturl,jm1_submissionurl,jm1_manuscriptreceived,jm1_workspacestatus,jm1_stage0handoffstatus,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $filter: `jm1_publishingintakeid eq ${intakeId}`,
  })
  if (!intake) throw new Error('intake_not_found')
  return intake
}

function assertLinkedContact(intake: DataverseRow) {
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
}

async function getRecentIntakes(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_manuscripturl,jm1_submissionurl,jm1_manuscriptreceived,jm1_intakestatus,jm1_workspacestatus,jm1_stageatsubmission,jm1_stage0handoffstatus,jm1_stage0handoffcreated,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '40',
  })
}

async function getRecentTitles(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_titles', {
    $select:
      'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,jm1pub_stage,jm1pub_status,jm1pub_publicationstatus,jm1pub_publiccatalogstatus,_jm1pub_contract_value,_jm1_author_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentAssets(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_publishingassets', {
    $select:
      'jm1pub_publishingassetid,jm1pub_assetformat,jm1pub_assetstatus,jm1pub_assetconfidencestatus,jm1pub_assethealthstatus,jm1pub_distributionstatus,jm1pub_evidencepath,jm1pub_evidencesource,jm1pub_filepackagereference,jm1pub_interiorfilereference,jm1pub_isbn13,_jm1pub_titleid_value,_jm1pub_contractid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentEditorialStages(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagesequence,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,_jm1pub_contactid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentOpportunities(config: DataverseServerConfig) {
  return dataverseList(config, 'opportunities', {
    $select:
      'opportunityid,name,jm1pub_projecttitle,jm1pub_intaketrackingid,jm1pub_contractstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,jm1_m6agreementpreparationstatus,jm1_m6onboardingstatus,jm1_m6packageselectionstatus,jm1_m6paymentoptionpreparationstatus,_parentcontactid_value,_customerid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '100',
  })
}

async function getRecentExecutionLogs(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_sourceentity,jm1_sourcerecordid,createdon',
    $orderby: 'createdon desc',
    $top: '100',
  })
}

function buildQueueItem(
  intake: DataverseRow,
  titles: DataverseRow[],
  assets: DataverseRow[],
  editorialStages: DataverseRow[],
  opportunities: DataverseRow[],
  logs: DataverseRow[],
): PublisherQueueItem {
  const titleName = stringValue(intake.jm1_projecttitle) || stringValue(intake.jm1_name)
  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const normalized = normalizeTitle(titleName)
  const title = titles.find((row) => normalizeTitle(stringValue(row.jm1pub_titlename || row.jm1pub_name)) === normalized)
  const titleId = stringValue(title?.jm1pub_titleid)
  const asset = assets.find((row) => titleId && dataverseLookupId(row, '_jm1pub_titleid_value') === titleId)
  const editorialStage = editorialStages.find(
    (row) => asset && dataverseLookupId(row, '_jm1pub_publishingassetid_value') === stringValue(asset.jm1pub_publishingassetid),
  )
  const opportunityId = dataverseLookupId(intake, '_jm1_opportunity_value')
  const opportunity = opportunities.find((row) => stringValue(row.opportunityid) === opportunityId)
  const log = logs.find(
    (row) =>
      stringValue(row.jm1_sourcerecordid) === stringValue(intake.jm1_publishingintakeid) ||
      (titleId && stringValue(row.jm1_sourcerecordid) === titleId),
  )
  const sourceLocation = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  const hasManuscript = intake.jm1_manuscriptreceived === true || Boolean(sourceLocation)
  const hasContact = Boolean(dataverseLookupId(intake, '_jm1_linkedcontact_value'))
  const currentStage = dataverseFormatted(title || {}, 'jm1pub_stage') || 'Inquiry'
  const latestActionType = stringValue(log?.jm1_actiontype)
  const hasEvidenceHold = latestActionType === 'PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED' && !hasManuscript
  const hasEditorialStage = Boolean(editorialStage) || latestActionType === 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED'
  const editorialWorkloadState = editorialStage
    ? deriveWorkloadState({
        pipelineStage: currentStage,
        stageType: dataverseFormatted(editorialStage, 'jm1pub_stagetype') || '',
        stageStatus: dataverseFormatted(editorialStage, 'jm1pub_stagestatus') || '',
        stageSummary: stringValue(editorialStage.jm1pub_authorsafesummary),
        hasAsset: Boolean(asset?.jm1pub_publishingassetid),
        latestAction: latestActionType,
      })
    : undefined
  const currentBlocker = deriveQueueBlocker(
    editorialWorkloadState,
    deriveBlocker({
      hasManuscript,
      hasContact,
      titleId,
      assetId: stringValue(asset?.jm1pub_publishingassetid),
      hasEvidenceHold,
      hasEditorialStage,
    }),
  )
  const authorizedActions = buildAuthorizedActions(currentBlocker, hasContact)
  const recommendedNextAction =
    editorialWorkloadState && currentBlocker !== 'Ready for next editorial scheduling decision'
      ? deriveNextAction(editorialWorkloadState, titleName)
      : authorizedActions.find((action) => action.id !== 'view_only')?.label || currentBlocker
  const actionOwner = currentBlocker.includes('release decision ready')
    ? 'publisher'
    : currentBlocker.includes('response pending')
      ? 'author'
      : currentBlocker.includes('in progress')
        ? 'system'
        : authorizedActions.some((action) => action.id !== 'view_only')
          ? 'publisher'
          : 'system'
  const daysOld = ageDays(stringValue(intake.createdon))

  return {
    key: stringValue(intake.jm1_publishingintakeid),
    intakeId: stringValue(intake.jm1_publishingintakeid),
    intakeReference: stringValue(intake.jm1_intakereferencecode),
    authorName,
    authorEmail: stringValue(intake.jm1_email),
    contactId: dataverseLookupId(intake, '_jm1_linkedcontact_value'),
    title: titleName,
    titleId,
    assetId: stringValue(asset?.jm1pub_publishingassetid),
    opportunityId,
    contractStatus: dataverseFormatted(opportunity || {}, 'jm1pub_contractstatus') || (title?._jm1pub_contract_value ? 'Linked' : 'Not confirmed'),
    paymentStatus: dataverseFormatted(opportunity || {}, 'jm1_m6firstpaymentstatus') || 'Not confirmed',
    rightsStatus: hasContact ? 'Contact linked; rights evidence pending publisher review' : 'Contact link missing',
    currentStage,
    editorialStage: editorialStage
      ? `${stringValue(editorialStage.jm1pub_name)}${dataverseFormatted(editorialStage, 'jm1pub_stagestatus') ? ` / ${dataverseFormatted(editorialStage, 'jm1pub_stagestatus')}` : ''}`
      : currentStage === 'Editorial'
        ? 'Editorial Review readiness'
        : 'Not initialized',
    capability: editorialWorkloadState
      ? deriveCapability(editorialWorkloadState)
      : currentStage === 'Editorial' || editorialStage
        ? 'CAP-001 / Editorial Intake'
        : 'Publisher Intake',
    sourceLocation,
    submissionDate: stringValue(intake.createdon),
    currentBlocker,
    recommendedNextAction,
    actionOwner,
    holdReason: currentBlocker === 'Ready for publisher intake review' ? '' : currentBlocker,
    ageDays: daysOld,
    ageBucket: ageBucket(daysOld),
    overdueState: overdueState(daysOld, currentBlocker),
    duplicateRisk: titleId ? 'Existing title match found' : 'No title match found',
    latestExecutionEvidence: log
      ? `${stringValue(log.jm1_actiontype)} (${stringValue(log.jm1_executionlogid)})`
      : undefined,
    sharePointLink: sourceLocation,
    authorizedActions,
  }
}

function buildWorkloadItems(
  titles: DataverseRow[],
  assets: DataverseRow[],
  editorialStages: DataverseRow[],
  intakes: DataverseRow[],
  logs: DataverseRow[],
): PublisherWorkloadItem[] {
  return titles
    .map((title) => {
      const titleId = stringValue(title.jm1pub_titleid)
      const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name)
      const titleAssets = assets.filter((asset) => dataverseLookupId(asset, '_jm1pub_titleid_value') === titleId)
      const asset = titleAssets[0]
      const assetId = stringValue(asset?.jm1pub_publishingassetid)
      const stages = editorialStages
        .filter(
          (stage) =>
            dataverseLookupId(stage, '_jm1pub_titleid_value') === titleId ||
            (assetId && dataverseLookupId(stage, '_jm1pub_publishingassetid_value') === assetId),
        )
        .sort((a, b) => Number(b.jm1pub_stagesequence || 0) - Number(a.jm1pub_stagesequence || 0))
      const latestStage = stages[0]
      const stageType = dataverseFormatted(latestStage || {}, 'jm1pub_stagetype') || ''
      const stageStatus = dataverseFormatted(latestStage || {}, 'jm1pub_stagestatus') || ''
      const pipelineStage = dataverseFormatted(title, 'jm1pub_stage') || 'Unstaged'
      const intake = intakes.find((row) => normalizeTitle(stringValue(row.jm1_projecttitle || row.jm1_name)) === normalizeTitle(titleName))
      const latestLog = findLatestLogForWorkload(logs, titleId, assetId, stages)
      const workloadState = deriveWorkloadState({
        pipelineStage,
        stageType,
        stageStatus,
        stageSummary: stringValue(latestStage?.jm1pub_authorsafesummary),
        hasAsset: Boolean(assetId),
        latestAction: stringValue(latestLog?.jm1_actiontype),
      })
      const capability = deriveCapability(workloadState)
      const risk = deriveDownstreamRisk(workloadState, titleName)
      const guard = deriveReadinessGuard(workloadState, latestStage, latestLog)
      const owner = deriveOwner(workloadState, guard.status)
      const ageBase = stringValue(latestStage?.modifiedon || latestStage?.createdon || title.modifiedon || title.createdon)

      return {
        key: titleId,
        title: titleName,
        author: stringValue(title.jm1pub_authorname) || dataverseFormatted(title, '_jm1_author_value') || 'Author pending',
        contactId:
          dataverseLookupId(latestStage || {}, '_jm1pub_contactid_value') ||
          dataverseLookupId(title, '_jm1_author_value') ||
          dataverseLookupId(intake || {}, '_jm1_linkedcontact_value'),
        relationshipId: '',
        intake: stringValue(intake?.jm1_intakereferencecode || intake?.jm1_publishingintakeid),
        titleId,
        assetId,
        pipelineStage,
        editorialStage: latestStage ? stringValue(latestStage.jm1pub_name) : 'Not initialized',
        editorialSubstage: workloadState === 'Line Editing - Author Review' ? 'Author Review' : stageStatus || 'Not Started',
        workloadState,
        activeCapability: capability,
        currentOwner: owner,
        nextAction: deriveNextAction(workloadState, titleName),
        targetDate: deriveTargetDate(workloadState),
        ageDays: ageDays(ageBase),
        authorAction: deriveAuthorAction(workloadState, guard.status),
        publisherAction: derivePublisherAction(workloadState),
        internalQaState: deriveInternalQaState(workloadState),
        packageReadiness: derivePackageReadiness(workloadState, guard.status),
        holdReason: guard.status === 'blocked' ? guard.message : '',
        restartCondition: deriveRestartCondition(workloadState, guard.status),
        downstreamCapacityRisk: risk,
        readinessGuard: guard,
        latestExecutionEvidence: latestLog
          ? `${stringValue(latestLog.jm1_actiontype)} (${stringValue(latestLog.jm1_executionlogid)})`
          : 'No recent execution evidence found',
      }
    })
    .filter((item) => item.title && isActiveWorkloadItem(item))
    .sort((a, b) => workloadPriority(a) - workloadPriority(b) || b.ageDays - a.ageDays)
}

function findLatestLogForWorkload(
  logs: DataverseRow[],
  titleId: string,
  assetId: string,
  stages: DataverseRow[],
) {
  const stageIds = new Set(stages.map((stage) => stringValue(stage.jm1pub_editorialstageid)).filter(Boolean))
  return logs.find((log) => {
    const recordId = stringValue(log.jm1_sourcerecordid)
    return recordId === titleId || recordId === assetId || stageIds.has(recordId)
  })
}

function deriveWorkloadState(input: {
  pipelineStage: string
  stageType: string
  stageStatus: string
  stageSummary?: string
  hasAsset: boolean
  latestAction?: string
}): PublisherWorkloadState {
  if (!input.hasAsset) return 'Blocked'
  const type = input.stageType.toLowerCase()
  const status = input.stageStatus.toLowerCase()
  const summary = input.stageSummary?.toLowerCase() || ''
  const latestAction = input.latestAction?.toLowerCase() || ''
  if (type.includes('line')) {
    if (
      status.includes('author') ||
      summary.includes('author review') ||
      summary.includes('delivered to the author') ||
      summary.includes('copyediting is blocked') ||
      latestAction.includes('cap002_author_package_delivered')
    ) {
      return 'Line Editing - Author Review'
    }
    if (status.includes('qa')) return 'Line Editing - Internal QA'
    if (status.includes('delivered') || status.includes('complete')) return 'Line Editing - Release Decision Ready'
    if (status.includes('progress')) return 'Line Editing - In Progress'
    return 'Line Editing - Not Started'
  }
  if (type.includes('developmental')) {
    if (status.includes('author')) return 'Developmental Editing - Author Review'
    if (status.includes('progress')) return 'Developmental Editing - In Progress'
    return 'Developmental Editing - Not Started'
  }
  if (type.includes('copy')) {
    if (
      status.includes('complete') ||
      summary.includes('internally complete') ||
      latestAction.includes('cap003_author_package_ready') ||
      latestAction.includes('cap003_internal_publisher_qa_completed')
    ) {
      return 'Copyediting - Release Decision Ready'
    }
    if (status.includes('progress')) return 'Copyediting In Progress'
    return 'Copyediting Ready'
  }
  if (type.includes('proof')) return 'Proofreading Ready'
  if (type.includes('production')) return 'Production Ready'
  if (input.pipelineStage.toLowerCase().includes('editorial')) return 'Editorial Review'
  if (input.pipelineStage.toLowerCase().includes('ongoing')) return 'External Hold'
  return 'Blocked'
}

function deriveCapability(state: PublisherWorkloadState) {
  if (state.startsWith('Developmental')) return 'CAP-001 Developmental Editing'
  if (state.startsWith('Line')) return 'CAP-002 Line Editing'
  if (state.startsWith('Copy')) return 'CAP-003 Copyediting'
  if (state.startsWith('Proof')) return 'CAP-004 Proofreading'
  if (state === 'Production Ready') return 'Production'
  return 'Editorial Review'
}

function deriveNextAction(state: PublisherWorkloadState, title: string) {
  if (
    title === 'The Intentional Leader' &&
    !['Line Editing - Author Review', 'Copyediting - Release Decision Ready'].includes(state)
  ) {
    return 'Complete full Volume I Line Editing package and QA'
  }
  switch (state) {
    case 'Editorial Review':
      return 'Complete Editorial Review and assign next governed stage'
    case 'Developmental Editing - Not Started':
      return 'Prepare Developmental plan without releasing author package until capacity guard passes'
    case 'Developmental Editing - In Progress':
      return 'Continue Developmental Editing and internal QA'
    case 'Developmental Editing - Author Review':
      return 'Await author response'
    case 'Line Editing - In Progress':
      return 'Complete line edit, QA, and package draft'
    case 'Line Editing - Internal QA':
      return 'Complete internal QA'
    case 'Line Editing - Release Decision Ready':
      return 'Jackie release decision required before author-facing Line Editing package is sent'
    case 'Line Editing - Author Review':
      return 'Await author response'
    case 'Copyediting Ready':
      return 'Hold until CAP-002 exit is complete'
    case 'Copyediting In Progress':
      return 'Complete Copyediting pass, QA, and internal package draft'
    case 'Copyediting - Release Decision Ready':
      return 'Jackie release decision required before author-facing Copyediting package is sent; Proofreading remains blocked'
    case 'External Hold':
      return 'Resolve external evidence or publisher judgment hold'
    default:
      return 'Resolve blocker before movement'
  }
}

function deriveTargetDate(state: PublisherWorkloadState) {
  const days =
    state === 'Line Editing - Author Review'
      ? 7
      : state === 'Line Editing - In Progress'
      ? 3
      : state === 'Line Editing - Release Decision Ready'
        ? 1
        : state === 'Editorial Review'
          ? 2
          : state.includes('Developmental')
            ? 5
            : 7
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

function deriveAuthorAction(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'None - publisher readiness guard active'
  if (state === 'Line Editing - Author Review') return 'Review and approve Line Editing package'
  if (state === 'Copyediting - Release Decision Ready') return 'None - publisher release decision pending'
  if (state.includes('Author Review')) return 'Review released package and respond through governed channel'
  return 'None'
}

function derivePublisherAction(state: PublisherWorkloadState) {
  if (state === 'Editorial Review') return 'Complete Editorial Review'
  if (state.startsWith('Developmental')) return 'Prepare or continue Developmental package'
  if (state === 'Line Editing - Release Decision Ready') return 'Review and approve release of the Line Editing package'
  if (state === 'Line Editing - Author Review') return 'Await author response'
  if (state.startsWith('Line')) return 'Complete Line Editing package'
  if (state === 'Copyediting Ready') return 'Confirm Line Editing exit before Copyediting'
  if (state === 'Copyediting In Progress') return 'Complete Copyediting package'
  if (state === 'Copyediting - Release Decision Ready') return 'Review and approve release of the Copyediting package'
  return 'Resolve current blocker'
}

function deriveInternalQaState(state: PublisherWorkloadState) {
  if (state.includes('Internal QA')) return 'In QA'
  if (state === 'Line Editing - Author Review') return 'PASS'
  if (state === 'Line Editing - Release Decision Ready') return 'Passed'
  if (state === 'Copyediting - Release Decision Ready') return 'PASS'
  if (state === 'Line Editing - In Progress' || state.includes('Developmental')) return 'Pending'
  if (state.includes('Author Review') || state === 'Copyediting Ready' || state === 'Production Ready') return 'Passed or not required'
  return 'Not started'
}

function derivePackageReadiness(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'Held by readiness guard'
  if (state === 'Line Editing - Author Review') return 'Delivered'
  if (state.includes('Author Review')) return 'Released to author'
  if (state === 'Line Editing - Release Decision Ready') return 'Ready for Jackie release decision'
  if (state === 'Copyediting - Release Decision Ready') return 'Ready for Jackie release decision'
  if (state.includes('In Progress') || state.includes('Not Started')) return 'Not ready'
  if (state.includes('Internal QA')) return 'Internal QA'
  return 'Pending'
}

function deriveRestartCondition(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'Correct manuscript-stage/package mismatch'
  if (state === 'Line Editing - Author Review') return 'Copyediting blocked until author approval gate is recorded'
  if (state === 'Copyediting - Release Decision Ready') return 'No restart required; Proofreading remains blocked until publisher release decision'
  if (state === 'External Hold') return 'Resolve external evidence hold'
  if (state === 'Blocked') return 'Reconcile title, asset, and stage evidence'
  return 'No restart required'
}

function deriveDownstreamRisk(state: PublisherWorkloadState, title: string): PublisherWorkloadItem['downstreamCapacityRisk'] {
  if (state === 'Line Editing - Author Review') return 'blocked'
  if (state === 'Copyediting - Release Decision Ready') return 'watch'
  if (title === 'The Intentional Leader') return 'watch'
  if (state.startsWith('Developmental')) return 'watch'
  if (state === 'Copyediting Ready' || state === 'Production Ready') return 'blocked'
  return 'none'
}

function deriveReadinessGuard(
  state: PublisherWorkloadState,
  stage: DataverseRow | undefined,
  latestLog: DataverseRow | undefined,
): PublisherWorkloadItem['readinessGuard'] {
  const summary = stringValue(stage?.jm1pub_authorsafesummary).toLowerCase()
  const latestAction = stringValue(latestLog?.jm1_actiontype)
  if (summary.includes('package') && !state.includes('Author Review') && !latestAction.includes('AUTHOR_PACKAGE')) {
    return {
      status: 'watch',
      message: 'Author-facing package language exists; confirm it matches current manuscript state before release.',
    }
  }
  if ((state === 'Copyediting Ready' || state === 'Production Ready') && !latestAction.includes('CAP002')) {
    return {
      status: 'blocked',
      message: 'Downstream readiness requires completed upstream editorial evidence.',
    }
  }
  return {
    status: 'pass',
    message: 'Author-facing readiness is consistent with governed stage state.',
  }
}

function deriveOwner(
  state: PublisherWorkloadState,
  guardStatus: 'pass' | 'watch' | 'blocked',
): PublisherWorkloadItem['currentOwner'] {
  if (guardStatus === 'blocked') return 'Cody'
  if (state === 'Line Editing - Release Decision Ready' || state === 'Copyediting - Release Decision Ready') return 'Jackie'
  if (state.includes('Author Review')) return 'Author'
  if (state === 'External Hold') return 'External'
  return 'Cody'
}

function isActiveWorkloadItem(item: PublisherWorkloadItem) {
  return ['Editorial', 'Ongoing Relationship', 'Production'].includes(item.pipelineStage) || item.editorialStage !== 'Not initialized'
}

function workloadPriority(item: PublisherWorkloadItem) {
  if (item.title === 'The Intentional Leader') return 0
  if (item.workloadState === 'Line Editing - Release Decision Ready') return 0
  if (item.workloadState === 'Copyediting - Release Decision Ready') return 0
  if (item.workloadState === 'Line Editing - In Progress') return 1
  if (item.workloadState === 'Editorial Review') return 2
  if (item.workloadState.startsWith('Developmental')) return 3
  if (item.downstreamCapacityRisk === 'blocked') return 4
  return 5
}

function deriveQueueBlocker(workloadState: PublisherWorkloadState | undefined, fallback: string) {
  if (workloadState === 'Line Editing - Release Decision Ready') return 'Line Editing package release decision ready'
  if (workloadState === 'Line Editing - Author Review') return 'Author Line Editing response pending'
  if (workloadState === 'Copyediting In Progress') return 'Copyediting in progress'
  if (workloadState === 'Copyediting - Release Decision Ready') return 'Copyediting package release decision ready'
  if (workloadState === 'Developmental Editing - Author Review') return 'Author Developmental Editing response pending'
  if (workloadState === 'Developmental Editing - In Progress') return 'Developmental Editing in progress'
  return fallback
}

function deriveBlocker(input: {
  hasManuscript: boolean
  hasContact: boolean
  titleId?: string
  assetId?: string
  hasEvidenceHold?: boolean
  hasEditorialStage?: boolean
}) {
  if (!input.hasContact) return 'Author contact must be reconciled'
  if (input.hasEvidenceHold) return 'Evidence hold active'
  if (input.titleId && input.assetId && input.hasEditorialStage) return 'Ready for next editorial scheduling decision'
  if (!input.hasManuscript) return 'Manuscript evidence is missing'
  if (!input.titleId || !input.assetId) return 'Ready for publisher intake review'
  if (!input.hasEditorialStage) return 'Editorial Review ready'
  return 'Ready for next editorial scheduling decision'
}

function buildAuthorizedActions(currentBlocker: string, hasContact: boolean): PublisherQueueItem['authorizedActions'] {
  if (currentBlocker === 'Ready for publisher intake review') {
    return [
      {
        id: 'review_intake',
        label: 'Review intake',
        entryConditions: ['Linked contact exists', 'Manuscript evidence exists'],
        authorFacingConsequence: 'None. This is an internal publisher movement.',
      },
    ]
  }

  if (currentBlocker === 'Manuscript evidence is missing' && hasContact) {
    return [
      {
        id: 'place_evidence_hold',
        label: 'Place evidence hold',
        entryConditions: ['Linked contact exists', 'Manuscript evidence is missing'],
        authorFacingConsequence: 'None. This records the internal evidence hold without contacting the author.',
      },
      {
        id: 'request_missing_information',
        label: 'Request missing information',
        entryConditions: ['Publisher confirms author-facing request is appropriate'],
        authorFacingConsequence: 'May prepare an author-facing request, but does not send automatically.',
      },
    ]
  }

  if (currentBlocker === 'Evidence hold active') {
    return [
      {
        id: 'verify_manuscript',
        label: 'Verify manuscript',
        entryConditions: ['Manuscript evidence exists in governed repository'],
        authorFacingConsequence: 'None. This clears internal evidence uncertainty only.',
      },
    ]
  }

  if (currentBlocker === 'Editorial Review ready') {
    return [
      {
        id: 'initialize_editorial_review',
        label: 'Initialize Editorial Review',
        entryConditions: ['Title exists', 'Publishing asset exists', 'Manuscript evidence verified'],
        authorFacingConsequence: 'None. This starts internal Editorial Review readiness.',
      },
    ]
  }

  return [
    {
      id: 'view_only',
      label: 'View evidence',
      entryConditions: ['Action blocked until missing evidence is resolved'],
      authorFacingConsequence: 'None.',
    },
  ]
}

async function findOrCreateTitle(config: DataverseServerConfig, intake: DataverseRow) {
  const titleName = stringValue(intake.jm1_projecttitle)
  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const escaped = escapeODataText(titleName)
  const existing = await dataverseFirst(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_stage',
    $filter: `jm1pub_titlename eq '${escaped}' or jm1pub_name eq '${escaped}'`,
  })

  if (existing) {
    if (dataverseFormatted(existing, 'jm1pub_stage') !== 'Editorial') {
      await dataversePatch(config, 'jm1pub_titles', stringValue(existing.jm1pub_titleid), {
        jm1pub_stage: TITLE_STAGE_EDITORIAL,
      })
    }
    return { id: stringValue(existing.jm1pub_titleid), name: titleName, created: false }
  }

  const entityId = await dataverseCreate(config, 'jm1pub_titles', {
    jm1pub_name: titleName,
    jm1pub_titlename: titleName,
    jm1pub_authorname: authorName,
    jm1pub_stage: TITLE_STAGE_EDITORIAL,
    jm1pub_publicationstatus: 'Publisher intake review initialized',
  })

  return { id: extractId(entityId), name: titleName, created: true }
}

async function findOrCreateAsset(config: DataverseServerConfig, intake: DataverseRow, titleId: string) {
  const existing = await dataverseFirst(config, 'jm1pub_publishingassets', {
    $select: 'jm1pub_publishingassetid,_jm1pub_titleid_value',
    $filter: `_jm1pub_titleid_value eq ${titleId}`,
  })
  if (existing) return { id: stringValue(existing.jm1pub_publishingassetid), created: false }

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  const titleName = stringValue(intake.jm1_projecttitle) || 'Publishing asset'
  const entityId = await dataverseCreate(config, 'jm1pub_publishingassets', {
    'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${titleId})`,
    jm1pub_name: titleName,
    jm1pub_assetformat: ASSET_FORMAT_OTHER,
    jm1pub_assetstatus: ASSET_STATUS_STAGED,
    jm1pub_distributionstatus: DISTRIBUTION_STATUS_DRAFT,
    jm1pub_evidencesource: 'Publisher Operating Center intake review',
    jm1pub_evidencepath: manuscriptUrl,
    jm1pub_interiorfilereference: manuscriptUrl,
  })

  return { id: extractId(entityId), created: true }
}

async function findOrCreateEditorialReviewStage(
  config: DataverseServerConfig,
  intake: DataverseRow,
  title: { id: string; name: string },
  assetId: string,
  correlationId: string,
) {
  const existing = await dataverseFirst(config, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagesequence',
    $filter: `_jm1pub_publishingassetid_value eq ${assetId} and jm1pub_stagesequence eq 1`,
  })
  if (existing) return { id: stringValue(existing.jm1pub_editorialstageid), created: false }

  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const entityId = await dataverseCreate(config, 'jm1pub_editorialstages', {
    jm1pub_name: `Editorial Review - ${title.name}`,
    jm1pub_projecttitle: title.name,
    jm1pub_author: authorName,
    jm1pub_publishingintakereference: stringValue(intake.jm1_intakereferencecode),
    jm1pub_intakereference: stringValue(intake.jm1_intakereferencecode),
    jm1pub_opportunityreference: dataverseLookupId(intake, '_jm1_opportunity_value'),
    jm1pub_stagetype: STAGE_TYPE_REVIEW,
    jm1pub_stagestatus: STAGE_STATUS_IN_PROGRESS,
    jm1pub_stagesequence: 1,
    jm1pub_healthstatus: HEALTH_HEALTHY,
    jm1pub_authorsafesummary:
      'Your manuscript is in Editorial Review. We are preparing the next publishing recommendation and will share the next decision step when it is ready.',
    jm1pub_internaloperationalsummary: `Editorial Review initialized from Publisher Operating Center for ${String(
      intake.jm1_intakereferencecode,
    )}.`,
    jm1pub_correlationid: correlationId,
    jm1pub_stagestartdate: new Date().toISOString(),
    jm1pub_currentartifactcount: 0,
    jm1pub_currentgatecount: 0,
    jm1pub_openexceptioncount: 0,
    'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${assetId})`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.id})`,
    ...(dataverseLookupId(intake, '_jm1_linkedcontact_value')
      ? { 'Jm1pub_Contactid@odata.bind': `/contacts(${dataverseLookupId(intake, '_jm1_linkedcontact_value')})` }
      : {}),
  })

  return { id: extractId(entityId), created: true }
}

async function writePublisherExecutionLog(
  config: DataverseServerConfig,
  input: {
    actionType: string
    name: string
    description: string
    sourceEntity: string
    sourceRecordId: string
  },
) {
  return dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: 'Publisher Operating Center',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
}

function buildMetrics(queue: PublisherQueueItem[], logs: DataverseRow[], workload: PublisherWorkloadItem[]) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const waitingQueue = queue.filter((item) => item.actionOwner !== 'author')
  const totalAge = waitingQueue.reduce((sum, item) => sum + item.ageDays, 0)
  const oldest = [...waitingQueue].sort((a, b) => b.ageDays - a.ageDays)[0]
  return {
    newSubmissionsAwaitingReview: queue.filter((item) => item.currentBlocker === 'Ready for publisher intake review').length,
    unlinkedAssets: queue.filter((item) => !item.assetId).length,
    editorialReviewQueue: queue.filter((item) => item.currentStage === 'Editorial').length,
    publisherActionsPending: queue.filter((item) => item.actionOwner === 'publisher').length,
    authorActionsPending: queue.filter((item) => item.actionOwner === 'author').length,
    contractPaymentHolds: queue.filter((item) => item.contractStatus !== 'Signed' && item.paymentStatus !== 'Paid Confirmed').length,
    failedTransitions: logs.filter((log) => stringValue(log.jm1_actiontype).includes('FAILED')).length,
    stalledAssets: queue.filter((item) => item.ageDays > 7 && item.actionOwner !== 'author').length,
    assetsWaitingReview: queue.filter((item) =>
      ['Ready for publisher intake review', 'Editorial Review ready', 'Ready for next editorial scheduling decision'].includes(
        item.currentBlocker,
      ),
    ).length,
    assetsOnHold: queue.filter((item) => item.currentBlocker.toLowerCase().includes('hold')).length,
    developmentalQueue: queue.filter((item) => item.editorialStage.toLowerCase().includes('developmental')).length,
    averageQueueAgeDays: waitingQueue.length ? Math.round((totalAge / waitingQueue.length) * 10) / 10 : 0,
    oldestWaitingAsset: oldest ? `${oldest.title} (${oldest.ageBucket})` : 'None',
    publisherActionsDueToday: queue.filter((item) => item.actionOwner === 'publisher' && item.ageDays >= 3).length,
    assetsMovedToday: logs.filter((log) => stringValue(log.createdon).startsWith(today)).length,
    assetsMovedThisWeek: logs.filter((log) => new Date(stringValue(log.createdon)).getTime() >= weekAgo).length,
    titlesAwaitingDevelopmentalEditing: workload.filter((item) => item.workloadState === 'Developmental Editing - Not Started')
      .length,
    titlesInDevelopmentalEditing: workload.filter((item) => item.workloadState === 'Developmental Editing - In Progress').length,
    titlesAwaitingLineEditing: workload.filter((item) => item.workloadState === 'Line Editing - Not Started').length,
    titlesInLineEditing: workload.filter((item) => item.workloadState === 'Line Editing - In Progress').length,
    titlesAwaitingCopyediting: workload.filter((item) => item.workloadState === 'Copyediting Ready').length,
    titlesAwaitingCopyeditingRelease: workload.filter((item) => item.workloadState === 'Copyediting - Release Decision Ready')
      .length,
    packagesHeldByReadinessGuard: workload.filter((item) => item.readinessGuard.status !== 'pass').length,
    downstreamCapacityWarnings: workload.filter((item) => item.downstreamCapacityRisk !== 'none').length,
  }
}

function emptyMetrics(): PublisherOperatingCenterSnapshot['metrics'] {
  return {
    newSubmissionsAwaitingReview: 0,
    unlinkedAssets: 0,
    editorialReviewQueue: 0,
    publisherActionsPending: 0,
    authorActionsPending: 0,
    contractPaymentHolds: 0,
    failedTransitions: 0,
    stalledAssets: 0,
    assetsWaitingReview: 0,
    assetsOnHold: 0,
    developmentalQueue: 0,
    averageQueueAgeDays: 0,
    oldestWaitingAsset: 'None',
    publisherActionsDueToday: 0,
    assetsMovedToday: 0,
    assetsMovedThisWeek: 0,
    titlesAwaitingDevelopmentalEditing: 0,
    titlesInDevelopmentalEditing: 0,
    titlesAwaitingLineEditing: 0,
    titlesInLineEditing: 0,
    titlesAwaitingCopyediting: 0,
    titlesAwaitingCopyeditingRelease: 0,
    packagesHeldByReadinessGuard: 0,
    downstreamCapacityWarnings: 0,
  }
}

function ageBucket(days: number): PublisherQueueItem['ageBucket'] {
  if (days <= 2) return '0-2 days'
  if (days <= 7) return '3-7 days'
  if (days <= 14) return '8-14 days'
  if (days <= 30) return '15-30 days'
  return 'Over 30 days'
}

function overdueState(days: number, blocker: string): PublisherQueueItem['overdueState'] {
  if (blocker.toLowerCase().includes('hold')) return days > 14 ? 'stalled' : 'watch'
  if (days > 14) return 'stalled'
  if (days > 7) return 'overdue'
  if (days > 2) return 'watch'
  return 'current'
}

function publisherActionToEvent(action: PublisherActionId) {
  switch (action) {
    case 'initialize_developmental_editing':
      return 'PUBLISHER_DEVELOPMENTAL_EDITING_INITIALIZATION_RECORDED'
    case 'request_missing_information':
      return 'PUBLISHER_MISSING_INFORMATION_REQUEST_PREPARED'
    case 'return_for_correction':
      return 'PUBLISHER_RETURN_FOR_CORRECTION_RECORDED'
    case 'retry_failed_operation':
      return 'PUBLISHER_FAILED_OPERATION_RETRY_RECORDED'
    default:
      return 'PUBLISHER_OPERATIONAL_ACTION_RECORDED'
  }
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
}

function ageDays(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 0
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)))
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function extractId(entityUrl: string) {
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1] || entityUrl
}
