import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const service = readFileSync(new URL('../lib/server/publishing-dispatch-service.ts', import.meta.url), 'utf8')
const workingTitlePolicy = readFileSync(new URL('../lib/server/working-title-policy.ts', import.meta.url), 'utf8')
const fiveTitleWorker = readFileSync(new URL('../lib/server/five-title-executive-recovery-dispatch.ts', import.meta.url), 'utf8')
const orchestrator = readFileSync(new URL('../lib/server/publishing-orchestrator.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/publishing/dispatch/author-package/route.ts', import.meta.url), 'utf8')
const certifyRoute = readFileSync(new URL('../app/api/publishing/dispatch/author-package/certify/route.ts', import.meta.url), 'utf8')
const relay = readFileSync(new URL('../azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js', import.meta.url), 'utf8')
const fiveTitleWorkflow = readFileSync(new URL('../.github/workflows/five-title-executive-recovery-dispatch.yml', import.meta.url), 'utf8')
const certificationWorkflow = readFileSync(
  new URL('../.github/workflows/publishing-operational-delivery-certification.yml', import.meta.url),
  'utf8',
)

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
    'titleReadiness',
    'authorFacingIdentity',
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
    'dataverseSendEvidence',
    'directReplyPath',
    'portalStatus',
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
    'PUBLISHING_DISPATCH_BLOCKED - AUTHOR_FACING_IDENTITY_NOT_RESOLVED',
  ]) {
    assert.match(service, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(service, /function stageHasCanonicalIntakeReferences/)
  assert.match(service, /stageReference && publishingReference && stageReference === publishingReference/)
  assert.doesNotMatch(service, /jm1pub_intakereference \|\| readback\.stage\.jm1pub_publishingintakereference/)
})

test('dispatch service allows working-title author review while preserving identity protection', () => {
  assert.match(service, /evaluateTitleReadiness/)
  assert.match(service, /titlePolicyProcessForStage/)
  assert.match(service, /titleReadiness:\s*readback\.titleStatus === 'WORKING_TITLE' \? 'WORKING_TITLE' : 'PASS'/)
  assert.match(service, /generate-or-reuse-three-governed-title-suggestions/)
  assert.match(service, /create-or-reuse-nonblocking-author-title-selection-task/)
  assert.match(service, /isUsableAuthorFacingName,\n\s+type TitleRequirementProcess/)
  assert.match(service, /authorFacingIdentity:\s*isUsableAuthorFacingName\(readback\.authorName\) \? 'PASS' : 'FAIL'/)
  assert.match(workingTitlePolicy, /function isUsableAuthorFacingName/)
  assert.match(workingTitlePolicy, /\['author', 'unknown author', 'unknown', 'tbd'\]/)
  assert.match(service, /title\.jm1pub_authordisplayname \|\| title\.jm1pub_authorname \|\| contact\.fullname \|\| stage\.jm1pub_author/)
  assert.doesNotMatch(service, /TITLE_NOT_FINAL_FOR_AUTHOR_REVIEW/)
})

test('working-title policy treats Untitled as valid through editorial and final-only downstream gates', () => {
  for (const token of [
    "WORKING_TITLE",
    "AUTHOR_PROVIDED",
    "AUTHOR_SELECTED_SUGGESTION",
    "FINAL_TITLE_APPROVED",
    "TITLE_CHANGE_REQUESTED",
    "EDITORIAL_REVIEW: workingAllowed('EDITORIAL_REVIEW')",
    "DEVELOPMENTAL_EDITING: workingAllowed('DEVELOPMENTAL_EDITING')",
    "LINE_EDITING: workingAllowed('LINE_EDITING')",
    "COPYEDITING: workingAllowed('COPYEDITING')",
    "PROOFREADING: workingAllowed('PROOFREADING')",
    "ISBN_ASSIGNMENT: finalRequired('ISBN_ASSIGNMENT')",
    "DISTRIBUTOR_METADATA: finalRequired('DISTRIBUTOR_METADATA')",
    "FINAL_COVER_PRODUCTION: finalRequired('FINAL_COVER_PRODUCTION')",
    "PUBLICATION_METADATA: finalRequired('PUBLICATION_METADATA')",
    "titleStatus: TITLE_STATUS.WORKING_TITLE",
    "nonblockingForEditorialApproval: true",
    "KEEP_WORKING_TITLE_FOR_NOW",
    "canonicalTitleMutation: false",
    "editorialApprovalBlocked: false",
  ]) {
    assert.match(workingTitlePolicy, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(workingTitlePolicy, /requiredSuggestionCount:\s*3/)
  assert.match(workingTitlePolicy, /preferredModelFamily:\s*'CLAUDE'/)
  assert.match(workingTitlePolicy, /fallbackAllowed:\s*false/)
  assert.match(workingTitlePolicy, /TITLE_SUGGESTION_BLOCKED - EXACTLY_THREE_DISTINCT_TITLES_REQUIRED/)
  assert.match(workingTitlePolicy, /author-title-selection/)
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
  assert.match(service, /interiorProof', 'reviewInstructions/)
  assert.match(service, /editedManuscript', 'reviewInstructions/)
  assert.doesNotMatch(service, /return \['editedManuscript', 'editorialMemo', 'reviewInstructions'\]/)
  assert.doesNotMatch(service, /return \['interiorProof', 'reviewInstructions', 'authorResponseMechanism'/)
  assert.doesNotMatch(service, /return \['editedManuscript', 'editorialMemo', 'reviewInstructions', 'authorResponseMechanism'/)
  assert.match(service, /https:\/\/graph\.microsoft\.com\/v1\.0\/drives/)
  assert.match(service, /ATTACHMENT_CHECKSUM_MISMATCH/)
  assert.match(service, /validateGovernedPackageAttachmentBinary/)
  assert.match(service, /GRAPH_CONFIG_MISSING_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION/)
  assert.match(service, /AUTHOR_ATTACHMENT_ROLE_COLLISION/)
  assert.match(service, /physicalAttachmentRoleCollision/)
  assert.match(service, /jm1pub_repositoryitemid/)
  assert.match(service, /jm1pub_sha256/)
  assert.match(service, /hasDuplicate/)
  assert.match(service, /artifactCanSatisfyRole/)
  assert.match(service, /role !== 'reviewInstructions'/)
  assert.match(service, /!\/instruction\|guide\|review\/i\.test\(haystack\)/)
  assert.match(service, /!\/\\\.pdf\\b\|pdf\/i\.test\(haystack\)/)
  assert.match(service, /role === 'reviewInstructions' && \/editorial\.\*review\.\*guide\|review\.\*guide\/i\.test\(haystack\)/)
  assert.match(service, /role === 'reviewInstructions' && \/\\\.\(txt\|md\|json\)\\b\|text\\\/\|markdown\/i\.test\(haystack\)/)
  assert.doesNotMatch(service, /buildRequiredAttachmentStubs/)
  assert.doesNotMatch(service, /PROGRAM-006 governed package materialization proof/)
})

test('dispatch service separates technical release from operational certification', () => {
  assert.match(service, /TECHNICALLY_RELEASED/)
  assert.match(service, /Operational delivery certification is required before Awaiting Author Response/)
  assert.match(service, /No seven-day response clock starts at technical release/)
  assert.match(service, /branded HTML, plain text, required attachments, checksums, archive, Dataverse send evidence, direct reply path, and single gate/)
  assert.match(service, /jm1pub_gatestatus:\s*GATE_STATUS_AWAITING_AUTHOR_RESPONSE/)
  assert.match(service, /jm1pub_awaitingsince:\s*now/)
  assert.match(service, /PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED/)
  assert.match(service, /authorResponseAlreadyReceived/)
  assert.match(service, /do-not-create-retroactive-seven-day-response-clock/)
  assert.match(service, /QUESTIONS_OR_CLARIFICATION_REQUESTED/)
  assert.match(service, /no seven-day response clock was created retroactively/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:BRANDED_HTML_NOT_VERIFIED/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:ARCHIVE_NOT_CONFIRMED/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:DATAVERSE_SEND_EVIDENCE_NOT_CONFIRMED/)
  assert.match(service, /OPERATIONAL_CERTIFICATION_BLOCKED:DIRECT_REPLY_PATH_NOT_CONFIRMED/)
  assert.doesNotMatch(service, /OPERATIONAL_CERTIFICATION_BLOCKED:PORTAL_ACCESS_NOT_CONFIRMED/)
  assert.doesNotMatch(service, /OPERATIONAL_CERTIFICATION_BLOCKED:RESPONSE_CONTROLS_NOT_CONFIRMED/)
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
    'archiveConfirmed',
    'dataverseSendEvidence',
    'singleActiveGate',
    'directReplyPath',
    'portalStatus',
  ]) {
    assert.match(certifyRoute, new RegExp(token))
  }
  assert.match(certifyRoute, /evidenceReferences/)
  assert.match(certifyRoute, /missingSupportingEvidenceReferences/)
  assert.match(certifyRoute, /supporting evidence references for every passed evidence field/)
  assert.doesNotMatch(certifyRoute, /cookie|session|x-jm1-relay-key/i)
})

test('operational certification workflow is protected and evidence backed', () => {
  assert.match(certificationWorkflow, /Publishing Operational Delivery Certification/)
  assert.match(certificationWorkflow, /environment: jmerrill-pub-production/)
  assert.match(certificationWorkflow, /npm run jm1-bootstrap -- --initiative "Publishing Operational Delivery Certification/)
  assert.match(certificationWorkflow, /Verify Production Release/)
  assert.match(certificationWorkflow, /jm1-pub-executive-recovery-dispatch/)
  assert.match(certificationWorkflow, /api\/publishing\/dispatch\/author-package\/certify/)
  assert.match(certificationWorkflow, /OPERATIONAL_CERTIFICATION_CONFIRMATION_REQUIRED/)
  assert.match(certificationWorkflow, /evidenceReferences/)
  assert.match(certificationWorkflow, /archiveConfirmed: true/)
  assert.match(certificationWorkflow, /dataverseSendEvidence: true/)
  assert.match(certificationWorkflow, /directReplyPath: true/)
  assert.match(certificationWorkflow, /singleActiveGate: true/)
  assert.match(certificationWorkflow, /authorResponseAlreadyReceived/)
  assert.doesNotMatch(certificationWorkflow, /x-jm1-relay-key/)
})

test('executive recovery sends corrected stage-specific author package copy', () => {
  const notificationEngine = readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8')
  assert.match(service, /corrected:\s*input\.executionMode === 'EXECUTIVE_RECOVERY'/)
  assert.match(service, /responseDeadline/)
  assert.match(notificationEngine, /Corrected \$\{subjectStageLabel\} Review Materials — \$\{input\.titleName\}/)
  assert.doesNotMatch(notificationEngine, /Corrected Proofreading Review Package/)
  assert.doesNotMatch(notificationEngine, /Corrected \$\{stageLabel\} Review Package/)
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
  const enterpriseRenderer = readFileSync(new URL('../lib/server/jm1-enterprise-communication-renderer.ts', import.meta.url), 'utf8')
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
  assert.match(brandEngine, /renderJm1EnterpriseCommunication/)
  assert.match(enterpriseRenderer, /<a href=/)
})

test('PROGRAM-006 keeps service-generated roles out of physical email attachments', () => {
  const notificationEngine = readFileSync(new URL('../lib/server/author-package-notification-engine.ts', import.meta.url), 'utf8')
  assert.match(notificationEngine, /isPhysicalEmailAttachmentRole/)
  assert.match(notificationEngine, /role !== 'authorResponseMechanism' && role !== 'packageManifest' && role !== 'authorCoverMessage'/)
  assert.match(service, /Required physical attachments/)
  assert.match(service, /packageInventory:\s*readback\.requiredAttachments[\s\S]+isPhysicalEmailAttachmentRole/)
  assert.match(service, /authorFacingFilename/)
  assert.match(notificationEngine, /AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED/)
  assert.match(notificationEngine, /View in Author Operating Center/)
  assert.match(notificationEngine, /Reply directly to publishing@jmerrill\.one/)
})
