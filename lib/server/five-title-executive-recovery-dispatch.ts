// Engine: Package Engine
// Reusable? Y
// Stage-specific exception? N

import { randomUUID } from 'node:crypto'

import { type AttachmentRole } from './author-package-notification-engine'
import {
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'
import type { PackageStageCode } from './author-review-package-engine'
import { dispatchAuthorPackage } from './publishing-dispatch-service'

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
  status: 'eligible' | 'blocked' | 'technically_released' | 'operationally_certified' | 'idempotent'
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
    expectedTitleId: '2d21ab5b-4d80-f111-ab0f-7c1e525b15c2',
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
      results.push(await releaseTitle(authority, readback, correlationId))
    } catch (error) {
      results.push({
        ...readback,
        status: 'blocked',
        blockers: [...readback.blockers, safeRuntimeBlocker(error)],
      })
    }
  }

  return {
    status:
      input.mode === 'dry-run'
        ? results.every((title) => title.status !== 'blocked')
          ? 'dry-run-complete'
          : 'blocked'
        : results.every((title) => title.status === 'operationally_certified' || title.status === 'idempotent')
          ? 'completed'
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
    return (
      dataverseLookupId(gate, '_jm1pub_editorialstageid_value') === stageId &&
      status !== 196650003 &&
      status !== 196650004
    )
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
      'record-technical-release-after-provider-acceptance',
      'require-operational-delivery-certification-before-author-response-clock',
    ],
    blockers,
    gateId: stringValue(activeGates[0]?.jm1pub_editorialapprovalgateid),
    executionLogIds: [],
  }
}

async function releaseTitle(
  authority: RecoveryTitleAuthority,
  readback: TitleDispatchResult,
  correlationId: string,
): Promise<TitleDispatchResult> {
  const titleId = readback.titleId || ''
  const stageId = readback.stageId || ''
  const result = await dispatchAuthorPackage({
    packageId: `${titleId}:${stageId}:current-author-package`,
    titleId,
    stageId,
    recipientContactId: authority.contactId,
    executionMode: 'EXECUTIVE_RECOVERY',
    packageVersion: 'executive-recovery-v1',
    correlationId,
    operator: 'github-oidc:jmerrill-pub-production',
  })

  return {
    ...readback,
    status:
      result.status === 'technically_released' || result.status === 'operationally_certified' || result.status === 'idempotent'
        ? result.status
        : 'blocked',
    gateId: result.gateId,
    providerMessageId: result.providerMessageId,
    executionLogIds: result.executionLogIds,
    blockers: result.status === 'blocked' ? result.blockers : readback.blockers,
  }
}

function selectStage(stages: DataverseRow[], authority: RecoveryTitleAuthority) {
  const stageMatch = stages.find((stage) => stageMatchesPackageStage(stage, authority.stageCode))
  if (stageMatch) return stageMatch

  const intakeMatch = stages.find(
    (stage) =>
      stringValue(stage.jm1pub_intakereference) === authority.intakeCode ||
      stringValue(stage.jm1pub_publishingintakereference) === authority.intakeCode,
  )
  return intakeMatch || stages[0] || null
}

function stageMatchesPackageStage(stage: DataverseRow, stageCode: PackageStageCode) {
  const haystack = [
    stringValue(stage.jm1pub_name),
    stringValue(stage.jm1pub_stagetype),
    dataverseFormatted(stage, 'jm1pub_stagetype', ''),
  ].join(' ')

  if (stageCode === 'INTERIOR_LAYOUT') return /interior|layout|hold|blocked/i.test(haystack)
  return /developmental|develop/i.test(haystack)
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
    interiorProof: /interior.*proof|layout.*proof|production.*pdf|\.pdf$/i,
    coverProof: /cover.*proof/i,
    productionProof: /production.*proof/i,
  }
  const pattern = patterns[role]
  return artifacts
    .filter((artifact) => {
      const haystack = [
        stringValue(artifact.jm1pub_editorialartifactname),
        stringValue(artifact.jm1pub_filename),
        dataverseFormatted(artifact, 'jm1pub_artifacttype', ''),
      ].join(' ')
      const size = Number(artifact.jm1pub_filesizebytes || 0)
      if (role === 'interiorProof' && size > 0 && size < 100_000) return false
      return pattern.test(haystack)
    })
    .sort((a, b) => artifactRoleScore(b, role) - artifactRoleScore(a, role))[0]
}

function artifactRoleScore(artifact: DataverseRow, role: AttachmentRole) {
  const haystack = [
    stringValue(artifact.jm1pub_editorialartifactname),
    stringValue(artifact.jm1pub_filename),
    dataverseFormatted(artifact, 'jm1pub_artifacttype', ''),
  ].join(' ')
  let score = artifact.jm1pub_iscurrentapproved === true ? 10 : 0
  if (role === 'editedManuscript' && /developmentally.*edited|edited.*manuscript/i.test(haystack)) score += 100
  if (role === 'editedManuscript' && /governed source/i.test(haystack)) score -= 20
  if (role === 'packageManifest' && /v2/i.test(haystack)) score += 20
  if (role === 'interiorProof' && /author review proof/i.test(haystack)) score += 100
  return score
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''")
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
