export type WaveC1EvidenceStatus = 'SUPPORTED' | 'CONFLICT' | 'INCOMPLETE' | 'NOT_APPLICABLE'

export type WaveC1EvidenceStrength = 'AUTHORITATIVE' | 'STRONG_CORROBORATED' | 'CONTEXTUAL' | 'INSUFFICIENT' | 'CONFLICT'

export type WaveC1Facet = {
  status: WaveC1EvidenceStatus
  strength: WaveC1EvidenceStrength
  value: string
  reason: string
  source: string
}

export type WaveC1ArtifactClass =
  | 'ORIGINAL_AUTHOR_SUBMISSION'
  | 'FINAL_EDITORIAL_MANUSCRIPT'
  | 'PRODUCTION_MASTER'
  | 'FINAL_PRINT_INTERIOR'
  | 'FINAL_PRINT_COVER'
  | 'FINAL_EPUB'
  | 'FINAL_AUDIO_MASTER'
  | 'SUPPORTING_ARTIFACT'
  | 'UNKNOWN_ARTIFACT_CLASS'

export type WaveC1ArtifactAuthorityInput = {
  artifactId?: string
  artifactType?: string
  artifactStatus?: string
  artifactTitleId?: string
  expectedTitleId?: string
  evidenceSource?: string
  storageReference?: string
  checksum?: string
  checksumAlgorithm?: string
  version?: string
  current?: boolean
  byteReadable?: boolean
  derivedFromArtifactId?: string
  duplicateCurrentCount?: number
  checksumMismatch?: boolean
}

export type WaveC1CommercialAuthorityInput = {
  packageState?: string
  commercialEvidenceText?: string
  pricingEvidenceText?: string
  agreementEvidenceText?: string
  agreementDocumentAvailable?: boolean
  contractStatus?: string
  providerStatus?: string
  signedDate?: string
  agreementExecutionLog?: boolean
  paymentEvidenceText?: string
  firstPaymentStatus?: string
  firstPaymentConfirmedOn?: string
  firstPaymentConfirmationSource?: string
  successfulPaymentEvent?: boolean
  requiredInitialPayment?: boolean
  correctCommercialContext?: boolean
  joinedFamilyEvidenceText?: string
  joinedFamilyEvent?: boolean
}

export type WaveC1ControlledWriteAuthority = 'NO' | 'LIMITED_COMMERCIAL_EVENT_WRITE_CANDIDATE'

export type WaveC1WorkspaceAuthorityInput = {
  authorRelationshipState?: string
  joinedFamilyEvent?: boolean
  entitlementEvidenceText?: string
  workspaceProvisioningEvidenceText?: string
  workspaceActiveEvidenceText?: string
  onboardingState?: string
  workspaceUrl?: string
}

export type WaveC1FormatAuthorityInput = {
  format?: string
  identityEvidenceText?: string
  distributionEvidenceText?: string
  externalId?: string
  liveUrl?: string
  liveState?: string
  certificationEvidenceText?: string
}

export function classifyWaveC1ArtifactClass(input: Pick<WaveC1ArtifactAuthorityInput, 'artifactType' | 'artifactStatus' | 'evidenceSource' | 'storageReference'>): WaveC1ArtifactClass {
  const text = normalize(`${input.artifactType || ''} ${input.artifactStatus || ''} ${input.evidenceSource || ''} ${input.storageReference || ''}`)
  if (/ORIGINAL|AUTHOR SUBMISSION|SOURCE MANUSCRIPT|MANUSCRIPT RECEIVED|INTAKE MANUSCRIPT/.test(text)) return 'ORIGINAL_AUTHOR_SUBMISSION'
  if (/FINAL EDITORIAL|APPROVED MANUSCRIPT|FINAL MANUSCRIPT|PROOFREAD COMPLETE|COPYEDIT COMPLETE/.test(text)) return 'FINAL_EDITORIAL_MANUSCRIPT'
  if (/PRODUCTION MASTER|MASTER SOURCE|VELLUM SOURCE|INDESIGN|BOOK PRODUCTION MASTER/.test(text)) return 'PRODUCTION_MASTER'
  if (/PRINT INTERIOR|INTERIOR PDF|PRINT READY INTERIOR|FINAL INTERIOR/.test(text)) return 'FINAL_PRINT_INTERIOR'
  if (/PRINT COVER|COVER PDF|FULL WRAP|FINAL COVER/.test(text)) return 'FINAL_PRINT_COVER'
  if (/EPUB|EBOOK/.test(text)) return 'FINAL_EPUB'
  if (/AUDIO MASTER|AUDIOBOOK MASTER|WAV|MP3/.test(text)) return 'FINAL_AUDIO_MASTER'
  if (text) return 'SUPPORTING_ARTIFACT'
  return 'UNKNOWN_ARTIFACT_CLASS'
}

export function evaluateWaveC1ArtifactAuthority(input: WaveC1ArtifactAuthorityInput) {
  const artifactClass = classifyWaveC1ArtifactClass(input)
  const identity = input.artifactId
    ? supported(input.artifactId, 'AUTHORITATIVE', 'Artifact identity is explicitly present.', 'Artifact registry')
    : incomplete('No artifact identifier is available.', 'Artifact registry')
  const type = artifactClass === 'UNKNOWN_ARTIFACT_CLASS'
    ? incomplete('Artifact class cannot be determined from surfaced source vocabulary.', 'Artifact registry')
    : supported(artifactClass, 'CONTEXTUAL', 'Artifact class is classified from surfaced artifact vocabulary.', 'Artifact registry')
  const titleBinding = input.artifactTitleId && input.expectedTitleId && input.artifactTitleId !== input.expectedTitleId
    ? conflict('Artifact is bound to a different title than the current projection.', 'Artifact registry title binding')
    : input.artifactTitleId || input.expectedTitleId
      ? supported(input.artifactTitleId || input.expectedTitleId || '', 'AUTHORITATIVE', 'Artifact/title binding is surfaced.', 'Artifact registry title binding')
      : incomplete('Artifact/title binding is not surfaced.', 'Artifact registry title binding')
  const provenance = input.evidenceSource || input.storageReference
    ? supported(input.evidenceSource || input.storageReference || '', 'CONTEXTUAL', 'Artifact provenance or storage reference is surfaced.', 'Artifact provenance')
    : incomplete('Artifact provenance is not surfaced.', 'Artifact provenance')
  const checksum = input.checksumMismatch
    ? conflict('Surfaced checksum does not match the accessible file bytes.', 'Artifact checksum')
    : isSha256(input.checksum)
      ? supported(input.checksum || '', 'AUTHORITATIVE', 'SHA-256 checksum is explicitly surfaced.', 'Artifact checksum')
      : incomplete('No governed checksum is surfaced; do not fabricate one from a path or URL.', 'Artifact checksum')
  const checksumComputability = input.byteReadable
    ? supported('READ_ONLY_BYTE_SOURCE_AVAILABLE', 'STRONG_CORROBORATED', 'File bytes are accessible for read-only checksum computation.', 'Artifact storage')
    : incomplete('File bytes are not proven accessible for read-only checksum computation.', 'Artifact storage')
  const currentVersion = input.duplicateCurrentCount && input.duplicateCurrentCount > 1
    ? conflict('Multiple current artifacts are surfaced for the same title/class.', 'Artifact current-version registry')
    : input.current === false
      ? conflict('Artifact is marked non-current or superseded.', 'Artifact current-version registry')
      : input.artifactId
        ? supported(input.version || 'CURRENT_VERSION_CONTEXTUAL', 'CONTEXTUAL', 'Current version is contextual unless an explicit current marker/version is surfaced.', 'Artifact current-version registry')
        : incomplete('Current artifact version cannot be established without identity.', 'Artifact current-version registry')
  const derivedLineage = /FINAL_|PRODUCTION_/.test(artifactClass) && !input.derivedFromArtifactId
    ? incomplete('Derived lifecycle-critical artifact lacks explicit source lineage.', 'Artifact lineage')
    : supported(input.derivedFromArtifactId || 'NOT_APPLICABLE_OR_SOURCE_ARTIFACT', 'CONTEXTUAL', 'Derived lineage boundary evaluated without reverse inference.', 'Artifact lineage')

  return {
    artifactClass,
    identity,
    type,
    titleBinding,
    provenance,
    checksum,
    checksumComputability,
    currentVersion,
    derivedLineage,
    additiveChecksumWrite:
      checksum.status === 'INCOMPLETE' && checksumComputability.status === 'SUPPORTED'
        ? 'SAFE_ADDITIVE_EVIDENCE_WRITE_CANDIDATE'
        : 'NOT_SAFE_TO_BACKFILL',
  }
}

export function evaluateWaveC1CommercialAuthority(input: WaveC1CommercialAuthorityInput) {
  const text = `${input.packageState || ''} ${input.commercialEvidenceText || ''}`
  const packageAccepted = /PACKAGE ACCEPTED|ACCEPTED PACKAGE|AUTHOR SELECTED PACKAGE/i.test(text)
    ? supported('PACKAGE_ACCEPTED', /event|ledger|selection/i.test(text) ? 'STRONG_CORROBORATED' : 'CONTEXTUAL', 'Package acceptance evidence is surfaced.', 'Package/commercial event ledger')
    : incomplete('Package acceptance event is not surfaced.', 'Package/commercial event ledger')
  const pricingLocked = /PRICING LOCKED|LOCKED PRICE|PRICE LOCKED|SELECTED PAYMENT OPTION|PAYMENT OPTION PREPARATION/i.test(`${text} ${input.pricingEvidenceText || ''}`)
    ? supported('PRICING_LOCKED', 'CONTEXTUAL', 'Pricing/payment-option lock evidence is surfaced.', 'Offer Engine / pricing lock ledger')
    : incomplete('Pricing lock evidence is not surfaced.', 'Offer Engine / pricing lock ledger')
  const agreementAuthoritative =
    /ACTIVE|SIGNED/.test(normalize(input.contractStatus || '')) ||
    /SIGNNOW_SIGNED|ADOBE_SIGNED|ADOBE_SIGNED_COMPLETED|ADOBE_COMPLETED|SIGNED|COMPLETED/.test(normalize(input.providerStatus || '')) ||
    Boolean(input.signedDate) ||
    Boolean(input.agreementExecutionLog)
  const agreementExecuted = agreementAuthoritative
    ? supported('AGREEMENT_EXECUTED', 'AUTHORITATIVE', 'Agreement execution is supported by contract status, provider status, signed date, or execution log.', 'Agreement execution ledger')
    : input.agreementDocumentAvailable
      ? incomplete('Agreement document exists, but execution is not proven by a governed contract/provider/execution event.', 'Agreement execution ledger')
      : /AGREEMENT EXECUTED|AGREEMENT SIGNED|SIGNED AGREEMENT|CONTRACT EXECUTED/i.test(input.agreementEvidenceText || input.commercialEvidenceText || '')
        ? supported('AGREEMENT_EXECUTED_CONTEXTUAL', 'CONTEXTUAL', 'Agreement execution wording is surfaced but should be upgraded to contract/provider evidence before writes.', 'Agreement execution text')
        : incomplete('Agreement execution evidence is not surfaced.', 'Agreement execution ledger')
  const paymentAuthoritative =
    /PAID CONFIRMED|PAID_CONFIRMED|835510002/i.test(input.firstPaymentStatus || '') &&
    Boolean(input.firstPaymentConfirmedOn) &&
    Boolean(input.firstPaymentConfirmationSource)
  const paymentFromEvent =
    input.successfulPaymentEvent === true &&
    input.requiredInitialPayment !== false &&
    input.correctCommercialContext !== false
  const initialPayment = paymentAuthoritative || paymentFromEvent
    ? supported('INITIAL_PAYMENT_RECEIVED', 'AUTHORITATIVE', 'Required initial payment is bound to successful payment evidence in the correct commercial context.', 'Stripe/payment event ledger')
    : /FIRST PAYMENT|INITIAL PAYMENT|DEPOSIT|PAID/i.test(input.paymentEvidenceText || input.commercialEvidenceText || '')
      ? supported('INITIAL_PAYMENT_CONTEXTUAL', 'CONTEXTUAL', 'Payment wording is surfaced but is not sufficient for lifecycle writes without bound payment event evidence.', 'Payment evidence text')
      : incomplete('Required initial payment event is not surfaced.', 'Stripe/payment event ledger')
  const joinedEvent = input.joinedFamilyEvent === true || /JOINED THE FAMILY/i.test(`${input.joinedFamilyEvidenceText || ''} ${input.packageState || ''}`)
  const joinedFamily = joinedEvent
    ? agreementExecuted.strength === 'AUTHORITATIVE' && initialPayment.strength === 'AUTHORITATIVE'
      ? supported('JOINED_THE_FAMILY', 'AUTHORITATIVE', 'Joined the Family is supported by agreement execution plus required initial payment.', 'Commercial event chain')
      : conflict('Joined the Family is surfaced without complete authoritative agreement/payment prerequisites.', 'Commercial event chain')
    : incomplete('Joined the Family event is not surfaced.', 'Commercial event chain')

  const controlledWriteAuthorityEligible: WaveC1ControlledWriteAuthority =
    agreementExecuted.strength === 'AUTHORITATIVE' && initialPayment.strength === 'AUTHORITATIVE' && joinedFamily.status === 'SUPPORTED'
      ? 'LIMITED_COMMERCIAL_EVENT_WRITE_CANDIDATE'
      : 'NO'

  return {
    packageAccepted,
    pricingLocked,
    agreementExecuted,
    initialPayment,
    joinedFamily,
    controlledWriteAuthorityEligible,
  }
}

export function evaluateWaveC1WorkspaceAuthority(input: WaveC1WorkspaceAuthorityInput) {
  const relationship = /ACTIVE AUTHOR|JOINED/.test(normalize(input.authorRelationshipState || '')) || input.joinedFamilyEvent
    ? supported(input.authorRelationshipState || 'ACTIVE_AUTHOR_CONTEXTUAL', 'CONTEXTUAL', 'Author relationship signal is surfaced separately from workspace.', 'Author relationship registry')
    : incomplete('Author relationship evidence is not surfaced.', 'Author relationship registry')
  const entitlement = /ENTITLED|WORKSPACE_ENTITLED|GRANT/.test(normalize(input.entitlementEvidenceText || ''))
    ? supported('WORKSPACE_ENTITLED', 'AUTHORITATIVE', 'Workspace entitlement evidence is explicitly surfaced.', 'Workspace entitlement registry')
    : incomplete('Workspace entitlement is not established by author/title/workspace URL alone.', 'Workspace entitlement registry')
  const activeWorkspace = /ACTIVE|WORKSPACE_ACTIVE|PROVISIONED/.test(normalize(input.workspaceActiveEvidenceText || input.workspaceProvisioningEvidenceText || ''))
    ? supported('WORKSPACE_ACTIVE', 'AUTHORITATIVE', 'Workspace active/provisioning evidence is explicitly surfaced.', 'Workspace provisioning registry')
    : incomplete('Workspace active state is not established by entitlement or URL alone.', 'Workspace provisioning registry')
  const onboarding = input.onboardingState
    ? supported(input.onboardingState, 'CONTEXTUAL', 'Onboarding state is surfaced separately from workspace active state.', 'Onboarding registry')
    : incomplete('Onboarding state is not surfaced.', 'Onboarding registry')
  return { relationship, entitlement, activeWorkspace, onboarding }
}

export function evaluateWaveC1FormatAuthority(input: WaveC1FormatAuthorityInput) {
  const identity = input.format || input.identityEvidenceText
    ? supported(input.format || input.identityEvidenceText || '', 'AUTHORITATIVE', 'Format identity is surfaced.', 'Format registry')
    : incomplete('Format identity is not surfaced.', 'Format registry')
  const distribution = /SUBMITTED|LIVE|RELEASED|CATALOG|DISTRIBUTION|PUBLISHED/.test(normalize(`${input.distributionEvidenceText || ''} ${input.liveState || ''}`))
    ? supported(input.liveState || 'DISTRIBUTION_STATE_SURFACED', 'CONTEXTUAL', 'Distribution/live state is surfaced separately from certification.', 'Distribution platform registry')
    : incomplete('Distribution/live state is not surfaced.', 'Distribution platform registry')
  const externalReference = input.externalId || input.liveUrl
    ? supported(input.externalId || input.liveUrl || '', 'CONTEXTUAL', 'External identifier or URL is surfaced.', 'Distributor external reference registry')
    : incomplete('External distributor reference is not surfaced.', 'Distributor external reference registry')
  const certification = /CERTIFIED|CERTIFICATION_EVENT|FINAL_DISTRIBUTION_CERTIFIED/.test(normalize(input.certificationEvidenceText || ''))
    ? supported('FORMAT_CERTIFIED', 'AUTHORITATIVE', 'Explicit certification event is surfaced.', 'Format certification ledger')
    : incomplete('Live state, URL, identifier, or publication status is not certification.', 'Format certification ledger')
  return { identity, distribution, externalReference, certification }
}

export function waveC1RoyaltyReadiness() {
  return {
    status: 'INCOMPLETE' as const,
    strength: 'INSUFFICIENT' as const,
    value: 'DATA_GAP',
    reason: 'Royalty payout readiness remains structural Block 09 and is not implemented in Wave C.1.',
    source: 'Royalty payout registry',
  }
}

function supported(value: string, strength: Exclude<WaveC1EvidenceStrength, 'INSUFFICIENT' | 'CONFLICT'>, reason: string, source: string): WaveC1Facet {
  return { status: 'SUPPORTED', strength, value: value || 'SUPPORTED', reason, source }
}

function conflict(reason: string, source: string): WaveC1Facet {
  return { status: 'CONFLICT', strength: 'CONFLICT', value: 'CONFLICT', reason, source }
}

function incomplete(reason: string, source: string): WaveC1Facet {
  return { status: 'INCOMPLETE', strength: 'INSUFFICIENT', value: 'DATA_GAP', reason, source }
}

function isSha256(value?: string) {
  return /^[a-f0-9]{64}$/i.test(String(value || '').trim())
}

function normalize(value: string) {
  return value.trim().replace(/[-–—_]/g, ' ').replace(/\s+/g, ' ').toUpperCase()
}
