import type { NormalizedPublishingIntake } from './schema'
import { createHash } from 'node:crypto'

export type ManuscriptUploadCandidate = {
  fileName: string
  contentType: string
  size: number
  bytes: ArrayBuffer
}

export type ManuscriptUploadValidation =
  | { ok: true; value: ManuscriptUploadCandidate; extension: ManuscriptFileExtension; reviewFlag: ManuscriptReviewFlag }
  | { ok: false; code: ManuscriptUploadErrorCode; message: string }

export type ManuscriptUploadResult =
  | {
      status: 'uploaded'
      manuscriptUrl: string
      fileName: string
      fileType: ManuscriptFileExtension
      reviewFlag: ManuscriptReviewFlag
      workspaceUrl: string
      workspaceFolderId: string
    }
  | { status: 'skipped'; reason: 'no_file' }
  | { status: 'failed'; reason: string }

export type StoredManuscriptArtifact = {
  manuscriptUrl: string
  fileName: string
  originalFileName: string
  fileType: ManuscriptFileExtension
  contentType: string
  size: number
  sha256: string
  reviewFlag: ManuscriptReviewFlag
  workspaceUrl: string
  workspaceFolderId: string
  sharePointItemId: string
}

export type ExistingIntakeWorkspaceInput = {
  reference: string
  firstName: string
  lastName: string
  bookTitle: string
  idempotencyKey?: string
}

export type ManuscriptArtifactProvenance =
  | {
      source: 'JOIN_UPLOAD' | 'CONTINUATION_UPLOAD'
      route: string
    }
  | {
      source: 'EMAIL'
      route: 'publisher-email-binding'
      mailbox: string
      messageId: string
      attachmentId: string
      receivedOn: string
      sender?: string
      recipientMailbox?: string
      boundBy?: string
      boundOn?: string
    }

export type InquiryWorkspaceResult =
  | { status: 'created'; workspaceUrl: string; workspaceFolderId: string }
  | { status: 'failed'; reason: string }

export type ManuscriptLinkVerificationResult =
  | { status: 'usable'; manuscriptUrl: string }
  | { status: 'failed'; reason: 'inaccessible_link' | 'invalid_link' | 'unsafe_link' | 'link_check_timeout' }

type ManuscriptFileExtension = 'docx' | 'doc' | 'pages' | 'rtf' | 'pdf' | 'md'
type ManuscriptReviewFlag = 'preferred_editable' | 'cleanup_required' | 'normalization_required' | 'review_only'
type ManuscriptUploadErrorCode =
  | 'empty_file'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'unsafe_file_name'

type GraphConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  siteHostname: string
  sitePath: string
  driveName: string
  inquiryRootPath: string
}

type GraphDrive = {
  id: string
  webUrl?: string
}

type GraphDriveItem = {
  id: string
  name: string
  webUrl: string
}

type InquiryWorkspaceContext = {
  token: string
  driveId: string
  workspacePath: string
  workspace: GraphDriveItem
}

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
const MAX_MANUSCRIPT_UPLOAD_BYTES = 25 * 1024 * 1024
const ORIGINAL_MANUSCRIPT_FOLDER = '01_Manuscript/Original'

const EXTENSION_FLAGS: Record<ManuscriptFileExtension, ManuscriptReviewFlag> = {
  docx: 'preferred_editable',
  doc: 'cleanup_required',
  pages: 'normalization_required',
  rtf: 'preferred_editable',
  pdf: 'review_only',
  md: 'preferred_editable',
}

export function validateManuscriptUploadCandidate(candidate: ManuscriptUploadCandidate): ManuscriptUploadValidation {
  if (!candidate.size || candidate.size <= 0) {
    return { ok: false, code: 'empty_file', message: 'Upload a non-empty manuscript file.' }
  }

  if (candidate.size > MAX_MANUSCRIPT_UPLOAD_BYTES) {
    return { ok: false, code: 'file_too_large', message: 'Upload a manuscript file smaller than 25 MB.' }
  }

  const safeName = sanitizeFileName(candidate.fileName)
  if (!safeName) {
    return { ok: false, code: 'unsafe_file_name', message: 'Use a safe manuscript file name.' }
  }

  const extension = getAllowedExtension(safeName)
  if (!extension) {
    return { ok: false, code: 'unsupported_file_type', message: 'Upload a .docx, .doc, .pages, .rtf, or .pdf manuscript file.' }
  }

  return {
    ok: true,
    value: { ...candidate, fileName: safeName },
    extension,
    reviewFlag: EXTENSION_FLAGS[extension],
  }
}

export async function uploadManuscriptToInquiryWorkspace(
  intake: NormalizedPublishingIntake,
  candidate: ManuscriptUploadCandidate | null,
): Promise<ManuscriptUploadResult> {
  if (!candidate) return { status: 'skipped', reason: 'no_file' }

  const validation = validateManuscriptUploadCandidate(candidate)
  if (!validation.ok) return { status: 'failed', reason: validation.code }

  const config = getGraphConfig()
  if (!config.ok) return { status: 'failed', reason: `sharepoint_configuration_missing:${config.missing.join(',')}` }

  try {
    const stored = await storeOriginalManuscriptArtifact({
      intake,
      candidate: validation.value,
      validation,
      provenance: {
        source: 'JOIN_UPLOAD',
        route: '/api/publishing/intake',
      },
    })

    return {
      status: 'uploaded',
      manuscriptUrl: stored.manuscriptUrl,
      fileName: stored.fileName,
      fileType: stored.fileType,
      reviewFlag: stored.reviewFlag,
      workspaceUrl: stored.workspaceUrl,
      workspaceFolderId: stored.workspaceFolderId,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: summarizeUploadError(error),
    }
  }
}

export async function storeOriginalManuscriptArtifact(input: {
  intake: ExistingIntakeWorkspaceInput
  candidate: ManuscriptUploadCandidate
  provenance: ManuscriptArtifactProvenance
  validation?: ManuscriptUploadValidation & { ok: true }
}): Promise<StoredManuscriptArtifact> {
  const validation = input.validation || validateManuscriptUploadCandidate(input.candidate)
  if (!validation.ok) throw new Error(validation.code)

  const config = getGraphConfig()
  if (!config.ok) throw new Error(`sharepoint_configuration_missing:${config.missing.join(',')}`)

  const context = await ensureExistingInquiryWorkspaceContext(input.intake, config.value)
  const manuscriptFolder = await ensureFolderPath(
    context.token,
    context.driveId,
    `${context.workspacePath}/${ORIGINAL_MANUSCRIPT_FOLDER}`,
  )
  const uploadFileName = buildUploadFileName(input.intake.reference, validation.value.fileName)
  const sourceSha256 = computeSha256(validation.value.bytes)
  const uploaded = await uploadSmallFile(
    context.token,
    context.driveId,
    `${context.workspacePath}/${ORIGINAL_MANUSCRIPT_FOLDER}/${uploadFileName}`,
    validation.value.bytes,
    validation.value.contentType,
  )
  const artifact: StoredManuscriptArtifact = {
    manuscriptUrl: uploaded.webUrl,
    fileName: uploadFileName,
    originalFileName: validation.value.fileName,
    fileType: validation.extension,
    contentType: validation.value.contentType || 'application/octet-stream',
    size: validation.value.size,
    sha256: sourceSha256,
    reviewFlag: validation.reviewFlag,
    workspaceUrl: context.workspace.webUrl || manuscriptFolder.webUrl,
    workspaceFolderId: context.workspace.id,
    sharePointItemId: uploaded.id,
  }
  const sourceManifestBytes = encodeUtf8Json(buildSourceArtifactManifest({
    intake: input.intake,
    artifact,
    provenance: input.provenance,
  }))
  const manifestName = `${input.intake.reference} - ${sourceSha256.slice(0, 12)} - source-artifact-manifest.json`
  await uploadSmallFile(
    context.token,
    context.driveId,
    `${context.workspacePath}/${ORIGINAL_MANUSCRIPT_FOLDER}/${manifestName}`,
    sourceManifestBytes,
    'application/json',
  )

  return artifact
}

export async function ensureInquiryWorkspace(intake: NormalizedPublishingIntake): Promise<InquiryWorkspaceResult> {
  const config = getGraphConfig()
  if (!config.ok) return { status: 'failed', reason: `sharepoint_configuration_missing:${config.missing.join(',')}` }

  try {
    const context = await ensureInquiryWorkspaceContext(intake, config.value)
    return {
      status: 'created',
      workspaceUrl: context.workspace.webUrl,
      workspaceFolderId: context.workspace.id,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: summarizeUploadError(error),
    }
  }
}

export async function verifyShareableManuscriptLink(url: string): Promise<ManuscriptLinkVerificationResult> {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return { status: 'failed', reason: 'invalid_link' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { status: 'failed', reason: 'invalid_link' }
  }

  if (isUnsafeFetchHostname(parsed.hostname)) {
    return { status: 'failed', reason: 'unsafe_link' }
  }

  try {
    const head = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    })

    if (head.ok) return { status: 'usable', manuscriptUrl: parsed.toString() }

    if (head.status !== 403 && head.status !== 405) {
      return { status: 'failed', reason: 'inaccessible_link' }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { status: 'failed', reason: 'link_check_timeout' }
    }
  }

  try {
    const get = await fetch(parsed.toString(), {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    })

    return get.ok
      ? { status: 'usable', manuscriptUrl: parsed.toString() }
      : { status: 'failed', reason: 'inaccessible_link' }
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error && error.name === 'TimeoutError' ? 'link_check_timeout' : 'inaccessible_link',
    }
  }
}

export const manuscriptUploadPolicy = {
  maxBytes: MAX_MANUSCRIPT_UPLOAD_BYTES,
  allowedExtensions: ['.docx', '.doc', '.pages', '.rtf', '.pdf'],
  flags: EXTENSION_FLAGS,
} as const

export function buildSourceArtifactManifest(input: {
  intake: ExistingIntakeWorkspaceInput
  artifact: StoredManuscriptArtifact
  provenance: ManuscriptArtifactProvenance
}) {
  return {
    schema: 'JM1_PUBLISHING_SOURCE_ARTIFACT_MANIFEST_V1',
    title: input.intake.bookTitle,
    author: `${input.intake.firstName} ${input.intake.lastName}`.trim(),
    intakeReference: input.intake.reference,
    correlationId: input.intake.idempotencyKey || input.intake.reference,
    sourceArtifact: {
      immutable: true,
      fileName: input.artifact.fileName,
      originalFileName: input.artifact.originalFileName,
      sourceFormat: input.artifact.fileType,
      contentType: input.artifact.contentType,
      sizeBytes: input.artifact.size,
      sha256: input.artifact.sha256,
      reviewFlag: input.artifact.reviewFlag,
      sharePointItemId: input.artifact.sharePointItemId,
      sharePointWebUrl: input.artifact.manuscriptUrl,
    },
    provenance: {
      ...input.provenance,
      sourceMutationPolicy: 'preserve_original_unchanged',
      downstreamVersionsMustDeriveFromSource: true,
    },
    ingestedAt: new Date().toISOString(),
  }
}

function getGraphConfig(): { ok: true; value: GraphConfig } | { ok: false; missing: string[] } {
  const config = {
    tenantId: process.env.SHAREPOINT_TENANT_ID || process.env.DATAVERSE_TENANT_ID,
    clientId: process.env.SHAREPOINT_CLIENT_ID || process.env.DATAVERSE_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || process.env.DATAVERSE_CLIENT_SECRET,
    siteHostname: process.env.JOIN_WORKSPACE_SITE_HOSTNAME || 'jmerrillfoundation.sharepoint.com',
    sitePath: process.env.JOIN_WORKSPACE_SITE_PATH || '/sites/publishing',
    driveName: process.env.JOIN_WORKSPACE_DRIVE_NAME || 'Documents',
    inquiryRootPath: trimSlashes(process.env.JOIN_WORKSPACE_INQUIRY_ROOT || '01_Pre-Pipeline/00_Inquiry'),
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) return { ok: false, missing }
  return { ok: true, value: config as GraphConfig }
}

async function getGraphAccessToken(config: GraphConfig) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })

  const json = await response.json().catch(() => null)
  const token = isRecord(json) && typeof json.access_token === 'string' ? json.access_token : ''
  if (!response.ok || !token) throw new Error(`graph_token_failed:${response.status}`)
  return token
}

async function getSite(token: string, config: GraphConfig): Promise<{ id: string }> {
  const sitePath = trimSlashes(config.sitePath)
  const response = await graphFetch(token, `/sites/${config.siteHostname}:/${sitePath}`)
  return response as { id: string }
}

async function getDriveByName(token: string, siteId: string, driveName: string): Promise<GraphDrive> {
  const response = await graphFetch(token, `/sites/${encodeURIComponent(siteId)}/drives`)
  if (!isRecord(response) || !Array.isArray(response.value)) throw new Error('graph_drive_list_invalid')

  const drive = response.value.find((item) => isRecord(item) && item.name === driveName)
  if (!isRecord(drive) || typeof drive.id !== 'string') throw new Error('graph_drive_not_found')
  return { id: drive.id, webUrl: typeof drive.webUrl === 'string' ? drive.webUrl : undefined }
}

async function ensureInquiryWorkspaceContext(
  intake: NormalizedPublishingIntake,
  config: GraphConfig,
): Promise<InquiryWorkspaceContext> {
  return ensureExistingInquiryWorkspaceContext(intake, config)
}

async function ensureExistingInquiryWorkspaceContext(
  intake: ExistingIntakeWorkspaceInput,
  config: GraphConfig,
): Promise<InquiryWorkspaceContext> {
  const token = await getGraphAccessToken(config)
  const site = await getSite(token, config)
  const drive = await getDriveByName(token, site.id, config.driveName)
  const workspaceFolderName = buildWorkspaceFolderName(intake)
  const workspacePath = `${config.inquiryRootPath}/${workspaceFolderName}`
  const workspace = await ensureFolderPath(token, drive.id, workspacePath)

  return {
    token,
    driveId: drive.id,
    workspacePath,
    workspace,
  }
}

async function ensureFolderPath(token: string, driveId: string, folderPath: string): Promise<GraphDriveItem> {
  const segments = trimSlashes(folderPath).split('/').filter(Boolean)
  let currentPath = ''
  let lastItem: GraphDriveItem | null = null

  for (const segment of segments) {
    const parentPath = currentPath
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const existing = await getDriveItemByPath(token, driveId, currentPath)
    if (existing) {
      lastItem = existing
      continue
    }

    lastItem = await createFolder(token, driveId, parentPath, segment)
  }

  if (!lastItem) throw new Error('graph_folder_path_empty')
  return lastItem
}

async function getDriveItemByPath(token: string, driveId: string, itemPath: string): Promise<GraphDriveItem | null> {
  const response = await fetch(`${GRAPH_BASE_URL}/drives/${encodeURIComponent(driveId)}/root:/${encodeGraphPath(itemPath)}`, {
    headers: graphHeaders(token),
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`graph_get_item_failed:${response.status}`)
  return parseDriveItem(await response.json())
}

async function createFolder(token: string, driveId: string, parentPath: string, folderName: string): Promise<GraphDriveItem> {
  const parent = parentPath
    ? `/drives/${encodeURIComponent(driveId)}/root:/${encodeGraphPath(parentPath)}:/children`
    : `/drives/${encodeURIComponent(driveId)}/root/children`

  const response = await fetch(`${GRAPH_BASE_URL}${parent}`, {
    method: 'POST',
    headers: {
      ...graphHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail',
    }),
  })

  if (response.status === 409) {
    const existingPath = parentPath ? `${parentPath}/${folderName}` : folderName
    const existing = await getDriveItemByPath(token, driveId, existingPath)
    if (existing) return existing
  }

  if (!response.ok) throw new Error(`graph_create_folder_failed:${response.status}`)
  return parseDriveItem(await response.json())
}

async function uploadSmallFile(
  token: string,
  driveId: string,
  itemPath: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<GraphDriveItem> {
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${encodeURIComponent(driveId)}/root:/${encodeGraphPath(itemPath)}:/content`,
    {
      method: 'PUT',
      headers: {
        ...graphHeaders(token),
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: bytes,
    },
  )

  if (!response.ok) throw new Error(`graph_upload_failed:${response.status}`)
  return parseDriveItem(await response.json())
}

async function graphFetch(token: string, path: string): Promise<unknown> {
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, { headers: graphHeaders(token) })
  if (!response.ok) throw new Error(`graph_fetch_failed:${response.status}`)
  return response.json()
}

function graphHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

function parseDriveItem(value: unknown): GraphDriveItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.webUrl !== 'string'
  ) {
    throw new Error('graph_drive_item_invalid')
  }

  return {
    id: value.id,
    name: value.name,
    webUrl: value.webUrl,
  }
}

function buildWorkspaceFolderName(intake: ExistingIntakeWorkspaceInput) {
  const authorName = sanitizePathSegment(`${intake.firstName} ${intake.lastName}`)
  const title = sanitizePathSegment(intake.bookTitle)
  return `${intake.reference} - ${authorName} - ${title}`.slice(0, 180)
}

function buildUploadFileName(reference: string, fileName: string) {
  return `${reference} - ${sanitizeFileName(fileName)}`.slice(0, 220)
}

function sanitizePathSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 90) || 'Untitled'
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\w\s().-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 120)

  if (!cleaned || cleaned === '.' || cleaned === '..') return ''
  return cleaned
}

function getAllowedExtension(fileName: string): ManuscriptFileExtension | null {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (
    extension === 'docx' ||
    extension === 'doc' ||
    extension === 'pages' ||
    extension === 'rtf' ||
    extension === 'pdf' ||
    extension === 'md'
  ) return extension
  return null
}

function computeSha256(bytes: ArrayBuffer) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex')
}

function encodeUtf8Json(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value, null, 2))
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

function trimSlashes(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function encodeGraphPath(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function summarizeUploadError(error: unknown) {
  if (!(error instanceof Error)) return 'unknown'
  return error.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]').slice(0, 120)
}

function isUnsafeFetchHostname(hostname: string) {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map((part) => Number.parseInt(part, 10))
    const [first, second] = parts

    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
    if (first === 10 || first === 127 || first === 0) return true
    if (first === 169 && second === 254) return true
    if (first === 172 && second >= 16 && second <= 31) return true
    if (first === 192 && second === 168) return true
  }

  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
