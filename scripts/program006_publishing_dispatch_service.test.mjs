import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const service = readFileSync(new URL('../lib/server/publishing-dispatch-service.ts', import.meta.url), 'utf8')
const fiveTitleWorker = readFileSync(new URL('../lib/server/five-title-executive-recovery-dispatch.ts', import.meta.url), 'utf8')
const orchestrator = readFileSync(new URL('../lib/server/publishing-orchestrator.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/publishing/dispatch/author-package/route.ts', import.meta.url), 'utf8')
const certifyRoute = readFileSync(new URL('../app/api/publishing/dispatch/author-package/certify/route.ts', import.meta.url), 'utf8')
const relay = readFileSync(new URL('../azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js', import.meta.url), 'utf8')
const fiveTitleWorkflow = readFileSync(new URL('../.github/workflows/five-title-executive-recovery-dispatch.yml', import.meta.url), 'utf8')

test('PROGRAM-006 exposes one canonical PublishingDispatchService operation', () => {
  assert.match(service, /export const PublishingDispatchService/)
  assert.match(service, /export async function dispatchAuthorPackage/)
  assert.match(service, /export async function certifyOperationalDelivery/)
  assert.match(service, /PackageID, TitleID, StageID, and RecipientContactID/)
  assert.match(service, /'DRY_RUN' \| 'PRODUCTION' \| 'EXECUTIVE_RECOVERY'/)
  assert.match(service, /service: 'PublishingDispatchService'/)
  assert.match(service, /operation: 'dispatchAuthorPackage'/)
  assert.match(service, /operation: 'certifyOperationalDelivery'/)
})

test('dispatch service owns validation, natural idempotency, and transaction evidence', () => {
  for (const token of [
    'currentPackage',
    'recipient',
    'manifest',
    'qa',
    'duplicateSend',
    'currentGate',
    'intakeReference',
    'currentPackageVersion',
    'requiredAttachments',
    'attachmentByteLength',
    'fileSignatures',
    'attachmentOpenTests',
    'expectedAttachmentContent',
    'sourceChecksumLineage',
    'attachmentChecksums',
    'deliveredAttachmentInventory',
    'deliveredButtonUrl',
    'authorClickThrough',
    'portalAccessPreflight',
    'workspaceTarget',
    'Title',
    'Stage',
    'Package Version',
    'Recipient',
    'PUBLISHING_DISPATCH_TRANSACTION_STARTED',
    'PUBLISHING_DISPATCH_TECHNICALLY_RELEASED',
    'PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING',
    'PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED',
    'DUPLICATE_ACTIVE_GATE_RECONCILIATION_REQUIRED',
    'PUBLISHING_DISPATCH_BLOCKED - INTAKE_REFERENCE_CODE_INVALID',
  ]) {
    assert.match(service, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(service, /function stageHasCanonicalIntakeReferences/)
  assert.match(service, /stageReference && publishingReference && stageReference === publishingReference/)
  assert.doesNotMatch(service, /jm1pub_intakereference \|\| readback\.stage\.jm1pub_publishingintakereference/)
})

test('dispatch service reuses governed branding and package notification controls', () => {
  assert.match(service, /validateAuthorPackageNotification/)
  assert.match(service, /buildAuthorReviewNotificationCopy/)
  assert.match(service, /buildAuthorPackageNotificationIdempotencyKey/)
  assert.match(service, /AUTHOR_PUBLISHING_COMMUNICATION_POLICY/)
  assert.match(service, /publishing@email\.jmerrill\.one|transactionalFromAddress/)
  assert.match(service, /publishing@jmerrill\.one|canonicalReplyTo/)
})

test('dispatch service fails closed unless real package attachments are materialized', () => {
  assert.match(service, /materializeRequiredAttachments/)
  assert.match(service, /interiorProof', 'reviewInstructions', 'authorResponseMechanism', 'packageManifest', 'authorCoverMessage/)
  assert.match(service, /editedManuscript', 'editorialMemo', 'reviewInstructions', 'authorResponseMechanism', 'packageManifest', 'authorCoverMessage/)
  assert.match(service, /https:\/\/graph\.microsoft\.com\/v1\.0\/drives/)
  assert.match(service, /ATTACHMENT_CHECKSUM_MISMATCH/)
  assert.match(service, /validateGovernedPackageAttachmentBinary/)
  assert.match(service, /GRAPH_CONFIG_MISSING_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION/)
  assert.doesNotMatch(service, /buildRequiredAttachmentStubs/)
  assert.doesNotMatch(service, /PROGRAM-006 governed package materialization proof/)
})

test('dispatch service separates technical release from operational certification', () => {
  assert.match(service, /TECHNICALLY_RELEASED/)
  assert.match(service, /Operational delivery certification is required before Awaiting Author Response/)
  assert.match(service, /No seven-day response clock starts at technical release/)
  assert.match(service, /branded HTML, required attachments, attachment checksums, archive, author portal access, package visibility, response controls, and gate/)
  assert.match(service, /jm1pub_gatestatus:\s*GATE_STATUS_AWAITING_AUTHOR_RESPONSE/)
  assert.match(service, /jm1pub_awaitingsince:\s*now/)
  assert.match(service, /PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:BRANDED_HTML_NOT_VERIFIED/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:ARCHIVE_NOT_CONFIRMED/)
  assert.doesNotMatch(service, /Gate \$\{gateId\} moved to AWAITING_AUTHOR_RESPONSE after provider/)
  assert.doesNotMatch(service, /TECHNICALLY_RELEASED[\s\S]{0,120}jm1pub_awaitingsince:\s*now/)
})

test('ACS relay requires and forwards attachments for author-review packages', () => {
  assert.match(relay, /AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1/)
  assert.match(relay, /AUTHOR_REVIEW_ATTACHMENTS_MISSING/)
  assert.match(relay, /normalizeAuthorReviewAttachments/)
  assert.match(relay, /contentInBase64/)
  assert.match(relay, /attachments:\s*Array\.isArray\(payload\.attachments\)/)
})

test('legacy callers delegate dispatch to the canonical service', () => {
  assert.match(fiveTitleWorker, /import \{ dispatchAuthorPackage \} from '\.\/publishing-dispatch-service'/)
  assert.match(fiveTitleWorker, /dispatchAuthorPackage\(\{/)
  assert.doesNotMatch(fiveTitleWorker, /function buildCoverMessage/)
  assert.doesNotMatch(fiveTitleWorker, /function sendRelay/)
  assert.match(orchestrator, /import \{ dispatchAuthorPackage \} from '\.\/publishing-dispatch-service'/)
  assert.match(orchestrator, /dispatchAuthorPackage\(\{/)
  assert.match(orchestrator, /technical-release-recorded/)
  assert.match(orchestrator, /dispatch\.status === 'operationally_certified'/)
  assert.doesNotMatch(orchestrator, /dispatch\.status === 'released'/)
})

test('canonical dispatch endpoint is OIDC protected and mode constrained', () => {
  assert.match(route, /verifyGitHubActionsOidcToken/)
  assert.match(route, /Bearer /)
  assert.match(route, /DRY_RUN/)
  assert.match(route, /PRODUCTION/)
  assert.match(route, /EXECUTIVE_RECOVERY/)
  assert.doesNotMatch(route, /cookie|session|x-jm1-relay-key/i)
})

test('operational certification endpoint is OIDC protected and evidence constrained', () => {
  assert.match(certifyRoute, /verifyGitHubActionsOidcToken/)
  assert.match(certifyRoute, /Bearer /)
  assert.match(certifyRoute, /certifyOperationalDelivery/)
  for (const token of [
    'brandedHtml',
    'plainText',
    'requiredAttachments',
    'attachmentByteLength',
    'fileSignatures',
    'attachmentOpenTests',
    'expectedAttachmentContent',
    'sourceChecksumLineage',
    'attachmentChecksums',
    'deliveredAttachmentInventory',
    'deliveredButtonUrl',
    'authorClickThrough',
    'archiveConfirmed',
    'portalAccess',
    'packageVisible',
    'responseControls',
    'responseForm',
    'singleActiveGate',
  ]) {
    assert.match(certifyRoute, new RegExp(token))
  }
  assert.match(certifyRoute, /evidenceReferences/)
  assert.match(certifyRoute, /missingSupportingEvidenceReferences/)
  assert.match(certifyRoute, /supporting evidence references for every passed evidence field/)
  assert.doesNotMatch(certifyRoute, /cookie|session|x-jm1-relay-key/i)
})

test('executive recovery sends corrected stage-specific author package copy', () => {
  assert.match(service, /corrected:\s*input\.executionMode === 'EXECUTIVE_RECOVERY'/)
  assert.match(service, /responseDeadline/)
  assert.match(readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8'), /Corrected \$\{subjectStageLabel\} Review Package — \$\{input\.titleName\}/)
  assert.doesNotMatch(readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8'), /Corrected Proofreading Review Package/)
  assert.doesNotMatch(readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8'), /Corrected \$\{stageLabel\} Review Package/)
})

test('executive recovery exposes package version for corrected replacement dispatch', () => {
  assert.match(fiveTitleWorkflow, /package_version:/)
  assert.match(fiveTitleWorkflow, /PACKAGE_VERSION/)
  assert.match(fiveTitleWorkflow, /packageVersion: \$packageVersion/)
  assert.match(fiveTitleWorker, /packageVersion\?: string/)
  assert.match(fiveTitleWorker, /input\.packageVersion/)
  assert.match(fiveTitleWorker, /packageVersion\?\.trim\(\) \|\| 'executive-recovery-v1'/)
})

test('PROGRAM-006 rejects corrupt package binaries and nonfunctional action links', () => {
  const notificationEngine = readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8')
  const brandEngine = readFileSync(new URL('../lib/server/author-communication-brand.ts', import.meta.url), 'utf8')
  for (const token of [
    'DOCX_ZIP_SIGNATURE',
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
    'PDF_SIGNATURE',
    'PDF_EOF_MISSING',
    'PDF_PAGE_COUNT',
    'MINIMUM_SIZE',
    'ERROR_PAYLOAD',
    'EXPECTED_CONTENT_MISSING',
  ]) {
    assert.match(notificationEngine, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(brandEngine, /PRIMARY_ACTION_LINK_MISSING/)
  assert.match(brandEngine, /PRIMARY_ACTION_NOT_CLICKABLE/)
  assert.match(brandEngine, /PRIMARY_ACTION_URL_INVALID/)
  assert.match(brandEngine, /SUBJECT_DUPLICATED_WORD/)
  assert.match(brandEngine, /<a href=/)
})

test('PROGRAM-006 keeps service-generated roles out of physical email attachments', () => {
  const notificationEngine = readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8')
  assert.match(notificationEngine, /isPhysicalEmailAttachmentRole/)
  assert.match(notificationEngine, /role !== 'authorResponseMechanism' && role !== 'authorCoverMessage'/)
  assert.match(service, /Required physical attachments/)
  assert.match(service, /packageInventory:\s*readback\.requiredAttachments[\s\S]+isPhysicalEmailAttachmentRole/)
})
