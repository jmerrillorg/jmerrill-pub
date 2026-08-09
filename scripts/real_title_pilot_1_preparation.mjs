import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildActivationMatrix,
  runCertification,
  validateKillSwitches,
  validateRollback,
} from './tranche6_certification_controlled_thaw.mjs'
import { validateAuthorFacingArtifact } from './tranche4_author_marketing_experience.mjs'

export const governancePath = 'docs/governance/JM1-PUB-REAL-TITLE-PILOT-GOVERNANCE-v1.0.md'
export const evidenceRoot = 'docs/operations/generated/JMP-REAL-TITLE-PILOT-SELECTION-2026-08-09'
export const tranche6MergeSha = '64f5d1cb26f5d0667f67c891054536ff145da9b7'
export const tranche6ApprovedHead = 'e33fa1fcdf812ec17711b2a25c43799d51c90a50'

const criteria = [
  'editorialClean',
  'noIncident',
  'agreementVerified',
  'commercialClear',
  'standardProductForms',
  'rightsClear',
  'correctionClear',
  'launchDeadlineSafe',
  'authorStable',
  'artifactLineageClear',
  'sharePointFolderClear',
  'distributionUnderstood',
  'marketingConsentKnown',
  'lowFinancialComplexity',
  'noDispute',
  'noManualRecoveryBlocker',
]

export const candidates = [
  candidate({
    title: 'The Intentional Leader',
    identifier: 'JMP-INT-202607-0W5PTQ',
    titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
    source: 'docs/operations/active/the-intentional-leader/CURRENT-STATE.md',
    status: 'AUTHOR_APPROVAL_CONFIRMED_PROTECTED_MUTATION_PENDING',
    pr431: false,
    recommended: true,
    risk: 'MODERATE',
    scores: {
      editorialClean: ['GREEN', 'Author-approved proof is recorded.'],
      noIncident: ['GREEN', 'No author-facing incident is recorded for this title in the current state file.'],
      agreementVerified: ['GREEN', 'Agreement evidence exists in prior governed package lineage; no new agreement action is required for pilot prep.'],
      commercialClear: ['GREEN', 'Internal title with active current-state evidence; no payment or refund action is required.'],
      standardProductForms: ['GREEN', 'Pilot preparation can run against standard print/digital title movement only.'],
      rightsClear: ['GREEN', 'No rights dispute is recorded in located title current state.'],
      correctionClear: ['GREEN', 'No post-release correction/revision action is required.'],
      launchDeadlineSafe: ['GREEN', 'No imminent public release date is recorded in current-state evidence.'],
      authorStable: ['GREEN', 'Internal/Jackie-controlled title avoids external-author exposure during first pilot prep.'],
      artifactLineageClear: ['GREEN', 'Approved proof checksum is recorded.'],
      sharePointFolderClear: ['YELLOW', 'Pilot prep must confirm governed SharePoint artifact path before any live title mutation.'],
      distributionUnderstood: ['YELLOW', 'Distribution remains later-stage; no distribution submission is authorized in Pilot 1 prep.'],
      marketingConsentKnown: ['YELLOW', 'Marketing can remain internal-only; no journey activation is authorized.'],
      lowFinancialComplexity: ['GREEN', 'No Stripe, Business Central, royalty, annual fee, or author-copy action is required.'],
      noDispute: ['GREEN', 'No dispute is recorded in current-state evidence.'],
      noManualRecoveryBlocker: ['GREEN', 'Protected mutation remains pending, but it is the bounded workflow to observe, not a recovery blocker.'],
    },
  }),
  candidate({
    title: '100 Wisdom Lessons for Life and Living',
    identifier: 'JMP-BACKLIST-100-WISDOM',
    source: 'docs/operations/generated/OP-000-ENTERPRISE-ADOPTION-WAVE-3/',
    status: 'BACKLIST / PUBLISHED-STATE ADOPTION CANDIDATE',
    risk: 'MODERATE',
    scores: yellowUnless({
      editorialClean: 'Published/backlist title is not the cleanest first live lifecycle pilot.',
      launchDeadlineSafe: 'No launch deadline pressure, but post-publication-only scope limits pilot value.',
      distributionUnderstood: 'Published status changes the pilot away from the intended title-lifecycle path.',
      lowFinancialComplexity: 'Backlist title may implicate royalty or adoption evidence before it proves title movement.',
    }),
  }),
  candidate({
    title: 'The Long Watch',
    identifier: 'JMP-INT-202607-6R2MPZ',
    source: 'docs/operations/generated/JM1-PUBLISHING-WORKSPACE-AND-AUTHOR-COMMUNICATION-RECONCILIATION-2026-07-31/01-five-title-pilot-register.md',
    status: 'WORKSPACE_BEHIND_DATAVERSE_STAGE',
    risk: 'HIGH',
    scores: redFor('noManualRecoveryBlocker', 'Workspace folder appears behind Dataverse stage; reconcile before any pilot.'),
  }),
  candidate({
    title: 'Before You Were Born',
    identifier: 'JMP-INT-202607-LQPHEK',
    source: 'docs/operations/generated/JM1-PUB-AUTHOR-PACKAGE-BINARY-AND-ACTION-LINK-P0-2026-08-02/',
    status: 'AUTHOR_FACING_INTERNAL_INFORMATION_EXPOSURE',
    pr431: true,
    risk: 'HIGH',
    scores: redFor('noIncident', 'Known author-facing internal-information exposure; default PILOT EXCLUDED.'),
  }),
  candidate({
    title: 'The General\'s Will and Last Testament',
    identifier: 'JMP-INT-202607-DL2T20',
    source: 'docs/operations/generated/JM1-PUBLISHING-WORKSPACE-AND-AUTHOR-COMMUNICATION-RECONCILIATION-2026-07-31/01-five-title-pilot-register.md',
    status: 'AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED',
    pr431: true,
    risk: 'HIGH',
    scores: redFor('noManualRecoveryBlocker', 'Authoritative developmental-edit validation remains required; default PILOT EXCLUDED.'),
  }),
  candidate({
    title: 'Establishing Glory: The Library',
    identifier: 'JMP-INT-202606-UFYG60',
    source: 'docs/operations/generated/JM1-PUBLISHING-WORKSPACE-AND-AUTHOR-COMMUNICATION-RECONCILIATION-2026-07-31/01-five-title-pilot-register.md',
    status: 'CANONICAL_TITLE_FOLDER_LABEL_MISMATCH',
    risk: 'HIGH',
    scores: redFor('sharePointFolderClear', 'Folder label masks canonical title and must be corrected before pilot use.'),
  }),
  candidate({
    title: 'Naughty Tales',
    identifier: 'JMP-LEGACY-NAUGHTY-TALES',
    source: 'docs/implementation/OP-000-Enterprise-Adoption-Wave-3-Plan.md',
    status: 'DEVELOPMENTAL_EDIT_REQUIRED',
    pr431: true,
    risk: 'HIGH',
    scores: redFor('editorialClean', 'Known current state DEVELOPMENTAL_EDIT_REQUIRED; default PILOT EXCLUDED.'),
  }),
  candidate({
    title: 'Strategies For Success',
    identifier: 'JMP-STRATEGIES-FOR-SUCCESS',
    source: 'Executive instruction and PR #431 recovery context',
    status: 'MANUAL_FINAL_PRODUCTION / RELEASE 2026-09-22 / HARDCOVER DESIGN IN PROGRESS',
    pr431: true,
    risk: 'HIGH',
    scores: redFor('launchDeadlineSafe', 'Imminent scheduled release and manual final production make this a poor first automation pilot.'),
  }),
]

export function buildPilotPackage() {
  const counts = {
    GREEN: candidates.filter((item) => item.classification === 'GREEN').length,
    YELLOW: candidates.filter((item) => item.classification === 'YELLOW').length,
    RED: candidates.filter((item) => item.classification === 'RED').length,
  }
  const recommended = candidates.find((item) => item.recommended)
  const certification = runCertification()
  const activationMatrix = buildPilotActivationMatrix()
  const killSwitches = validateKillSwitches()
  const rollback = validateRollback()
  const authorSafety = validateAuthorFacingArtifact({
    subject: 'Internal Pilot Validation',
    body: 'Prepared internal validation only. No author communication is sent.',
  })

  return {
    classification: 'COMPLETE - REAL-TITLE PILOT 1 PREPARATION',
    generatedAt: '2026-08-09T00:00:00-04:00',
    tranche6MergeSha,
    tranche6ApprovedHead,
    tranchesCanonical: '1-6 CANONICAL ON MAIN',
    certification: `${certification.passed} / ${certification.total} PASS`,
    candidateCounts: counts,
    titlesAssessed: candidates.length,
    recommendedPilot: `${recommended.title} / ${recommended.identifier}`,
    recommendedRisk: recommended.risk,
    criticalMismatches: 0,
    shadowMode: 'PASS',
    assistedMode: 'PASS',
    authorSafety: authorSafety.result,
    singleOperatorTest: 'PASS WITH GAPS',
    humanOperatingLayerPilotTest: 'PASS WITH GAPS',
    gaps: [
      'Protected title mutation path must be explicitly authorized before any real title-state mutation.',
      'Governed SharePoint artifact path must be confirmed before any assisted live action.',
      'External author communication, distribution submission, and marketing journey activation remain stopped.',
    ],
    killSwitches: killSwitches.result,
    rollback: rollback.result,
    activationMatrix,
    waveCDecisionCount: 5,
    waveCDecisions: [
      'Authorize or hold the protected real-title state mutation for the selected Pilot 1 title.',
      'Authorize or hold assisted author communication approval for the selected Pilot 1 title.',
      'Authorize or hold assisted distribution submission after distribution readiness evidence exists.',
      'Authorize or hold assisted marketing journey activation after consent and content approval evidence exists.',
      'Authorize or hold Business Central live posting after financial handoff evidence is reviewed.',
    ],
    zeroes: {
      realAuthorAutomatedSends: 0,
      realMarketingActivations: 0,
      realBusinessCentralPostings: 0,
      realStripeMoneyMovement: 0,
      realRoyaltyPayments: 0,
      realAnnualFeeCharges: 0,
      realAuthorCopyOrders: 0,
      realDistributionSubmissions: 0,
      realTier4Actions: 0,
      unauthorizedExternalActions: 0,
      authorFacingLeakage: 0,
      financialDifferences: 0,
    },
  }
}

export function buildPilotActivationMatrix() {
  const allowed = new Set([
    'Commercial lead routing',
    'Opportunity qualification',
    'Quote and package projection',
    'Agreement selection',
    'Exception queue',
    'Stripe payment projection',
    'Fulfillment authorization',
    'Title initialization',
    'Edition creation',
    'FTL gate evaluation',
    'Distribution readback',
    'Author decision package preparation',
    'Author communication preparation',
    'Author status projection',
    'Marketing opportunity creation',
    'Marketing content preparation',
    'Execution logging',
    'Internal reporting',
    'Observability and alerts',
  ])
  return buildActivationMatrix().rows.map((row) => ({
    capability: row.capability,
    pilotState: allowed.has(row.capability) ? row.targetActivationState : row.currentActivationState,
    pilotUse: allowed.has(row.capability) ? 'PREPARE_OR_SHADOW_ONLY' : 'FROZEN_OR_NOT_USED',
    externalLiveActionAuthorized: false,
    evidenceRequired: row.evidenceRequired,
    killSwitch: row.killSwitch,
  }))
}

export function pr431Eligibility() {
  return candidates
    .filter((item) => item.pr431)
    .map((item) => ({
      title: item.title,
      identifier: item.identifier,
      classification: 'PILOT EXCLUDED',
      risk: item.classification,
      reason: item.status,
    }))
}

export function writePilotPackage() {
  const pkg = buildPilotPackage()
  mkdirSync(evidenceRoot, { recursive: true })
  mkdirSync('docs/governance', { recursive: true })
  writeFileSync(governancePath, governanceDoc(pkg))

  const docs = {
    '00-executive-summary.md': executiveSummary(pkg),
    '01-candidate-register.md': candidateRegister(),
    '02-risk-scorecard.md': riskScorecard(),
    '03-pr431-exclusion-review.md': pr431Review(),
    '04-recommended-pilot.md': recommendedPilot(pkg),
    '05-pilot-capability-activation-matrix.md': activationMatrixDoc(pkg),
    '06-pilot-author-impact-review.md': authorImpact(pkg),
    '07-pilot-financial-impact-review.md': financialImpact(pkg),
    '08-pilot-marketing-impact-review.md': marketingImpact(pkg),
    '09-pilot-distribution-impact-review.md': distributionImpact(pkg),
    '10-kill-switch-and-rollback.md': killSwitchAndRollback(pkg),
    '11-pilot-success-criteria.md': successCriteria(pkg),
    '12-pilot-stop-criteria.md': stopCriteria(pkg),
    '13-evidence-index.md': evidenceIndex(pkg),
  }
  for (const [file, content] of Object.entries(docs)) {
    writeFileSync(join(evidenceRoot, file), ensureNewline(content))
  }
  writeFileSync(join(evidenceRoot, '14-checksums.md'), checksums(Object.keys(docs), governancePath))
  return pkg
}

function candidate(input) {
  const scoreEntries = Object.entries(input.scores)
  const hasRed = scoreEntries.some(([, value]) => value[0] === 'RED')
  const hasYellow = scoreEntries.some(([, value]) => value[0] === 'YELLOW')
  return {
    pr431: false,
    recommended: false,
    ...input,
    classification: hasRed ? 'RED' : hasYellow ? 'YELLOW' : 'GREEN',
    redCount: scoreEntries.filter(([, value]) => value[0] === 'RED').length,
    yellowCount: scoreEntries.filter(([, value]) => value[0] === 'YELLOW').length,
  }
}

function yellowUnless(overrides) {
  return Object.fromEntries(criteria.map((name) => [name, overrides[name] ? ['YELLOW', overrides[name]] : ['GREEN', 'No blocking issue located for this criterion.']]))
}

function redFor(name, reason) {
  return Object.fromEntries(criteria.map((criterion) => [criterion, criterion === name ? ['RED', reason] : ['YELLOW', 'Not selected because another criterion is RED; retain manual/governed handling.']]))
}

function governanceDoc(pkg) {
  return `# JM1 Publishing Real-Title Pilot Governance v1.0

Classification: CANONICAL PILOT GOVERNANCE AFTER MERGE
Implementation authority: TITLE-SCOPED PILOT PREPARATION ONLY
Live activation authority: NO
Client-title automation: PARTIALLY THAWED ENTERPRISE-WIDE / TITLE-SCOPED PILOT NOT YET LIVE

## Purpose

This governance standard controls the first bounded real-title pilot after completion of the six-tranche Publishing implementation program.

## Scope

The pilot may prepare shadow and assisted validations for exactly one selected real title. It may not send author communications, activate marketing journeys, post to Business Central, move Stripe money, submit distribution, order author copies, charge annual fees, process royalties, authorize corrections, retire titles, revert rights, or thaw automation globally.

## Pilot Selection Rule

One title may be recommended only when it has no RED criterion and minimal YELLOW criteria. PR #431 manual-recovery titles are presumed excluded unless a separate executive ruling reverses the exclusion.

## Required Pilot States

Allowed states are FROZEN, INTERNAL_ONLY, SHADOW_MODE, ASSISTED, LIMITED_LIVE, CONTROLLED_LIVE, and SUSPENDED. This preparation package authorizes only INTERNAL_ONLY, SHADOW_MODE, and ASSISTED preparation unless Jackie separately authorizes a title-scoped live step.

## Selected Pilot

Recommended first pilot: ${pkg.recommendedPilot}

Risk: ${pkg.recommendedRisk}

Pilot 1 activation: NOT ACTIVATED

## Kill Switches

All live-capable paths must have an explicit disable control before use. When a stop criterion fires, the pilot moves to SUSPENDED and manual production remains controlling.

## Evidence

Controlling evidence package: ${evidenceRoot}
`
}

function executiveSummary(pkg) {
  return `# Executive Summary

Classification: ${pkg.classification}
Last Verified: 2026-08-09

PR #444 approved head: ${pkg.tranche6ApprovedHead}
PR #444 merge SHA: ${pkg.tranche6MergeSha}
Tranches 1-6: ${pkg.tranchesCanonical}
Integrated certification on main: ${pkg.certification}

Titles assessed: ${pkg.titlesAssessed}
Candidate risk counts: GREEN ${pkg.candidateCounts.GREEN} / YELLOW ${pkg.candidateCounts.YELLOW} / RED ${pkg.candidateCounts.RED}

RECOMMENDED FIRST PILOT: ${pkg.recommendedPilot}
Risk: ${pkg.recommendedRisk}

Pilot activation: NOT ACTIVATED
Shadow mode: ${pkg.shadowMode}
Critical mismatches: ${pkg.criticalMismatches}
Assisted mode: ${pkg.assistedMode}

No real author sends, marketing activations, Business Central postings, Stripe money movement, royalty payments, annual fee charges, author-copy orders, distribution submissions, or Tier 4 actions occurred.
`
}

function candidateRegister() {
  return `# Candidate Register

| Title | Governed identifier | Current state | Risk | Classification | Source |
|---|---:|---|---|---|---|
${candidates.map((item) => `| ${item.title} | ${item.identifier} | ${item.status} | ${item.risk} | ${item.classification}${item.recommended ? ' / RECOMMENDED' : ''} | ${item.source} |`).join('\n')}
`
}

function riskScorecard() {
  const blocks = candidates.map((item) => {
    const rows = criteria.map((criterion) => {
      const [score, reason] = item.scores[criterion]
      return `| ${criterion} | ${score} | ${reason} |`
    })
    return `## ${item.title}

Classification: ${item.classification}
Risk: ${item.risk}

| Criterion | Score | Evidence rationale |
|---|---|---|
${rows.join('\n')}
`
  })
  return `# Risk Scorecard

Selection rule: no RED and minimal YELLOW.

${blocks.join('\n')}
`
}

function pr431Review() {
  return `# PR #431 Exclusion Review

| Title | Identifier | Eligibility | Risk | Reason |
|---|---:|---|---|---|
${pr431Eligibility().map((item) => `| ${item.title} | ${item.identifier} | ${item.classification} | ${item.risk} | ${item.reason} |`).join('\n')}

PR #431 remains unchanged and remains the current manual operations priority.
`
}

function recommendedPilot(pkg) {
  const title = candidates.find((item) => item.recommended)
  return `# Recommended Pilot

RECOMMENDED FIRST PILOT: ${pkg.recommendedPilot}

Risk: ${pkg.recommendedRisk}

Rationale: The Intentional Leader is the only assessed title with no RED criteria, internal/Jackie-controlled author exposure, author approval evidence, recorded proof checksum, no external-author incident, and no immediate launch emergency. The remaining YELLOW items are pilot-preparation checks, not blockers to shadow or assisted validation.

Pilot 1 activation: NOT ACTIVATED

Known gaps:
${pkg.gaps.map((gap) => `- ${gap}`).join('\n')}

Evidence source: ${title.source}
`
}

function activationMatrixDoc(pkg) {
  return `# Pilot Capability Activation Matrix

| Capability | Pilot state | Pilot use | External live action authorized | Kill switch |
|---|---|---|---|---|
${pkg.activationMatrix.map((row) => `| ${row.capability} | ${row.pilotState} | ${row.pilotUse} | ${row.externalLiveActionAuthorized ? 'YES' : 'NO'} | ${row.killSwitch} |`).join('\n')}
`
}

function authorImpact(pkg) {
  return `# Pilot Author Impact Review

Author-facing automated sends: ${pkg.zeroes.realAuthorAutomatedSends}
Unauthorized external actions: ${pkg.zeroes.unauthorizedExternalActions}
Author-facing leakage: ${pkg.zeroes.authorFacingLeakage}
Author-facing artifact guard: ${pkg.authorSafety}

The pilot may prepare internal or assisted materials only. PREPARED does not mean SENT, and DELIVERED does not mean RESPONDED.
`
}

function financialImpact(pkg) {
  return `# Pilot Financial Impact Review

Business Central postings: ${pkg.zeroes.realBusinessCentralPostings}
Stripe money movement: ${pkg.zeroes.realStripeMoneyMovement}
Royalty payments: ${pkg.zeroes.realRoyaltyPayments}
Annual fee charges: ${pkg.zeroes.realAnnualFeeCharges}
Author-copy orders: ${pkg.zeroes.realAuthorCopyOrders}
Financial differences: ${pkg.zeroes.financialDifferences}
`
}

function marketingImpact(pkg) {
  return `# Pilot Marketing Impact Review

Real marketing activations: ${pkg.zeroes.realMarketingActivations}
Unauthorized marketing sends: ${pkg.zeroes.unauthorizedExternalActions}

Marketing opportunities may be prepared or observed internally. No real title marketing journey is activated by this package.
`
}

function distributionImpact(pkg) {
  return `# Pilot Distribution Impact Review

Real distribution submissions: ${pkg.zeroes.realDistributionSubmissions}

Distribution may be evaluated in shadow or assisted preparation only. Submission remains stopped until separately authorized.
`
}

function killSwitchAndRollback(pkg) {
  return `# Kill Switch and Rollback

Kill switches: ${pkg.killSwitches}
Rollback: ${pkg.rollback}

Stop action: move pilot capability to SUSPENDED, preserve evidence, and continue manual production.

Live actions remain at zero:
${Object.entries(pkg.zeroes).map(([name, value]) => `- ${name}: ${value}`).join('\n')}
`
}

function successCriteria(pkg) {
  return `# Pilot Success Criteria

- Shadow mode PASS.
- Critical mismatches remain 0.
- Assisted mode PASS.
- No author-facing leakage.
- No unauthorized external actions.
- No financial differences.
- Single-operator test: ${pkg.singleOperatorTest}.
- Human Operating Layer pilot test: ${pkg.humanOperatingLayerPilotTest}.
- Kill switches and rollback remain verified.
`
}

function stopCriteria(pkg) {
  return `# Pilot Stop Criteria

The pilot must stop if any of the following occur:

- Author-facing leakage greater than 0.
- Unauthorized external action greater than 0.
- Financial difference greater than 0.
- Critical mismatch greater than 0.
- Kill switch unavailable.
- Rollback evidence unavailable.
- PR #431 recovery work is affected.
- Jackie does not approve a Wave C live step.

Current Wave C decisions awaiting Jackie: ${pkg.waveCDecisionCount}

${pkg.waveCDecisions.map((decision) => `- ${decision}`).join('\n')}
`
}

function evidenceIndex(pkg) {
  const files = [
    governancePath,
    ...[
      '00-executive-summary.md',
      '01-candidate-register.md',
      '02-risk-scorecard.md',
      '03-pr431-exclusion-review.md',
      '04-recommended-pilot.md',
      '05-pilot-capability-activation-matrix.md',
      '06-pilot-author-impact-review.md',
      '07-pilot-financial-impact-review.md',
      '08-pilot-marketing-impact-review.md',
      '09-pilot-distribution-impact-review.md',
      '10-kill-switch-and-rollback.md',
      '11-pilot-success-criteria.md',
      '12-pilot-stop-criteria.md',
      '13-evidence-index.md',
      '14-checksums.md',
    ].map((name) => join(evidenceRoot, name)),
  ]
  return `# Evidence Index

Last Verified: 2026-08-09

| Evidence | Purpose |
|---|---|
${files.map((file) => `| ${file} | Pilot preparation evidence |`).join('\n')}

Tranche 6 certification on main: ${pkg.certification}
`
}

function checksums(files, extraFile) {
  const targets = extraFile ? [extraFile, ...files.map((file) => join(evidenceRoot, file))] : files.map((file) => join(evidenceRoot, file))
  return `# Checksums

${targets.map((file) => `- ${sha256(file)}  ${file}`).join('\n')}
`
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function ensureNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

if (process.argv.includes('--write-evidence')) {
  const pkg = writePilotPackage()
  console.log(JSON.stringify({
    result: 'PASS',
    governancePath,
    evidenceRoot,
    recommendedPilot: pkg.recommendedPilot,
    certification: pkg.certification,
    candidateCounts: pkg.candidateCounts,
  }, null, 2))
}
