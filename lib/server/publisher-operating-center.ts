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
  duplicateRisk: string
  latestExecutionEvidence?: string
  sharePointLink?: string
  authorizedActions: Array<{
    id: 'initialize_publisher_intake_review' | 'view_only'
    label: string
    entryConditions: string[]
    authorFacingConsequence: string
  }>
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
    assetsMovedToday: number
    assetsMovedThisWeek: number
  }
  queues: {
    enterprise: PublisherQueueItem[]
    proofAssets: PublisherQueueItem[]
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
      queues: { enterprise: [], proofAssets: [] },
    }
  }

  const [intakes, titles, assets, opportunities, logs] = await Promise.all([
    getRecentIntakes(config),
    getRecentTitles(config),
    getRecentAssets(config),
    getRecentOpportunities(config),
    getRecentExecutionLogs(config),
  ])

  const queue = intakes
    .map((intake) => buildQueueItem(intake, titles, assets, opportunities, logs))
    .filter((item) => item.intakeReference)

  const proofAssets = queue
    .filter((item) =>
      ['before you were born', 'the general’s will and last testament', "the general's will and last testament"].includes(
        normalizeTitle(item.title),
      ),
    )
    .slice(0, 2)

  return {
    generatedAt: new Date().toISOString(),
    status: 'core-live',
    operator: {
      role: 'Publisher',
      authorization: 'Internal Entra workforce allowlist',
    },
    metrics: buildMetrics(queue, logs),
    queues: {
      enterprise: queue,
      proofAssets,
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
  opportunities: DataverseRow[],
  logs: DataverseRow[],
): PublisherQueueItem {
  const titleName = stringValue(intake.jm1_projecttitle) || stringValue(intake.jm1_name)
  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const normalized = normalizeTitle(titleName)
  const title = titles.find((row) => normalizeTitle(stringValue(row.jm1pub_titlename || row.jm1pub_name)) === normalized)
  const titleId = stringValue(title?.jm1pub_titleid)
  const asset = assets.find((row) => titleId && dataverseLookupId(row, '_jm1pub_titleid_value') === titleId)
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
  const currentBlocker = deriveBlocker({ hasManuscript, hasContact, titleId, assetId: stringValue(asset?.jm1pub_publishingassetid) })
  const recommendedNextAction =
    currentBlocker === 'Ready for publisher intake review'
      ? 'Initialize publisher intake review'
      : currentBlocker

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
    editorialStage: currentStage === 'Editorial' ? 'Editorial Review readiness' : 'Not initialized',
    capability: currentStage === 'Editorial' ? 'CAP-001 / Editorial Intake' : 'Publisher Intake',
    sourceLocation,
    submissionDate: stringValue(intake.createdon),
    currentBlocker,
    recommendedNextAction,
    actionOwner: currentBlocker === 'Ready for publisher intake review' ? 'publisher' : 'system',
    holdReason: currentBlocker === 'Ready for publisher intake review' ? '' : currentBlocker,
    ageDays: ageDays(stringValue(intake.createdon)),
    duplicateRisk: titleId ? 'Existing title match found' : 'No title match found',
    latestExecutionEvidence: log
      ? `${stringValue(log.jm1_actiontype)} (${stringValue(log.jm1_executionlogid)})`
      : undefined,
    sharePointLink: sourceLocation,
    authorizedActions:
      currentBlocker === 'Ready for publisher intake review'
        ? [
            {
              id: 'initialize_publisher_intake_review',
              label: 'Initialize review',
              entryConditions: ['Linked contact exists', 'Manuscript evidence exists', 'No duplicate title/asset conflict detected'],
              authorFacingConsequence: 'None. This is an internal publisher movement.',
            },
          ]
        : [
            {
              id: 'view_only',
              label: 'View evidence',
              entryConditions: ['Action blocked until missing evidence is resolved'],
              authorFacingConsequence: 'None.',
            },
          ],
  }
}

function deriveBlocker(input: { hasManuscript: boolean; hasContact: boolean; titleId?: string; assetId?: string }) {
  if (!input.hasContact) return 'Author contact must be reconciled'
  if (!input.hasManuscript) return 'Manuscript evidence is missing'
  if (!input.titleId || !input.assetId) return 'Ready for publisher intake review'
  return 'Ready for next editorial scheduling decision'
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

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl)
  const entityId = await dataverseCreate(config, 'jm1pub_publishingassets', {
    'jm1pub_titleid@odata.bind': `/jm1pub_titles(${titleId})`,
    jm1pub_assetformat: ASSET_FORMAT_OTHER,
    jm1pub_assetstatus: ASSET_STATUS_STAGED,
    jm1pub_distributionstatus: DISTRIBUTION_STATUS_DRAFT,
    jm1pub_evidencesource: 'Publisher Operating Center intake review',
    jm1pub_evidencepath: manuscriptUrl,
    jm1pub_interiorfilereference: manuscriptUrl,
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

function buildMetrics(queue: PublisherQueueItem[], logs: DataverseRow[]) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return {
    newSubmissionsAwaitingReview: queue.filter((item) => item.currentBlocker === 'Ready for publisher intake review').length,
    unlinkedAssets: queue.filter((item) => !item.assetId).length,
    editorialReviewQueue: queue.filter((item) => item.currentStage === 'Editorial').length,
    publisherActionsPending: queue.filter((item) => item.actionOwner === 'publisher').length,
    authorActionsPending: queue.filter((item) => item.actionOwner === 'author').length,
    contractPaymentHolds: queue.filter((item) => item.contractStatus !== 'Signed' && item.paymentStatus !== 'Paid Confirmed').length,
    failedTransitions: logs.filter((log) => stringValue(log.jm1_actiontype).includes('FAILED')).length,
    stalledAssets: queue.filter((item) => item.ageDays > 7 && item.actionOwner !== 'author').length,
    assetsMovedToday: logs.filter((log) => stringValue(log.createdon).startsWith(today)).length,
    assetsMovedThisWeek: logs.filter((log) => new Date(stringValue(log.createdon)).getTime() >= weekAgo).length,
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
    assetsMovedToday: 0,
    assetsMovedThisWeek: 0,
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
