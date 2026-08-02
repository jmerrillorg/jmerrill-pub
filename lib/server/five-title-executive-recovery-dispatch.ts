// Engine: Package Engine
// Reusable? Y
// Stage-specific exception? N

import { createHash, randomUUID } from 'node:crypto'

import {
  AUTHOR_PUBLISHING_COMMUNICATION_POLICY,
  buildAuthorReviewNotificationCopy,
  buildAuthorPackageNotificationIdempotencyKey,
  validateAuthorPackageNotification,
  type AttachmentRole,
  type GovernedPackageAttachment,
} from './author-package-notification-engine'
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
import type { PackageStageCode } from './author-review-package-engine'

const GATE_STATUS_AWAITING_AUTHOR_RESPONSE = 196650002
const STAGE_STATUS_AWAITING_AUTHOR = 100000002
const EXECUTION_STATUS_SUCCESS = 835500001
const EXECUTION_STATUS_FAILED = 835500002
const BAND_LEVEL_1 = 835500000
const APPROVED_MESSAGE_TYPE = 'APPROVED_AUTHOR_RESPONSE'
const RELAY_FALLBACK_URL = 'https://func-jm1-acs-email-relay.azurewebsites.net'
const SYSTEM_OPERATOR = 'github-oidc:jmerrill-pub-production'

type DataverseRow = Record<string, unknown>

export type FiveTitleDispatchMode = 'dry-run' | 'confirm'

export type FiveTitleDispatchRequest = {
  mode: FiveTitleDispatchMode
  executiveRecovery: boolean
  confirmation?: string
  titles?: string[]
}

export type FiveTitleDispatchResult = {
  status: 'dry-run-complete' | 'completed' | 'blocked'
  mode: FiveTitleDispatchMode
  correlationId: string
  titles: TitleDispatchResult[]
}

export type TitleDispatchResult = {
  intakeCode: string
  title: string
  stageCode: PackageStageCode
  status: 'eligible' | 'blocked' | 'released' | 'idempotent'
  titleId?: string
  stageId?: string
  contactId: string
  recipientEmail?: string
  currentGateCount: number
  currentArtifactCount: number
  authorVisibleArtifactCount: number
  packageReadinessBlockers?: string[]
  proposedMutations: string[]
  blockers: string[]
  gateId?: string
  providerMessageId?: string
  executionLogIds: string[]
}

export type RecoveryTitleAuthority = {
  title: string
  intakeCode: string
  stageCode: PackageStageCode
  contactId: string
  recipientEmail?: string
  owner: 'EDITORIAL' | 'PRODUCTION' | 'PUBLISHING_OPERATIONS' | 'ENGINEERING' | 'JACKIE / PUBLISHING_OPERATIONS'
  expectedTitleId?: string
  internalLabel?: string
}

export const FIVE_TITLE_EXECUTIVE_RECOVERY_ALLOWLIST: RecoveryTitleAuthority[] = [
  {
    title: 'Before You Were Born',
    intakeCode: 'JMP-INT-202607-LQPHEK',
    stageCode: 'DEVELOPMENTAL_EDITING',
    contactId: 'dfb397e7-3b7c-f111-ab0f-6045bdd69435',
    owner: 'PUBLISHING_OPERATIONS',
  },
  {
    title: "The General's Will and Last Testament",
    intakeCode: 'JMP-INT-202607-DL2T20',
    stageCode: 'DEVELOPMENTAL_EDITING',
    contactId: 'c8c8747e-6675-f111-ab0f-6045bdd69678',
    owner: 'PUBLISHING_OPERATIONS',
  },
  {
    title: 'Establishing Glory: The Library',
    intakeCode: 'JMP-INT-202606-UFYG6O',
    stageCode: 'DEVELOPMENTAL_EDITING',
    contactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
    owner: 'PUBLISHING_OPERATIONS',
    internalLabel: 'Compilation-Reconciliation',
  },
  {
    title: 'The Long Watch',
    intakeCode: 'JMP-INT-202607-6R2MPZ',
    stageCode: 'DEVELOPMENTAL_EDITING',
    contactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
    owner: 'PUBLISHING_OPERATIONS',
    expectedTitleId: 'a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2',
  },
  {
    title: 'The Intentional Leader',
    intakeCode: 'JMP-INT-202607-0W5PTQ',
    stageCode: 'INTERIOR_LAYOUT',
    contactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
    owner: 'PRODUCTION',
  },
]

export async function dispatchFiveTitleExecutiveRecovery(input: FiveTitleDispatchRequest): Promise<FiveTitleDispatchResult> {
  if (!input.executiveRecovery) throw new Error('EXECUTIVE_RECOVERY_REQUIRED')
  if (input.mode === 'confirm' && input.confirmation !== 'EXECUTIVE_RECOVERY') {
    throw new Error('EXECUTIVE_RECOVERY_CONFIRMATION_REQUIRED')
  }

  const config = getDataverseServerConfig()
  if (!config) throw new Error('DATAVERSE_CONFIG_MISSING')
  const selected = selectTitles(input.titles)
  const correlationId = `five-title-executive-recovery:${new Date().toISOString()}:${randomUUID()}`
  const results: TitleDispatchResult[] = []

  for (const authority of selected) {
    const readback = await readTitleAuthority(config, authority)
    if (input.mode === 'dry-run' || readback.blockers.length > 0) {
      results.push(readback)
      continue
    }
    try {
      results.push(await releaseTitle(config, authority, readback, correlationId))
    } catch (error) {
      results.push({
        ...readback,
        status: 'blocked',
        blockers: [...readback.blockers, safeRuntimeBlocker(error)],
      })
    }
  }

  return {
    status: results.every((title) => title.status === 'released' || title.status === 'idempotent')
      ? input.mode === 'dry-run'
        ? 'dry-run-complete'
        : 'completed'
      : 'blocked',
    mode: input.mode,
    correlationId,
    titles: results,
  }
}

function selectTitles(input?: string[]) {
  if (!input?.length) return FIVE_TITLE_EXECUTIVE_RECOVERY_ALLOWLIST
  const requested = new Set(input.map((value) => value.trim()).filter(Boolean))
  const selected = FIVE_TITLE_EXECUTIVE_RECOVERY_ALLOWLIST.filter(
    (title) => requested.has(title.title) || requested.has(title.intakeCode),
  )
  if (selected.length !== requested.size) throw new Error('TITLE_ALLOWLIST_MISMATCH')
  return selected
}

async function readTitleAuthority(config: DataverseServerConfig, authority: RecoveryTitleAuthority): Promise<TitleDispatchResult> {
  const title = authority.expectedTitleId
    ? await dataverseFirst(config, 'jm1pub_titles', {
        $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,_jm1_author_value',
        $filter: `jm1pub_titleid eq ${authority.expectedTitleId}`,
      })
    : await dataverseFirst(config, 'jm1pub_titles', {
        $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,_jm1_author_value',
        $filter: `jm1pub_titlename eq '${escapeOData(authority.title)}' or jm1pub_name eq '${escapeOData(authority.title)}'`,
      })
  const titleId = stringValue(title?.jm1pub_titleid)
  const contact = await dataverseFirst(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1',
    $filter: `contactid eq ${authority.contactId}`,
  })
  const recipientEmail = authority.recipientEmail || stringValue(contact?.emailaddress1)
  const stages = titleId
    ? await dataverseList(config, 'jm1pub_editorialstages', {
        $select:
          'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_authorsafesummary,jm1pub_intakereference,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value,createdon,modifiedon',
        $filter: `_jm1pub_titleid_value eq ${titleId}`,
      })
    : []
  const stage = selectStage(stages, authority)
  const stageId = stringValue(stage?.jm1pub_editorialstageid)
  const artifacts = titleId
    ? await dataverseList(config, 'jm1pub_editorialartifacts', {
        $select:
          'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,createdon,modifiedon',
        $filter: `_jm1pub_titleid_value eq ${titleId}`,
      })
    : []
  const stageArtifacts = artifacts.filter((artifact) => !stageId || dataverseLookupId(artifact, '_jm1pub_editorialstageid_value') === stageId)
  const gates = titleId
    ? await dataverseList(config, 'jm1pub_editorialapprovalgates', {
        $select:
          'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,createdon,modifiedon',
        $filter: `_jm1pub_titleid_value eq ${titleId}`,
      })
    : []
  const activeGates = gates.filter((gate) => {
    const status = Number(gate.jm1pub_gatestatus || 0)
    return status !== 196650003 && status !== 196650004
  })
  const authorVisibleArtifacts = stageArtifacts.filter((artifact) => isAuthorVisibleArtifact(artifact))
  const packageReadinessBlockers = packageArtifactReadinessBlockers(authority, authorVisibleArtifacts)
  const blockers = [
    !titleId ? 'CANONICAL_TITLE_NOT_FOUND' : '',
    !contact ? 'CANONICAL_CONTACT_NOT_FOUND' : '',
    !recipientEmail ? 'CANONICAL_RECIPIENT_EMAIL_MISSING' : '',
    !stageId ? 'CURRENT_STAGE_NOT_FOUND' : '',
    stageId && dataverseLookupId(stage || {}, '_jm1pub_contactid_value') && dataverseLookupId(stage || {}, '_jm1pub_contactid_value') !== authority.contactId
      ? 'STAGE_CONTACT_MISMATCH'
      : '',
    authorVisibleArtifacts.length === 0 ? 'AUTHOR_SAFE_PACKAGE_ARTIFACTS_NOT_FOUND' : '',
    ...packageReadinessBlockers,
    activeGates.length > 1 ? 'DUPLICATE_ACTIVE_GATES' : '',
  ].filter(Boolean)

  return {
    intakeCode: authority.intakeCode,
    title: authority.title,
    stageCode: authority.stageCode,
    status: blockers.length ? 'blocked' : 'eligible',
    titleId,
    stageId,
    contactId: authority.contactId,
    recipientEmail,
    currentGateCount: activeGates.length,
    currentArtifactCount: stageArtifacts.length,
    authorVisibleArtifactCount: authorVisibleArtifacts.length,
    packageReadinessBlockers,
    proposedMutations: [
      'create-or-reuse-one-author-review-gate',
      'dispatch-one-branded-author-review-message-through-acs',
      'record-dataverse-send-evidence',
      'set-gate-awaiting-author-response-after-delivery',
      'set-stage-awaiting-author-response-after-delivery',
    ],
    blockers,
    gateId: stringValue(activeGates[0]?.jm1pub_editorialapprovalgateid),
    executionLogIds: [],
  }
}

async function releaseTitle(
  config: DataverseServerConfig,
  authority: RecoveryTitleAuthority,
  readback: TitleDispatchResult,
  correlationId: string,
): Promise<TitleDispatchResult> {
  const titleId = readback.titleId || ''
  const stageId = readback.stageId || ''
  const gateId = readback.gateId || (await createGate(config, authority, readback, correlationId))
  const packageChecksum = stableChecksum(`${titleId}:${stageId}:${gateId}:${authority.stageCode}:${authority.intakeCode}`)
  const idempotencyKey = buildAuthorPackageNotificationIdempotencyKey({
    titleId,
    stageCode: packageType(authority.stageCode),
    gateId,
    packageId: gateId,
    packageVersion: 'executive-recovery-v1',
    packageChecksum,
  })
  const existing = await findExecutionLog(config, 'FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED', idempotencyKey)
  if (existing) {
    return { ...readback, status: 'idempotent', gateId, executionLogIds: [stringValue(existing.jm1_executionlogid)] }
  }

  const attachments = await materializeRequiredAttachments(config, authority, titleId, stageId)
  const message = buildAuthorReviewNotificationCopy({
    stageCode: packageType(authority.stageCode),
    titleName: authority.title,
    authorName: displayNameFromEmail(readback.recipientEmail),
    corrected: authority.stageCode === 'INTERIOR_LAYOUT',
  })
  const packageValidation = validateAuthorPackageNotification({
    titleId,
    authorId: authority.contactId,
    stageCode: packageType(authority.stageCode),
    gateId,
    packageId: gateId,
    packageVersion: 'executive-recovery-v1',
    packageArtifactIds: attachments.map((attachment) => attachment.artifactId),
    requiredAttachmentArtifactIds: attachments.map((attachment) => attachment.artifactId),
    workspaceAccessLocation: `/author/portal?titleId=${encodeURIComponent(titleId)}`,
    notificationTemplateId: message.templateName,
    recipientPolicy: {
      from: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress,
      to: readback.recipientEmail || '',
      replyTo: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo,
      bcc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy],
    },
    correlationId,
    idempotencyKey,
    attachments,
    packageChecksum,
  })
  if (!packageValidation.ok) {
    await writeExecutionLog(config, {
      actionType: 'FIVE_TITLE_EXECUTIVE_RECOVERY_BLOCKED',
      name: `FIVE_TITLE_EXECUTIVE_RECOVERY_BLOCKED - ${authority.title}`,
      description: `Release blocked before author communication. ${packageValidation.blocker}; gate ${gateId}; idempotency ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: gateId,
      failed: true,
    })
    return {
      ...readback,
      status: 'blocked',
      blockers: [...readback.blockers, packageValidation.blocker || 'AUTHOR_PACKAGE_NOTIFICATION_BLOCKED'],
      gateId,
      executionLogIds: [],
    }
  }

  const startedLog = await writeExecutionLog(config, {
    actionType: 'FIVE_TITLE_EXECUTIVE_RECOVERY_STARTED',
    name: `FIVE_TITLE_EXECUTIVE_RECOVERY_STARTED - ${authority.title}`,
    description: `Executive recovery release started. Stage ${authority.stageCode}; intake ${authority.intakeCode}; title ${titleId}; gate ${gateId}; idempotency ${idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
  })
  const relay = await sendRelay({
    gateId,
    intakeCode: authority.intakeCode,
    title: authority.title,
    authorName: displayNameFromEmail(readback.recipientEmail),
    authorEmail: readback.recipientEmail || '',
    subject: `${stageLabel(authority.stageCode)} Review Package - ${authority.title}`,
    text: message.body,
    html: message.htmlBody,
    templateName: message.templateName,
    templateVersion: message.templateVersion,
    templateMetadata: message.templateMetadata,
    attachments,
  })
  const now = new Date().toISOString()

  await Promise.all([
    dataversePatch(config, 'jm1pub_editorialapprovalgates', gateId, {
      jm1pub_gatestatus: GATE_STATUS_AWAITING_AUTHOR_RESPONSE,
      jm1pub_nextstageauthorized: false,
      jm1pub_awaitingsince: now,
      jm1pub_authorresponsesummary: `${stageLabel(authority.stageCode)} package sent through executive recovery. Awaiting author response.`,
      jm1pub_authordecisionsource: `notification:${relay.providerMessageId}`,
      jm1pub_correlationid: correlationId,
    }),
    dataversePatch(config, 'jm1pub_editorialstages', stageId, {
      jm1pub_stagestatus: STAGE_STATUS_AWAITING_AUTHOR,
      jm1pub_authorsafesummary: `Your ${stageLabel(authority.stageCode).toLowerCase()} package is ready for review.`,
      jm1pub_internaloperationalsummary: `Executive recovery package sent through ACS. Reply-To ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo}; archive ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy}; idempotency ${idempotencyKey}.`,
      jm1pub_currentgatecount: 1,
      jm1pub_correlationid: correlationId,
    }),
  ])

  const sentLog = await writeExecutionLog(config, {
    actionType: 'FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED',
    name: `FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED - ${authority.title}`,
    description: `Package delivered from ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress}; reply-to ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo}; archive ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy}; provider message ${relay.providerMessageId}; response clock starts ${now}; idempotency ${idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
  })

  return {
    ...readback,
    status: 'released',
    gateId,
    providerMessageId: relay.providerMessageId,
    executionLogIds: [startedLog, sentLog].map(extractId),
  }
}

async function createGate(
  config: DataverseServerConfig,
  authority: RecoveryTitleAuthority,
  readback: TitleDispatchResult,
  correlationId: string,
) {
  const entityId = await dataverseCreate(config, 'jm1pub_editorialapprovalgates', {
    jm1pub_editorialapprovalgatename: `${stageLabel(authority.stageCode)} Author Review - ${authority.title}`,
    jm1pub_gatecode: 196650004,
    jm1pub_gatestatus: 196650001,
    jm1pub_nextstageauthorized: false,
    jm1pub_authorresponsesummary: 'Ready for governed author release under executive recovery.',
    jm1pub_correlationid: correlationId,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${readback.titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${readback.stageId})`,
  })
  return extractId(entityId)
}

async function sendRelay(input: {
  gateId: string
  intakeCode: string
  title: string
  authorName: string
  authorEmail: string
  subject: string
  text: string
  html: string
  templateName: string
  templateVersion: string
  templateMetadata: {
    htmlSha256: string
    textSha256: string
    qualityGate: string
  }
  attachments: GovernedPackageAttachment[]
}) {
  const relayUrl =
    process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || RELAY_FALLBACK_URL
  const relayKey =
    process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY
  if (!relayKey) throw new Error('RELAY_KEY_MISSING')
  const approvedOn = new Date().toISOString()
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: APPROVED_MESSAGE_TYPE,
      diagnosticId: input.gateId,
      intakeReferenceCode: input.intakeCode,
      authorEmail: input.authorEmail,
      to: [input.authorEmail],
      authorName: input.authorName,
      projectTitle: input.title,
      subject: input.subject,
      body: input.text,
      htmlBody: input.html,
      templateName: input.templateName,
      templateVersion: input.templateVersion,
      templateMetadata: input.templateMetadata,
      attachments: input.attachments.map((attachment) => ({
        name: attachment.fileName,
        contentType: attachment.contentType,
        contentInBase64: attachment.contentBytesBase64,
        role: attachment.role,
        artifactId: attachment.artifactId,
        sha256: attachment.sha256,
      })),
      approvedBy: SYSTEM_OPERATOR,
      approvedOn,
      internalVisibilityMailbox: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy,
      replyTo: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      bcc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy],
    }),
  })
  const body = (await response.json().catch(() => null)) as { providerMessageId?: string; accepted?: boolean; reason?: string; code?: string } | null
  if (!response.ok || (!body?.accepted && !body?.providerMessageId)) {
    throw new Error(`RELAY_SEND_FAILED:${body?.reason || body?.code || response.status}`)
  }
  return { providerMessageId: body.providerMessageId || 'accepted-without-provider-message-id' }
}

async function materializeRequiredAttachments(
  config: DataverseServerConfig,
  authority: RecoveryTitleAuthority,
  titleId: string,
  stageId: string,
): Promise<GovernedPackageAttachment[]> {
  const artifacts = await dataverseList(config, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_sha256,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value',
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
  })
  const visible = artifacts.filter((artifact) => isAuthorVisibleArtifact(artifact))
  const roles = requiredAttachmentRoles(authority.stageCode)
  const selected = roles.map((role) => {
    const artifact = selectArtifactForRole(visible, role)
    if (!artifact) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:REQUIRED_ATTACHMENT_MISSING:${role}`)
    return { role, artifact }
  })
  const token = await getGraphToken()

  return Promise.all(
    selected.map(async ({ role, artifact }) => {
      const driveId = stringValue(artifact.jm1pub_repositorydriveid)
      const itemId = stringValue(artifact.jm1pub_repositoryitemid)
      if (!driveId || !itemId) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_LOCATION_MISSING:${role}`)
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      )
      if (!response.ok) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_MATERIALIZATION_FAILED:${role}:${response.status}`)
      const body = Buffer.from(await response.arrayBuffer())
      const expectedSha = stringValue(artifact.jm1pub_sha256)
      const actualSha = stableChecksum(body)
      if (expectedSha && expectedSha.toLowerCase() !== actualSha.toLowerCase()) {
        throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_CHECKSUM_MISMATCH:${role}`)
      }
      const filename = sanitizeDownloadFilename(stringValue(artifact.jm1pub_filename) || `${role}.bin`)
      return {
        role,
        artifactId: stringValue(artifact.jm1pub_editorialartifactid),
        fileName: filename,
        contentType: contentTypeForFilename(filename),
        contentBytesBase64: body.toString('base64'),
        sizeBytes: body.byteLength,
        sha256: actualSha,
      }
    }),
  )
}

async function getGraphToken() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.SHAREPOINT_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.SHAREPOINT_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || process.env.SHAREPOINT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('GRAPH_CONFIG_MISSING_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION')
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  const json = (await response.json().catch(() => null)) as { access_token?: string } | null
  if (!response.ok || !json?.access_token) {
    throw new Error(`GRAPH_TOKEN_FAILED_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION:${response.status}`)
  }
  return json.access_token
}

function selectStage(stages: DataverseRow[], authority: RecoveryTitleAuthority) {
  const intakeMatch = stages.find(
    (stage) =>
      stringValue(stage.jm1pub_intakereference) === authority.intakeCode ||
      stringValue(stage.jm1pub_publishingintakereference) === authority.intakeCode,
  )
  return intakeMatch || stages[0] || null
}

function isAuthorVisibleArtifact(artifact: DataverseRow) {
  if (artifact.jm1pub_supersededon) return false
  if (artifact.jm1pub_iscurrentapproved === true) return true
  const status = dataverseFormatted(artifact, 'jm1pub_artifactstatus', '') || String(artifact.jm1pub_artifactstatus || '')
  const visibility = dataverseFormatted(artifact, 'jm1pub_visibility', '') || String(artifact.jm1pub_visibility || '')
  return /approved|current|author/i.test(`${status} ${visibility}`)
}

function packageArtifactReadinessBlockers(authority: RecoveryTitleAuthority, artifacts: DataverseRow[]) {
  return requiredAttachmentRoles(authority.stageCode)
    .filter((role) => !selectArtifactForRole(artifacts, role))
    .map((role) => `REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:${role}`)
}

function requiredAttachmentRoles(stageCode: PackageStageCode): AttachmentRole[] {
  if (stageCode === 'INTERIOR_LAYOUT') {
    return ['interiorProof', 'reviewInstructions', 'authorResponseMechanism', 'packageManifest', 'authorCoverMessage']
  }
  return ['editedManuscript', 'editorialMemo', 'reviewInstructions', 'authorResponseMechanism', 'packageManifest', 'authorCoverMessage']
}

function selectArtifactForRole(artifacts: DataverseRow[], role: AttachmentRole) {
  const patterns: Record<AttachmentRole, RegExp> = {
    editedManuscript: /manuscript|developmental.*docx|edited/i,
    editorialMemo: /memo|summary|developmental.*assessment|developmental.*summary/i,
    reviewInstructions: /instruction|review/i,
    authorResponseMechanism: /response|approval/i,
    packageManifest: /manifest/i,
    authorCoverMessage: /cover.*message|cover.*letter|message/i,
    lineEditedManuscript: /line/i,
    copyeditedManuscript: /copyedit/i,
    proofreadManuscript: /proofread/i,
    reviewCoverNote: /cover.*note/i,
    interiorProof: /interior.*proof|layout.*proof|production.*pdf|\\.pdf$/i,
    coverProof: /cover.*proof/i,
    productionProof: /production.*proof/i,
  }
  const pattern = patterns[role]
  return artifacts.find((artifact) => {
    const haystack = [
      stringValue(artifact.jm1pub_editorialartifactname),
      stringValue(artifact.jm1pub_filename),
      dataverseFormatted(artifact, 'jm1pub_artifacttype', ''),
    ].join(' ')
    const size = Number(artifact.jm1pub_filesizebytes || 0)
    if (role === 'interiorProof' && size > 0 && size < 100_000) return false
    return pattern.test(haystack)
  })
}

function displayNameFromEmail(email?: string) {
  if (!email) return 'Author'
  const local = email.split('@')[0] || 'Author'
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'Author'
}

async function findExecutionLog(config: DataverseServerConfig, actionType: string, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription',
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeOData(idempotencyKey)}')`,
  })
}

async function writeExecutionLog(
  config: DataverseServerConfig,
  input: { actionType: string; name: string; description: string; sourceEntity: string; sourceRecordId: string; failed?: boolean },
) {
  const completedAt = new Date().toISOString()
  const entityId = await dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: safeDetail(input.description),
    jm1_agentname: 'jmerrill.pub',
    jm1_agentmodel: 'five-title-executive-recovery-dispatch',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS_FAILED : EXECUTION_STATUS_SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
  return entityId
}

function packageType(stageCode: PackageStageCode) {
  return stageCode === 'INTERIOR_LAYOUT' ? 'INTERIOR_LAYOUT_REVIEW' : 'DEVELOPMENTAL_EDITING_REVIEW'
}

function stageLabel(stageCode: PackageStageCode) {
  return stageCode === 'INTERIOR_LAYOUT' ? 'Interior Layout' : 'Developmental Editing'
}

function stableChecksum(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function sanitizeDownloadFilename(value: string) {
  return value.replace(/[\r\n"\\/]/g, '-').slice(0, 180) || 'editorial-artifact'
}

function contentTypeForFilename(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8'
  return 'application/octet-stream'
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''")
}

function extractId(value: string) {
  const match = value.match(/\(([^)]+)\)$/)
  return match?.[1] || value
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .slice(0, 1000)
}

function safeRuntimeBlocker(error: unknown) {
  const value = error instanceof Error ? error.message : 'AUTHOR_PACKAGE_RELEASE_BLOCKED'
  return safeDetail(value).replace(/[:][0-9a-zA-Z._~+/=-]{24,}/g, ':[redacted]')
}
