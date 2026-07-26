import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)

const {
  PRODUCTION_TAXONOMY,
  TIMING_GOVERNANCE,
  PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS,
  PRODUCT_FORM_CODES,
  ILL_PROGRAM_DEFINITION,
  buildProductionPipelineV2Doctrine,
  buildStandardEbookEdition,
  resolveAudiobookCommercials,
  resolveLargePrintCommercials,
  evaluateComplexAccessibilityEdition,
  validateProvisionalProductFormExposure,
  validateInteractiveScopeCap,
  createParallelProductionWork,
  validateProductionAssembly,
  canEnterDistributionReadiness,
  validateEpubWorkflow,
  buildProductionReviewPackageManifest,
  validateMockDistribution,
  buildPublisherValidationChecklist,
  auditIllustrationPricingAuthority,
  validateIllustrationCommercialBoundary,
  validateIllustrationScope,
  validateIllustrationRights,
  requiresIllustrationStyleGuide,
  mapIllustrationAssetToEditions,
  validateProductionAssemblyIllustrations,
  buildEditionReadiness,
} = require('../azure-functions/diagnostic-ai-runner/src/production/productionPipelineV2Doctrine.js')

const {
  buildArchitectureRegistry,
  buildProgramNormalizationFindings,
  validateArchitectureRegistry,
} = require('../azure-functions/diagnostic-ai-runner/src/architecture/architectureRegistry.js')

function runGuard() {
  const doctrine = buildProductionPipelineV2Doctrine()

  assert.equal(doctrine.version, 'JM1_PRODUCTION_PIPELINE_V2_0')
  assert.equal(PRODUCTION_TAXONOMY.length, 16)
  assert.deepEqual(PRODUCT_FORM_CODES, ['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07', 'PF-08'])
  assert.deepEqual(Object.keys(TIMING_GOVERNANCE).sort(), [...PRODUCTION_TAXONOMY].sort())
  assert.equal(doctrine.titleEditionPlan.productFormIdentity, 'PRODUCT_FORM_CODE')

  const parallel = createParallelProductionWork({
    titleId: 'guard-title',
    stageId: 'guard-proofreading-stage',
    approvedSourceArtifactId: 'guard-approved-proofread-manuscript',
    sourceChecksum: 'guard-source-checksum',
    correlationId: 'guard-correlation',
  })
  assert.equal(parallel.ok, true)
  assert.deepEqual(parallel.workItems.map((item) => item.workstream).sort(), ['COVER_DESIGN', 'INTERIOR_LAYOUT'])
  assert.equal(parallel.workItems.every((item) => item.owner === 'JM1 Automation'), true)
  assert.equal(parallel.workItems.every((item) => item.dependsOn.length === 0), true)

  const missingEpubArtifacts = PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS.filter((artifact) => artifact !== 'EPUB')
  const assemblyBlocked = validateProductionAssembly(missingEpubArtifacts)
  assert.equal(assemblyBlocked.ok, false)
  assert.equal(assemblyBlocked.event, 'PRODUCTION_ASSEMBLY_BLOCKED')
  assert.equal(assemblyBlocked.missing[0].missingArtifact, 'EPUB')
  assert.equal(Boolean(assemblyBlocked.missing[0].owner), true)
  assert.equal(Boolean(assemblyBlocked.missing[0].blockingReason), true)
  assert.equal(Boolean(assemblyBlocked.missing[0].nextAutomaticAction), true)

  const epubFailed = canEnterDistributionReadiness(['ACCESSIBILITY_QA', 'METADATA_VALIDATION'])
  assert.equal(epubFailed.ok, false)
  assert.deepEqual(epubFailed.blockers, ['EPUB_GENERATION_REQUIRED'])

  const epubPassed = validateEpubWorkflow({
    epubArtifact: {
      structureValid: true,
      navigationValid: true,
      tableOfContentsValid: true,
      metadataValid: true,
    },
    accessibilityEvidence: { taggingValid: true },
    metadataEvidence: { complete: true },
  })
  assert.equal(epubPassed.ok, true)

  const reviewPackage = buildProductionReviewPackageManifest([
    { role: 'INTERIOR_PROOF_PDF', artifactId: 'interior-proof' },
    { role: 'COVER_PROOF', artifactId: 'cover-proof' },
    { role: 'PRODUCTION_NOTES', artifactId: 'production-notes' },
    { role: 'REVIEW_INSTRUCTIONS', artifactId: 'review-instructions' },
    { role: 'PUBLISHER_COMMUNICATION', artifactId: 'publisher-communication' },
  ])
  assert.equal(reviewPackage.ok, true)
  assert.equal(reviewPackage.separateInteriorReviewAllowed, false)
  assert.equal(reviewPackage.separateCoverReviewAllowed, false)

  const mockDistribution = validateMockDistribution({
    printPackage: true,
    epub: true,
    accessibility: true,
    isbn: true,
    pricing: true,
    territories: true,
    bisac: true,
    keywords: true,
    metadata: true,
    cover: true,
    spine: true,
    trim: true,
    distributorPayloads: true,
    attemptedActions: [],
  })
  assert.equal(mockDistribution.ok, true)

  const unsafeMockDistribution = validateMockDistribution({
    attemptedActions: ['PUBLISH', 'CREATE_FINANCIAL_POSTING'],
  })
  assert.equal(unsafeMockDistribution.ok, false)
  assert.deepEqual(unsafeMockDistribution.forbiddenActionsDetected, ['PUBLISH', 'CREATE_FINANCIAL_POSTING'])

  const publisherValidation = buildPublisherValidationChecklist({
    interiorApproved: true,
    coverApproved: true,
    epubApproved: true,
    accessibilityApproved: true,
    metadataComplete: true,
    pricingApproved: true,
    bisacApproved: true,
    keywordsApproved: true,
    mockDistributionPassed: true,
    productionPackageFrozen: true,
    publicationDateApproved: true,
  })
  assert.equal(publisherValidation.ok, true)
  assert.equal(publisherValidation.availableDecision, 'LIVE_DISTRIBUTION_APPROVED')

  const ebook = buildStandardEbookEdition({
    titleId: 'guard-title',
    editionPlanId: 'guard-plan',
    isbn: '978-1-961475-00-0',
    retailerProducts: [{ distributor: 'Amazon', retailerProductIdType: 'ASIN', retailerProductId: 'B000000' }],
  })
  assert.equal(ebook.ok, true)
  assert.equal(ebook.editionCount, 1)
  assert.equal(ebook.retailerEditionRecordsCreated, 0)
  assert.equal(ebook.accessibilityConsumesPackageSlot, false)

  const audiobook = resolveAudiobookCommercials({ narrationMethod: 'HUMAN_SINGLE_VOICE', packageName: 'Premier' })
  assert.equal(audiobook.consumesPackageSlot, false)
  assert.equal(audiobook.premierSwap.creditOrDiscountApplies, false)

  const largePrint = resolveLargePrintCommercials({ complexity: 'COMPLEX' })
  assert.equal(largePrint.productFormCount, 1)
  assert.equal(largePrint.price, 250)

  const pf06 = evaluateComplexAccessibilityEdition({ triggerConditions: ['COMPLEX_TABLES'] })
  assert.equal(pf06.required, true)
  assert.equal(pf06.pf03RemainsAccessibleByDefault, true)

  const pf07 = validateProvisionalProductFormExposure('PF-07', {})
  assert.equal(pf07.ok, true)

  const pf08 = validateInteractiveScopeCap({ scopeCapApproved: false })
  assert.equal(pf08.ok, false)
  assert.equal(pf08.blocker, 'CUSTOM_SOW_REQUIRED')

  const readiness = buildEditionReadiness({
    'PF-03': {
      productionStatus: 'COMPLETE',
      qaStatus: 'PASSED',
      readiness: 'READY',
      distributionEligibility: 'ELIGIBLE',
    },
  })
  assert.equal(readiness.length, PRODUCT_FORM_CODES.length)
  assert.equal(readiness.find((edition) => edition.productFormCode === 'PF-03').distributionEligibility, 'ELIGIBLE')
  assert.equal(readiness.every((edition) => edition.blocksOtherEditions === false), true)

  assert.equal(ILL_PROGRAM_DEFINITION.programFamilyCode, 'ILL')
  assert.equal(ILL_PROGRAM_DEFINITION.createsTitleEdition, false)
  assert.equal(ILL_PROGRAM_DEFINITION.isbnBearing, false)
  assert.equal(ILL_PROGRAM_DEFINITION.pricingStatus, 'NOT_APPROVED')
  assert.equal(ILL_PROGRAM_DEFINITION.runtimeCommissioningStatus, 'NOT_COMMISSIONED_FOR_LIVE_CLIENT')
  assert.equal(ILL_PROGRAM_DEFINITION.commercialAvailability, 'NOT_ACTIVE')
  assert.equal(PRODUCT_FORM_CODES.includes('ILL'), false)

  const pricingAudit = auditIllustrationPricingAuthority()
  assert.equal(pricingAudit.length, 5)
  assert.equal(pricingAudit.find((record) => record.record === 'JMP-ILL-AI-STD').configuredAmount, 'PENDING_JACKIE_UNIT_PRICE')
  assert.equal(pricingAudit.every((record) => record.publicExposure === 'PROHIBITED'), true)
  assert.equal(validateIllustrationCommercialBoundary().ok, true)

  const illustrationScope = validateIllustrationScope({
    illustrationCount: 5,
    illustrationTypes: ['SPOT'],
    standardOrCustomComplexity: 'STANDARD',
    productionMethod: 'AI',
    revisionRounds: 1,
    editionUsage: ['PF-01', 'PF-03'],
    deliverySpecifications: 'print and ebook',
    pricingMethod: 'JMP-ILL-AI-STD',
    rightsTreatment: 'JM1_LICENSED',
    creditTreatment: 'CREDIT_REQUIRED',
    targetCompletion: '2026-08-01',
  })
  assert.equal(illustrationScope.ok, false)
  assert.equal(illustrationScope.missing.includes('pricingAuthority'), true)

  const blockedRights = validateIllustrationRights({
    productionMethod: 'AI',
    aiDisclosure: false,
    toolModelRecord: '',
    licenseOrOwnershipTreatment: 'JM1_LICENSED',
    editionAndMarketingUsage: 'PF-01',
  })
  assert.equal(blockedRights.blocksInteriorLayout, true)

  const styleGuide = requiresIllustrationStyleGuide({ illustrationCount: 5 })
  assert.equal(styleGuide.required, true)

  const mappings = mapIllustrationAssetToEditions({
    illustrationAssetId: 'ill-1',
    editionMappings: [{ productFormCode: 'PF-01' }, { productFormCode: 'PF-02' }],
  }, [{ productFormCode: 'PF-01', selectionStatus: 'SELECTED_INCLUDED_SLOT' }])
  assert.equal(mappings.mappings.length, 1)

  const illustrationAssembly = validateProductionAssemblyIllustrations(
    [{ productFormCode: 'PF-01', selectionStatus: 'SELECTED_INCLUDED_SLOT' }],
    [{ illustrationAssetId: 'ill-1', productionMethod: 'AI', qaStatus: 'PENDING' }],
  )
  assert.equal(illustrationAssembly.ok, false)

  const architectureRegistry = buildArchitectureRegistry()
  const registryValidation = validateArchitectureRegistry(architectureRegistry)
  assert.equal(registryValidation.ok, true)
  assert.equal(registryValidation.gapCount, 10)
  assert.deepEqual(registryValidation.noBuildViolations, [])
  assert.equal(architectureRegistry.foundationalEntries[0].implementationAuthorization, 'REGISTRY_ONLY')
  const illRegistry = architectureRegistry.programs.find((program) => program.capabilityCode === 'ILL')
  assert.equal(illRegistry.governanceStatus, 'CANON_CANDIDATE')
  assert.equal(illRegistry.implementationAuthorization, 'CONTROLLED_ARCHITECTURE_ONLY')
  assert.equal(illRegistry.pricingStatus, 'NOT_APPROVED')
  assert.deepEqual(buildProgramNormalizationFindings().map((finding) => finding.programFamilyCode), ['GFX', 'INT', 'SER'])

  console.log('workflow-engine-guard: JM1 Production Pipeline v2.0 PF/ILL and Architecture Registry invariants passed')
}

runGuard()
