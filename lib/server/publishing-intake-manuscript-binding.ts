import {
  dataverseCreate,
  dataverseFirst,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'
import {
  storeOriginalManuscriptArtifact,
  validateManuscriptUploadCandidate,
  type ExistingIntakeWorkspaceInput,
  type ManuscriptUploadCandidate,
  type StoredManuscriptArtifact,
} from '@/lib/publishing/intake/manuscriptUpload'

const EXECUTION_STATUS_SUCCESS = 835500001
const BAND_LEVEL_1 = 835500000
const WORKSPACE_STATUS_CREATED = 835513001
const DEFAULT_MAILBOX = 'publishing@jmerrill.one'

type DataverseRow = Record<string, unknown>

export type BindEmailManuscriptInput = {
  intakeId: string
  messageId: string
  attachmentId: string
  operatorEmail: string
  mailbox?: string
}

export async function bindEmailManuscriptToIntake(input: BindEmailManuscriptInput) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getBindingIntake(config, input.intakeId)
  const mailbox = (input.mailbox || DEFAULT_MAILBOX).trim().toLowerCase()
  const attachment = await fetchMailboxAttachment({
    mailbox,
    messageId: input.messageId,
    attachmentId: input.attachmentId,
  })
  const validation = validateManuscriptUploadCandidate(attachment.candidate)
  if (!validation.ok) throw new Error(validation.code)

  const existing = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  const marker = buildBindingMarker({ mailbox, messageId: input.messageId, attachmentId: input.attachmentId })
  const existingNotes = stringValue(intake.jm1_additionalnotes)
  if (existing && existingNotes.includes(marker)) {
    return {
      status: 'idempotent',
      intakeId: input.intakeId,
      manuscriptUrl: existing,
      marker,
    }
  }

  const artifact = await storeOriginalManuscriptArtifact({
    intake: intakeContext(intake),
    candidate: attachment.candidate,
    validation,
    provenance: {
      source: 'EMAIL',
      route: 'publisher-email-binding',
      mailbox,
      messageId: input.messageId,
      attachmentId: input.attachmentId,
      receivedOn: attachment.receivedOn,
      sender: attachment.sender,
      recipientMailbox: mailbox,
      boundBy: input.operatorEmail,
      boundOn: new Date().toISOString(),
    },
  })

  await patchIntakeWithArtifact(config, input.intakeId, intake, artifact, [
    marker,
    `EMAIL_MANUSCRIPT_BOUND filename=${artifact.originalFileName}; sha256=${artifact.sha256}; format=${artifact.fileType}; receivedOn=${attachment.receivedOn}; boundBy=${input.operatorEmail}`,
  ])
  const logId = await writeBindingExecutionLog(config, {
    actionType: 'EMAIL_MANUSCRIPT_BOUND_TO_INTAKE',
    intakeId: input.intakeId,
    projectTitle: stringValue(intake.jm1_projecttitle || intake.jm1_name),
    reference: stringValue(intake.jm1_intakereferencecode),
    operatorEmail: input.operatorEmail,
    description: `Email manuscript attachment was bound to intake. Mailbox ${mailbox}. Message ${redactId(input.messageId)}. Attachment ${redactId(input.attachmentId)}. File ${artifact.originalFileName}. SHA-256 ${artifact.sha256}.`,
  })

  return {
    status: 'bound',
    intakeId: input.intakeId,
    manuscriptUrl: artifact.manuscriptUrl,
    sha256: artifact.sha256,
    fileType: artifact.fileType,
    reviewFlag: artifact.reviewFlag,
    executionLogId: extractId(logId),
  }
}

export async function bindContinuationManuscriptToIntake(input: {
  intakeId: string
  reference: string
  candidate: ManuscriptUploadCandidate
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getBindingIntake(config, input.intakeId)
  const reference = stringValue(intake.jm1_intakereferencecode)
  if (reference !== input.reference) throw new Error('continuation_reference_mismatch')

  const validation = validateManuscriptUploadCandidate(input.candidate)
  if (!validation.ok) throw new Error(validation.code)

  const artifact = await storeOriginalManuscriptArtifact({
    intake: intakeContext(intake),
    candidate: input.candidate,
    validation,
    provenance: {
      source: 'CONTINUATION_UPLOAD',
      route: '/api/publishing/intake/continue',
    },
  })
  await patchIntakeWithArtifact(config, input.intakeId, intake, artifact, [
    `CONTINUATION_MANUSCRIPT_UPLOADED sha256=${artifact.sha256}; format=${artifact.fileType}`,
  ])

  return {
    status: 'bound',
    intakeId: input.intakeId,
    reference,
    manuscriptUrl: artifact.manuscriptUrl,
    sha256: artifact.sha256,
    fileType: artifact.fileType,
    reviewFlag: artifact.reviewFlag,
  }
}

export async function getContinuationIntakeStatus(input: { intakeId: string; reference: string }) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')
  const intake = await getBindingIntake(config, input.intakeId)
  if (stringValue(intake.jm1_intakereferencecode) !== input.reference) throw new Error('continuation_reference_mismatch')
  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  return {
    reference: input.reference,
    projectTitle: stringValue(intake.jm1_projecttitle || intake.jm1_name),
    manuscriptReceived: intake.jm1_manuscriptreceived === true || Boolean(manuscriptUrl),
    manuscriptUrl: manuscriptUrl ? '[stored]' : '',
  }
}

async function getBindingIntake(config: DataverseServerConfig, intakeId: string) {
  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_idempotencykey,jm1_manuscripturl,jm1_submissionurl,jm1_manuscriptreceived,jm1_sharepointworkspaceurl,jm1_sharepointworkspacefolderid,jm1_additionalnotes,createdon,modifiedon',
    $filter: `jm1_publishingintakeid eq ${intakeId}`,
  })
  if (!intake) throw new Error('intake_not_found')
  return intake
}

function intakeContext(intake: DataverseRow): ExistingIntakeWorkspaceInput {
  return {
    reference: stringValue(intake.jm1_intakereferencecode),
    firstName: stringValue(intake.jm1_firstname),
    lastName: stringValue(intake.jm1_lastname),
    bookTitle: stringValue(intake.jm1_projecttitle || intake.jm1_name),
    idempotencyKey: stringValue(intake.jm1_idempotencykey),
  }
}

async function patchIntakeWithArtifact(
  config: DataverseServerConfig,
  intakeId: string,
  intake: DataverseRow,
  artifact: StoredManuscriptArtifact,
  notes: string[],
) {
  const existingNotes = stringValue(intake.jm1_additionalnotes)
  const nextNotes = [...notes, existingNotes].filter(Boolean).join('\n').slice(0, 950)
  await dataversePatch(config, 'jm1_publishingintakes', intakeId, {
    jm1_manuscriptreceived: true,
    jm1_manuscripturl: artifact.manuscriptUrl,
    jm1_sharepointworkspaceurl: artifact.workspaceUrl,
    jm1_sharepointworkspacefolderid: artifact.workspaceFolderId,
    jm1_workspacestatus: WORKSPACE_STATUS_CREATED,
    jm1_additionalnotes: nextNotes,
  })
}

async function fetchMailboxAttachment(input: {
  mailbox: string
  messageId: string
  attachmentId: string
}): Promise<{
  candidate: ManuscriptUploadCandidate
  receivedOn: string
  sender?: string
}> {
  const token = await getGraphAccessToken()
  const message = await graphFetch(
    token,
    `/users/${encodeURIComponent(input.mailbox)}/messages/${encodeURIComponent(input.messageId)}?$select=id,receivedDateTime,from`,
  )
  if (!isRecord(message)) throw new Error('message_not_found')
  const attachment = await graphFetch(
    token,
    `/users/${encodeURIComponent(input.mailbox)}/messages/${encodeURIComponent(input.messageId)}/attachments/${encodeURIComponent(input.attachmentId)}`,
  )
  if (!isRecord(attachment)) throw new Error('attachment_not_found')
  if (attachment['@odata.type'] !== '#microsoft.graph.fileAttachment') throw new Error('attachment_not_file')
  const contentBytes = typeof attachment.contentBytes === 'string' ? attachment.contentBytes : ''
  if (!contentBytes) throw new Error('attachment_content_unavailable')
  const bytes = Buffer.from(contentBytes, 'base64')
  const name = typeof attachment.name === 'string' ? attachment.name : ''
  const contentType = typeof attachment.contentType === 'string' ? attachment.contentType : 'application/octet-stream'
  const size = typeof attachment.size === 'number' ? attachment.size : bytes.byteLength

  return {
    candidate: {
      fileName: name,
      contentType,
      size,
      bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    },
    receivedOn: typeof message.receivedDateTime === 'string' ? message.receivedDateTime : '',
    sender: readSender(message),
  }
}

async function getGraphAccessToken() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.SHAREPOINT_TENANT_ID || process.env.DATAVERSE_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.SHAREPOINT_CLIENT_ID || process.env.DATAVERSE_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || process.env.SHAREPOINT_CLIENT_SECRET || process.env.DATAVERSE_CLIENT_SECRET
  if (!tenantId || !clientId || !clientSecret) throw new Error('graph_configuration_missing')

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
  const json = await response.json().catch(() => null)
  const token = isRecord(json) && typeof json.access_token === 'string' ? json.access_token : ''
  if (!response.ok || !token) throw new Error(`graph_token_failed:${response.status}`)
  return token
}

async function graphFetch(token: string, path: string) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`graph_fetch_failed:${response.status}`)
  return response.json()
}

async function writeBindingExecutionLog(
  config: DataverseServerConfig,
  input: {
    actionType: string
    intakeId: string
    projectTitle: string
    reference: string
    operatorEmail: string
    description: string
  },
) {
  return dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: `${input.actionType} - ${input.projectTitle || input.reference}`.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: `${input.description} Operator ${input.operatorEmail}. No message body or manuscript content stored in Dataverse.`.slice(0, 1000),
    jm1_agentname: 'Publisher Operating Center',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: 'jm1_publishingintake',
    jm1_sourcerecordid: input.intakeId,
  })
}

function buildBindingMarker(input: { mailbox: string; messageId: string; attachmentId: string }) {
  return `EMAIL_BINDING mailbox=${input.mailbox}; message=${input.messageId}; attachment=${input.attachmentId}`
}

function readSender(message: DataverseRow) {
  const from = message.from
  if (!isRecord(from) || !isRecord(from.emailAddress)) return undefined
  return typeof from.emailAddress.address === 'string' ? from.emailAddress.address : undefined
}

function redactId(value: string) {
  return value.length <= 12 ? '[id]' : `${value.slice(0, 6)}...${value.slice(-4)}`
}

function extractId(entityUrl: string) {
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1] || entityUrl
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
