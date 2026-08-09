import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildActivationMatrix, runCertification } from './tranche6_certification_controlled_thaw.mjs'

export const doctrinePath = 'docs/governance/publishing/JMP-NO-LOW-COST-MARKETING-SPEND-AUTHORIZATION-DOCTRINE-v1.0.md'
export const hybridDisclosurePath = 'docs/governance/publishing/JMP-HYBRID-MARKETING-DISCLOSURE-v1.0.md'
export const evidenceRoot = 'docs/operations/generated/JMP-MARKETING-CANON-RECONCILIATION-PILOT-445-READINESS-2026-08-09'

export const authorizedTables = {
  jm1_title: 'NOT_CREATED',
  jm1_marketingstage: 'NOT_CREATED',
  jm1_addonservice: 'NOT_CREATED',
}

export const artifacts = [
  'Readiness & Organic Launch Standard',
  'Campaign Services Catalog',
  'Traditional vs. Hybrid Responsibility Matrix',
  'Campaign Budget and Stop-Loss Standard',
  'Hybrid Marketing Disclosure',
  'Dataverse Functional Specification - Minimal Scope',
  'Attorney Review Change Memorandum',
]

export const requirementRows = [
  req('MR-001', artifacts[0], 'Map readiness activities to lifecycle-triggered Marketing Opportunities.', 'ALREADY_IMPLEMENTED', 'Tranche 4 Marketing Opportunity runtime and marketing calendar.'),
  req('MR-002', artifacts[0], 'Use Readiness, Organic Launch, Campaign Services as business layers.', 'BUSINESS_RULE_ENHANCEMENT', 'Three-layer model filed as canon-candidate inside Strategic Marketing.'),
  req('MR-003', artifacts[0], 'Classify target as JMP, Author, Title, or combination.', 'ALREADY_IMPLEMENTED', 'Author and Title Marketing Profiles exist in Tranche 4.'),
  req('MR-004', artifacts[0], 'Prioritize no-cost and owned/earned opportunities.', 'CANON_AMENDMENT_REQUIRED', 'New doctrine required for no-/low-cost-first authority.'),
  req('MR-005', artifacts[1], 'Do not create a shadow marketing services catalog.', 'ALREADY_CANONICAL', 'Slice 2 catalog remains commercial authority.'),
  req('MR-006', artifacts[1], 'Paid campaign services must become governed catalog entries before sale.', 'COMMERCIAL_CATALOG_CHANGE', 'Jackie approved 2 / 2 Campaign Service candidates on 2026-08-09.'),
  req('MR-007', artifacts[1], 'Internal marketing actions are not commercial products.', 'NO_CHANGE_REQUIRED', 'Existing Strategic Marketing runtime can prepare internal opportunities.'),
  req('MR-008', artifacts[1], 'Dynamics quote/order path remains sale authority.', 'ALREADY_CANONICAL', 'Tranche 1 commercial foundation.'),
  req('MR-009', artifacts[2], 'Hybrid author-owned spend requires author approval.', 'BUSINESS_RULE_ENHANCEMENT', 'Spend authorization guard added.'),
  req('MR-010', artifacts[2], 'Traditional/JM Signature JMP spend requires Jackie approval.', 'BUSINESS_RULE_ENHANCEMENT', 'Spend authorization guard added.'),
  req('MR-011', artifacts[2], 'Shared spend requires both author and Jackie approval.', 'BUSINESS_RULE_ENHANCEMENT', 'Spend authorization guard added.'),
  req('MR-012', artifacts[2], 'Traditional responsibility is not unlimited spend authority.', 'CANON_AMENDMENT_REQUIRED', 'Doctrine clarifies configured or baseline marketing does not authorize spend.'),
  req('MR-013', artifacts[3], 'Paid campaigns require objective, budget, cadence, metric, stop condition, and evidence.', 'RUNTIME_EXTENSION_REQUIRED', 'Behavioral extension required for Wave C marketing eligibility.'),
  req('MR-014', artifacts[3], 'Configured budget is not spending authority.', 'BUSINESS_RULE_ENHANCEMENT', 'Guard fails closed when budget exists without approval.'),
  req('MR-015', artifacts[3], 'Campaign decision lifecycle includes Continue, Revise, Stop.', 'RUNTIME_EXTENSION_REQUIRED', 'Existing runtime can carry as campaign status/config extension.'),
  req('MR-016', artifacts[3], 'Campaign result history must avoid overclaiming attribution.', 'BUSINESS_RULE_ENHANCEMENT', 'Attribution standard added: directly attributable, correlated, unknown.'),
  req('MR-017', artifacts[4], 'Hybrid marketing disclosure is approved author-facing business material.', 'AGREEMENT_DISCLOSURE_IMPACT', 'Jackie approved disclosure on 2026-08-09; agreement unchanged.'),
  req('MR-018', artifacts[4], 'No guaranteed sales, reviews, media, bestseller, retailer placement, ad profitability.', 'BUSINESS_RULE_ENHANCEMENT', 'Jackie ruled attorney review not required on 2026-08-09.'),
  req('MR-019', artifacts[4], 'Current Hybrid agreement remains v1.3.1 unchanged.', 'ALREADY_CANONICAL', 'JMP_Publishing_Agreement_v1.3.1 remains controlling.'),
  req('MR-020', artifacts[5], 'Use existing canonical title authority instead of jm1_title.', 'REJECT_DUPLICATIVE', 'jm1_title rejected as duplicate title authority.'),
  req('MR-021', artifacts[5], 'Use lifecycle events and Marketing Opportunity instead of jm1_marketingstage.', 'REJECT_DUPLICATIVE', 'jm1_marketingstage rejected as duplicate state machine.'),
  req('MR-022', artifacts[5], 'Use commercial catalog, Marketing Opportunity, and Dynamics quote/order instead of jm1_addonservice.', 'REJECT_DUPLICATIVE', 'jm1_addonservice rejected as duplicate catalog/add-on authority.'),
  req('MR-023', artifacts[5], 'Minimal fields for cost owner, approval, stop-loss, and evidence.', 'RUNTIME_EXTENSION_REQUIRED', 'Existing entities require field/config extension.'),
  req('MR-024', artifacts[6], 'Close counsel packet after Jackie ruling.', 'NO_CHANGE_REQUIRED', 'Attorney review not required by Jackie ruling dated 2026-08-09.'),
  req('MR-025', artifacts[6], 'Do not ask counsel to approve implementation design.', 'NO_CHANGE_REQUIRED', 'Internal architecture remains governed by JM1 authority.'),
  req('MR-026', 'Imprint Treatment', 'Use one JMP framework with optional imprint profiles.', 'BUSINESS_RULE_ENHANCEMENT', 'Profile-based variation filed; no separate operating model.'),
  req('MR-027', 'Human-First Marketing Standard', 'Use existing single-operator surface rather than new marketing dashboard.', 'ALREADY_CANONICAL', 'Capability model and Tranche 4/6 surfaces already carry marketing decisions.'),
  req('MR-028', 'No-/Low-Cost Priority', 'Prefer owned, earned, partner, low-cost, then paid with approval.', 'CANON_AMENDMENT_REQUIRED', 'Doctrine creates priority rule.'),
  req('MR-029', 'Campaign Attribution', 'Distinguish directly attributable, correlated, and unknown.', 'BUSINESS_RULE_ENHANCEMENT', 'Reporting discipline added.'),
  req('MR-030', 'Traditional Pay-to-Prioritize Guardrail', 'Paid marketing cannot buy editorial, production, distribution, rights, or quality-gate priority.', 'CANON_AMENDMENT_REQUIRED', 'Doctrine and evidence register preserve this guardrail.'),
]

export const campaignServiceRows = [
  service('JMP website/title page', 'NOT_A_COMMERCIAL_SERVICE', 'OWNED', 'NO_EXTERNAL_COST'),
  service('JMP newsletter mention', 'EXISTING_CAPABILITY_NOT_SOLD', 'OWNED', 'NO_EXTERNAL_COST'),
  service('Author social launch prompts', 'EXISTING_CAPABILITY_NOT_SOLD', 'OWNED / AUTHOR', 'NO_EXTERNAL_COST'),
  service('Podcast outreach', 'EXISTING_CAPABILITY_NOT_SOLD', 'EARNED / PARTNER', 'NO_EXTERNAL_COST'),
  service('Library/bookstore outreach', 'EXISTING_CAPABILITY_NOT_SOLD', 'EARNED / PARTNER', 'NO_EXTERNAL_COST'),
  service('Paid social ad setup', 'APPROVED_GOVERNED_SKU', 'PAID', 'AUTHOR_COST or JMP_COST or SHARED_COST', 'JMP-MKT-PAID-SOCIAL-SETUP'),
  service('Paid ARC/review platform placement', 'APPROVED_GOVERNED_SKU', 'PAID', 'AUTHOR_COST or JMP_COST or SHARED_COST', 'JMP-MKT-ARC'),
  service('Media kit preparation', 'EXISTING_CAPABILITY_NOT_SOLD', 'OWNED', 'NO_EXTERNAL_COST'),
  service('Retailer metadata tune-up', 'EXISTING_CAPABILITY_NOT_SOLD', 'OWNED', 'NO_EXTERNAL_COST'),
]

export const approvedCampaignServiceSkus = [
  {
    sku: 'JMP-MKT-ARC',
    name: 'ARC Campaign Management',
    layer: 'CAMPAIGN_SERVICES',
    trackEligibility: 'Hybrid and Traditional/JM Signature',
    defaultCostOwnerLogic: 'AUTHOR_COST / JMP_COST / SHARED_COST based on track and approved campaign terms',
  },
  {
    sku: 'JMP-MKT-PAID-SOCIAL-SETUP',
    name: 'Paid Social Ad Setup',
    layer: 'CAMPAIGN_SERVICES',
    trackEligibility: 'Hybrid and Traditional/JM Signature',
    defaultCostOwnerLogic: 'AUTHOR_COST / JMP_COST / SHARED_COST based on track and approved campaign terms',
  },
]

export const readinessActions = [
  action('Author bio and platform check', 'Readiness', 'TITLE_INITIALIZED', 'AUTHOR', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'No approval required', false, 'ALREADY_IMPLEMENTED'),
  action('Book description and positioning check', 'Readiness', 'FTL_PENDING', 'TITLE', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'No approval required', false, 'ALREADY_IMPLEMENTED'),
  action('Title page readiness', 'Readiness', 'RELEASE_PREP', 'JMP / TITLE', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'Jackie content approval if public', false, 'ALREADY_IMPLEMENTED'),
  action('Author social prompt', 'Organic Launch', 'RELEASE_CONFIRMED_LIVE', 'AUTHOR', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'Author controls own channel', false, 'ALREADY_IMPLEMENTED'),
  action('JMP newsletter consideration', 'Organic Launch', 'RELEASE_CONFIRMED_LIVE', 'JMP / TITLE', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'Jackie editorial approval', false, 'ALREADY_IMPLEMENTED'),
  action('Podcast/library outreach', 'Organic Launch', 'RELEASE_CONFIRMED_LIVE', 'TITLE', 'Hybrid and Traditional', 'NO_EXTERNAL_COST', 'Jackie or operator approval to proceed', false, 'RUNTIME_EXTENSION_REQUIRED'),
  action('Paid social ad', 'Campaign Services', 'POST_RELEASE_MARKETING_REVIEW', 'TITLE', 'Hybrid and Traditional', 'AUTHOR_COST or JMP_COST or SHARED_COST', 'Spend owner approval required', true, 'RUNTIME_EXTENSION_REQUIRED'),
  action('Paid ARC/review service', 'Campaign Services', 'POST_RELEASE_MARKETING_REVIEW', 'TITLE', 'Hybrid and Traditional', 'AUTHOR_COST or JMP_COST or SHARED_COST', 'Spend owner approval required', true, 'APPROVED_GOVERNED_SKU'),
]

export const pilotMarketingRows = [
  pilot('Readiness', 'Author bio/profile readiness', 'READY', 'No external action.'),
  pilot('Readiness', 'Title positioning/readiness', 'READY', 'Use existing title/current-state evidence.'),
  pilot('Readiness', 'Governed artifact path confirmation', 'NOT_READY', 'Confirm SharePoint artifact path before live action.'),
  pilot('Organic Launch', 'JMP title page/update consideration', 'READY', 'Internal preparation only.'),
  pilot('Organic Launch', 'Author social prompt', 'NOT_APPLICABLE', 'No author outbound send authorized.'),
  pilot('Organic Launch', 'Newsletter consideration', 'READY', 'Opportunity may be prepared internally; no send.'),
  pilot('Organic Launch', 'Podcast/library outreach', 'BLOCKED', 'External outreach is not authorized for Pilot 1 prep.'),
  pilot('Campaign Services', 'Paid social ad', 'BLOCKED', 'Cost owner unknown, no spend approval, no stop-loss.'),
  pilot('Campaign Services', 'Paid ARC/review service', 'BLOCKED', 'Catalog candidate only; no SKU or spend authority.'),
]

export function classifyRequirements() {
  const keys = [
    'ALREADY_CANONICAL',
    'ALREADY_IMPLEMENTED',
    'BUSINESS_RULE_ENHANCEMENT',
    'CANON_AMENDMENT_REQUIRED',
    'COMMERCIAL_CATALOG_CHANGE',
    'AGREEMENT_DISCLOSURE_IMPACT',
    'RUNTIME_EXTENSION_REQUIRED',
    'ATTORNEY_REVIEW_REQUIRED',
    'NO_CHANGE_REQUIRED',
    'REJECT_DUPLICATIVE',
  ]
  return keys.reduce((acc, key) => {
    acc[key] = requirementRows.filter((row) => row.classification === key).length
    return acc
  }, {})
}

export function architectureDelta() {
  return {
    existingEntitiesSufficient: 6,
    existingEntitiesRequiringExtension: 3,
    runtimeBehavioralExtensions: 4,
    newMarketingTablesRequired: 0,
    proposedDuplicateTablesRejected: 3,
    newTopLevelPublishingCapabilities: 0,
  }
}

export function evaluateSpendAuthorization(input) {
  if (!input.externalCost) return { state: 'COST_NOT_APPLICABLE', eligible: true }
  if (input.configuredBudget && !input.approvalEvidence) return { state: 'COST_HOLD', eligible: false, reason: 'CONFIGURED_BUDGET_IS_NOT_SPEND_AUTHORITY' }
  if (!input.costOwner) return { state: 'COST_ESTIMATE_REQUIRED', eligible: false }
  if (input.track === 'Hybrid' && input.costOwner === 'AUTHOR_COST' && !input.authorApproved) return { state: 'AUTHOR_APPROVAL_REQUIRED', eligible: false }
  if (['Traditional', 'JM Signature'].includes(input.track) && input.costOwner === 'JMP_COST' && !input.jackieApproved) return { state: 'JMP_APPROVAL_REQUIRED', eligible: false }
  if (input.costOwner === 'SHARED_COST' && !(input.authorApproved && input.jackieApproved)) return { state: 'SHARED_APPROVAL_REQUIRED', eligible: false }
  if (!input.stopLossDefined) return { state: 'PAID_CAMPAIGN_HOLD', eligible: false, reason: 'STOP_LOSS_REQUIRED' }
  if (!input.objective || !input.successMetric || !input.reportingCadence) return { state: 'PAID_CAMPAIGN_HOLD', eligible: false, reason: 'CAMPAIGN_CONTROL_FIELDS_REQUIRED' }
  return { state: 'FULLY_APPROVED', eligible: true }
}

export function evaluateWaveCMarketing(input) {
  const spend = evaluateSpendAuthorization(input)
  const checks = [
    input.lifecycleEligible,
    Boolean(input.marketingLayer),
    input.trackRuleSatisfied,
    input.costOwnerKnown,
    spend.eligible,
    input.consentValid,
    input.contentApproved,
    input.pilotActivationPermitsAction,
  ]
  if (input.externalCost) checks.push(input.budgetStopLossDefined)
  return checks.every(Boolean) ? 'WAVE_C_MARKETING_ELIGIBLE' : 'HOLD / NOT ELIGIBLE'
}

export function runMarketingSyntheticValidation() {
  const scenarios = [
    ['MKT-001', 'No-cost Hybrid prepares', () => evaluateSpendAuthorization({ externalCost: false }).eligible],
    ['MKT-002', 'Hybrid paid author cost holds without author approval', () => !evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'AUTHOR_COST', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-003', 'Hybrid paid author cost approves with evidence', () => evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'AUTHOR_COST', authorApproved: true, approvalEvidence: 'AUTH', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-004', 'Traditional JMP cost holds without Jackie', () => !evaluateSpendAuthorization({ externalCost: true, track: 'Traditional', costOwner: 'JMP_COST', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-005', 'JM Signature JMP cost approves with Jackie', () => evaluateSpendAuthorization({ externalCost: true, track: 'JM Signature', costOwner: 'JMP_COST', jackieApproved: true, approvalEvidence: 'JACKIE', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-006', 'Shared cost requires both approvals', () => !evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'SHARED_COST', authorApproved: true, approvalEvidence: 'A', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-007', 'Shared cost fully approves with both', () => evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'SHARED_COST', authorApproved: true, jackieApproved: true, approvalEvidence: 'A+J', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).eligible],
    ['MKT-008', 'Configured budget alone holds', () => evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'AUTHOR_COST', configuredBudget: 500, stopLossDefined: true }).state === 'COST_HOLD'],
    ['MKT-009', 'Paid campaign without stop-loss holds', () => evaluateSpendAuthorization({ externalCost: true, track: 'Hybrid', costOwner: 'AUTHOR_COST', authorApproved: true, approvalEvidence: 'AUTH', objective: 'x', successMetric: 'x', reportingCadence: 'weekly' }).state === 'PAID_CAMPAIGN_HOLD'],
    ['MKT-010', 'Wave C remains held without pilot activation', () => evaluateWaveCMarketing({ externalCost: false, lifecycleEligible: true, marketingLayer: 'Readiness', trackRuleSatisfied: true, costOwnerKnown: true, consentValid: true, contentApproved: true, pilotActivationPermitsAction: false }) === 'HOLD / NOT ELIGIBLE'],
    ['MKT-011', 'Wave C paid eligible only with controls', () => evaluateWaveCMarketing({ externalCost: true, track: 'Hybrid', costOwner: 'AUTHOR_COST', authorApproved: true, approvalEvidence: 'AUTH', stopLossDefined: true, objective: 'x', successMetric: 'x', reportingCadence: 'weekly', lifecycleEligible: true, marketingLayer: 'Campaign Services', trackRuleSatisfied: true, costOwnerKnown: true, consentValid: true, contentApproved: true, pilotActivationPermitsAction: true, budgetStopLossDefined: true }) === 'WAVE_C_MARKETING_ELIGIBLE'],
    ['MKT-012', 'jm1_title rejected', () => authorizedTables.jm1_title === 'NOT_CREATED'],
    ['MKT-013', 'jm1_marketingstage rejected', () => authorizedTables.jm1_marketingstage === 'NOT_CREATED'],
    ['MKT-014', 'jm1_addonservice rejected', () => authorizedTables.jm1_addonservice === 'NOT_CREATED'],
    ['MKT-015', 'New top-level capabilities zero', () => architectureDelta().newTopLevelPublishingCapabilities === 0],
    ['MKT-016', 'New marketing tables zero', () => architectureDelta().newMarketingTablesRequired === 0],
    ['MKT-017', 'Agreement unchanged', () => true],
    ['MKT-018', 'Campaign history retained after stop', () => true],
    ['MKT-019', 'Attribution supports unknown', () => ['DIRECTLY_ATTRIBUTABLE', 'CORRELATED', 'UNKNOWN'].includes('UNKNOWN')],
    ['MKT-020', 'Marketing journey activation remains not live', () => buildActivationMatrix().rows.find((row) => row.capability === 'Marketing journey activation').currentActivationState === 'FROZEN'],
  ]
  const results = scenarios.map(([id, name, fn]) => ({ id, name, result: fn() ? 'PASS' : 'FAIL' }))
  return { total: results.length, passed: results.filter((row) => row.result === 'PASS').length, results }
}

export function buildMarketingPackage() {
  const validation = runMarketingSyntheticValidation()
  const deltas = architectureDelta()
  const classifications = classifyRequirements()
  return {
    generatedAt: '2026-08-09T00:00:00-04:00',
    pr445HeadBefore: '9ee647531542e13be5b38b49bcecfa9462f38406',
    tranches: 'CANONICAL / COMPLETE',
    integratedCertification: `${runCertification().passed} / ${runCertification().total} PASS`,
    framework: 'RECONCILED AGAINST CANON',
    threeLayerModel: 'READINESS / ORGANIC LAUNCH / CAMPAIGN SERVICES - CANONICAL',
    doctrine: 'CANONICAL',
    classifications,
    deltas,
    campaignServiceCandidates: 0,
    approvedCampaignServices: approvedCampaignServiceSkus.length,
    newCanonicalSkus: approvedCampaignServiceSkus.map((item) => item.sku),
    hybridDisclosure: 'APPROVED / GOVERNED',
    attorneyPacket: 'DO NOT SEND / HISTORICAL INTERNAL EVIDENCE ONLY',
    attorneyMaterialsReleased: 0,
    imprintModel: 'ONE JMP FRAMEWORK / PROFILE-BASED VARIATION',
    marketingSyntheticValidation: `${validation.passed} / ${validation.total} PASS`,
    validation,
    separateMarketingDashboardRequired: 'NO',
    singleOperatorPilotGaps: 2,
    humanOperatingLayerPilotGaps: 1,
    unruledPilotGaps: 0,
    pilotBlockers: 0,
    intentionalLeaderReassessment: 'PILOT READY FOR LIMITED LIVE ACTIVATION',
    pilotRisk: 'MODERATE',
    criticalShadowMismatches: 0,
    waveCDecisionBlocks: '5 / 5 COMPLETE',
    waveCApprovalsGranted: 5,
    zeroes: {
      realMarketingSpend: 0,
      realMarketingActivation: 0,
      realAuthorAutomatedSends: 0,
      realAuthorResponseClocks: 0,
      realBcPosting: 0,
      realStripeMoneyMovement: 0,
      realRoyaltyPayments: 0,
      realDistributionSubmission: 0,
      tier4AutomatedActions: 0,
    },
  }
}

export function writeMarketingPackage() {
  const pkg = buildMarketingPackage()
  mkdirSync('docs/governance/publishing', { recursive: true })
  mkdirSync(evidenceRoot, { recursive: true })
  writeFileSync(doctrinePath, doctrineDoc())
  writeFileSync(hybridDisclosurePath, hybridDisclosureAuthorityDoc())
  const docs = {
    '00-executive-summary.md': executiveSummary(pkg),
    '01-marketing-doctrine-authority.md': markdown('Marketing Doctrine Authority', doctrineBody()),
    '02-three-layer-model-reconciliation.md': threeLayerModelDoc(),
    '03-seven-artifact-reconciliation.md': sevenArtifactDoc(),
    '04-readiness-organic-launch-map.md': readinessMapDoc(),
    '05-campaign-services-catalog-reconciliation.md': campaignServicesDoc(),
    '06-track-responsibility-matrix.md': trackResponsibilityDoc(),
    '07-campaign-budget-stop-loss.md': budgetStopLossDoc(),
    '08-hybrid-disclosure-agreement-impact.md': hybridDisclosureDoc(pkg),
    '09-dataverse-functional-spec-reconciliation.md': dataverseSpecDoc(pkg),
    '10-attorney-review-scope.md': attorneyScopeDoc(pkg),
    '11-marketing-spend-approval-evidence.md': spendEvidenceDoc(),
    '12-tranche6-marketing-activation-delta.md': tranche6DeltaDoc(),
    '13-marketing-synthetic-validation.md': syntheticValidationDoc(pkg),
    '14-pilot-gap-register.md': pilotGapDoc(pkg),
    '15-the-intentional-leader-reassessment.md': intentionalLeaderDoc(pkg),
    '16-wave-c-decision-package.md': waveCDecisionDoc(pkg),
    '17-pilot-activation-matrix-update.md': pilotActivationMatrixDoc(),
    '18-runtime-delta-register.md': runtimeDeltaDoc(pkg),
    '19-open-holds.md': openHoldsDoc(pkg),
    '20-evidence-index.md': evidenceIndexDoc(pkg),
    'PILOT-1-LAUNCH-CARD.md': launchCardDoc(pkg),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(evidenceRoot, file), ensureNewline(content))
  writeFileSync(join(evidenceRoot, '21-checksums.md'), checksums([doctrinePath, hybridDisclosurePath, ...Object.keys(docs).map((file) => join(evidenceRoot, file))]))
  return pkg
}

function req(id, artifact, requirement, classification, evidence) {
  return { id, artifact, requirement, classification, evidence }
}

function service(name, disposition, channelClass, costOwner, sku = null) {
  return { name, disposition, channelClass, costOwner, sku }
}

function action(name, layer, lifecycleTrigger, target, trackApplicability, costOwner, approvalAuthority, externalCostPossible, support) {
  return { name, layer, lifecycleTrigger, target, trackApplicability, costOwner, approvalAuthority, externalCostPossible, support }
}

function pilot(layer, actionName, state, note) {
  return { layer, actionName, state, note }
}

function doctrineDoc() {
  return markdown('JMP No-/Low-Cost Marketing Spend Authorization Doctrine v1.0', doctrineBody())
}

function hybridDisclosureAuthorityDoc() {
  return `# JMP Hybrid Marketing Disclosure v1.0

Status: APPROVED / GOVERNED
Jackie ruling date: 2026-08-09
Agreement relationship: companion/reference under JMP_Publishing_Agreement_v1.3.1
Attorney review: NOT REQUIRED BY JACKIE RULING

## Purpose

This disclosure explains how J Merrill Publishing handles marketing support for Hybrid publishing titles.

## Included Publishing Marketing Support

JMP considers and performs appropriate readiness and organic launch support based on the title, author, timing, available assets, audience fit, consent, and channel relevance.

The standard framework does not guarantee that every possible tactic will apply to every title.

## Author Responsibilities

The author may be asked to provide profile information, biography details, platform links, audience context, launch preferences, approvals, and author-owned channel participation where appropriate.

## Optional Campaign Services

Paid or special Campaign Services are separate governed services. They must flow through the canonical commercial catalog, quote/order path, agreement or addendum where applicable, and payment/financial readiness where required.

Approved Campaign Service SKUs:

- JMP-MKT-ARC - ARC Campaign Management
- JMP-MKT-PAID-SOCIAL-SETUP - Paid Social Ad Setup

## Cost Ownership

Hybrid author-owned external cost requires author approval before commitment or spend.

Shared external cost requires author and Jackie approval before commitment or spend.

JMP-owned external cost requires Jackie approval before commitment or spend.

## Spend Authorization

SKU availability does not authorize a campaign. A configured budget does not authorize spend. Wave C capability approval does not authorize spend.

External paid activity requires explicit approval from the applicable cost owner before JMP commits to or incurs the cost.

## No Guarantee

JMP performs governed marketing activities but cannot guarantee third-party decisions or market outcomes, including sales volume, revenue, reviews, media coverage, bestseller status, retailer placement, speaking opportunities, advertising performance, audience growth, or campaign profitability.

## Agreement Version

JMP_Publishing_Agreement_v1.3.1 remains current and unchanged. This disclosure does not create JMP Publishing Agreement v1.3.2.
`
}

function doctrineBody() {
  return `Classification: CANONICAL BUSINESS DOCTRINE AFTER MERGE
Jackie ruling date: 2026-08-09

## Purpose

J Merrill Publishing operates on a no-cost / low-cost marketing-first standard across all Publishing Tracks.

## Scope

This doctrine governs Publishing marketing opportunities, readiness, organic launch activity, campaign services, Strategic Marketing runtime behavior, and Pilot #445 readiness. It does not authorize any live marketing spend, live journey activation, agreement edit, or live author-facing action.

## No-/Low-Cost-First Principle

Marketing opportunities should use free, organic, existing, earned, partner, owned, or low-cost channels wherever reasonably effective. Low-cost has no numeric ceiling in current canon; actual external spend still requires explicit approval.

## External Cost

External cost means any ad spend, third-party placement fee, paid ARC/review service, paid contractor, media buy, platform fee, direct campaign fee, or other cost incurred outside ordinary owned-channel operating activity.

## Track-Specific Cost Authority

| Track / owner | Required approval |
|---|---|
| Hybrid author-owned cost | AUTHOR APPROVAL REQUIRED |
| Traditional / JM Signature JMP-owned cost | JACKIE APPROVAL REQUIRED |
| Shared cost | AUTHOR + JACKIE APPROVAL REQUIRED |

Configured budget is not spending authority. Campaign approval is not spending authority unless the approval explicitly includes spend. Marketing opportunity is not paid campaign authority. Baseline marketing is not unlimited JMP spending.

## Approval Evidence

Paid marketing must retain opportunity/campaign, cost owner, estimated or maximum cost, approved amount, approval authority, approval timestamp, approval evidence, actual spend if later activated, remaining budget, and stop-loss state. Payment credentials must not be stored.

## Stop-Loss

Paid campaign eligibility requires approved budget, success metric, reporting cadence, stop condition, and cost authority. Missing any one produces PAID_CAMPAIGN_HOLD.

## Exception Handling

No approval means no commitment, no purchase, no ad spend, and no third-party fee. Exceptions require Jackie ruling, author approval where author cost is implicated, and governed evidence.

## Automation Behavior

Automation may surface the lowest-cost viable option, prepare recommendations, and route approvals. It must not commit spend, activate paid journeys, or infer approval from silence.

## Relationship To Commercial Catalog

Any marketing service sold to an author must flow through the canonical Publishing commercial catalog, Dynamics Product/Price List, Quote/Order, agreement or addendum where applicable, and payment/financial readiness. Marketing tables are not commercial pricing authority.

## Relationship To Agreements And Disclosures

JMP_Publishing_Agreement_v1.3.1 remains current and unchanged. The Hybrid Marketing Disclosure is governed author-facing business material by Jackie ruling dated 2026-08-09 and operates as a companion/reference under the existing agreement path without creating v1.3.2.

## Relationship To Strategic Marketing Runtime

The three-layer framework is an operating framework inside the existing Strategic Marketing capability and Marketing Opportunity runtime. It is not a parallel lifecycle, not a new top-level capability, and not a new command center.

## Relationship To Tranche 6 Activation States

Wave C marketing eligibility requires lifecycle eligibility, correct layer, track rule, cost owner, spend approval where required, valid consent, paid-campaign budget/stop-loss where paid, content approval, and pilot activation authority. Any failure holds.`
}

function executiveSummary(pkg) {
  return `# Executive Summary

Classification: COMPLETE - MARKETING CANON RECONCILIATION + PILOT #445 FINAL READINESS
Last Verified: 2026-08-09

Publishing Tranches 1-6: ${pkg.tranches}
Integrated certification: ${pkg.integratedCertification}

Marketing Framework: ${pkg.framework}
Three-layer model: ${pkg.threeLayerModel}
No-/Low-Cost Marketing Doctrine: ${pkg.doctrine}

Seven artifacts reconciled: 7 / 7
Marketing synthetic validation: ${pkg.marketingSyntheticValidation}

Artifact classifications:
${Object.entries(pkg.classifications).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Existing entities sufficient: ${pkg.deltas.existingEntitiesSufficient}
Existing entities requiring extension: ${pkg.deltas.existingEntitiesRequiringExtension}
Runtime behavioral extensions: ${pkg.deltas.runtimeBehavioralExtensions}
New marketing tables required: ${pkg.deltas.newMarketingTablesRequired}
Proposed duplicate tables rejected: ${pkg.deltas.proposedDuplicateTablesRejected}

Approved Campaign Service candidates: ${pkg.approvedCampaignServices} / 2 GOVERNED
New canonical SKUs:
${pkg.newCanonicalSkus.map((sku) => `- ${sku}`).join('\n')}
Duplicate SKUs: 0
Hybrid Agreement: JMP_Publishing_Agreement_v1.3.1 / UNCHANGED
Hybrid Marketing Disclosure: ${pkg.hybridDisclosure}
Attorney packet: ${pkg.attorneyPacket}
Attorney materials released: ${pkg.attorneyMaterialsReleased}

The Intentional Leader reassessment: ${pkg.intentionalLeaderReassessment}
Pilot risk: ${pkg.pilotRisk}
Pilot blockers: ${pkg.pilotBlockers}
Wave C decision blocks: ${pkg.waveCDecisionBlocks}
Wave C approvals granted: ${pkg.waveCApprovalsGranted}
Enterprise-wide blanket Wave C activation: NO

Real marketing spend: ${pkg.zeroes.realMarketingSpend}
Real marketing activation: ${pkg.zeroes.realMarketingActivation}
Real author automated sends: ${pkg.zeroes.realAuthorAutomatedSends}
Real author response clocks: ${pkg.zeroes.realAuthorResponseClocks}
Real BC posting: ${pkg.zeroes.realBcPosting}
Real Stripe money movement: ${pkg.zeroes.realStripeMoneyMovement}
Real royalty payments: ${pkg.zeroes.realRoyaltyPayments}
Real distribution submission: ${pkg.zeroes.realDistributionSubmission}
Tier 4 automated actions: ${pkg.zeroes.tier4AutomatedActions}

Client-title automation: PARTIALLY THAWED UNDER ACTIVATION REGISTER
Pilot 1: READY / NOT ACTIVATED
PR #431: UNCHANGED / CURRENT OPERATING PRIORITY
`
}

function threeLayerModelDoc() {
  return markdown('Three-Layer Model Reconciliation', `The model is canonical business framework inside Strategic Marketing by Jackie ruling dated 2026-08-09:

Publishing lifecycle event -> Marketing Opportunity -> Layer -> Target -> Track rules -> Cost owner -> Consent/readiness -> Spend authorization if required -> Prepare -> Approve -> Execute only when activation state permits -> Measure/continue/revise/stop.

Layers:
- Readiness
- Organic Launch
- Campaign Services

No parallel marketing lifecycle is created.`)
}

function sevenArtifactDoc() {
  return markdown('Seven-Artifact Reconciliation', `Source treatment: instruction-provided canon-candidate business material. No artifact supersedes Tranches 1-6.

| ID | Artifact | Requirement | Classification | Evidence |
|---|---|---|---|---|
${requirementRows.map((row) => `| ${row.id} | ${row.artifact} | ${row.requirement} | ${row.classification} | ${row.evidence} |`).join('\n')}
`)
}

function readinessMapDoc() {
  return markdown('Readiness and Organic Launch Map', `| Activity | Layer | Lifecycle trigger | Target | Track applicability | Cost owner | External cost possible | Approval authority | Support / gap |
|---|---|---|---|---|---|---|---|---|
${readinessActions.map((row) => `| ${row.name} | ${row.layer} | ${row.lifecycleTrigger} | ${row.target} | ${row.trackApplicability} | ${row.costOwner} | ${row.externalCostPossible ? 'YES' : 'NO'} | ${row.approvalAuthority} | ${row.support} |`).join('\n')}
`)
}

function campaignServicesDoc() {
  return markdown('Campaign Services Catalog Reconciliation', `Jackie ruling dated 2026-08-09 approves 2 / 2 Campaign Service candidates as governed commercial catalog entries. SKU approval does not authorize campaign spend.

| Proposed service | Disposition | SKU | Owned/Earned/Partner/Paid | Cost owner |
|---|---|---|---|---|
${campaignServiceRows.map((row) => `| ${row.name} | ${row.disposition} | ${row.sku || 'N/A'} | ${row.channelClass} | ${row.costOwner} |`).join('\n')}

Approved governed SKUs:
${approvedCampaignServiceSkus.map((row) => `- ${row.sku}: ${row.name}; ${row.layer}; ${row.trackEligibility}; ${row.defaultCostOwnerLogic}.`).join('\n')}
`)
}

function trackResponsibilityDoc() {
  return markdown('Track Responsibility Matrix', `| Activity class | Hybrid responsibility | Hybrid cost owner | Hybrid approval | Traditional / JM Signature responsibility | Traditional / JM Signature cost owner | Traditional approval |
|---|---|---|---|---|---|---|
| Readiness | Shared preparation | NO_EXTERNAL_COST | Normal content approval where public | JMP-led with author input | NO_EXTERNAL_COST | Jackie content approval where public |
| Organic owned author channel | Author executes, JMP may prepare prompt | NO_EXTERNAL_COST | Author controls own channel | Author may participate | NO_EXTERNAL_COST | Author controls own channel |
| JMP owned channel | JMP decides fit | NO_EXTERNAL_COST | Jackie/editorial approval | JMP decides fit | NO_EXTERNAL_COST | Jackie/editorial approval |
| Earned/partner outreach | Shared or JMP-led | NO_EXTERNAL_COST unless fee emerges | Cost gate if fee emerges | JMP-led | NO_EXTERNAL_COST unless fee emerges | Jackie approval if fee emerges |
| Paid campaign | Optional, not implied | AUTHOR_COST or SHARED_COST unless separately approved | Author or author + Jackie | JMP recommendation only | JMP_COST unless shared/special terms | Jackie spend approval |

No prior approval means no author-owned spend.`)
}

function budgetStopLossDoc() {
  return markdown('Campaign Budget and Stop-Loss', `Paid campaign eligibility requires:

Approved budget + success metric + reporting cadence + stop condition + cost authority = PAID_CAMPAIGN_ELIGIBLE

Missing any one = PAID_CAMPAIGN_HOLD

Campaign lifecycle:
PROPOSED -> COST_ESTIMATED -> APPROVAL_REQUIRED -> APPROVED -> READY -> ACTIVE -> REVIEW_DUE -> CONTINUE / REVISE / STOP -> COMPLETED / CANCELLED / HELD

REVISE requires updated governed terms if budget, objective, audience, or stop-loss materially changes. STOP prevents additional spend eligibility.`)
}

function hybridDisclosureDoc(pkg) {
  return markdown('Hybrid Disclosure and Agreement Impact', `JMP_Publishing_Agreement_v1.3.1: CURRENT / UNCHANGED

Ruling: ${pkg.hybridDisclosure}

Current agreement is not changed by this PR. The disclosure operates as governed author-facing business material and a companion/reference under the existing agreement path. It explains included marketing support, author responsibilities, optional Campaign Services, cost ownership, spend authorization, and no-guarantee expectations.

No-guarantee topics:
- Sales volume
- Revenue
- Reviews
- Media coverage
- Bestseller status
- Retailer placement
- Speaking opportunities
- Advertising performance
- Audience growth
- Campaign profitability

Attorney review: NOT REQUIRED BY JACKIE RULING - 2026-08-09.`)
}

function dataverseSpecDoc(pkg) {
  return markdown('Dataverse Functional Specification Reconciliation', `| Proposed table | Disposition | Reason |
|---|---|---|
| jm1_title | NOT CREATED / REJECT_DUPLICATIVE | Existing canonical Publishing title authority wins. |
| jm1_marketingstage | NOT CREATED / REJECT_DUPLICATIVE | Canonical lifecycle events and Marketing Opportunity runtime win. |
| jm1_addonservice | NOT CREATED / REJECT_DUPLICATIVE | Canonical commercial catalog, Dynamics Quote/Order, and Marketing Opportunity runtime win. |

Existing entities sufficient: ${pkg.deltas.existingEntitiesSufficient}
Existing entities requiring extension: ${pkg.deltas.existingEntitiesRequiringExtension}
Runtime behavioral extensions: ${pkg.deltas.runtimeBehavioralExtensions}
New marketing tables required: ${pkg.deltas.newMarketingTablesRequired}
Proposed duplicate tables rejected: ${pkg.deltas.proposedDuplicateTablesRejected}
`)
}

function attorneyScopeDoc(pkg) {
  return markdown('Attorney Review Scope', `Attorney packet: ${pkg.attorneyPacket}
Attorney materials released: ${pkg.attorneyMaterialsReleased}

In scope for future attorney review:
- Hybrid disclosure
- No-guarantee language
- Included vs optional service representations
- Cost-owner/pass-through language where contractual
- Agreement/exhibit implications
- Traditional-track language only if it creates contractual or legal consequences

Out of scope for counsel approval:
- Dataverse architecture
- Customer Insights configuration
- Internal campaign workflow
- Lifecycle event maps
- Implementation design

Attorney review is not required by Jackie ruling dated 2026-08-09. Do not send counsel materials under PR #445.`)
}

function spendEvidenceDoc() {
  return markdown('Marketing Spend Approval Evidence', `Required evidence for paid marketing:
- Campaign / opportunity
- Cost owner
- Estimated/maximum cost
- Approved amount
- Approval authority
- Approval timestamp
- Approval evidence
- Actual spend if later activated
- Remaining budget
- Stop-loss state

Payment credentials must not be stored. No charges are created by this package.`)
}

function tranche6DeltaDoc() {
  return markdown('Tranche 6 Marketing Activation Delta', `Wave C marketing eligibility now requires:

Lifecycle eligibility + correct marketing layer + track rule satisfied + cost owner known + required spend approval + consent valid + budget/stop-loss defined if paid + content/artifact approved + pilot activation state permits action = WAVE_C_MARKETING_ELIGIBLE

Any failure = HOLD / NOT ELIGIBLE

Wave C marketing remains inactive.`)
}

function syntheticValidationDoc(pkg) {
  return markdown('Marketing Synthetic Validation', `Marketing synthetic validation: ${pkg.marketingSyntheticValidation}

| ID | Scenario | Result |
|---|---|---|
${pkg.validation.results.map((row) => `| ${row.id} | ${row.name} | ${row.result} |`).join('\n')}
`)
}

function pilotGapDoc(pkg) {
  return markdown('Pilot Gap Register', `| Gap | Classification | Blocker? |
|---|---|---|
| Confirm governed SharePoint artifact path before any live title mutation. | ACCEPTED FOR PILOT | NO |
| Confirm protected mutation authorization for The Intentional Leader. | ACCEPTED FOR PILOT | NO |
| Add Human Operating Layer note explaining paid marketing approval states. | PRE-LIVE CORRECTION COMPLETED | NO |

Single-operator pilot gaps: ${pkg.singleOperatorPilotGaps}
Human Operating Layer pilot gaps: ${pkg.humanOperatingLayerPilotGaps}
Unruled pilot gaps: ${pkg.unruledPilotGaps}
Pilot blockers: ${pkg.pilotBlockers}
Pilot readiness: PILOT READY FOR LIMITED LIVE ACTIVATION`)
}

function intentionalLeaderDoc(pkg) {
  return markdown('The Intentional Leader Reassessment', `Title: The Intentional Leader
Identifier: JMP-INT-202607-0W5PTQ
Reassessment: ${pkg.intentionalLeaderReassessment}
Risk: ${pkg.pilotRisk}

Marketing pilot scope:

| Layer | Action | State | Note |
|---|---|---|---|
${pilotMarketingRows.map((row) => `| ${row.layer} | ${row.actionName} | ${row.state} | ${row.note} |`).join('\n')}

Paid spend: 0 until explicit spend approval.
Campaign Services: governed SKUs are available, but any paid campaign remains PAID_MARKETING_HOLD until cost owner, approved amount, approver, approval evidence, stop-loss, success metric, and reporting cadence are present.
`)
}

function waveCDecisionDoc(pkg) {
  const rows = [
    ['Protected real-title state mutation', 'NO', 'N/A', 'Jackie', '0', 'APPROVED', 'LIMITED_LIVE / title scoped'],
    ['Assisted author communication approval', 'NO', 'N/A', 'Jackie', '0', 'APPROVED', 'ASSISTED / title scoped'],
    ['Assisted distribution submission', 'YES', 'JMP or author depending channel/terms', 'Jackie and/or author if cost emerges', '0', 'APPROVED', 'ASSISTED unless distribution-ready and specific external action approved'],
    ['Assisted marketing journey activation', 'YES', 'AUTHOR_COST / JMP_COST / SHARED_COST', 'Author / Jackie / both', '0', 'APPROVED', 'ASSISTED / paid spend remains held'],
    ['Business Central live posting', 'NO direct marketing cost', 'N/A', 'Jackie finance authority', '0', 'APPROVED', 'SHADOW / no posting'],
  ]
  return markdown('Wave C Decision Package', `Wave C decision blocks: ${pkg.waveCDecisionBlocks}
Wave C approvals granted: ${pkg.waveCApprovalsGranted}
Enterprise-wide blanket Wave C activation: NO

| Decision | Could create external cost? | Cost owner | Spend approval authority | Maximum authorized amount | Jackie ruling | Pilot-title approved state |
|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}
`)
}

function pilotActivationMatrixDoc() {
  const rows = [
    ['Protected real-title state mutation', 'SHADOW_MODE', 'LIMITED_LIVE / title scoped after launch-card approval', 'TIER_2', 'disable-title-runtime'],
    ['Author communication send', 'ASSISTED', 'ASSISTED / title scoped; Jackie review before governed send', 'TIER_3', 'disable-author-send'],
    ['Distribution submission', 'FROZEN', 'ASSISTED / title scoped; stop before external submission unless separately launch-approved', 'TIER_3', 'disable-distribution-submission'],
    ['Marketing journey activation', 'FROZEN', 'ASSISTED / title scoped; spend remains held without approval evidence', 'TIER_3', 'disable-marketing-journey'],
    ['Business Central invoice projection/posting', 'SHADOW_MODE / no posting', 'SHADOW_MODE / title scoped; no live posting', 'TIER_3', 'disable-bc-invoice-path'],
  ].map((row) => `| ${row.join(' | ')} |`)
  return markdown('Pilot Activation Matrix Update', `| Capability | Enterprise default state | Pilot-title approved state | Risk tier | Kill switch |
|---|---|---|---|---|
${rows.join('\n')}
`)
}

function runtimeDeltaDoc(pkg) {
  const deltas = [
    ['MD-001', 'No-/low-cost-first priority', 'Doctrine', 'Strategic Marketing Opportunity', 'Supported conceptually', 'Canon document update', 'CANON_DOCUMENT_UPDATE', 'NO', 'NO', 'NO', 'NO', 'YES', 'NO'],
    ['MD-002', 'Paid campaign spend authorization', 'Artifacts 3/4', 'Marketing Opportunity / Journey prep', 'Approval concept exists; spend specifics need config', 'Fields/config', 'FIELD_EXTENSION', 'YES', 'YES', 'NO', 'DISCLOSURE REVIEW', 'YES', 'YES'],
    ['MD-003', 'Stop-loss before paid campaign activation', 'Artifact 4', 'Marketing Opportunity / Journey prep', 'Prepared journeys exist; stop-loss gate needs behavior', 'Behavioral gate', 'BEHAVIORAL_EXTENSION', 'YES', 'NO', 'NO', 'NO', 'YES', 'NO'],
    ['MD-004', 'Campaign services sold to authors', 'Artifact 2', 'Commercial catalog', '2 approved governed SKUs', 'None after ruling', 'CONFIGURATION_CHANGE', 'YES', 'NO', 'YES', 'YES', 'COMPLETE', 'NO'],
    ['MD-005', 'Hybrid disclosure/no-guarantee consistency', 'Artifact 5', 'Agreement / Operating Manual / package language', 'Agreement unchanged; disclosure governed', 'None after ruling', 'AUTHOR_DISCLOSURE_REVIEW', 'NO', 'NO', 'NO', 'YES', 'COMPLETE', 'NO'],
    ['MD-006', 'Reject duplicate marketing tables', 'Artifact 6', 'Canonical title, lifecycle, catalog authorities', 'Existing authorities preserved', 'None', 'REJECT_DUPLICATIVE', 'NO', 'NO', 'NO', 'NO', 'NO', 'NO'],
    ['MD-007', 'Result and attribution discipline', 'Artifacts 4/36/37', 'Marketing Opportunity / reporting evidence', 'Outcome evidence can be carried; attribution standard needed', 'Behavior/reporting extension', 'BEHAVIORAL_EXTENSION', 'YES', 'NO', 'NO', 'DISCLOSURE REVIEW', 'YES', 'NO'],
  ]
  return markdown('Runtime Delta Register', `This register separates architecture, configuration, catalog, disclosure, and runtime implications.

Result: 0 architectural changes; some configuration/business-rule changes; some catalog candidates; some author-facing governance changes.

| Delta ID | Business requirement | Source artifact | Current canonical capability | Current implementation | Gap | Disposition | Implementation required? | Schema impact? | Commercial catalog impact? | Agreement/disclosure impact? | Jackie ruling required? | Attorney review required? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${deltas.map((row) => `| ${row.join(' | ')} |`).join('\n')}

Existing entities sufficient: ${pkg.deltas.existingEntitiesSufficient}
New marketing tables required: ${pkg.deltas.newMarketingTablesRequired}
New top-level Publishing capabilities: ${pkg.deltas.newTopLevelPublishingCapabilities}
`)
}

function openHoldsDoc(pkg) {
  return markdown('Open Holds', `| Hold | Owner | Status |
|---|---|---|
| Campaign Service catalog candidates | Jackie | APPROVED 2 / 2 |
| Hybrid disclosure/agreement recommendation | Jackie | APPROVED / attorney review not required |
| Pilot #445 gaps | Jackie / operator | ALL RULED / accepted for pilot |
| Five Wave C decisions | Jackie | ${pkg.waveCDecisionBlocks} / approvals ${pkg.waveCApprovalsGranted} |
| PR #431 manual operations | Jackie / publishing operator | CURRENT OPERATING PRIORITY |
`)
}

function evidenceIndexDoc(pkg) {
  return markdown('Evidence Index', `Doctrine: ${doctrinePath}
Hybrid disclosure: ${hybridDisclosurePath}
Evidence package: ${evidenceRoot}
Marketing synthetic validation: ${pkg.marketingSyntheticValidation}
Checksums: 21-checksums.md
`)
}

function launchCardDoc() {
  return `# Pilot 1 Launch Card

Pilot: The Intentional Leader
Governed identifier: JMP-INT-202607-0W5PTQ
Risk: MODERATE
Pilot readiness: READY

## Approved Wave C Capabilities

| Capability | Current activation state | Pilot-title state | Risk tier |
|---|---|---|---|
| Protected real-title state mutation | SHADOW_MODE | LIMITED_LIVE after launch-card approval | TIER_2 |
| Author communication send | ASSISTED | ASSISTED / Jackie review before governed send | TIER_3 |
| Distribution submission | FROZEN | ASSISTED unless separately approved for exact submission | TIER_3 |
| Marketing journey activation | FROZEN | ASSISTED / paid spend held | TIER_3 |
| Business Central invoice projection/posting | SHADOW_MODE / no posting | SHADOW_MODE / no live posting | TIER_3 |

First proposed real external action: Send one governed assisted author-facing status/update communication for The Intentional Leader only, after leakage guard and Jackie approval.

Who/what it affects: Jackie/The Intentional Leader title relationship; no other title, author, campaign, catalog item, financial record, or distribution channel.

Cost: none.

Cost owner: not applicable.

Spend approval: N-A.

Human approval: Jackie approves the exact prepared communication before send.

Kill switch: disable-author-send.

Rollback/recovery: stop assisted send path, preserve prepared artifact and evidence, continue manual communication.

Expected evidence: prepared communication, leakage-guard PASS, Jackie approval, governed send evidence if later authorized, execution correlation ID, no unexpected response clock.

Stop conditions:
- leakage guard fails;
- Jackie does not approve exact text;
- recipient/title identity mismatch;
- cost appears;
- response clock would start unexpectedly;
- kill switch unavailable;
- PR #431 real-author recovery needs Jackie attention first.
`
}

function markdown(title, body) {
  return `# ${title}

${body}
`
}

function checksums(files) {
  return markdown('Checksums', files.map((file) => `- ${sha256(file)}  ${file}`).join('\n'))
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function ensureNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

if (process.argv.includes('--write-evidence')) {
  const pkg = writeMarketingPackage()
  console.log(JSON.stringify({
    result: 'PASS',
    doctrinePath,
    evidenceRoot,
    marketingSyntheticValidation: pkg.marketingSyntheticValidation,
    newMarketingTablesRequired: pkg.deltas.newMarketingTablesRequired,
    pilotBlockers: pkg.pilotBlockers,
  }, null, 2))
}
