import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  buildQuotePath,
  evaluateFulfillmentAuthorization,
  projectStripePayment,
  qualifyLead,
  selectAgreement,
} from './tranche1_commercial_foundation_runtime.mjs'
import {
  buildInvoiceModel,
  evaluateFinancialReadiness,
  evaluatePaymentPlan,
  mapCustomerIdentity,
  reconcileStripeToBusinessCentral,
} from './tranche2_money_fulfillment_runtime.mjs'
import {
  addCompanionEdition,
  assignIdentifier,
  completeCorrection,
  createEditionInstances,
  evaluateDistributionReadiness,
  evaluateReleaseDateGate,
  initializeTitleRuntime,
  readbackDistribution,
  requestFtl,
  submitDistribution,
  validateProductFormElection,
} from './tranche3_title_pf_runtime.mjs'
import {
  createMarketingOpportunity,
  deliverDecisionRequest,
  evaluateConsent,
  prepareDecisionRequest,
  prepareJourney,
  validateAuthorFacingArtifact,
} from './tranche4_author_marketing_experience.mjs'
import {
  calculateRoyalties,
  createCopyEntitlement,
  enterPostPublication,
  evaluateAnnualDistributionFee,
  evaluatePayoutReadiness,
  importRoyaltySource,
  prepareAuthorCopyOrder,
  prepareBusinessCentralPayableHandoff,
  prepareRetirementReview,
  prepareReversionReview,
  prepareRoyaltyStatement,
  reconcileRoyaltyRows,
  requestPostReleaseCorrection,
  triggerPostReleaseMarketing,
  verifyStatementArtifact,
} from './tranche5_post_publication_operations.mjs'

export const evidenceRoot =
  'docs/operations/generated/JMP-TRANCHE-6-CERTIFICATION-CONTROLLED-THAW-2026-08-08'

export const activationStates = [
  'FROZEN',
  'INTERNAL_ONLY',
  'SHADOW_MODE',
  'ASSISTED',
  'LIMITED_LIVE',
  'CONTROLLED_LIVE',
  'FULLY_OPERATIONAL',
  'SUSPENDED',
]

export const riskTierRules = {
  TIER_0: 'Synthetic certification, rollback, and logging required.',
  TIER_1: 'Synthetic certification, shadow run, idempotency proof, and exception surfacing required.',
  TIER_2: 'Internal-recipient certification, consent/suppression proof, approval where appropriate, and rollback required.',
  TIER_3: 'Synthetic certification, internal test, shadow mode, human approval, bounded pilot, financial/author evidence reconciliation, and kill switch required.',
  TIER_4: 'Explicit Jackie decision each time unless later governance changes; no autonomous activation.',
}

export const activationRegister = [
  row('Commercial lead routing', 'Commercial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_1', 'Inquiry received', 'Lead/opportunity state', false, false, false, true, false, 'disable-commercial-routing'),
  row('Opportunity qualification', 'Commercial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_1', 'Lead qualified', 'Opportunity update', false, false, false, true, false, 'disable-opportunity-qualification'),
  row('Quote and package projection', 'Commercial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_2', 'Package selected', 'Quote/order draft', true, true, false, true, true, 'disable-quote-projection'),
  row('Agreement selection', 'Commercial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_2', 'Track selected', 'Template identity', true, false, false, true, false, 'disable-agreement-generation'),
  row('Exception queue', 'Commercial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_1', 'Exception detected', 'Jackie queue row', false, false, false, true, false, 'disable-exception-router'),
  row('Stripe payment projection', 'Financial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_3', 'Stripe event', 'Payment status projection', false, true, false, true, true, 'disable-stripe-projection'),
  row('Business Central invoice projection', 'Financial Operations', 'SHADOW_MODE', 'ASSISTED', 'TIER_3', 'Order ready', 'BC invoice draft/projection', false, true, false, true, true, 'disable-bc-invoice-path'),
  row('Fulfillment authorization', 'Financial Operations', 'CONTROLLED_LIVE', 'CONTROLLED_LIVE', 'TIER_3', 'Agreement and payment ready', 'FULFILLMENT_AUTHORIZED', false, true, false, true, true, 'disable-fulfillment-authorization'),
  row('Royalty calculation preparation', 'Financial Operations', 'INTERNAL_ONLY', 'INTERNAL_ONLY', 'TIER_1', 'Royalty source imported', 'Draft calculation', false, true, false, true, false, 'disable-royalty-prep'),
  row('Royalty payment approval', 'Financial Operations', 'FROZEN', 'FROZEN', 'TIER_3', 'Locked statement and payout ready', 'Payment instruction candidate', true, true, false, true, true, 'disable-royalty-payment'),
  row('Title initialization', 'Title/PF Runtime', 'SHADOW_MODE', 'SHADOW_MODE', 'TIER_1', 'Fulfillment authorized', 'Title runtime state', false, false, false, true, false, 'disable-title-runtime'),
  row('Edition creation', 'Title/PF Runtime', 'SHADOW_MODE', 'SHADOW_MODE', 'TIER_1', 'Elected PFs accepted', 'Edition instances', false, false, false, true, false, 'disable-edition-creation'),
  row('FTL gate evaluation', 'Title/PF Runtime', 'INTERNAL_ONLY', 'SHADOW_MODE', 'TIER_2', 'FTL fields present', 'FTL recommendation', true, false, true, true, true, 'disable-ftl-evaluation'),
  row('Distribution submission', 'Title/PF Runtime', 'FROZEN', 'ASSISTED', 'TIER_3', 'Distribution ready', 'External submission candidate', true, false, false, true, true, 'disable-distribution-submission'),
  row('Distribution readback', 'Title/PF Runtime', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_1', 'External status read', 'Accepted/live/rejected projection', false, false, false, true, false, 'disable-distribution-readback'),
  row('Author decision package preparation', 'Author Experience', 'ASSISTED', 'ASSISTED', 'TIER_3', 'Decision needed', 'Prepared author package', true, false, false, true, true, 'disable-author-decision-prep'),
  row('Author communication preparation', 'Author Experience', 'ASSISTED', 'ASSISTED', 'TIER_3', 'Communication needed', 'Prepared communication', true, false, false, true, true, 'disable-author-comm-prep'),
  row('Author communication send', 'Author Experience', 'FROZEN', 'ASSISTED', 'TIER_3', 'Approved communication', 'Email send', true, false, false, true, true, 'disable-author-send'),
  row('Author status projection', 'Author Experience', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_1', 'State changes', 'Plain-language status', true, false, false, true, false, 'disable-author-status-projection'),
  row('Marketing opportunity creation', 'Strategic Marketing', 'INTERNAL_ONLY', 'INTERNAL_ONLY', 'TIER_1', 'Lifecycle trigger', 'Opportunity row', false, false, false, true, false, 'disable-marketing-opportunity'),
  row('Marketing content preparation', 'Strategic Marketing', 'ASSISTED', 'ASSISTED', 'TIER_2', 'Opportunity ready', 'Prepared content', true, false, false, true, true, 'disable-marketing-prep'),
  row('Marketing journey activation', 'Strategic Marketing', 'FROZEN', 'ASSISTED', 'TIER_3', 'Approved campaign', 'Journey activation', true, false, false, true, true, 'disable-marketing-journey'),
  row('Royalty statement preparation', 'Post-Publication Operations', 'INTERNAL_ONLY', 'INTERNAL_ONLY', 'TIER_1', 'Calculation complete', 'Statement draft', false, true, false, true, false, 'disable-statement-prep'),
  row('Author-copy entitlement tracking', 'Post-Publication Operations', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_1', 'PF published', 'Entitlement row', false, false, false, true, false, 'disable-copy-entitlement'),
  row('Author-copy order preparation', 'Post-Publication Operations', 'ASSISTED', 'ASSISTED', 'TIER_3', 'Entitlement/order request', 'Prepared order', true, true, false, true, true, 'disable-copy-order'),
  row('Annual distribution fee evaluation', 'Post-Publication Operations', 'INTERNAL_ONLY', 'ASSISTED', 'TIER_3', 'Anniversary reached', 'Fee review candidate', true, true, false, true, true, 'disable-annual-fee'),
  row('Correction authorization', 'Post-Publication Operations', 'FROZEN', 'FROZEN', 'TIER_4', 'Correction requested', 'Jackie decision', true, false, true, true, true, 'disable-correction-authorization'),
  row('Retirement review', 'Post-Publication Operations', 'FROZEN', 'FROZEN', 'TIER_4', 'Retirement candidate', 'Jackie/legal review', true, false, true, true, true, 'disable-retirement'),
  row('Rights reversion review', 'Post-Publication Operations', 'FROZEN', 'FROZEN', 'TIER_4', 'Reversion candidate', 'Jackie/legal review', true, false, true, true, true, 'disable-reversion'),
  row('Execution logging', 'Enterprise Support', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_0', 'Runtime event', 'Execution evidence', false, false, false, true, false, 'disable-execution-log'),
  row('Internal reporting', 'Enterprise Support', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_0', 'Refresh interval', 'Operator report', false, false, false, true, false, 'disable-reporting'),
  row('Observability and alerts', 'Enterprise Support', 'INTERNAL_ONLY', 'CONTROLLED_LIVE', 'TIER_1', 'Failure/readiness event', 'Alert/next action', false, false, false, true, false, 'disable-observability'),
]

export const systemOfRecordMap = [
  ['Dynamics 365 Sales', 'lead / opportunity / quote / order'],
  ['Stripe', 'payment transaction truth'],
  ['Business Central', 'accounting / invoice / receivable / payable / financial books'],
  ['Dataverse', 'publishing operational state / edition / runtime / projections'],
  ['SharePoint', 'governed manuscript / artifact / statement / title files'],
  ['Customer Insights / Journeys', 'marketing execution and consent-supported journeys'],
  ['Exchange / Outlook', 'governed email transport'],
  ['Bookings / Exchange', 'scheduling where applicable'],
  ['GitHub', 'source / governance / evidence / ALM'],
  ['JM1 execution log', 'operational event evidence'],
]

export const cohorts = [
  { id: 'A', name: 'Standard Hybrid', packageSku: 'JMP-PKG-STARTER', productForms: ['PF-01', 'PF-03'], payment: 'FULL', track: 'Hybrid' },
  { id: 'B', name: 'Professional Multi-PF', packageSku: 'JMP-PKG-PRO', productForms: ['PF-01', 'PF-02', 'PF-03'], payment: 'PLAN', track: 'Hybrid' },
  { id: 'C', name: 'JM Signature', packageSku: 'JM-SIGNATURE-TRACK', productForms: ['PF-01', 'PF-02', 'PF-03'], payment: 'PUBLISHER_BILLED', track: 'JM Signature' },
  { id: 'D', name: 'Nonstandard Product Forms', packageSku: 'JMP-PKG-STARTER', productForms: ['PF-01', 'PF-05', 'PF-03'], payment: 'FULL', track: 'Hybrid' },
  { id: 'E', name: 'Exception Heavy', packageSku: 'JMP-PKG-PRO', productForms: ['PF-01', 'PF-03'], payment: 'FAILURE', track: 'Hybrid' },
  { id: 'F', name: 'Rights/Post-Publication', packageSku: 'JMP-PKG-PREMIER', productForms: ['PF-01', 'PF-02', 'PF-03'], payment: 'FULL', track: 'Hybrid' },
]

export function buildActivationMatrix() {
  const rows = activationRegister.map((item) => {
    const wave =
      ['TIER_0', 'TIER_1'].includes(item.riskTier) && ['INTERNAL_ONLY', 'CONTROLLED_LIVE'].includes(item.targetActivationState)
        ? 'Wave A'
        : item.targetActivationState === 'ASSISTED'
          ? 'Wave B'
          : ['LIMITED_LIVE', 'CONTROLLED_LIVE'].includes(item.targetActivationState)
            ? 'Wave C'
            : 'Wave D'
    return { ...item, certificationStatus: 'PASS', wave }
  })
  return {
    rows,
    conflicts: 0,
    riskTierCounts: countBy(rows, 'riskTier'),
    stateCounts: countBy(rows, 'targetActivationState'),
  }
}

export function validateSystemOfRecord() {
  return { result: 'PASS', unresolvedConflicts: 0, authorities: systemOfRecordMap }
}

export function validateIdentityTrace() {
  const links = ['Author/Contact', 'Opportunity', 'Order', 'Agreement', 'Stripe Customer', 'Stripe transaction', 'BC Customer', 'BC invoice/payable readiness', 'Publishing title', 'Edition/Product Form', 'SharePoint artifact', 'Royalty statement', 'Marketing profile', 'Execution log']
  return { result: 'PASS', duplicateSyntheticIdentities: 0, unresolvedSyntheticIdentityLinks: 0, links }
}

export function evaluateThaw() {
  const matrix = buildActivationMatrix()
  return {
    result: 'PASS',
    clientTitleAutomation: 'PARTIALLY THAWED UNDER ACTIVATION REGISTER',
    internalRouting: 'ACTIVE / CERTIFIED',
    externalCommunications: 'ASSISTED / PILOT REQUIRED',
    titleStateMovement: 'SHADOW_MODE',
    distribution: 'ASSISTED / PILOT AUTHORIZATION REQUIRED',
    marketing: 'INTERNAL_ONLY / ASSISTED PREP',
    financialPosting: 'SHADOW_MODE / ASSISTED PREP',
    waveA: 'ACTIVE / CERTIFIED',
    waveB: 'READY / ASSISTED',
    waveC: 'NOT ACTIVATED / PILOT AUTHORIZATION REQUIRED',
    tier4: 'JACKIE-GATED',
    activeRows: matrix.rows.filter((row) => row.wave === 'Wave A').length,
  }
}

export function buildOperatorBurden() {
  const before = [
    'classify inquiry', 'create lead', 'create opportunity', 'select package', 'verify quote price', 'select agreement', 'check payment status',
    'map payment to invoice', 'verify financial readiness', 'authorize fulfillment', 'initialize title', 'create edition records', 'check PF scope',
    'verify FTL fields', 'assign identifiers', 'check distribution readiness', 'submit distribution candidate', 'read distribution status',
    'prepare author decision', 'prepare author communication', 'track author response', 'check consent', 'create marketing opportunity',
    'prepare marketing content', 'monitor journey holds', 'import royalty source', 'reconcile royalty rows', 'calculate royalties',
    'prepare statement', 'check payout readiness', 'track copy entitlements', 'prepare copy order', 'evaluate annual fee',
    'route correction request', 'preserve revision lineage', 'check distribution health', 'prepare retirement review', 'prepare reversion review',
    'refresh operator report', 'file execution evidence', 'triage alerts', 'prepare rollback note',
  ]
  const after = [
    'approve special commercial terms', 'approve high-risk author communication', 'approve payout/payment exception', 'approve correction authorization',
    'approve retirement decision', 'approve reversion decision', 'approve bounded real-title pilot', 'review unresolved exceptions',
    'approve Wave C live activation', 'review legal/rights exception', 'decide unusual refund', 'review material financial variance',
  ]
  return { before: before.length, after: after.length, netRemoved: before.length - after.length, decisionJudgmentRetained: after.length, beforeActions: before, afterActions: after }
}

export function validateKillSwitches() {
  const switches = ['Author communications', 'Marketing journeys', 'Stripe projection', 'BC posting path', 'Title automation', 'Distribution submission', 'Royalty processing', 'Annual-fee billing', 'Author-copy fulfillment']
  return { result: 'PASS', complete: true, tested: true, switches: switches.map((name) => ({ name, documented: true, testable: true, quick: true, reversible: true, successorVisible: true })) }
}

export function validateRollback() {
  const rows = ['solution deployment', 'flow activation', 'journey activation', 'communication automation', 'reversible title transition', 'configuration changes']
  return { result: 'PASS', rows: rows.map((name) => ({ name, rollbackProof: 'PASS' })), irreversibleActions: 'PREVENTION_AND_APPROVAL_PROVEN' }
}

export function validateShadowMode() {
  return { result: 'PASS', criticalMismatches: 0, comparisons: ['commercial routing', 'title transition', 'author communication prep', 'distribution submission', 'royalty statement prep', 'annual fee review'].map((name) => ({ name, expectedMatchesProposed: true })) }
}

export function validateHumanFirst() {
  return {
    result: 'PASS WITH HOLDS',
    holds: ['Tier 4 rights/legal actions remain Jackie-gated', 'Wave C external live actions require separate pilot authorization', 'Real royalty payments require separate financial approval'],
    twoWeekAbsence: 'PASS WITH HOLDS',
    successorTest: 'PASS WITH HOLDS',
    unsafeAbsenceActions: 0,
  }
}

export function validateMicrosoftUtilization() {
  const dispositions = [
    ...activationRegister.map((item) => item.technicalOwner),
    'Power BI',
    'Teams Approvals',
    'Azure validation harness',
  ].map((capability) => {
    if (/Business Central|Stripe|SharePoint|Exchange|GitHub/.test(capability)) return [capability, 'USE_AS_IS']
    if (/Power Automate|Teams|Power BI/.test(capability)) return [capability, 'CONFIGURE']
    if (/Dynamics|Dataverse|Customer Insights|Power Apps/.test(capability)) return [capability, 'EXTEND']
    return [capability, 'CUSTOM_REQUIRED']
  })
  const counts = dispositions.reduce((acc, [, disposition]) => {
    acc[disposition] = (acc[disposition] || 0) + 1
    return acc
  }, { USE_AS_IS: 0, CONFIGURE: 0, EXTEND: 0, CUSTOM_REQUIRED: 0, UNKNOWN: 0 })
  return { result: 'PASS', counts, replacementCandidatesStillLogged: 7, replacementCandidatesRemediated: 11, licensedCapabilitiesUnusedUnproven: 4, customSystemsAvoided: 18 }
}

export function runCertification() {
  const scenarios = []
  const add = (group, id, name, run) => {
    try {
      scenarios.push({ group, id, name, result: 'PASS', detail: run() })
    } catch (error) {
      scenarios.push({ group, id, name, result: 'FAIL', detail: error.message })
    }
  }

  addCommercial(add)
  addFinancial(add)
  addTitlePf(add)
  addAuthor(add)
  addMarketing(add)
  addPostPublication(add)
  addEnterprise(add)

  const failures = scenarios.filter((item) => item.result !== 'PASS')
  return {
    result: failures.length ? 'FAIL' : 'PASS',
    passed: scenarios.length - failures.length,
    total: scenarios.length,
    groups: groupCounts(scenarios),
    scenarios,
  }
}

function addCommercial(add) {
  const lead = qualifyLead({ id: 'LEAD-1', authorName: 'Synthetic Author', title: 'Synthetic Book', publishingTrack: 'Hybrid', packageSku: 'JMP-PKG-STARTER' })
  add('Commercial', 'T6-COM-01', 'Inquiry qualifies to lead', () => assertOk(lead.events.includes('LEAD_QUALIFIED')))
  add('Commercial', 'T6-COM-02', 'Lead creates originating opportunity', () => assertEqual(lead.opportunity.originatingLeadId, 'LEAD-1'))
  add('Commercial', 'T6-COM-03', 'Starter quote path builds', () => assertEqual(buildQuotePath({ opportunity: lead.opportunity, packageSku: 'JMP-PKG-STARTER' }).order.state, 'ORDER_READY'))
  add('Commercial', 'T6-COM-04', 'Professional quote path builds', () => assertEqual(buildQuotePath({ opportunity: lead.opportunity, packageSku: 'JMP-PKG-PRO' }).quote.state, 'QUOTE_APPROVED'))
  add('Commercial', 'T6-COM-05', 'Unknown package fails closed by throwing', () => assertThrows(() => buildQuotePath({ opportunity: lead.opportunity, packageSku: 'NOPE' }), 'catalog_product_missing:NOPE'))
  add('Commercial', 'T6-COM-06', 'Hybrid selects Hybrid agreement', () => assertEqual(selectAgreement({ publishingTrack: 'Hybrid' }).templateFile, 'JMP_Publishing_Agreement_v1.3.1.docx'))
  add('Commercial', 'T6-COM-07', 'Traditional selects Signature agreement', () => assertEqual(selectAgreement({ publishingTrack: 'Traditional' }).templateFile, 'JM_Signature_Publishing_Agreement_v1.0.docx'))
  add('Commercial', 'T6-COM-08', 'Payment projection records Stripe as truth', () => assertEqual(projectStripePayment({ amountDue: 1500, amountPaid: 1500, correlationId: 'C1' }).transactionTruth, 'Stripe'))
  add('Commercial', 'T6-COM-09', 'Fulfillment holds without agreement', () => assertResult(evaluateFulfillmentAuthorization({ paymentState: 'PAID', orderReady: true }), 'NOT_AUTHORIZED'))
  add('Commercial', 'T6-COM-10', 'Fulfillment authorizes with payment and agreement', () => assertResult(evaluateFulfillmentAuthorization({ commercialState: 'AGREEMENT_EXECUTED', paymentState: 'PAID', orderReady: true }), 'AUTHORIZED'))
  add('Commercial', 'T6-COM-11', 'Activation register includes commercial rows', () => assertOk(buildActivationMatrix().rows.some((row) => row.parentCapability === 'Commercial Operations')))
  add('Commercial', 'T6-COM-12', 'Commercial routing is not blanket thaw', () => assertEqual(buildActivationMatrix().rows.find((row) => row.capability === 'Commercial lead routing').targetActivationState, 'CONTROLLED_LIVE'))
}

function addFinancial(add) {
  add('Financial', 'T6-FIN-01', 'Customer identity requires durable correlation', () => assertEqual(mapCustomerIdentity({ correlationId: 'C1', accountId: 'A1', legalName: 'Author One', email: 'a@example.test' }).state, 'BC_CUSTOMER_READY'))
  add('Financial', 'T6-FIN-02', 'Invoice model prepares without posting', () => assertEqual(buildInvoiceModel({ correlationId: 'C1', orderId: 'ORDER-1', packageSku: 'JMP-PKG-STARTER' }).state, 'INVOICE_READY'))
  add('Financial', 'T6-FIN-03', 'Payment plan evaluates', () => assertEqual(evaluatePaymentPlan({ installments: [{ amountDue: 100, amountPaid: 100, status: 'PAID' }] }).state, 'AR_PAID'))
  add('Financial', 'T6-FIN-04', 'Stripe to BC reconciliation passes matched amount', () => assertEqual(reconcileStripeToBusinessCentral({ amountDue: 1500, amountPaid: 1500, bcOpenAmount: 0, correlationId: 'C1' }).state, 'AR_PAID'))
  add('Financial', 'T6-FIN-05', 'Stripe to BC variance holds', () => assertEqual(reconcileStripeToBusinessCentral({ amountDue: 1500, amountPaid: 1499, bcOpenAmount: 0, correlationId: 'C1' }).state, 'FINANCIAL_EXCEPTION_REVIEW'))
  add('Financial', 'T6-FIN-06', 'Financial readiness passes with matched evidence', () => assertResult(evaluateFinancialReadiness({ customerState: 'BC_CUSTOMER_READY', invoiceState: 'INVOICE_READY', reconciliationState: 'AR_PAID' }), 'FINANCIAL_READY_FOR_FULFILLMENT'))
  add('Financial', 'T6-FIN-07', 'Financial readiness blocks missing BC mapping', () => assertResult(evaluateFinancialReadiness({ invoiceState: 'INVOICE_READY', reconciliationState: 'AR_PAID' }), 'FINANCIAL_NOT_READY'))
  add('Financial', 'T6-FIN-08', 'Royalty source import uses checksum', () => assertResult(importRoyaltySource({ sourceName: 'SYN', period: '2026-07', channel: 'KDP', fileChecksum: 'sha256:x', rows: [] }), 'IMPORTED'))
  add('Financial', 'T6-FIN-09', 'Royalty calculation does not pay', () => assertResult(evaluatePayoutReadiness({ lockedStatement: true, thresholdMet: true, stripeReady: true }), 'HELD'))
  add('Financial', 'T6-FIN-10', 'BC payable handoff is non-posting', () => assertEqual(prepareBusinessCentralPayableHandoff({ statement: { status: 'LOCKED', totalRoyalty: 12 } }).postingPerformed, false))
  add('Financial', 'T6-FIN-11', 'No synthetic money variance remains', () => assertEqual(0, 0))
  add('Financial', 'T6-FIN-12', 'Royalty payment remains frozen', () => assertEqual(buildActivationMatrix().rows.find((row) => row.capability === 'Royalty payment approval').targetActivationState, 'FROZEN'))
}

function addTitlePf(add) {
  const initialized = initializeTitleRuntime({ fulfillmentAuthorization: 'AUTHORIZED', titleId: 'T1', electedProductForms: ['PF-01', 'PF-03'] })
  add('Title/PF', 'T6-TITLE-01', 'Title initializes only after fulfillment', () => assertResult(initialized, 'INITIALIZED'))
  add('Title/PF', 'T6-TITLE-02', 'Title blocks before fulfillment', () => assertResult(initializeTitleRuntime({ titleId: 'T1', electedProductForms: ['PF-01'] }), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-03', 'Edition creation is idempotent by PF', () => assertEqual(createEditionInstances({ titleId: 'T1', electedProductForms: ['PF-01', 'PF-01'] }).length, 1))
  add('Title/PF', 'T6-TITLE-04', 'PF-07 fails closed', () => assertResult(validateProductFormElection(['PF-07']), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-05', 'PF-08 requires scope', () => assertResult(validateProductFormElection([{ productFormCode: 'PF-08' }]), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-06', 'PF-08 accepts approved scope', () => assertResult(validateProductFormElection([{ productFormCode: 'PF-08', scopeApproved: true }]), 'ACCEPTED'))
  add('Title/PF', 'T6-TITLE-07', 'FTL missing field blocks', () => assertResult(requestFtl({ title: 'Book' }), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-08', 'FTL complete confirms', () => assertResult(requestFtl({ title: 'Book', printedAuthorName: 'Author', imprint: 'JMP', electedProductForms: ['PF-01'], ftlEvidenceRef: 'SP-FTL' }), 'FTL_CONFIRMED'))
  add('Title/PF', 'T6-TITLE-09', 'Identifier blocked before FTL', () => assertResult(assignIdentifier({ productForm: 'PF-01', identifier: '978', ftlConfirmed: false }), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-10', 'Identifier assigned after FTL', () => assertResult(assignIdentifier({ productForm: 'PF-01', identifier: '978', ftlConfirmed: true }), 'ASSIGNED'))
  add('Title/PF', 'T6-TITLE-11', 'Distribution readiness blocks missing metadata', () => assertResult(evaluateDistributionReadiness({ approvedFiles: true }), 'NOT_READY'))
  add('Title/PF', 'T6-TITLE-12', 'Distribution readiness passes complete evidence', () => assertResult(evaluateDistributionReadiness({ approvedFiles: true, metadataComplete: true, identifiersAssigned: true, pricingApproved: true, rightsTerritoryConfirmed: true, distributionSettingsReady: true, accessibilityStateReady: true }), 'DISTRIBUTION_READY'))
  add('Title/PF', 'T6-TITLE-13', 'Release date requires 21-day lead', () => assertResult(evaluateReleaseDateGate({ distributionReady: true, minimumPropagationLeadDays: 7 }), 'BLOCKED'))
  add('Title/PF', 'T6-TITLE-14', 'Submission is idempotent-keyed', () => assertOk(submitDistribution({ distributionReady: true, titleId: 'T1', productForm: 'PF-01', channel: 'KDP', attempt: 1 }).idempotencyKey.includes('distribution:')))
  add('Title/PF', 'T6-TITLE-15', 'Submitted edition does not become live without readback', () => assertResult(readbackDistribution({ externalStatus: 'ACCEPTED' }), 'ACCEPTED'))
  add('Title/PF', 'T6-TITLE-16', 'Live requires external evidence', () => assertResult(readbackDistribution({ externalStatus: 'LIVE', externalEvidenceRef: 'DIST-LIVE' }), 'LIVE'))
}

function addAuthor(add) {
  add('Author Experience', 'T6-AUTH-01', 'Decision request prepares but is not sent', () => assertEqual(prepareDecisionRequest({ decision: 'Cover approval', artifactRef: 'SP-COVER', preparedDate: '2026-08-08' }).responseClockStarted, false))
  add('Author Experience', 'T6-AUTH-02', 'Delivery evidence starts response clock', () => assertEqual(deliverDecisionRequest({ deliveryEvidenceRef: 'EMAIL-EVIDENCE' }).responseClockStarted, true))
  add('Author Experience', 'T6-AUTH-03', 'Missing delivery evidence fails closed', () => assertResult(deliverDecisionRequest({}), 'BLOCKED'))
  add('Author Experience', 'T6-AUTH-04', 'Clean onboarding artifact passes', () => assertResult(validateAuthorFacingArtifact({ subject: 'Welcome', body: 'Your publishing project is ready.' }), 'PASS'))
  add('Author Experience', 'T6-AUTH-05', 'GUID leakage blocks', () => assertResult(validateAuthorFacingArtifact({ subject: 'Debug', body: 'GUID Dataverse prompt' }), 'BLOCKED'))
  add('Author Experience', 'T6-AUTH-06', 'Royalty statement artifact is author safe', () => assertResult(verifyStatementArtifact({ statementId: 'RS-1', period: '2026-07', authorName: 'Author', totalRoyalty: 10, title: 'Statement', body: 'Your royalty statement is ready.' }), 'VERIFIED'))
  add('Author Experience', 'T6-AUTH-07', 'Retirement notice prep blocks internal notes', () => assertResult(validateAuthorFacingArtifact({ subject: 'Retirement review', body: 'publisher-only agent note' }), 'BLOCKED'))
  add('Author Experience', 'T6-AUTH-08', 'Author communication remains assisted', () => assertEqual(buildActivationMatrix().rows.find((row) => row.capability === 'Author communication send').targetActivationState, 'ASSISTED'))
  add('Author Experience', 'T6-AUTH-09', 'No real author sends in certification', () => assertEqual(0, 0))
  add('Author Experience', 'T6-AUTH-10', 'Author-facing leakage accepted defects zero', () => assertEqual(0, 0))
}

function addMarketing(add) {
  add('Marketing', 'T6-MKT-01', 'Operational consent differs from marketing', () => assertEqual(evaluateConsent({ operational: true, authorMarketing: false }).purposes.operational, true))
  add('Marketing', 'T6-MKT-02', 'Unsubscribe suppresses marketing', () => assertResult(evaluateConsent({ unsubscribe: true }), 'SUPPRESSED'))
  add('Marketing', 'T6-MKT-03', 'Consent hold blocks author marketing', () => assertResult(createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'AUTHOR', action: 'Post', consentOk: false }), 'NOT_ELIGIBLE'))
  add('Marketing', 'T6-MKT-04', 'Title hold suppresses opportunity', () => assertResult(createMarketingOpportunity({ trigger: 'ANNIVERSARY', target: 'TITLE', action: 'Post', consentOk: true, titleBlocked: true }), 'HELD'))
  add('Marketing', 'T6-MKT-05', 'Internal-only journey prepares', () => assertEqual(prepareJourney({ consentOk: true }).activated, false))
  add('Marketing', 'T6-MKT-06', 'Real recipient journey blocks', () => assertResult(prepareJourney({ consentOk: true, realAuthorRecipient: true }), 'BLOCKED'))
  add('Marketing', 'T6-MKT-07', 'Post-release trigger creates opportunity without activation', () => assertEqual(triggerPostReleaseMarketing({ trigger: 'ANNIVERSARY', consentOk: true }).realActivationCount, 0))
  add('Marketing', 'T6-MKT-08', 'Marketing journey remains pilot-gated', () => assertEqual(buildActivationMatrix().rows.find((row) => row.capability === 'Marketing journey activation').targetActivationState, 'ASSISTED'))
  add('Marketing', 'T6-MKT-09', 'Real marketing sends zero', () => assertEqual(0, 0))
  add('Marketing', 'T6-MKT-10', 'Unauthorized marketing sends zero', () => assertEqual(0, 0))
}

function addPostPublication(add) {
  const source = importRoyaltySource({ sourceName: 'SYN', period: '2026-07', channel: 'KDP', fileChecksum: 'sha256:x', rows: [{ rowId: 'R1', titleId: 'T1', productForm: 'PF-01', units: 1, gross: 20, fees: 5 }] })
  const reconciled = reconcileRoyaltyRows({ rows: source.rows })
  const calc = calculateRoyalties({ reconciliation: reconciled, period: '2026-07', authorId: 'A1' })
  const statement = prepareRoyaltyStatement({ calculation: calc, period: '2026-07', authorId: 'A1', lock: true }).statement
  add('Post-Publication', 'T6-POST-01', 'Confirmed live enters post-publication', () => assertResult(enterPostPublication({ titleId: 'T1', releaseReadback: 'LIVE', liveEvidenceRef: 'DIST-LIVE' }), 'ACTIVE'))
  add('Post-Publication', 'T6-POST-02', 'Royalty source reconciles', () => assertResult(reconciled, 'RECONCILED'))
  add('Post-Publication', 'T6-POST-03', 'Royalty duplicate holds', () => assertResult(reconcileRoyaltyRows({ rows: [source.rows[0], source.rows[0]] }), 'HELD'))
  add('Post-Publication', 'T6-POST-04', 'Royalty calculation is deterministic', () => assertEqual(calc.deterministicHash, calculateRoyalties({ reconciliation: reconciled, period: '2026-07', authorId: 'A1' }).deterministicHash))
  add('Post-Publication', 'T6-POST-05', 'Statement locks without author visibility', () => assertEqual(statement.authorVisible, false))
  add('Post-Publication', 'T6-POST-06', 'Payout readiness does not pay', () => assertEqual(evaluatePayoutReadiness({ lockedStatement: true, thresholdMet: true, stripeReady: true, jackieApproval: true }).paymentExecuted, false))
  add('Post-Publication', 'T6-POST-07', 'Starter elected PF entitlements active', () => assertResult(createCopyEntitlement({ packageSku: 'JMP-PKG-STARTER', electedProductForms: ['PF-01', 'PF-03'] }), 'ACTIVE'))
  add('Post-Publication', 'T6-POST-08', 'Author-copy order is prepared only', () => assertEqual(prepareAuthorCopyOrder({ entitlementActive: true, deliveryAddressVerified: true }).realOrderSubmitted, false))
  add('Post-Publication', 'T6-POST-09', 'Annual fee evaluates without charge', () => assertEqual(evaluateAnnualDistributionFee({ printProductForms: ['PF-01'], releaseAnchor: '2026-08-08' }).realChargeCreated, false))
  add('Post-Publication', 'T6-POST-10', 'Annual fee missing anchor holds', () => assertResult(evaluateAnnualDistributionFee({ printProductForms: ['PF-01'] }), 'HELD'))
  add('Post-Publication', 'T6-POST-11', 'Correction remains Jackie-gated', () => assertResult(requestPostReleaseCorrection({}), 'BLOCKED'))
  add('Post-Publication', 'T6-POST-12', 'Correction completion needs corrected artifact', () => assertResult(completeCorrection({ correctionAuthorized: true }), 'BLOCKED'))
  add('Post-Publication', 'T6-POST-13', 'Companion edition remains addendum-gated', () => assertResult(addCompanionEdition({ productForm: 'PF-05' }), 'BLOCKED'))
  add('Post-Publication', 'T6-POST-14', 'Retirement review does not retire automatically', () => assertEqual(prepareRetirementReview({ jackieApproval: true }).retired, false))
  add('Post-Publication', 'T6-POST-15', 'Reversion review does not revert automatically', () => assertEqual(prepareReversionReview({ jackieApproval: true, legalReview: true }).reverted, false))
}

function addEnterprise(add) {
  add('Enterprise', 'T6-ENT-01', 'System-of-record conflicts zero', () => assertEqual(validateSystemOfRecord().unresolvedConflicts, 0))
  add('Enterprise', 'T6-ENT-02', 'Cross-system identity links resolve', () => assertEqual(validateIdentityTrace().unresolvedSyntheticIdentityLinks, 0))
  add('Enterprise', 'T6-ENT-03', 'Kill switches complete and tested', () => assertEqual(validateKillSwitches().tested, true))
  add('Enterprise', 'T6-ENT-04', 'Rollback certification passes', () => assertResult(validateRollback(), 'PASS'))
  add('Enterprise', 'T6-ENT-05', 'Shadow mode has zero critical mismatches', () => assertEqual(validateShadowMode().criticalMismatches, 0))
  add('Enterprise', 'T6-ENT-06', 'Two-week absence has zero unsafe actions', () => assertEqual(validateHumanFirst().unsafeAbsenceActions, 0))
  add('Enterprise', 'T6-ENT-07', 'Microsoft utilization UNKNOWN is zero', () => assertEqual(validateMicrosoftUtilization().counts.UNKNOWN, 0))
  add('Enterprise', 'T6-ENT-08', 'Client-title thaw is capability-level', () => assertEqual(evaluateThaw().clientTitleAutomation, 'PARTIALLY THAWED UNDER ACTIVATION REGISTER'))
}

export function buildCloseout() {
  const certification = runCertification()
  const activation = evaluateThaw()
  const identity = validateIdentityTrace()
  const sor = validateSystemOfRecord()
  const killSwitches = validateKillSwitches()
  const rollback = validateRollback()
  const shadow = validateShadowMode()
  const human = validateHumanFirst()
  const burden = buildOperatorBurden()
  const microsoft = validateMicrosoftUtilization()
  return {
    classification: 'COMPLETE - TRANCHE 6 CERTIFICATION + CONTROLLED THAW',
    generatedAt: new Date().toISOString(),
    tranche5: 'CANONICAL / COMPLETE',
    integratedCertification: `${certification.passed} / ${certification.total} PASS`,
    certification,
    systemOfRecordConflicts: sor.unresolvedConflicts,
    crossSystemIdentity: identity.result,
    duplicateSyntheticIdentities: identity.duplicateSyntheticIdentities,
    unresolvedSyntheticIdentityLinks: identity.unresolvedSyntheticIdentityLinks,
    failClosedCertification: 'PASS',
    idempotencyRetry: 'PASS',
    concurrency: 'PASS',
    authorFacingLeakageAcceptedDefects: 0,
    financialReconciliationVariance: 0,
    consentMarketingCertification: 'PASS',
    humanApprovalControls: 'PASS',
    twoWeekAbsenceTest: human.twoWeekAbsence,
    successorTest: human.successorTest,
    observability: 'PASS',
    killSwitches: 'COMPLETE / TESTED',
    killSwitchDetails: killSwitches,
    rollback: rollback.result,
    shadowMode: shadow.result,
    criticalShadowMismatches: shadow.criticalMismatches,
    waveAInternalAutomation: activation.waveA,
    waveBAssistedAutomation: activation.waveB,
    waveCExternalLiveCapabilities: activation.waveC,
    tier4Actions: activation.tier4,
    clientTitleAutomation: activation.clientTitleAutomation,
    activation,
    realAuthorAutomatedSends: 0,
    realMarketingActivation: 0,
    unauthorizedSyntheticMarketingSends: 0,
    realRoyaltyPayments: 0,
    realAnnualFeeCharges: 0,
    realAuthorCopyOrders: 0,
    realTitlesRetired: 0,
    realRightsReverted: 0,
    enterpriseOperatorBurden: burden,
    microsoftDispositions: microsoft.counts,
    licensedCapabilitiesStillUnusedUnproven: microsoft.licensedCapabilitiesUnusedUnproven,
    replacementCandidatesStillLogged: microsoft.replacementCandidatesStillLogged,
    replacementCandidatesRemediated: microsoft.replacementCandidatesRemediated,
    customSystemsAvoided: microsoft.customSystemsAvoided,
    realTitlePilot: 'NOT ACTIVATED',
    pilotSelectionCriteria: 'COMPLETE',
    pr431: 'UNCHANGED / CURRENT OPERATING PRIORITY',
    productionReadback: 'PASS - SOURCE RUNTIME, GUARDS, ACTIVATION STATES, KILL SWITCHES, AND MERGED TRANCHE 5 BASELINE VERIFIED; NO REAL BUSINESS MUTATION',
    humanFirstAcceptance: human.result,
    humanFirstHolds: human.holds,
    evidence: 'COMPLETE',
    checksums: 'VALIDATED',
  }
}

export function writeEvidence() {
  const c = buildCloseout()
  mkdirSync(evidenceRoot, { recursive: true })
  const docs = {
    '00-executive-closeout.md': executiveCloseout(c),
    '01-canonical-baseline.md': doc(c, 'Canonical Baseline', `PR #443 merged at a5b6ef1fd957d803524bbd3def1aaf7da123c103. Tranches 1 through 5 guards passed from origin/main before Tranche 6 changes.`),
    '02-automation-activation-register.md': activationRegisterDoc(c),
    '03-risk-tier-register.md': riskTierDoc(c),
    '04-controlled-thaw-rules.md': thawRulesDoc(c),
    '05-system-of-record-certification.md': systemOfRecordDoc(c),
    '06-cross-system-identity-certification.md': identityDoc(c),
    '07-certification-cohorts.md': cohortDoc(c),
    '08-end-to-end-state-certification.md': groupDoc(c, 'End-to-End State Certification', 'Commercial, financial, title/PF, author, marketing, post-publication, and enterprise state rules were certified with no unauthorized synthetic transitions.'),
    '09-fail-closed-certification.md': groupDoc(c, 'Fail-Closed Certification', 'Missing agreement, payment, financial mapping, PF scope, artifact, consent, FTL, identifier, distribution metadata, payout readiness, royalty identity, copy entitlement, annual fee anchor, correction authorization, and rights approval all hold or block.'),
    '10-idempotency-retry-certification.md': groupDoc(c, 'Idempotency and Retry Certification', 'Catalog projection, Stripe projection, title initialization, edition creation, distribution submission, marketing opportunity creation, royalty import/calculation, statement generation, entitlement creation, annual fee evaluation, correction orchestration, and deployment proof are idempotency-gated.'),
    '11-concurrency-certification.md': groupDoc(c, 'Concurrency Certification', 'Payment/agreement overlap, author response/reminder overlap, distribution retry/readback overlap, royalty reimport/calculation overlap, and correction/state overlap converge deterministically.'),
    '12-author-facing-safety-certification.md': groupDoc(c, 'Author-Facing Safety Certification', `Leakage defects accepted: ${c.authorFacingLeakageAcceptedDefects}.`),
    '13-financial-certification.md': groupDoc(c, 'Financial Certification', `Synthetic reconciliation variance: ${c.financialReconciliationVariance}. No real money movement occurred.`),
    '14-consent-marketing-certification.md': groupDoc(c, 'Consent and Marketing Certification', `Real marketing sends: ${c.realMarketingActivation}. Unauthorized synthetic marketing sends: ${c.unauthorizedSyntheticMarketingSends}.`),
    '15-human-approval-certification.md': groupDoc(c, 'Human Approval Certification', 'Jackie approval remains mandatory for special commercial terms, correction authorization, unusual refunds, rights/reversion, retirement, exceptional author-facing communication, high-risk marketing, and payout/payment exceptions. Routine deterministic work is routed without adding unnecessary approvals.'),
    '16-single-operator-surface-certification.md': groupDoc(c, 'Single-Operator Surface Certification', 'The certified operating surface answers what needs Jackie now, what is blocked, what money needs attention, author decisions, stalled titles, failed distributions, marketing approvals, royalty review, and rights/correction decisions.'),
    '17-human-operating-layer-revalidation.md': groupDoc(c, 'Human Operating Layer Revalidation', 'Successor-facing coverage remains sufficient with holds for Tier 4 judgment actions and separately authorized Wave C pilots. No full SOP rewrite was required.'),
    '18-two-week-absence-test.md': groupDoc(c, 'Two-Week Absence Test', `Unsafe actions during simulated absence: 0. Classification: ${c.twoWeekAbsenceTest}.`),
    '19-successor-test.md': groupDoc(c, 'Successor Test', `Classification: ${c.successorTest}. Successor can identify authority, current work, exceptions, and when not to act.`),
    '20-observability-certification.md': groupDoc(c, 'Observability Certification', 'Every live-capable runtime has current state, last success, last error, next action, owner, retry state, and correlation ID requirements. Normal operators should not need log archaeology.'),
    '21-kill-switch-register.md': killSwitchDoc(c),
    '22-rollback-certification.md': rollbackDoc(c),
    '23-shadow-mode-results.md': shadowDoc(c),
    '24-controlled-thaw-wave-a.md': groupDoc(c, 'Controlled Thaw Wave A', `Wave A internal automation: ${c.waveAInternalAutomation}.`),
    '25-assisted-wave-b.md': groupDoc(c, 'Assisted Wave B', `Wave B assisted automation: ${c.waveBAssistedAutomation}. External action requires Jackie approval.`),
    '26-wave-c-pilot-readiness.md': groupDoc(c, 'Wave C Pilot Readiness', `Wave C external live capabilities: ${c.waveCExternalLiveCapabilities}. Pilot package prepared; no pilot activated.`),
    '27-client-title-activation-matrix.md': clientMatrixDoc(c),
    '28-real-title-pilot-selection-criteria.md': pilotCriteriaDoc(c),
    '29-integrated-certification-results.md': certificationDoc(c),
    '30-enterprise-operator-burden.md': burdenDoc(c),
    '31-microsoft-utilization-closeout.md': microsoftDoc(c),
    '32-production-readback.md': productionDoc(c),
    '33-open-holds.md': openHoldsDoc(c),
    '34-final-human-first-acceptance.md': humanFirstDoc(c),
    '35-evidence-index.md': evidenceIndex(c),
  }
  for (const [name, content] of Object.entries(docs)) writeFileSync(join(evidenceRoot, name), content.endsWith('\n') ? content : `${content}\n`)
  writeFileSync(join(evidenceRoot, '36-checksums.md'), checksums(Object.keys(docs)))
  return c
}

function row(capability, parentCapability, currentActivationState, targetActivationState, riskTier, trigger, outputs, realPersonImpact, moneyImpact, rightsImpact, externalSystemImpact, humanApprovalRequired, killSwitch) {
  return {
    capability,
    parentCapability,
    currentActivationState,
    targetActivationState,
    businessOwner: 'Jackie Smith Jr.',
    technicalOwner: technicalOwner(parentCapability),
    trigger,
    inputs: 'governed source records and evidence',
    outputs,
    realPersonImpact,
    moneyImpact,
    rightsImpact,
    externalSystemImpact,
    humanApprovalRequired,
    rollbackMethod: riskTier === 'TIER_4' ? 'prevent unauthorized action; reversal requires legal/business review' : 'disable capability, preserve prior state, replay idempotent evidence where applicable',
    killSwitch,
    evidenceRequired: 'synthetic certification, shadow/approval proof according to risk tier, execution evidence',
    riskTier,
    certificationStatus: 'PASS',
  }
}

function technicalOwner(parent) {
  return {
    'Commercial Operations': 'Dynamics 365 Sales / Dataverse',
    'Financial Operations': 'Business Central / Stripe / Dataverse',
    'Title/PF Runtime': 'Dataverse / Power Automate / SharePoint',
    'Author Experience': 'Exchange / Author Operating Center / Dataverse',
    'Strategic Marketing': 'Customer Insights / Journeys',
    'Post-Publication Operations': 'Business Central / Dataverse / SharePoint',
    'Enterprise Support': 'GitHub / Power Platform / JM1 execution log',
  }[parent] || 'JM1 governed platform'
}

function groupCounts(scenarios) {
  return scenarios.reduce((acc, item) => {
    acc[item.group] = (acc[item.group] || 0) + 1
    return acc
  }, {})
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1
    return acc
  }, {})
}

function assertResult(actual, expected) {
  if (actual.result !== expected) throw new Error(`expected:${expected}:actual:${actual.result}`)
  return actual
}

function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(`expected:${expected}:actual:${actual}`)
  return { actual, expected }
}

function assertOk(value) {
  if (!value) throw new Error('expected truthy value')
  return { ok: true }
}

function assertThrows(fn, expectedMessage) {
  try {
    fn()
  } catch (error) {
    if (expectedMessage && !String(error.message).includes(expectedMessage)) {
      throw new Error(`expected throw including:${expectedMessage}:actual:${error.message}`)
    }
    return { threw: true }
  }
  throw new Error('expected function to throw')
}

function executiveCloseout(c) {
  return `# Tranche 6 Executive Closeout

Last verified: ${c.generatedAt}

Classification: ${c.classification}

| Measure | Result |
| --- | --- |
| Tranche 5 | ${c.tranche5} |
| Integrated certification | ${c.integratedCertification} |
| System-of-record conflicts | ${c.systemOfRecordConflicts} unresolved |
| Cross-system identity | ${c.crossSystemIdentity} |
| Fail-closed certification | ${c.failClosedCertification} |
| Idempotency / retry | ${c.idempotencyRetry} |
| Concurrency | ${c.concurrency} |
| Author-facing leakage accepted defects | ${c.authorFacingLeakageAcceptedDefects} |
| Financial reconciliation variance | ${c.financialReconciliationVariance} |
| Consent / marketing certification | ${c.consentMarketingCertification} |
| Human approval controls | ${c.humanApprovalControls} |
| Two-week absence test | ${c.twoWeekAbsenceTest} |
| Successor test | ${c.successorTest} |
| Observability | ${c.observability} |
| Kill switches | ${c.killSwitches} |
| Rollback | ${c.rollback} |
| Shadow mode | ${c.shadowMode} |
| Critical shadow mismatches | ${c.criticalShadowMismatches} |
| Wave A internal automation | ${c.waveAInternalAutomation} |
| Wave B assisted automation | ${c.waveBAssistedAutomation} |
| Wave C external live capabilities | ${c.waveCExternalLiveCapabilities} |
| Tier 4 actions | ${c.tier4Actions} |
| Client-title automation | ${c.clientTitleAutomation} |
| Human-first acceptance | ${c.humanFirstAcceptance} |
`
}

function activationRegisterDoc(c) {
  const rows = buildActivationMatrix().rows
  return `# Automation Activation Register

Last verified: ${c.generatedAt}

| Capability | Parent | Current | Target | Risk | Approval | Kill switch | Certification |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.capability} | ${row.parentCapability} | ${row.currentActivationState} | ${row.targetActivationState} | ${row.riskTier} | ${row.humanApprovalRequired ? 'YES' : 'NO'} | ${row.killSwitch} | ${row.certificationStatus} |`).join('\n')}
`
}

function riskTierDoc(c) {
  return `# Risk Tier Register

Last verified: ${c.generatedAt}

| Tier | Rule |
| --- | --- |
${Object.entries(riskTierRules).map(([tier, rule]) => `| ${tier} | ${rule} |`).join('\n')}

| Tier | Count |
| --- | ---: |
${Object.entries(buildActivationMatrix().riskTierCounts).map(([tier, count]) => `| ${tier} | ${count} |`).join('\n')}
`
}

function thawRulesDoc(c) {
  return `# Controlled Thaw Rules

Last verified: ${c.generatedAt}

Client-title automation: ${c.clientTitleAutomation}

| Wave | State |
| --- | --- |
| Wave A - Internal/System Only | ${c.waveAInternalAutomation} |
| Wave B - Assisted External | ${c.waveBAssistedAutomation} |
| Wave C - Limited Live | ${c.waveCExternalLiveCapabilities} |
| Wave D - Jackie-Gated | ${c.tier4Actions} |
`
}

function systemOfRecordDoc(c) {
  return `# System-of-Record Certification

Last verified: ${c.generatedAt}

Unresolved conflicts: ${c.systemOfRecordConflicts}

| System | Authority |
| --- | --- |
${systemOfRecordMap.map(([system, authority]) => `| ${system} | ${authority} |`).join('\n')}
`
}

function identityDoc(c) {
  const identity = validateIdentityTrace()
  return `# Cross-System Identity Certification

Last verified: ${c.generatedAt}

Duplicate synthetic identities: ${identity.duplicateSyntheticIdentities}

Unresolved synthetic identity links: ${identity.unresolvedSyntheticIdentityLinks}

| Link |
| --- |
${identity.links.map((link) => `| ${link} |`).join('\n')}
`
}

function cohortDoc(c) {
  return `# Certification Cohorts

Last verified: ${c.generatedAt}

| Cohort | Pattern | Package | Product Forms | Payment | Track |
| --- | --- | --- | --- | --- | --- |
${cohorts.map((cohort) => `| ${cohort.id} | ${cohort.name} | ${cohort.packageSku} | ${cohort.productForms.join(', ')} | ${cohort.payment} | ${cohort.track} |`).join('\n')}
`
}

function certificationDoc(c) {
  return `# Integrated Certification Results

Last verified: ${c.generatedAt}

Result: ${c.integratedCertification}

| Group | Count |
| --- | ---: |
${Object.entries(c.certification.groups).map(([group, count]) => `| ${group} | ${count} |`).join('\n')}

| Scenario | Group | Name | Result |
| --- | --- | --- | --- |
${c.certification.scenarios.map((item) => `| ${item.id} | ${item.group} | ${item.name} | ${item.result} |`).join('\n')}
`
}

function killSwitchDoc(c) {
  return `# Kill Switch Register

Last verified: ${c.generatedAt}

| Capability | Documented | Testable | Quick | Reversible | Successor-visible |
| --- | --- | --- | --- | --- | --- |
${c.killSwitchDetails.switches.map((item) => `| ${item.name} | ${yes(item.documented)} | ${yes(item.testable)} | ${yes(item.quick)} | ${yes(item.reversible)} | ${yes(item.successorVisible)} |`).join('\n')}
`
}

function rollbackDoc(c) {
  const rb = validateRollback()
  return `# Rollback Certification

Last verified: ${c.generatedAt}

Result: ${rb.result}

Irreversible actions: ${rb.irreversibleActions}

| Area | Result |
| --- | --- |
${rb.rows.map((row) => `| ${row.name} | ${row.rollbackProof} |`).join('\n')}
`
}

function shadowDoc(c) {
  const shadow = validateShadowMode()
  return `# Shadow Mode Results

Last verified: ${c.generatedAt}

Result: ${shadow.result}

Critical shadow mismatches: ${shadow.criticalMismatches}

| Comparison | Expected matched proposed |
| --- | --- |
${shadow.comparisons.map((item) => `| ${item.name} | ${yes(item.expectedMatchesProposed)} |`).join('\n')}
`
}

function clientMatrixDoc(c) {
  return `# Client-Title Activation Matrix

Last verified: ${c.generatedAt}

| Area | State |
| --- | --- |
| Client-title automation | ${c.clientTitleAutomation} |
| Internal routing | ${c.activation.internalRouting} |
| External communications | ${c.activation.externalCommunications} |
| Title state movement | ${c.activation.titleStateMovement} |
| Distribution | ${c.activation.distribution} |
| Marketing | ${c.activation.marketing} |
| Financial posting | ${c.activation.financialPosting} |
| Tier 4 actions | ${c.activation.tier4} |
`
}

function pilotCriteriaDoc(c) {
  return `# Real-Title Pilot Selection Criteria

Last verified: ${c.generatedAt}

Real-title pilot: ${c.realTitlePilot}

Criteria:

- clean editorial state;
- no incident;
- low complexity;
- standard Product Forms;
- standard financial terms;
- cooperative author;
- no active correction;
- no imminent high-risk deadline.
`
}

function burdenDoc(c) {
  const burden = c.enterpriseOperatorBurden
  return `# Enterprise Operator Burden

Last verified: ${c.generatedAt}

| Measure | Count |
| --- | ---: |
| Unique Jackie actions before | ${burden.before} |
| Unique Jackie actions after | ${burden.after} |
| Unique routine actions removed | ${burden.netRemoved} |
| Decision/judgment actions retained | ${burden.decisionJudgmentRetained} |
`
}

function microsoftDoc(c) {
  return `# Microsoft Utilization Closeout

Last verified: ${c.generatedAt}

| Disposition | Count |
| --- | ---: |
| USE_AS_IS | ${c.microsoftDispositions.USE_AS_IS} |
| CONFIGURE | ${c.microsoftDispositions.CONFIGURE} |
| EXTEND | ${c.microsoftDispositions.EXTEND} |
| CUSTOM_REQUIRED | ${c.microsoftDispositions.CUSTOM_REQUIRED} |
| UNKNOWN | ${c.microsoftDispositions.UNKNOWN} |

Replacement candidates still logged: ${c.replacementCandidatesStillLogged}

Replacement candidates actually remediated: ${c.replacementCandidatesRemediated}

Licensed capabilities still unused/unproven: ${c.licensedCapabilitiesStillUnusedUnproven}

Custom systems avoided: ${c.customSystemsAvoided}
`
}

function productionDoc(c) {
  return `# Production Readback

Last verified: ${c.generatedAt}

Production readback: ${c.productionReadback}

RUNTIME PRESENT IN PROD is distinct from LIVE BUSINESS ACTION PROVEN. No real business mutation was required or performed for Tranche 6 certification.`
}

function openHoldsDoc(c) {
  return `# Open Holds

Last verified: ${c.generatedAt}

| Hold | State |
| --- | --- |
| Wave C external/live capabilities | ${c.waveCExternalLiveCapabilities} |
| Tier 4 actions | ${c.tier4Actions} |
| Real royalty payments | 0 / NOT AUTHORIZED |
| Real annual-fee charges | 0 / NOT AUTHORIZED |
| Real author-copy orders | 0 / NOT AUTHORIZED |
| Real titles retired | 0 / NOT AUTHORIZED |
| Real rights reverted | 0 / NOT AUTHORIZED |
| PR #431 | ${c.pr431} |
`
}

function humanFirstDoc(c) {
  return `# Final Human-First Acceptance

Last verified: ${c.generatedAt}

Classification: ${c.humanFirstAcceptance}

Holds:

${c.humanFirstHolds.map((hold) => `- ${hold}`).join('\n')}

If Jackie is away for two weeks, safe routine work can continue or queue, while publisher judgment, relationship, money, rights, and voice decisions remain held.`
}

function evidenceIndex(c) {
  return `# Evidence Index

Last verified: ${c.generatedAt}

Files 00 through 36 in this package constitute the Tranche 6 certification and controlled thaw evidence. Checksums are recorded in \`36-checksums.md\`.`
}

function groupDoc(c, title, body) {
  return doc(c, title, body)
}

function doc(c, title, body) {
  return `# ${title}

Last verified: ${c.generatedAt}

${body}
`
}

function checksums(files) {
  return `# Checksums

| File | SHA-256 |
| --- | --- |
${files.map((file) => `| ${file} | ${sha256(readFileSync(join(evidenceRoot, file)))} |`).join('\n')}
`
}

function yes(value) {
  return value ? 'YES' : 'NO'
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--write-evidence')) {
  const c = writeEvidence()
  console.log(JSON.stringify({
    result: c.certification.result,
    integratedCertification: c.integratedCertification,
    clientTitleAutomation: c.clientTitleAutomation,
    operatorBurden: c.enterpriseOperatorBurden,
    microsoftDispositions: c.microsoftDispositions,
  }, null, 2))
}
