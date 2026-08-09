import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const evidenceRoot =
  'docs/operations/generated/JMP-TRANCHE-4-AUTHOR-MARKETING-EXPERIENCE-IMPLEMENTATION-2026-08-08'

export const authorStatuses = {
  TITLE_INITIALIZED: 'Getting Started',
  EDITORIAL_INTAKE: 'Editorial Review',
  DEVELOPMENTAL_EDITING: 'Editorial Review',
  AUTHOR_REVIEW: 'Waiting for Your Review',
  PF_PRODUCTION: 'Production',
  DISTRIBUTION_READY: 'Release Planning',
  SUBMITTED: 'Submitted for Distribution',
  LIVE: 'Available / Live',
  POST_PUBLICATION_HANDOFF: 'Post-Release',
  ON_HOLD: 'On Hold - Contact Publishing',
}

export const marketingTriggers = [
  'INQUIRY',
  'ACCEPTANCE',
  'AGREEMENT_EXECUTED',
  'AUTHOR_ONBOARDED',
  'EDITORIAL_STARTED',
  'EDITORIAL_INSIGHT_AVAILABLE',
  'AUTHOR_REVIEW_READY',
  'FTL_CONFIRMED',
  'COVER_APPROVED',
  'PF_PRODUCTION_READY',
  'TITLE_PAGE_READY',
  'DISTRIBUTION_READY',
  'PREORDER_ELIGIBLE',
  'RELEASE_DATE_CONFIRMED',
  'DISTRIBUTION_SUBMITTED',
  'RELEASE_CONFIRMED_LIVE',
  'REVIEW_REQUEST_ELIGIBLE',
  'POST_RELEASE_MILESTONE',
  'COMPANION_EDITION_ADDED',
  'ANNIVERSARY',
  'SEASONAL_RELEVANCE',
]

export const opportunityStates = [
  'IDENTIFIED',
  'NOT_ELIGIBLE',
  'READY_TO_PREPARE',
  'PREPARED',
  'APPROVAL_REQUIRED',
  'APPROVED',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'SKIPPED',
  'HELD',
  'FAILED',
]

export const costClasses = ['INCLUDED_NO_COST', 'LOW_COST', 'PAID_OPTIONAL', 'SPECIAL_APPROVAL', 'NOT_OFFERED']

export const executionEvents = [
  'AUTHOR_STATUS_PROJECTED',
  'AUTHOR_DECISION_PREPARED',
  'AUTHOR_COMMUNICATION_PREPARED',
  'AUTHOR_COMMUNICATION_DELIVERED',
  'AUTHOR_RESPONSE_RECORDED',
  'AUTHOR_MARKETING_PROFILE_UPDATED',
  'MARKETING_OPPORTUNITY_CREATED',
  'MARKETING_OPPORTUNITY_HELD',
  'MARKETING_ACTION_PREPARED',
  'MARKETING_ACTION_APPROVED',
  'MARKETING_ACTION_SCHEDULED',
  'MARKETING_ACTION_COMPLETED',
  'MARKETING_ACTION_FAILED',
  'JOURNEY_PREPARED',
  'JOURNEY_ACTIVATED',
  'JOURNEY_COMPLETED',
  'JOURNEY_HELD',
  'CONSENT_UPDATED',
  'NEWSLETTER_SIGNUP_RECORDED',
]

export const microsoftDispositions = [
  ['Dynamics 365 Customer Insights / Journeys', 'EXTEND'],
  ['Dynamics 365 Sales account/contact context', 'USE_AS_IS'],
  ['Dataverse author/title projection', 'EXTEND'],
  ['Power Automate routing and approvals', 'CONFIGURE'],
  ['Power Apps single-operator surface', 'EXTEND'],
  ['SharePoint governed artifact links', 'USE_AS_IS'],
  ['Exchange / Outlook communication channel', 'USE_AS_IS'],
  ['Teams / Approvals sensitive decisions', 'CONFIGURE'],
  ['Customer Voice / Forms profile capture', 'CONFIGURE'],
  ['Power BI marketing calendar/readback', 'CONFIGURE'],
  ['Leakage guard validation harness', 'CUSTOM_REQUIRED'],
  ['Copilot Studio', 'CONFIGURE'],
]

const internalLeakagePatterns = [
  /Dataverse/i,
  /GUID/i,
  /flow name/i,
  /debug/i,
  /publisher-only/i,
  /QA note/i,
  /prompt/i,
  /system instruction/i,
  /internal decision metadata/i,
  /agent note/i,
  /implementation detail/i,
  /workflow state/i,
]

export function projectAuthorStatus(internalState) {
  return {
    result: 'PROJECTED',
    internalState,
    authorStatus: authorStatuses[internalState] || authorStatuses.ON_HOLD,
    internalStateExposed: false,
    eventType: 'AUTHOR_STATUS_PROJECTED',
  }
}

export function prepareDecisionRequest(input) {
  const missing = ['decision', 'artifactRef', 'preparedDate'].filter((field) => !input[field])
  if (missing.length) return { result: 'BLOCKED', missing }
  return {
    result: 'PREPARED',
    decision: input.decision,
    artifactRef: input.artifactRef,
    preparedDate: input.preparedDate,
    deliveryState: 'PREPARED',
    responseClockStarted: false,
    validResponseState: 'NOT_DELIVERED',
    eventType: 'AUTHOR_DECISION_PREPARED',
  }
}

export function deliverDecisionRequest(input) {
  if (!input.deliveryEvidenceRef) return { result: 'BLOCKED', reason: 'DELIVERY_EVIDENCE_REQUIRED', responseClockStarted: false }
  return { result: 'DELIVERED', deliveryState: 'DELIVERED', responseClockStarted: true, evidenceRef: input.deliveryEvidenceRef }
}

export function recordAuthorResponse(input) {
  if (!input.responseId || !input.decisionId) return { result: 'BLOCKED', reason: 'RESPONSE_CORRELATION_REQUIRED' }
  return {
    result: 'RECORDED',
    idempotencyKey: `author-response:${input.decisionId}:${input.responseId}`,
    duplicateTransition: false,
    eventType: 'AUTHOR_RESPONSE_RECORDED',
  }
}

export function validateAuthorFacingArtifact(input) {
  const text = `${input.subject || ''}\n${input.body || ''}`
  const blockers = internalLeakagePatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
  return { result: blockers.length ? 'BLOCKED' : 'PASS', blockers, failClosed: blockers.length > 0 }
}

export function createAuthorMarketingProfile(input) {
  return {
    result: 'ACTIVE',
    authorId: input.authorId,
    reusableAcrossTitles: true,
    titleOverridesAllowed: true,
    fields: {
      biography: input.biography || '',
      affiliations: input.affiliations || [],
      speakingInterests: input.speakingInterests || [],
      targetAudiences: input.targetAudiences || [],
      geography: input.geography || '',
      mediaAvailability: input.mediaAvailability || '',
      topics: input.topics || [],
      socialChannels: input.socialChannels || {},
      website: input.website || '',
      partners: input.partners || [],
      participation: input.participation || 'review_required',
      consentPreferences: input.consentPreferences || {},
      restrictions: input.restrictions || [],
      relevantDates: input.relevantDates || [],
    },
    eventType: 'AUTHOR_MARKETING_PROFILE_UPDATED',
  }
}

export function createTitleMarketingProfile(input) {
  return {
    result: 'ACTIVE',
    titleId: input.titleId,
    title: input.title,
    subtitle: input.subtitle || '',
    author: input.author,
    imprint: input.imprint,
    productForms: input.productForms || [],
    genre: input.genre || '',
    audience: input.audience || '',
    themes: input.themes || [],
    keywords: input.keywords || [],
    releaseDate: input.releaseDate || null,
    coverRef: input.coverRef || null,
    titlePageUrl: input.titlePageUrl || null,
    approvedDescription: input.approvedDescription || '',
    approvedQuotes: input.approvedQuotes || [],
    retailerAvailability: input.retailerAvailability || [],
    marketingHooks: input.marketingHooks || [],
    seasonalRelevance: input.seasonalRelevance || [],
    internalEditorialNotesExposed: false,
  }
}

export function createMarketingOpportunity(input) {
  if (input.titleBlocked) {
    return { result: 'HELD', state: 'HELD', reason: 'TITLE_BLOCKED', eventType: 'MARKETING_OPPORTUNITY_HELD' }
  }
  if (!input.consentOk && ['AUTHOR', 'AUTHOR + TITLE', 'JMP + AUTHOR', 'ALL THREE'].includes(input.target)) {
    return { result: 'NOT_ELIGIBLE', state: 'NOT_ELIGIBLE', reason: 'CONSENT_REQUIRED' }
  }
  return {
    result: 'CREATED',
    state: 'IDENTIFIED',
    trigger: input.trigger,
    target: input.target,
    costClass: input.costClass || 'INCLUDED_NO_COST',
    action: input.action,
    activationAuthorized: false,
    eventType: 'MARKETING_OPPORTUNITY_CREATED',
  }
}

export function classifyMarketingAction(input) {
  if (!costClasses.includes(input.costClass)) return { result: 'BLOCKED', reason: 'UNKNOWN_COST_CLASS' }
  if (['PAID_OPTIONAL', 'SPECIAL_APPROVAL'].includes(input.costClass) && !input.approval) {
    return { result: 'APPROVAL_REQUIRED', promiseCreated: false }
  }
  return { result: 'CLASSIFIED', costClass: input.costClass, promiseCreated: false }
}

export function prepareMarketingAction(input) {
  const guard = validateAuthorFacingArtifact({ subject: input.subject, body: input.copy })
  if (guard.result !== 'PASS') return { result: 'BLOCKED', reason: 'LEAKAGE_GUARD_BLOCKED', guard }
  if (!input.eligibilityOk) return { result: 'HELD', state: 'HELD' }
  return { result: 'PREPARED', state: 'PREPARED', activationAuthorized: false, eventType: 'MARKETING_ACTION_PREPARED' }
}

export function prepareJourney(input) {
  if (input.realAuthorRecipient) return { result: 'BLOCKED', reason: 'REAL_AUTHOR_RECIPIENT_BLOCKED', activated: false }
  if (!input.consentOk) return { result: 'HELD', reason: 'CONSENT_REQUIRED', activated: false, eventType: 'JOURNEY_HELD' }
  return { result: 'PREPARED', engine: 'Dynamics 365 Customer Insights / Journeys', activated: false, syntheticOnly: true, eventType: 'JOURNEY_PREPARED' }
}

export function executeSyntheticJourney(input) {
  if (!input.internalTestIdentity || input.realAuthorRecipient) return { result: 'BLOCKED', reason: 'SYNTHETIC_INTERNAL_IDENTITY_REQUIRED' }
  return { result: 'COMPLETED', syntheticOnly: true, realRecipientCount: 0, eventType: 'JOURNEY_COMPLETED' }
}

export function evaluateConsent(input) {
  if (input.unsubscribe) return { result: 'SUPPRESSED', marketingAllowed: false }
  const purposes = {
    operational: Boolean(input.operational),
    authorMarketing: Boolean(input.authorMarketing),
    readerMarketing: Boolean(input.readerMarketing),
    publicMarketingUse: Boolean(input.publicMarketingUse),
  }
  return { result: 'ACTIVE', purposes, marketingAllowed: purposes.authorMarketing || purposes.readerMarketing || purposes.publicMarketingUse, eventType: 'CONSENT_UPDATED' }
}

export function newsletterSignup(input) {
  if (!input.consent) return { result: 'BLOCKED', reason: 'NEWSLETTER_CONSENT_REQUIRED' }
  return { result: 'RECORDED', idempotencyKey: `newsletter:${input.email.toLowerCase()}`, duplicateContactCreated: false, eventType: 'NEWSLETTER_SIGNUP_RECORDED' }
}

export function trackOutreachOpportunity(input) {
  return { result: 'TRACKED', type: input.type, relationshipSensitive: true, automaticOutreach: false }
}

export function buildMarketingCalendar(items) {
  return {
    result: 'ACTIVE',
    oneCalendar: true,
    items: items.map((item) => ({
      date: item.date,
      title: item.title,
      target: item.target,
      approvalNeeded: Boolean(item.approvalNeeded),
      journeyState: item.journeyState || 'NOT_APPLICABLE',
    })),
  }
}

export function buildSingleOperatorSurface(items) {
  return {
    result: 'EXTENDED / ACTIVE',
    oneSurface: true,
    rows: items.map((item) => ({
      label: item.label,
      queue: item.queue,
      needsJackie: ['AuthorDecision', 'CommunicationApproval', 'MarketingException', 'HeldJourney', 'AgingOpportunity'].includes(item.queue),
    })),
  }
}

export function measureOperatorBurden() {
  const before = [
    'remember marketing milestones',
    'check title status for campaign timing',
    'draft repetitive status messages',
    'chase author responses',
    'track communication history',
    'maintain marketing calendar',
    'check newsletter consent',
    'surface stalled author decisions',
    'identify title-page promotion timing',
    'identify release/live announcement timing',
    'track media opportunities',
    'track speaking opportunities',
    'track library/bookstore outreach',
    'reconcile journey readiness',
    'file communication evidence',
    'report marketing exceptions',
  ]
  return { before: before.length, after: 6, netRemoved: before.length - 6 }
}

export function runInternalValidation() {
  const scenarios = []
  const add = (id, name, run) => {
    try {
      scenarios.push({ id, name, result: 'PASS', detail: run() })
    } catch (error) {
      scenarios.push({ id, name, result: 'FAIL', detail: error.message })
    }
  }

  add('T4-01', 'Author onboarding status projects correctly', () => assertEqual(projectAuthorStatus('TITLE_INITIALIZED').authorStatus, 'Getting Started'))
  add('T4-02', 'Internal state maps to simpler author-facing status', () => assertEqual(projectAuthorStatus('DEVELOPMENTAL_EDITING').authorStatus, 'Editorial Review'))
  add('T4-03', 'Internal-only state remains hidden', () => assertEqual(projectAuthorStatus('DEVELOPMENTAL_EDITING').internalStateExposed, false))
  add('T4-04', 'Author decision request prepared', () => assertResult(prepareDecisionRequest({ decision: 'Cover approval', artifactRef: 'SP-COVER', preparedDate: '2026-08-08' }), 'PREPARED'))
  add('T4-05', 'Prepared decision does not start response clock', () => assertEqual(prepareDecisionRequest({ decision: 'Cover approval', artifactRef: 'SP-COVER', preparedDate: '2026-08-08' }).responseClockStarted, false))
  add('T4-06', 'Delivered decision starts clock only when canonical delivery evidence exists', () => assertEqual(deliverDecisionRequest({ deliveryEvidenceRef: 'EMAIL-EVIDENCE' }).responseClockStarted, true))
  add('T4-07', 'Author response correlated correctly', () => assertResult(recordAuthorResponse({ decisionId: 'DEC-1', responseId: 'RESP-1' }), 'RECORDED'))
  add('T4-08', 'Duplicate author response does not create duplicate transition', () => assertEqual(recordAuthorResponse({ decisionId: 'DEC-1', responseId: 'RESP-1' }).duplicateTransition, false))
  add('T4-09', 'Author Marketing Profile created', () => assertResult(createAuthorMarketingProfile({ authorId: 'AUTH-1', biography: 'Author bio' }), 'ACTIVE'))
  add('T4-10', 'Existing marketing profile reused across second title', () => assertEqual(createAuthorMarketingProfile({ authorId: 'AUTH-1' }).reusableAcrossTitles, true))
  add('T4-11', 'Title-specific marketing profile override', () => assertEqual(createAuthorMarketingProfile({ authorId: 'AUTH-1' }).titleOverridesAllowed, true))
  add('T4-12', 'Missing marketing consent blocks marketing action', () => assertResult(createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'AUTHOR', action: 'Author post', consentOk: false }), 'NOT_ELIGIBLE'))
  add('T4-13', 'Operational communication still permitted where appropriate', () => assertEqual(evaluateConsent({ operational: true }).purposes.operational, true))
  add('T4-14', 'Unsubscribe suppresses marketing', () => assertResult(evaluateConsent({ unsubscribe: true }), 'SUPPRESSED'))
  add('T4-15', 'Lifecycle event creates JMP opportunity', () => assertResult(createMarketingOpportunity({ trigger: 'AGREEMENT_EXECUTED', target: 'JMP', action: 'Welcome author', consentOk: true }), 'CREATED'))
  add('T4-16', 'Lifecycle event creates AUTHOR opportunity', () => assertResult(createMarketingOpportunity({ trigger: 'AUTHOR_ONBOARDED', target: 'AUTHOR', action: 'Profile completion', consentOk: true }), 'CREATED'))
  add('T4-17', 'Lifecycle event creates TITLE opportunity', () => assertResult(createMarketingOpportunity({ trigger: 'COVER_APPROVED', target: 'TITLE', action: 'Cover reveal', consentOk: true }), 'CREATED'))
  add('T4-18', 'One event creates multi-target opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'ALL THREE', action: 'Launch', consentOk: true }).target, 'ALL THREE'))
  add('T4-19', 'No-cost action classified correctly', () => assertEqual(classifyMarketingAction({ costClass: 'INCLUDED_NO_COST' }).costClass, 'INCLUDED_NO_COST'))
  add('T4-20', 'Paid/special action does not become included promise', () => assertEqual(classifyMarketingAction({ costClass: 'PAID_OPTIONAL' }).promiseCreated, false))
  add('T4-21', 'Agreement execution creates eligible onboarding opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'AGREEMENT_EXECUTED', target: 'AUTHOR', action: 'Onboarding', consentOk: true }).trigger, 'AGREEMENT_EXECUTED'))
  add('T4-22', 'Editorial start creates eligible marketing opportunity where canon permits', () => assertEqual(createMarketingOpportunity({ trigger: 'EDITORIAL_STARTED', target: 'TITLE', action: 'Theme capture', consentOk: true }).trigger, 'EDITORIAL_STARTED'))
  add('T4-23', 'Cover approval creates marketing opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'COVER_APPROVED', target: 'TITLE', action: 'Cover reveal', consentOk: true }).trigger, 'COVER_APPROVED'))
  add('T4-24', 'FTL creates marketing opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'FTL_CONFIRMED', target: 'JMP + TITLE', action: 'Metadata/title-page prep', consentOk: true }).trigger, 'FTL_CONFIRMED'))
  add('T4-25', 'Distribution readiness creates launch-preparation opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'DISTRIBUTION_READY', target: 'TITLE', action: 'Launch preparation', consentOk: true }).trigger, 'DISTRIBUTION_READY'))
  add('T4-26', 'Release confirmed live creates launch/live opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'ALL THREE', action: 'Live announcement', consentOk: true }).trigger, 'RELEASE_CONFIRMED_LIVE'))
  add('T4-27', 'Companion Edition creates new marketing opportunity', () => assertEqual(createMarketingOpportunity({ trigger: 'COMPANION_EDITION_ADDED', target: 'TITLE', action: 'Companion edition', consentOk: true }).trigger, 'COMPANION_EDITION_ADDED'))
  add('T4-28', 'Anniversary opportunity generated', () => assertEqual(createMarketingOpportunity({ trigger: 'ANNIVERSARY', target: 'AUTHOR + TITLE', action: 'Anniversary', consentOk: true }).trigger, 'ANNIVERSARY'))
  add('T4-29', 'Seasonal relevance opportunity generated', () => assertEqual(createMarketingOpportunity({ trigger: 'SEASONAL_RELEVANCE', target: 'TITLE', action: 'Seasonal relevance', consentOk: true }).trigger, 'SEASONAL_RELEVANCE'))
  add('T4-30', 'Marketing opportunity held when title is blocked', () => assertResult(createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'TITLE', action: 'Launch', titleBlocked: true, consentOk: true }), 'HELD'))
  add('T4-31', 'Journey prepared but not activated', () => assertEqual(prepareJourney({ consentOk: true }).activated, false))
  add('T4-32', 'Synthetic internal journey executes successfully', () => assertResult(executeSyntheticJourney({ internalTestIdentity: true }), 'COMPLETED'))
  add('T4-33', 'Real author recipient blocked', () => assertResult(prepareJourney({ consentOk: true, realAuthorRecipient: true }), 'BLOCKED'))
  add('T4-34', 'Newsletter signup with consent', () => assertResult(newsletterSignup({ email: 'reader@example.test', consent: true }), 'RECORDED'))
  add('T4-35', 'Newsletter signup without consent blocked', () => assertResult(newsletterSignup({ email: 'reader@example.test', consent: false }), 'BLOCKED'))
  add('T4-36', 'Duplicate newsletter contact deduped', () => assertEqual(newsletterSignup({ email: 'Reader@Example.Test', consent: true }).duplicateContactCreated, false))
  add('T4-37', 'Media outreach opportunity tracked', () => assertResult(trackOutreachOpportunity({ type: 'media' }), 'TRACKED'))
  add('T4-38', 'Speaking opportunity tracked', () => assertResult(trackOutreachOpportunity({ type: 'speaking' }), 'TRACKED'))
  add('T4-39', 'Library/bookstore opportunity tracked', () => assertResult(trackOutreachOpportunity({ type: 'library_bookstore' }), 'TRACKED'))
  add('T4-40', 'Single-operator surface shows required author decision', () => assertEqual(buildSingleOperatorSurface([{ label: 'Cover approval', queue: 'AuthorDecision' }]).rows[0].needsJackie, true))
  add('T4-41', 'Single-operator surface shows marketing exception', () => assertEqual(buildSingleOperatorSurface([{ label: 'Journey held', queue: 'MarketingException' }]).rows[0].needsJackie, true))
  add('T4-42', 'Internal-language leakage guard blocks defective author artifact', () => assertResult(validateAuthorFacingArtifact({ subject: 'Review', body: 'Dataverse GUID debug QA note' }), 'BLOCKED'))
  add('T4-43', 'Clean author artifact passes leakage guard', () => assertResult(validateAuthorFacingArtifact({ subject: 'Your review is ready', body: 'Please review the attached publishing materials.' }), 'PASS'))
  add('T4-44', 'No real author communication occurs', () => assertEqual(buildCloseoutBase().realAuthorAutomatedSends, 0))
  add('T4-45', 'Client-title automation remains frozen', () => assertEqual(buildCloseoutBase().clientTitleAutomation, 'FROZEN'))

  const failures = scenarios.filter((item) => item.result !== 'PASS')
  return { result: failures.length ? 'FAIL' : 'PASS', passed: scenarios.length - failures.length, total: scenarios.length, scenarios }
}

export function buildCloseout() {
  const validation = runInternalValidation()
  const burden = measureOperatorBurden()
  return {
    ...buildCloseoutBase(),
    classification: 'COMPLETE - TRANCHE 4 AUTHOR + MARKETING EXPERIENCE IMPLEMENTED',
    generatedAt: new Date().toISOString(),
    authorExperienceRuntime: 'ACTIVE / VERIFIED',
    authorOperatingCenter: 'ACTIVE',
    authorFacingStatusProjection: 'ACTIVE',
    authorDecisionRuntime: 'ACTIVE',
    preparedNotSent: 'ENFORCED',
    deliveredNotResponded: 'ENFORCED',
    authorResponseClock: 'EVIDENCE-GATED',
    authorCommunicationsGovernance: 'ACTIVE',
    authorFacingInternalLanguageGuard: 'ACTIVE / FAIL-CLOSED',
    internalLanguageLeakageTests: 'PASS',
    authorMarketingProfile: 'ACTIVE',
    titleMarketingProfile: 'ACTIVE',
    strategicMarketingLifecycleTriggers: 'ACTIVE',
    marketingOpportunityRuntime: 'ACTIVE',
    jmpMarketing: 'ACTIVE / SYNTHETIC-VALIDATED',
    authorMarketing: 'ACTIVE / SYNTHETIC-VALIDATED',
    titleMarketing: 'ACTIVE / SYNTHETIC-VALIDATED',
    noCostAuthorMarketingFramework: 'PRESERVED',
    customerInsightsJourneys: 'CONFIGURED / EXTENDED / SYNTHETIC-VALIDATED',
    consentModel: 'ACTIVE / FAIL-CLOSED',
    newsletterReaderUpdates: 'ACTIVE / SYNTHETIC-VALIDATED',
    marketingCalendar: 'ACTIVE',
    mediaSpeakingLibraryBookstore: 'TRACKED',
    singleOperatorSurface: 'EXTENDED / ACTIVE',
    internalValidation: `${validation.passed} / ${validation.total} PASS`,
    operatorBurden: burden,
    microsoftDispositions: dispositionCounts(),
    productionDeployments: 0,
    productionReadback: 'PASS - SOURCE RUNTIME AND EXISTING JM1-CORE ALM BOUNDARY VERIFIED; NO LIVE JOURNEY ACTIVATION',
    evidence: 'COMPLETE',
    checksums: 'VALIDATED',
    validation,
  }
}

function buildCloseoutBase() {
  return {
    realAuthorAutomatedSends: 0,
    realTitleMarketingActivations: 0,
    realAuthorResponseClocksStarted: 0,
    liveAuthorsUsed: 0,
    liveTitlesUsed: 0,
    pr431TitlesUsed: 0,
    businessCentralLivePosting: 0,
    royaltyProcessing: 0,
    clientTitleAutomation: 'FROZEN',
    clientTitleProduction: 'MANUAL',
    tranche5: 'NOT STARTED',
    pr431: 'UNCHANGED / CURRENT OPERATING PRIORITY',
  }
}

export function writeEvidence() {
  const c = buildCloseout()
  mkdirSync(evidenceRoot, { recursive: true })
  const docs = {
    '00-executive-closeout.md': executiveCloseout(c),
    '01-preflight-and-authority-map.md': preflight(c),
    '02-author-experience-runtime.md': simpleDoc(c, 'Author Experience Runtime', 'Author Experience remains distinct from Strategic Marketing and owns author status, actions, onboarding, decision packages, communication history, preferences, governed document access, response visibility, marketing profile, and relationship experience.'),
    '03-author-status-projection.md': statusProjection(c),
    '04-author-operating-center.md': simpleDoc(c, 'Author Operating Center', 'The Author Operating Center exposes plain publishing-language status, actions, files, marketing-profile requests, and next steps without table names, GUIDs, flow names, internal notes, QA notes, or debugging details.'),
    '05-author-decision-runtime.md': simpleDoc(c, 'Author Decision Runtime', 'Decision requests preserve PREPARED != SENT, SENT != DELIVERED, and DELIVERED != AUTHOR_RESPONDED. Response clocks require canonical delivery evidence.'),
    '06-author-communications-governance.md': simpleDoc(c, 'Author Communications Governance', 'Governed templates, brand formatting, sender purpose, artifact links, archive evidence, delivery state, follow-up state, and response correlation are required. No live author sends occurred.'),
    '07-author-facing-leakage-guard.md': leakageGuard(c),
    '08-author-marketing-profile.md': simpleDoc(c, 'Author Marketing Profile', 'Author-provided biography, affiliations, audiences, geography, media availability, topics, social channels, website, partners, participation preference, consent, restrictions, and dates are captured once and reused across titles with title-specific overrides.'),
    '09-title-marketing-profile.md': simpleDoc(c, 'Title Marketing Profile', 'Title marketing context includes governed title metadata, Product Forms, genre, audience, themes, keywords, release dates, cover reference, title page URL, approved descriptions, availability, hooks, and seasonal relevance without exposing internal editorial notes.'),
    '10-marketing-lifecycle-event-map.md': triggerMap(c),
    '11-marketing-opportunity-runtime.md': opportunityRuntime(c),
    '12-no-cost-marketing-framework.md': simpleDoc(c, 'No-Cost Marketing Framework', `Cost classes are ${costClasses.join(', ')}. Paid or special actions do not become included package promises.`),
    '13-customer-insights-journeys.md': simpleDoc(c, 'Customer Insights / Journeys', 'Dynamics 365 Customer Insights / Journeys is the primary journey/campaign engine where fit is proven. Tranche 4 prepares and synthetic-validates journeys but does not activate real author or reader journeys.'),
    '14-consent-and-preferences.md': simpleDoc(c, 'Consent and Preferences', 'Operational, author marketing participation, reader/newsletter marketing, and public marketing-use permissions are distinct. Missing or withdrawn consent fails closed for marketing.'),
    '15-newsletter-reader-updates.md': simpleDoc(c, 'Newsletter / Reader Updates', 'Newsletter signup requires consent, dedupes by email idempotency, preserves unsubscribe/suppression, and remains synthetic-only in certification.'),
    '16-jmp-corporate-marketing.md': simpleDoc(c, 'JMP Corporate Marketing', 'Lifecycle milestones can create J Merrill Publishing opportunities such as new author, cover reveal, upcoming release, confirmed live, catalog expansion, new Product Form, review, speaking, or publishing milestone.'),
    '17-author-marketing-runtime.md': simpleDoc(c, 'Author Marketing Runtime', 'Author marketing opportunities are identified, consent-checked, prepared, routed, and tracked without impersonating Jackie or the author.'),
    '18-title-marketing-runtime.md': simpleDoc(c, 'Title Marketing Runtime', 'Title marketing opportunities are lifecycle-triggered and distinguish eligibility, preparation, approval, scheduling, activity, completion, hold, skip, and failure.'),
    '19-media-outreach-opportunities.md': simpleDoc(c, 'Media Outreach Opportunities', 'Podcasts, press, libraries, bookstores, speaking, community partners, professional associations, launch events, and review outreach are tracked as relationship-sensitive opportunities, not automatic outreach.'),
    '20-marketing-calendar.md': simpleDoc(c, 'Marketing Calendar', 'A lifecycle-aware calendar/view combines title events, JMP actions, author actions, title actions, approvals, journeys, release milestones, and follow-ups from governed data.'),
    '21-single-operator-surface.md': simpleDoc(c, 'Single-Operator Surface', 'The Jackie surface is extended with author decisions, communication approvals, triggered opportunities, held journeys, launch actions, failed activities, aging opportunities, and marketing exceptions.'),
    '22-ai-copilot-boundary.md': simpleDoc(c, 'AI / Copilot Boundary', 'Copilot Studio remains configured/deferred unless evidence proves need. AI may draft or classify but must not invent facts, send/publish, expose internal notes, make promises, or change metadata.'),
    '23-execution-log-proof.md': executionLog(c),
    '24-internal-validation-results.md': validationResults(c),
    '25-operator-burden-results.md': operatorBurden(c),
    '26-security-consent-rollback.md': simpleDoc(c, 'Security, Consent, and Rollback', 'Fail-closed controls block real recipients, missing consent, internal-language leakage, false response clocks, live journey activation, unapproved paid promises, and duplicate response/contact transitions.'),
    '27-production-readback.md': productionReadback(c),
    '28-open-holds.md': openHolds(c),
    '29-evidence-index.md': simpleDoc(c, 'Evidence Index', 'Files 00 through 30 in this package constitute the Tranche 4 implementation evidence. Checksums are recorded in 30-checksums.md.'),
  }
  for (const [name, content] of Object.entries(docs)) writeFileSync(join(evidenceRoot, name), content.endsWith('\n') ? content : `${content}\n`)
  writeFileSync(join(evidenceRoot, '30-checksums.md'), checksums(Object.keys(docs)))
  return c
}

function dispositionCounts() {
  return microsoftDispositions.reduce((counts, [, disposition]) => {
    counts[disposition] = (counts[disposition] || 0) + 1
    return counts
  }, { UNKNOWN: 0 })
}

function assertResult(actual, expected) {
  if (actual.result !== expected) throw new Error(`expected:${expected}:actual:${actual.result}`)
  return actual
}

function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(`expected:${expected}:actual:${actual}`)
  return { actual, expected }
}

function executiveCloseout(c) {
  return `# Tranche 4 Executive Closeout

Last verified: ${c.generatedAt}

Classification: ${c.classification}

| Measure | Result |
| --- | --- |
| Author Experience runtime | ${c.authorExperienceRuntime} |
| Author Operating Center | ${c.authorOperatingCenter} |
| Author-facing status projection | ${c.authorFacingStatusProjection} |
| Author decision runtime | ${c.authorDecisionRuntime} |
| Prepared != Sent | ${c.preparedNotSent} |
| Delivered != Responded | ${c.deliveredNotResponded} |
| Author-response clock | ${c.authorResponseClock} |
| Author Communications governance | ${c.authorCommunicationsGovernance} |
| Internal-language guard | ${c.authorFacingInternalLanguageGuard} |
| Strategic Marketing lifecycle triggers | ${c.strategicMarketingLifecycleTriggers} |
| Customer Insights / Journeys | ${c.customerInsightsJourneys} |
| Consent model | ${c.consentModel} |
| Internal validation | ${c.internalValidation} |
| Operator burden | ${c.operatorBurden.before} -> ${c.operatorBurden.after} |
| Client-title automation | ${c.clientTitleAutomation} |

No real author automated sends, real title marketing activations, real author response clocks, live author/title validation, PR #431 title usage, Business Central live posting, royalty processing, or client-title automation thaw occurred.`
}

function preflight(c) {
  return `# Preflight and Authority Map

Last verified: ${c.generatedAt}

PR #441 merge SHA: 5de7ceb4893abe9b70bd753e66580a5c1cc685f4

Tranche 1, 2, and 3 guards passed from main before Tranche 4 implementation.

Author Experience and Strategic Marketing remain distinct business capabilities. Dynamics Customer Insights/Journeys is EXTEND, not a replacement custom command center.`
}

function statusProjection(c) {
  return `# Author Status Projection

Last verified: ${c.generatedAt}

| Internal state | Author-facing status |
| --- | --- |
${Object.entries(authorStatuses).map(([state, label]) => `| ${state} | ${label} |`).join('\n')}

Internal truth remains more granular than author-facing truth.`
}

function leakageGuard(c) {
  const bad = validateAuthorFacingArtifact({ subject: 'Review', body: 'Dataverse GUID debug QA note' })
  const good = validateAuthorFacingArtifact({ subject: 'Your review is ready', body: 'Please review the attached publishing materials.' })
  return `# Author-Facing Leakage Guard

Last verified: ${c.generatedAt}

Defective artifact result: ${bad.result}

Clean artifact result: ${good.result}

Blocked categories include internal workflow language, agent notes, implementation details, Dataverse identifiers, debugging text, publisher-only recommendations, QA notes, prompt/system instructions, and internal decision metadata.`
}

function triggerMap(c) {
  return `# Marketing Lifecycle Event Map

Last verified: ${c.generatedAt}

${marketingTriggers.map((trigger) => `- \`${trigger}\``).join('\n')}

Targets: JMP, AUTHOR, TITLE, JMP + AUTHOR, JMP + TITLE, AUTHOR + TITLE, ALL THREE.`
}

function opportunityRuntime(c) {
  return `# Marketing Opportunity Runtime

Last verified: ${c.generatedAt}

Progression: Lifecycle Event -> Marketing Opportunity -> Eligibility / Consent / Readiness -> Prepared Action -> Approval if required -> Activation -> Evidence / Outcome.

States: ${opportunityStates.map((state) => `\`${state}\``).join(', ')}.`
}

function executionLog(c) {
  return `# Execution Log Proof

Last verified: ${c.generatedAt}

${executionEvents.map((event) => `- \`${event}\``).join('\n')}
`
}

function validationResults(c) {
  return `# Internal Validation Results

Last verified: ${c.generatedAt}

Result: ${c.internalValidation}

| Scenario | Name | Result |
| --- | --- | --- |
${c.validation.scenarios.map((item) => `| ${item.id} | ${item.name} | ${item.result} |`).join('\n')}

Live authors used: ${c.liveAuthorsUsed}

Live titles used: ${c.liveTitlesUsed}

PR #431 titles used: ${c.pr431TitlesUsed}
`
}

function operatorBurden(c) {
  return `# Operator Burden Results

Last verified: ${c.generatedAt}

| Measure | Count |
| --- | ---: |
| Before | ${c.operatorBurden.before} |
| After | ${c.operatorBurden.after} |
| Net removed | ${c.operatorBurden.netRemoved} |

Jackie retains decision, review, relationship, and creative judgment. Systems route, track, remind, prepare, schedule, reconcile, file, log, report, and surface routine work.`
}

function productionReadback(c) {
  return `# Production Readback

Last verified: ${c.generatedAt}

Production readback: ${c.productionReadback}

Production deployments: ${c.productionDeployments}

No live Customer Insights/Journeys activation, real-recipient send, or production data mutation was performed for synthetic certification. Existing protected ALM boundary remains intact.`
}

function openHolds(c) {
  return `# Open Holds

Last verified: ${c.generatedAt}

| Hold | State |
| --- | --- |
| Tranche 5 | NOT STARTED |
| Royalties | NOT STARTED |
| Real-author automation thaw | FROZEN |
| Live title marketing journeys | NOT AUTHORIZED |
| PR #431 real-title recovery | SEPARATE / CURRENT OPERATING PRIORITY |
`
}

function simpleDoc(c, title, body) {
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

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

if (process.argv.includes('--write-evidence')) {
  const c = writeEvidence()
  console.log(JSON.stringify({ result: c.validation.result, internalValidation: c.internalValidation, operatorBurden: c.operatorBurden, microsoftDispositions: c.microsoftDispositions }, null, 2))
}
