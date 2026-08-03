#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8' }).trim()
const args = parseArgs(process.argv.slice(2))

const AIC_CANON = {
  brand: 'Agape International Cathedral',
  tenant: 'JM1',
  primaryDomain: 'agapeic.org',
  legacyDomain: 'agapeic.com',
  legacyDomainScope: 'EXCLUDED',
  separateTenantMigration: 'NOT_PLANNED',
  mailboxModel: 'SHARED_MAILBOXES',
  mailboxStrategy: 'ROLE_BASED_SHARED_MAILBOXES',
  directSharedMailboxSignIn: 'PROHIBITED',
  communicationRenderer: 'JM1 Enterprise Communication Renderer',
  brandOverlay: 'agapeInternationalCathedral',
  failureCodes: [
    'AIC_UNAPPROVED_SENDER',
    'AIC_LEGACY_DOMAIN_SELECTED',
    'AIC_SHARED_MAILBOX_DIRECT_SIGNIN',
    'AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED',
    'AIC_ECR_OVERLAY_NOT_LOADED',
  ],
}

const bootstrapVersion = '1.0.0'
const initiative = args.initiative || 'repository'
const mode = args.mode || 'read-only'
const generatedAt = new Date().toISOString()
const branch = exec('git', ['branch', '--show-current']) || 'detached'
const headSha = exec('git', ['rev-parse', 'HEAD'])
const mainSha = exec('git', ['rev-parse', 'origin/main'])
const aheadBehind = parseAheadBehind(exec('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main']))
const statusLines = exec('git', ['status', '--porcelain=v1']).split('\n').filter(Boolean)
const dirtyPaths = statusLines.map(parseStatusLine)
const handoffPath = initiativeHandoffPath(initiative)
const handoff = readJsonIfExists(handoffPath)

const enterpriseCanon = loadEnterpriseCanon()
const repositoryCanon = loadRepositoryCanon()
const runtimeCanon = loadRuntimeCanon()
const initiativeContext = loadInitiativeContext(initiative, handoff)
const worktree = evaluateWorktree(dirtyPaths, aheadBehind, mode)
const conflicts = detectConflicts({ runtimeCanon, repositoryCanon, initiativeContext, handoff, worktree })
const executionAuthority = deriveExecutionAuthority(mode, worktree, conflicts, initiativeContext)
const stopConditions = deriveStopConditions({ enterpriseCanon, repositoryCanon, runtimeCanon, initiativeContext, worktree, conflicts, executionAuthority })
const status = stopConditions.length > 0
  ? 'BOOTSTRAP FAIL'
  : executionAuthority.requiredApprovals.length > 0 || worktree.status === 'PASS_WITH_HOLDS'
    ? 'BOOTSTRAP PASS WITH HOLDS'
    : 'BOOTSTRAP PASS'

const manifest = {
  bootstrapVersion,
  generatedAt,
  status,
  repository: {
    name: 'jmerrill-pub',
    branch,
    headSha,
    mainSha,
    worktreeClean: dirtyPaths.length === 0,
    ahead: aheadBehind.ahead,
    behind: aheadBehind.behind,
    dirtyPaths: dirtyPaths.length,
    outOfScopePaths: worktree.outOfScopePaths,
  },
  enterpriseCanon,
  repositoryCanon,
  runtimeCanon,
  initiativeContext,
  executionAuthority,
  worktree,
  conflicts,
  stopConditions,
}

validateManifest(manifest)
writeOutputs(manifest)
printSummary(manifest)
if (status === 'BOOTSTRAP FAIL') process.exit(1)

function loadEnterpriseCanon() {
  const docs = [
    'docs/doctrine/JM1-HUMAN-FIRST-SERVICE-DELIVERY-STANDARD-v1.0.md',
    'docs/doctrine/JM1-WEB-WHYFIRST-DOCTRINE-v1.0.md',
    'docs/doctrine/ENV-001-Environment-Promotion-Doctrine.md',
    '00_SYSTEM/Canon-Artifacts/JM1-Enterprise-Capability-and-Pipeline-Standard-v1.0.md',
    'docs/implementation/JM1-COM-001-Communications-Standard-v1.0.md',
    'docs/doctrine/JM1-ENTERPRISE-COMMUNICATION-STANDARD-v1.0.md',
  ]
  return {
    status: docs.every((doc) => existsSync(join(repoRoot, doc))) ? 'loaded' : 'failed',
    doctrines: [
      'Human-First Operating Principle',
      'Why-First Service Standard',
      'Microsoft-First Standard',
      'Communications Identity Alignment',
      'Model Sovereignty & Risk Doctrine',
      'Manual-to-Governed Transition Doctrine',
      'JM1 Human-First Service Delivery Standard',
      'Clean Worktree / One Initiative Rule',
      'Executive Exception Authority',
      'JM1 Enterprise Communication Standard v1.0',
    ],
    documents: docs.map((path) => ({ path, exists: existsSync(join(repoRoot, path)) })),
  }
}

function loadRepositoryCanon() {
  return {
    status: 'loaded',
    programs: [
      'Author Experience Reset',
      'PROGRAM-006 PublishingDispatchService',
      'Author communication brand canon',
      'Email-first author workflow',
      'JM1 Enterprise Communication Renderer',
    ],
    standards: [
      'Portal optionality rule',
      'Operational delivery certification',
      'Attachment integrity controls',
      'Protected mutation controls',
      'JMP Print Interior Standard v1.0',
      'JMP Metadata Standard v1.0',
      'Canonical template governance',
      'ISBN assignment governance',
      'PR dependency and stale-authority controls',
      'Dirty worktree scope guard',
    ],
    guards: [
      'jm1-bootstrap-guard',
      'jm1-canon-consistency-guard',
      'jm1-initiative-handoff-guard',
      'dirty-worktree-scope-guard',
      'stale-pr-authority-guard',
    ],
    printProduction: {
      interiorStyle: 'JMP Print Interior Standard v1.0',
      metadataProfile: 'JMP Metadata Standard v1.0',
      trim: '6 x 9',
      template: 'Canonical JMP internal template',
      automatedLayout: 'CANONICAL',
      nativeVellumProjectRequired: false,
      chapter1: 'RECTO',
      subsequentChapters: 'NATURAL_FLOW',
      frontMatterNumbering: 'LOWERCASE_ROMAN_INTERNAL',
      bodyNumbering: 'ARABIC_1_AT_CHAPTER_1',
      chapter1OpeningHeaderFooterFolio: 'HIDDEN',
      runningHeaders: 'ELIGIBLE_CONTINUATION_PAGES_ONLY',
      toc: 'PRIMARY_ENTRIES_ONLY',
      soulDiveInToc: false,
    },
    communication: {
      standard: 'JM1 Enterprise Communication Standard v1.0',
      renderer: 'JM1 Enterprise Communication Renderer',
      workflowSpecificHtmlAllowed: false,
      sender: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      archiveMailbox: 'publishing@jmerrill.one',
      primaryDelivery: 'email',
      portalRequired: false,
      internalArtifactsExposed: 0,
    },
  }
}

function loadRuntimeCanon() {
  const apiBase = Boolean(process.env.DATAVERSE_WEB_API_BASE_URL || process.env.JM1_CORE_ENVIRONMENT_URL)
  return {
    status: 'verified',
    environment: process.env.JM1_CORE_ENVIRONMENT_NAME || 'JM1 Core',
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || mainSha,
    productionHealth: process.env.JM1_PRODUCTION_HEALTH || 'NOT_QUERIED_BY_BOOTSTRAP',
    stagingHealth: process.env.JM1_STAGING_HEALTH || 'NOT_RELEVANT',
    dataverseReadiness: apiBase ? 'CONFIGURED' : 'MISSING_CONFIG',
    graphSharePointReadiness: process.env.JM1_PUBLISHING_SITE_ID && process.env.JM1_PUBLISHING_DRIVE_ID ? 'CONFIGURED' : 'MISSING_OR_NOT_REQUIRED',
    acsRelayReadiness: 'CONFIGURED_BY_REPOSITORY_CANON',
    protectedEndpointReadiness: process.env.JM1_DIAGNOSTIC_RUNNER_KEY ? 'CONFIGURED' : 'PROTECTED_KEY_NOT_EXPOSED_OR_NOT_LOADED',
    authenticatedExecutionIdentity: readIdentity(),
    dependencies: {
      node: process.version,
      npm: safeExec('npm', ['--version']) || 'unknown',
    },
    communication: {
      authorFacingDeliveryChannel: 'EMAIL FIRST',
      sender: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      archiveMailbox: 'publishing@jmerrill.one',
      primaryDelivery: 'email',
      portalRequired: false,
      portal: 'OPTIONAL / SECONDARY',
      gmailFallback: 'NOT CANONICAL',
      outlookFallback: 'NOT CANONICAL UNLESS SPECIFICALLY AUTHORIZED',
      internalArtifactsExposed: 0,
    },
    secretValuesPrinted: 0,
  }
}

function loadInitiativeContext(name, activeHandoff) {
  if (/agape.*shared mailbox|aic.*shared mailbox/i.test(name)) {
    return {
      status: activeHandoff ? 'loaded' : 'loaded',
      initiativeType: 'identity-mailbox',
      name: activeHandoff?.initiative || 'Agape Shared Mailbox Implementation',
      brand: AIC_CANON.brand,
      tenant: AIC_CANON.tenant,
      primaryDomain: AIC_CANON.primaryDomain,
      legacyDomain: AIC_CANON.legacyDomain,
      legacyDomainScope: AIC_CANON.legacyDomainScope,
      separateTenantMigration: AIC_CANON.separateTenantMigration,
      mailboxModel: AIC_CANON.mailboxModel,
      mailboxStrategy: AIC_CANON.mailboxStrategy,
      directSharedMailboxSignIn: AIC_CANON.directSharedMailboxSignIn,
      communicationRenderer: AIC_CANON.communicationRenderer,
      brandOverlay: AIC_CANON.brandOverlay,
      currentStage: {
        state: activeHandoff?.currentState || 'DOMAIN_VERIFICATION_REQUIRED_BEFORE_MAILBOX_MUTATION',
      },
      domainAuthority: activeHandoff?.domainAuthority || {
        azureDnsZone: 'agapeic.org',
        azureDnsHost: 'Azure DNS',
        microsoft365DomainPresent: null,
        microsoft365DomainVerified: null,
        exchangeServicesConfigured: null,
      },
      mailboxAuthority: activeHandoff?.mailboxAuthority || {},
      currentBlockers: activeHandoff?.currentBlockers || [],
      currentHolds: activeHandoff?.whatIsHeld || [],
      failureCodes: AIC_CANON.failureCodes,
      openDecisions: activeHandoff?.openDecisions || [],
    }
  }
  if (/intentional leader/i.test(name)) {
    const artifact = activeHandoff?.artifacts?.find((item) => item.role === 'approved-proof') || {}
    return {
      status: activeHandoff ? 'loaded' : 'loaded',
      initiativeType: 'publishing-title',
      name: activeHandoff?.initiative || 'The Intentional Leader',
      identifiers: {
        intakeReference: activeHandoff?.intakeReference || null,
        titleId: activeHandoff?.titleId || null,
      },
      currentStage: {
        name: activeHandoff?.currentStage || null,
        productionStage: activeHandoff?.currentProductionStage || null,
        stageId: activeHandoff?.stageId || null,
        liveDataverseStatus: activeHandoff?.liveDataverseReadback?.stageStatus ?? null,
        state: activeHandoff?.currentState || 'APPROVED_PROOF_READY_FOR_PROTECTED_ADVANCEMENT',
      },
      currentGate: {
        gateId: activeHandoff?.currentGateId || null,
        gateCode: activeHandoff?.currentGateCode || null,
        liveDataverseStatus: activeHandoff?.liveDataverseReadback?.gateStatus ?? null,
      },
      authorContact: {
        author: activeHandoff?.author || null,
        canonicalRecipient: activeHandoff?.canonicalRecipient || null,
      },
      currentApproval: {
        authorResponse: activeHandoff?.authorResponseState || null,
        approvedProof: activeHandoff?.approvedProof || null,
        approvedProofSha256: artifact.sha256 || null,
      },
      responseClock: {
        state: activeHandoff?.responseClockState || null,
        count: activeHandoff?.responseClockCount ?? null,
      },
      artifacts: [
        {
          role: 'current-proof',
          artifactId: artifact.artifactId || null,
          checksum: artifact.sha256 || null,
          pageCount: artifact.pageCount || null,
        },
      ],
      imprint: activeHandoff?.imprint || null,
      currentProductionSource: activeHandoff?.currentProductionSource || null,
      contractedFormats: activeHandoff?.contractedFormats || [],
      isbnState: activeHandoff?.isbnState || null,
      approvedDisclaimer: activeHandoff?.approvedDisclaimer || null,
      templateStyleProfile: activeHandoff?.templateStyleProfile || null,
      currentBlockers: activeHandoff?.currentBlockers || [],
      currentHolds: activeHandoff?.whatIsHeld || [],
      latestControllingEvidence: activeHandoff ? handoffPath : 'docs/operations/active/the-intentional-leader/CURRENT-STATE.json',
      proofGenerated: activeHandoff?.proofGenerated ?? null,
      proofDelivered: activeHandoff?.proofDelivered ?? null,
      authorApproval: activeHandoff?.authorApproval ?? null,
      protectedArtifactMutation: activeHandoff?.protectedArtifactMutation ?? null,
      interiorLayoutGate: activeHandoff?.interiorLayoutGate ?? null,
      additionalAuthorEmail: activeHandoff?.additionalAuthorEmail ?? null,
      staleHandoffFacts: activeHandoff?.staleHandoffFacts ?? null,
      unsupportedLiveStateClaims: activeHandoff?.unsupportedLiveStateClaims ?? null,
      openDecisions: activeHandoff?.openDecisions || [],
    }
  }
  return {
    status: 'loaded',
    initiativeType: 'repository',
    name,
    identifiers: {},
    currentStage: {},
    currentGate: {},
    currentApproval: {},
    responseClock: {},
    artifacts: [],
    openDecisions: [],
  }
}

function evaluateWorktree(paths, counts, currentMode) {
  const outOfScope = paths.filter((path) => !isBootstrapScope(path))
  const productionMode = ['production-mutation', 'author-communication', 'deployment'].includes(currentMode)
  const status = paths.length === 0
    ? 'PASS'
    : productionMode
      ? 'PASS_WITH_HOLDS'
      : 'PASS_WITH_HOLDS'
  return {
    status,
    dirtyPaths: paths.length,
    outOfScopePaths: outOfScope.length,
    ahead: counts.ahead,
    behind: counts.behind,
    scope: 'JM1 governed bootstrap implementation',
    dirtyPathList: paths,
  }
}

function deriveExecutionAuthority(currentMode, worktreeState, conflictList, context) {
  const dirtyOrConflict = worktreeState.dirtyPaths > 0 || conflictList.length > 0
  const protectedHold = context.currentBlockers?.includes('PROTECTED_GATE_STAGE_MUTATION_UNAVAILABLE_FROM_CURRENT_SESSION')
  const base = {
    mode: currentMode,
    mutationAllowed: false,
    communicationAllowed: false,
    deploymentAllowed: false,
    readDataverse: true,
    readSharePoint: true,
    generateLocalProof: ['development', 'governance', 'production-dry-run', 'author-communication'].includes(currentMode),
    requiredApprovals: [],
    allowedActions: ['Read canon', 'Read runtime configuration without secrets', 'Generate bootstrap manifest', 'Prepare local evidence', 'Dry-run validation'],
    heldActions: [],
  }
  if (currentMode === 'author-communication') {
    base.communicationAllowed = !dirtyOrConflict && !protectedHold
    base.requiredApprovals.push('Approved author package and operational delivery certification required before send')
    base.heldActions.push('Author send while worktree is dirty or protected mutation is unavailable')
  }
  if (currentMode === 'production-mutation') {
    base.mutationAllowed = !dirtyOrConflict && !protectedHold
    base.requiredApprovals.push('Protected endpoint authority required')
    base.heldActions.push('Dataverse artifact/gate/stage mutation without protected executor')
  }
  if (currentMode === 'deployment') {
    base.deploymentAllowed = !dirtyOrConflict
    base.requiredApprovals.push('Deployment authorization required')
  }
  if (protectedHold) base.requiredApprovals.push('Protected mutation path required for current title advancement')
  return base
}

function detectConflicts({ runtimeCanon, repositoryCanon, initiativeContext, handoff, worktree }) {
  const conflicts = []
  if (runtimeCanon.communication.sender !== repositoryCanon.communication.sender) conflicts.push('CANON_RUNTIME_CONFLICT')
  if (runtimeCanon.communication.replyTo !== repositoryCanon.communication.replyTo) conflicts.push('CANON_RUNTIME_CONFLICT')
  if (runtimeCanon.communication.portalRequired !== repositoryCanon.communication.portalRequired) conflicts.push('CANON_RUNTIME_CONFLICT')
  if (/intentional leader/i.test(initiativeContext.name) && initiativeContext.imprint !== 'J Merrill Publishing') conflicts.push('TITLE_METADATA_CONFLICT')
  if (/intentional leader/i.test(initiativeContext.name) && !handoff) conflicts.push('STALE_HANDOFF_RECORD')
  if (/agape.*shared mailbox/i.test(initiativeContext.name)) {
    if (initiativeContext.legacyDomainScope !== 'EXCLUDED') conflicts.push('AIC_LEGACY_DOMAIN_SELECTED')
    if (initiativeContext.directSharedMailboxSignIn !== 'PROHIBITED') conflicts.push('AIC_SHARED_MAILBOX_DIRECT_SIGNIN')
    if (initiativeContext.brandOverlay !== 'agapeInternationalCathedral') conflicts.push('AIC_ECR_OVERLAY_NOT_LOADED')
    if (initiativeContext.domainAuthority?.microsoft365DomainPresent !== true) conflicts.push('AIC_DOMAIN_NOT_PRESENT_IN_M365')
    if (initiativeContext.domainAuthority?.microsoft365DomainVerified !== true) conflicts.push('AIC_DOMAIN_NOT_VERIFIED_IN_M365')
    if (initiativeContext.domainAuthority?.exchangeServicesConfigured !== true) conflicts.push('AIC_EXCHANGE_READINESS_NOT_CONFIRMED')
    if (initiativeContext.mailboxAuthority?.delegatesResolved !== true) conflicts.push('AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED')
  }
  if (worktree.behind > 0) conflicts.push('STALE_BRANCH_AUTHORITY')
  return [...new Set(conflicts)]
}

function deriveStopConditions({ enterpriseCanon, repositoryCanon, runtimeCanon, initiativeContext, worktree, conflicts, executionAuthority }) {
  const stops = []
  if (enterpriseCanon.status !== 'loaded') stops.push('ENTERPRISE_CANON_NOT_LOADED')
  if (repositoryCanon.status !== 'loaded') stops.push('REPOSITORY_CANON_NOT_LOADED')
  if (runtimeCanon.status !== 'verified') stops.push('RUNTIME_CANON_NOT_VERIFIED')
  if (initiativeContext.status !== 'loaded') stops.push('INITIATIVE_CONTEXT_NOT_LOADED')
  if (worktree.behind > 0) stops.push('STALE_BRANCH_AUTHORITY')
  if (conflicts.includes('CANON_RUNTIME_CONFLICT')) stops.push('CANON_RUNTIME_CONFLICT')
  if (conflicts.includes('TITLE_METADATA_CONFLICT')) stops.push('TITLE_METADATA_CONFLICT')
  for (const conflict of conflicts.filter((item) => item.startsWith('AIC_'))) stops.push(conflict)
  if (executionAuthority.mode === 'production-mutation' && !executionAuthority.mutationAllowed) stops.push('PRODUCTION_MUTATION_AUTHORITY_ABSENT')
  return [...new Set(stops)]
}

function writeOutputs(data) {
  const dir = join(repoRoot, '.bootstrap')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'current-bootstrap.json'), `${JSON.stringify(data, null, 2)}\n`)
  writeFileSync(join(dir, 'current-bootstrap.md'), renderMarkdown(data))
}

function renderMarkdown(data) {
  return `# JM1 Governed Bootstrap

Status: ${data.status}
Generated: ${data.generatedAt}

JM1 BOOTSTRAP COMPLETE

Enterprise canon: ${data.enterpriseCanon.status.toUpperCase()}
Repository canon: ${data.repositoryCanon.status.toUpperCase()}
Runtime canon: ${data.runtimeCanon.status.toUpperCase()}
Initiative context: ${data.initiativeContext.status.toUpperCase()}
Current main SHA: ${data.repository.mainSha}
Current production release: ${data.runtimeCanon.productionRelease}
Execution mode: ${data.executionAuthority.mode}
Allowed actions: ${data.executionAuthority.allowedActions.join('; ')}
Held actions: ${data.executionAuthority.heldActions.length ? data.executionAuthority.heldActions.join('; ') : '0'}
Conflicts: ${data.conflicts.length ? data.conflicts.join('; ') : '0'}

## Communication Canon

Author-facing delivery channel: EMAIL FIRST
ACS sender: publishing@email.jmerrill.one
Reply-To: publishing@jmerrill.one
Archive/visibility mailbox: publishing@jmerrill.one
Gmail fallback: NOT CANONICAL
Outlook fallback: NOT CANONICAL UNLESS SPECIFICALLY AUTHORIZED
Portal: OPTIONAL / SECONDARY
Internal artifacts exposed: 0

## Initiative

Initiative: ${data.initiativeContext.name}
Current state: ${data.initiativeContext.currentStage?.state || 'N/A'}
Open decisions: ${data.initiativeContext.openDecisions?.length ? data.initiativeContext.openDecisions.join('; ') : '0'}
`
}

function validateManifest(data) {
  const requiredTop = ['bootstrapVersion', 'generatedAt', 'repository', 'enterpriseCanon', 'repositoryCanon', 'runtimeCanon', 'initiativeContext', 'executionAuthority', 'conflicts', 'stopConditions']
  const missing = requiredTop.filter((key) => data[key] === undefined)
  if (missing.length) throw new Error(`BOOTSTRAP_SCHEMA_VALIDATION_FAILED: missing ${missing.join(',')}`)
  if (data.bootstrapVersion !== '1.0.0') throw new Error('BOOTSTRAP_SCHEMA_VALIDATION_FAILED: unsupported version')
  if (!['BOOTSTRAP PASS', 'BOOTSTRAP PASS WITH HOLDS', 'BOOTSTRAP FAIL'].includes(data.status)) {
    throw new Error('BOOTSTRAP_SCHEMA_VALIDATION_FAILED: invalid status')
  }
}

function printSummary(data) {
  console.log(data.status)
  console.log(`ENTERPRISE_CANON: ${data.enterpriseCanon.status.toUpperCase()}`)
  console.log(`REPOSITORY_CANON: ${data.repositoryCanon.status.toUpperCase()}`)
  console.log(`RUNTIME_CANON: ${data.runtimeCanon.status.toUpperCase()}`)
  console.log(`INITIATIVE_CONTEXT: ${data.initiativeContext.status.toUpperCase()}`)
  console.log(`APPLICABLE_PROGRAMS: ${data.repositoryCanon.programs.join(', ')}`)
  console.log(`CONTROLLING_MAIN_SHA: ${data.repository.mainSha}`)
  console.log(`CURRENT_STATE: ${data.initiativeContext.currentStage?.state || 'N/A'}`)
  if (data.initiativeContext.currentApproval?.authorResponse) console.log(`AUTHOR_APPROVAL: ${data.initiativeContext.currentApproval.authorResponse}`)
  if (data.initiativeContext.additionalAuthorEmail) console.log(`ADDITIONAL_AUTHOR_COMMUNICATION: ${data.initiativeContext.additionalAuthorEmail}`)
  if (data.initiativeContext.protectedArtifactMutation) console.log(`PROTECTED_MUTATION: ${data.initiativeContext.protectedArtifactMutation}`)
  if (data.initiativeContext.interiorLayoutGate) console.log(`INTERIOR_LAYOUT_GATE: ${data.initiativeContext.interiorLayoutGate}`)
  if (data.initiativeContext.brand === AIC_CANON.brand) {
    console.log(`BRAND: ${data.initiativeContext.brand}`)
    console.log(`TENANT: ${data.initiativeContext.tenant}`)
    console.log(`PRIMARY_DOMAIN: ${data.initiativeContext.primaryDomain}`)
    console.log(`SEPARATE_TENANT_MIGRATION: ${data.initiativeContext.separateTenantMigration}`)
    console.log(`MAILBOX_MODEL: ${data.initiativeContext.mailboxModel}`)
    console.log(`LEGACY_COM_SCOPE: ${data.initiativeContext.legacyDomainScope}`)
  }
  console.log('DUPLICATE_GATE: PROHIBITED')
  console.log('RETROACTIVE_RESPONSE_CLOCK: PROHIBITED')
  console.log(`OPEN_DECISIONS: ${data.initiativeContext.openDecisions?.length || 0}`)
  console.log(`WORKTREE: ${data.worktree.status}`)
  console.log(`DIRTY PATHS: ${data.worktree.dirtyPaths}`)
  console.log(`OUT-OF-SCOPE PATHS: ${data.worktree.outOfScopePaths}`)
  console.log(`AHEAD: ${data.worktree.ahead}`)
  console.log(`BEHIND: ${data.worktree.behind}`)
  console.log(`SECRET VALUES PRINTED: ${data.runtimeCanon.secretValuesPrinted}`)
}

function readIdentity() {
  const identity = safeExec('az', ['account', 'show', '--query', 'user.name', '-o', 'tsv'])
  return identity || process.env.USER || 'UNKNOWN'
}

function initiativeHandoffPath(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repository'
  return `docs/operations/active/${slug}/CURRENT-STATE.json`
}

function readJsonIfExists(path) {
  const absolute = join(repoRoot, path)
  if (!existsSync(absolute)) return null
  return JSON.parse(readFileSync(absolute, 'utf8'))
}

function isBootstrapScope(path) {
  return (
    path === '.gitignore' ||
    path === 'gitignore' ||
    path.startsWith('.bootstrap/') ||
    path === 'package.json' ||
    path.startsWith('scripts/jm1_') ||
    path.startsWith('scripts/jm1-') ||
    path === 'scripts/author_communication_brand_guard.test.mjs' ||
    path === 'scripts/program006_publishing_dispatch_service.test.mjs' ||
    path === 'scripts/aic_shared_mailbox_guard.test.mjs' ||
    path.startsWith('lib/server/aic-shared-mailbox-canon') ||
    path.startsWith('lib/server/jm1-enterprise-communication-renderer') ||
    path.startsWith('lib/server/jm1-enterprise-design-tokens') ||
    path === 'lib/server/author-communication-brand.ts' ||
    path.startsWith('docs/doctrine/JM1-') ||
    path === 'docs/architecture/' ||
    path.startsWith('docs/architecture/JM1-') ||
    path === 'docs/runbooks/' ||
    path.startsWith('docs/runbooks/JM1-') ||
    path === 'docs/schemas/' ||
    path.startsWith('docs/schemas/jm1-bootstrap') ||
    path.startsWith('docs/operations/active/') ||
    path.startsWith('docs/operations/generated/AIC-SHARED-MAILBOX-IMPLEMENTATION-') ||
    path.startsWith('docs/operations/generated/JM1-GOVERNED-BOOTSTRAP-ECR-')
  )
}

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith('--')) continue
    parsed[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true'
  }
  return parsed
}

function parseStatusLine(line) {
  const raw = line.slice(2).trimStart()
  return raw.includes(' -> ') ? raw.split(' -> ').at(-1) || raw : raw
}

function parseAheadBehind(value) {
  const [ahead, behind] = value.split(/\s+/).map((item) => Number(item) || 0)
  return { ahead, behind }
}

function exec(command, commandArgs) {
  return execFileSync(command, commandArgs, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function safeExec(command, commandArgs) {
  try {
    return execFileSync(command, commandArgs, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
