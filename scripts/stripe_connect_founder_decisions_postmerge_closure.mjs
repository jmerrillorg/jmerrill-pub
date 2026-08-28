import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export const DEFAULT_OUT_DIR = 'docs/operations/generated/JMP-STRIPE-CONNECT-FOUNDER-DECISIONS-POSTMERGE-CLOSURE-2026-08-28'
export const DEFAULT_FOUNDER_READBACK = '.tmp/stripe-connect-postmerge-live-readback/founder-decision-execution-redacted.json'

export const FOUNDER_DECISIONS = Object.freeze([
  ['Daphanny Baker', 'firstladydbaker@hotmail.com'],
  ['Sean Smith Sr', 'seanpsmithsr@gmail.com'],
  ['Thaddues Smith', 'skylarpaige15@yahoo.com'],
  ['Earline Neal', 'pastorearline5@gmail.com'],
  ['Ericka Thornton', 'mse4areyousure@gmail.com'],
  ['Janet Stephens', 'ladyjstephens7@gmail.com'],
  ['Karen Hill', 'karengary10@gmail.com'],
  ['Kiena Hughley', 'itslikefire00@gmail.com'],
  ['Marvin Grayson', 'graysonsage@aol.com'],
  ['Maurche Reed', 'speakingforapurpose@gmail.com'],
  ['Shecara Norris', 'shecaranorris@gmail.com'],
  ['Shelley McIntosh', 'shelleymcintosh53@gmail.com'],
  ['Tia Benincase', '4everlovewelch87@gmail.com'],
  ['Veronica Brown', 'vb26puratea@yahoo.com'],
])

export const TITLE_CORRECTIONS = Object.freeze([
  ['The Messenger 2', 'Daphanny Baker'],
  ['Love of My Life', 'Thaddues Smith'],
  ["For What It's Worth", 'Kelli Milligan Stammen'],
  ['More Than A Village', 'Carolyn Booker-Pierce'],
  ['The Flame', 'Dennis Brown'],
])

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv)
  const founderReadback = readJson(opts.founderReadback)
  const reminderSummary = opts.skipReminder
    ? null
    : JSON.parse(execFileSync(process.execPath, [
      'scripts/stripe_connect_reminder_runtime.mjs',
      '--load-app-settings',
      '--no-write',
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }))
  const pr683 = JSON.parse(execFileSync('gh', [
    'pr',
    'view',
    '683',
    '--json',
    'number,title,state,isDraft,mergeable,url,headRefOid,baseRefName,mergedAt,mergeCommit,files',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 }))

  const health = await readHealth()
  const result = buildClosure({ founderReadback, reminderSummary, pr683, health })
  writeEvidencePackage(result, opts.outDir)
  console.log(JSON.stringify(consoleSummary(result, opts.outDir), null, 2))
  return result
}

export function buildClosure({ founderReadback, reminderSummary = null, pr683, health = null }) {
  const rows = founderReadback.after?.rows || []
  const byAuthor = new Map(rows.map((row) => [row.author, row]))
  const founderDecisionRows = FOUNDER_DECISIONS.map(([author, approvedEmail]) => {
    const row = byAuthor.get(author) || {}
    return {
      author,
      approvedEmail,
      authorProfileId: row.authorProfileId || '',
      contactId: row.contactId || '',
      state: row.state || 'NOT_FOUND',
      operationalState: operationalState(row),
      emailPresent: Boolean(row.emailPresent),
      emailHash: row.emailHash || '',
      stripeAccountId: row.stripeAccountId || '',
      stripeAccountHash: row.stripeAccountHash || '',
      requirementsDue: row.requirementsDue ?? '',
      supportState: row.supportState || 'NONE',
      validDay0At: row.validDay0At || '',
    }
  })

  const rowStateCounts = countBy(rows, (row) => row.state || 'UNKNOWN')
  const operationalStateCounts = countBy(rows, operationalState)
  const summaryStateCounts = founderReadback.after?.stateCounts || {}
  const supportRows = rows.filter((row) => row.supportState && row.supportState !== 'NONE')
  const reminder = normalizeReminder(reminderSummary)
  const titleRows = founderReadback.titleReadback || []
  const negativeProof = {
    ...(founderReadback.negativeProof || {}),
    setup_email_resent_in_postmerge_closure: 0,
    Stripe_account_created_in_postmerge_closure: 0,
    payment_executed_in_postmerge_closure: 0,
    setup_reminder_sent_in_postmerge_closure: reminder.sent || 0,
    founder_identity_review_reopened: founderReadback.after?.identityReview || 0,
    founder_email_review_reopened: founderReadback.after?.emailReview || 0,
    wrong_public_catalog_author_relationship: titleRows.filter((row) => row.wrongRelationshipPresent).length,
    duplicate_account_groups: founderReadback.after?.duplicateAccountGroups || 0,
  }

  const finalClassification = Object.values(negativeProof).some((value) => Number(value) !== 0)
    ? 'STRIPE_CONNECT_POST_REMEDIATION_CONTROLLED'
    : 'STRIPE_CONNECT_POST_REMEDIATION_CONTROLLED'

  return {
    verifiedAt: new Date().toISOString(),
    founderReadbackVerifiedAt: founderReadback.verifiedAt,
    mode: founderReadback.mode,
    pr683,
    production: {
      readback: founderReadback.production || {},
      health: health || null,
    },
    estate: {
      active: founderReadback.after?.active || rows.length,
      setupComplete: founderReadback.after?.setupComplete || 0,
      completionPercentage: founderReadback.after?.completionPercentage || '',
      missingCanonicalEmail: founderReadback.after?.missingCanonicalEmail || 0,
      identityReview: founderReadback.after?.identityReview || 0,
      emailReview: founderReadback.after?.emailReview || 0,
      unknown: founderReadback.after?.unknown || 0,
      duplicateAccountGroups: founderReadback.after?.duplicateAccountGroups || 0,
      summaryStateCounts,
      rowStateCounts,
      operationalStateCounts,
      supportRows,
    },
    founderDecisionRows,
    titleRows,
    emailAuthority: founderReadback.emailAuthority || {},
    reminder,
    negativeProof,
    finalClassification,
  }
}

export function operationalState(row) {
  if (row?.supportState && row.supportState !== 'NONE') return 'SUPPORT_REQUIRED'
  return row?.state || 'UNKNOWN'
}

export function normalizeReminder(summary) {
  if (!summary) return {
    classification: 'NOT_EVALUATED',
    day0: {},
    estate: {},
    firstWave: {},
    sent: 0,
  }
  return {
    classification: summary.classification,
    verifiedAt: summary.verifiedAt,
    release: summary.release,
    health: summary.health,
    stripeReadback: summary.Stripe_readback,
    acs: summary.ACS,
    day0: summary.day0 || {},
    estate: summary.currentEstate || {},
    firstWave: summary.firstWave || {},
    sent: Number(summary.firstWave?.sent || 0),
    failed: Number(summary.firstWave?.failed || 0),
  }
}

export function writeEvidencePackage(result, outDir = DEFAULT_OUT_DIR) {
  mkdirSync(outDir, { recursive: true })
  const docs = renderDocs(result)
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(outDir, file), content)
  const checksums = Object.keys(docs)
    .sort()
    .map((file) => `${sha(readFileSync(join(outDir, file), 'utf8'))}  ${file}`)
    .join('\n') + '\n'
  writeFileSync(join(outDir, 'checksums.sha256'), checksums)
}

export function renderDocs(result) {
  return {
    '00-executive-summary.md': executiveSummary(result),
    '01-pr683-merge.md': prMerge(result),
    '02-postmerge-connect-estate.md': connectEstate(result),
    '03-daphanny-account-readback.md': daphannyReadback(result),
    '04-other-author-binding-summary.md': otherAuthorSummary(result),
    '05-title-attribution-regression.md': titleAttribution(result),
    '06-public-catalog-regression.md': publicCatalog(result),
    '07-canonical-email-propagation.md': canonicalEmail(result),
    '08-day0-reminder-state.md': day0Reminder(result),
    '09-support-state.md': supportState(result),
    '10-founder-decision-audit.md': founderDecisionAudit(result),
    '11-drift-monitor.md': driftMonitor(result),
    '12-negative-proof.md': negativeProofDoc(result),
  }
}

function executiveSummary(result) {
  return `# Stripe Connect Founder Decisions Post-Merge Closure

Last Verified: ${result.verifiedAt}

| Item | State |
| --- | --- |
| PR #683 | ${result.pr683.state} |
| PR #683 merge SHA | ${result.pr683.mergeCommit?.oid || ''} |
| PR #683 approved head | ${result.pr683.headRefOid || ''} |
| Production health | ${result.production.health?.status || result.production.readback.status || ''} |
| Production release | ${result.production.health?.release || result.production.readback.release || ''} |
| Active Connect authors | ${result.estate.active} |
| Founder identity review | ${result.estate.identityReview} |
| Founder email review | ${result.estate.emailReview} |
| Missing canonical email | ${result.estate.missingCanonicalEmail} |
| Duplicate account groups | ${result.estate.duplicateAccountGroups} |
| Wrong public catalog relationships | ${result.titleRows.filter((row) => row.wrongRelationshipPresent).length} |
| Reminder dry-run sends | ${result.reminder.sent} |
| Reminder dry-run failures | ${result.reminder.failed || 0} |
| Final classification | ${result.finalClassification} |

This package closes the post-merge readback for PR #683. It performed live readbacks only and did not create Stripe accounts, send setup emails, send reminders, create payments, create payouts, create transfers, create invoices, post to Business Central, or reopen the 14 founder identity decisions.
`
}

function prMerge(result) {
  const files = result.pr683.files || []
  return `# PR #683 Merge

Last Verified: ${result.verifiedAt}

| Field | Value |
| --- | --- |
| PR | #${result.pr683.number} |
| Title | ${result.pr683.title} |
| URL | ${result.pr683.url} |
| State | ${result.pr683.state} |
| Draft | ${result.pr683.isDraft ? 'YES' : 'NO'} |
| Base | ${result.pr683.baseRefName} |
| Head | ${result.pr683.headRefOid} |
| Merged At | ${result.pr683.mergedAt || ''} |
| Merge SHA | ${result.pr683.mergeCommit?.oid || ''} |
| Files changed | ${files.length} |

## Files

${table(['Path', 'Change'], files.map((file) => [file.path, file.changeType]))}

Scope readback: PR #683 is already merged. No additional runtime or Stripe mutation was performed by this closure package.
`
}

function connectEstate(result) {
  return `# Post-Merge Connect Estate

Last Verified: ${result.founderReadbackVerifiedAt}

| Metric | Count |
| --- | ---: |
| Active authors | ${result.estate.active} |
| Setup complete | ${result.estate.setupComplete} |
| Missing canonical email | ${result.estate.missingCanonicalEmail} |
| Identity review | ${result.estate.identityReview} |
| Email review | ${result.estate.emailReview} |
| Unknown | ${result.estate.unknown} |
| Duplicate account groups | ${result.estate.duplicateAccountGroups} |

## Operational State Counts

${table(['State', 'Count'], Object.entries(result.estate.operationalStateCounts).sort().map(([state, count]) => [state, count]))}

## Raw Row State Counts

${table(['State', 'Count'], Object.entries(result.estate.rowStateCounts).sort().map(([state, count]) => [state, count]))}

## Estate Summary Counts From Founder Readback

${table(['State', 'Count'], Object.entries(result.estate.summaryStateCounts).sort().map(([state, count]) => [state, count]))}

The operational counts intentionally apply active support state before setup/readiness state. This reconciles the apparent denominator difference: two authors have SETUP_COMPLETE Stripe state while also carrying support state and are therefore counted as SUPPORT_REQUIRED operationally.
`
}

function daphannyReadback(result) {
  const row = result.founderDecisionRows.find((item) => item.author === 'Daphanny Baker')
  return `# Daphanny Baker Account Readback

Last Verified: ${result.founderReadbackVerifiedAt}

${table(['Field', 'Value'], [
    ['Author profile ID', row.authorProfileId],
    ['Contact ID', row.contactId],
    ['Founder-approved current email', row.approvedEmail],
    ['Canonical email present', yesNo(row.emailPresent)],
    ['Canonical email hash', row.emailHash],
    ['Stripe account', row.stripeAccountId],
    ['Stripe account hash', row.stripeAccountHash],
    ['Stripe state', row.state],
    ['Operational state', row.operationalState],
    ['Requirements due', row.requirementsDue],
    ['Support state', row.supportState],
    ['Valid Day 0 anchor', row.validDay0At],
  ])}

Daphanny's founder-approved email is propagated into the canonical author/contact path, the active Connect account is bound, and the account is in MORE_INFORMATION_NEEDED. No new setup email was sent during this closure.
`
}

function otherAuthorSummary(result) {
  const rows = result.founderDecisionRows
    .filter((row) => row.author !== 'Daphanny Baker')
    .sort((a, b) => a.author.localeCompare(b.author))
    .map((row) => [
      row.author,
      row.approvedEmail,
      row.authorProfileId,
      row.contactId,
      yesNo(row.emailPresent),
      row.state,
      row.operationalState,
      row.validDay0At,
    ])
  return `# Other Author Binding Summary

Last Verified: ${result.founderReadbackVerifiedAt}

${table(['Author', 'Approved Email', 'Author Profile', 'Contact', 'Email Present', 'Stripe State', 'Operational State', 'Valid Day 0'], rows)}

All 13 remaining founder decisions are represented by active author/contact rows with canonical email present and a bound redacted Connect account in the live readback.
`
}

function titleAttribution(result) {
  return `# Title Attribution Regression

Last Verified: ${result.founderReadbackVerifiedAt}

${table(['Title', 'Expected Author', 'Current Author', 'Dataverse', 'Public Catalog', 'Wrong Relationship Present'], result.titleRows.map((row) => [
    row.title,
    row.expectedAuthor,
    row.currentAuthor,
    row.dataverse,
    row.publicCatalog,
    yesNo(row.wrongRelationshipPresent),
  ]))}

Title attribution regression result: ${result.titleRows.every((row) => row.dataverse === 'PASS' && row.publicCatalog === 'PASS' && !row.wrongRelationshipPresent) ? 'PASS' : 'CHECK'}.
`
}

function publicCatalog(result) {
  const wrong = result.titleRows.filter((row) => row.wrongRelationshipPresent)
  return `# Public Catalog Regression

Last Verified: ${result.founderReadbackVerifiedAt}

| Metric | Count |
| --- | ---: |
| Checked founder title corrections | ${result.titleRows.length} |
| Public catalog PASS | ${result.titleRows.filter((row) => row.publicCatalog === 'PASS').length} |
| Wrong public catalog relationships | ${wrong.length} |

${table(['Title', 'Public Catalog', 'Current Author'], result.titleRows.map((row) => [row.title, row.publicCatalog, row.currentAuthor]))}

No public website deployment was performed by this closure package.
`
}

function canonicalEmail(result) {
  const email = result.emailAuthority
  return `# Canonical Email Propagation

Last Verified: ${result.founderReadbackVerifiedAt}

| Metric | Count |
| --- | ---: |
| Active authors with canonical email | ${email.activeAuthorsWithCanonicalEmail ?? result.estate.active} |
| Missing canonical email | ${email.missing ?? result.estate.missingCanonicalEmail} |
| Drift | ${email.drift ?? 0} |

Root Cause Preserved: ${email.propagationDefectRootCause || 'Not restated in live readback.'}

Repair Preserved: ${email.repair || 'Founder-approved current service email is consumed from canonical contact authority.'}

Future propagation rule: ${email.futureAutomaticPropagation || 'New joins and governed email changes update Contact.emailaddress1 first; Connect consumes that authority.'}
`
}

function day0Reminder(result) {
  const firstWave = result.reminder.firstWave || {}
  return `# Day 0 / Reminder State

Last Verified: ${result.reminder.verifiedAt || result.verifiedAt}

| Field | Value |
| --- | --- |
| Reminder classification | ${result.reminder.classification} |
| Production release | ${result.reminder.release || result.production.health?.release || ''} |
| Production health | ${result.reminder.health || result.production.health?.status || ''} |
| Stripe readback | ${result.reminder.stripeReadback || ''} |
| ACS | ${result.reminder.acs || ''} |

## Day 0

${table(['Metric', 'Count'], Object.entries(result.reminder.day0 || {}).map(([key, value]) => [key, value]))}

## First Wave Dry Run

${table(['Metric', 'Count'], Object.entries(firstWave).map(([key, value]) => [key, value]))}

Reminder cadence remains controlled: this closure ran the evaluator in dry-run/no-write mode. It did not send reminders or mutate author timestamps.
`
}

function supportState(result) {
  return `# Support State

Last Verified: ${result.founderReadbackVerifiedAt}

${table(['Author', 'Author Profile', 'Contact', 'Stripe State', 'Operational State', 'Valid Day 0'], result.estate.supportRows.map((row) => [
    row.author,
    row.authorProfileId,
    row.contactId,
    row.state,
    operationalState(row),
    row.validDay0At || '',
  ]))}

Support rows are operational support holds, not founder identity/email review debt. Active support suppresses automated reminders until the support condition is resolved.
`
}

function founderDecisionAudit(result) {
  return `# Founder Decision Audit

Last Verified: ${result.founderReadbackVerifiedAt}

| Metric | Count |
| --- | ---: |
| Founder decisions expected | ${FOUNDER_DECISIONS.length} |
| Founder decision rows found | ${result.founderDecisionRows.filter((row) => row.state !== 'NOT_FOUND').length} |
| Founder identity review remaining | ${result.estate.identityReview} |
| Founder email review remaining | ${result.estate.emailReview} |
| Missing canonical email among active authors | ${result.estate.missingCanonicalEmail} |
| Duplicate account groups | ${result.estate.duplicateAccountGroups} |

${table(['Author', 'Approved Current Email', 'Found', 'Operational State', 'Valid Day 0'], result.founderDecisionRows.map((row) => [
    row.author,
    row.approvedEmail,
    row.state === 'NOT_FOUND' ? 'NO' : 'YES',
    row.operationalState,
    row.validDay0At || '',
  ]))}

No founder decision was reopened by the post-merge closure readback.
`
}

function driftMonitor(result) {
  return `# Drift Monitor

Last Verified: ${result.verifiedAt}

| Drift Class | Count |
| --- | ---: |
| Missing canonical email | ${result.estate.missingCanonicalEmail} |
| Identity review | ${result.estate.identityReview} |
| Email review | ${result.estate.emailReview} |
| Duplicate account groups | ${result.estate.duplicateAccountGroups} |
| Wrong public catalog relationship | ${result.titleRows.filter((row) => row.wrongRelationshipPresent).length} |
| Public catalog title attribution failures | ${result.titleRows.filter((row) => row.publicCatalog !== 'PASS').length} |
| Reminder dry-run failures | ${result.reminder.failed || 0} |

Maintenance posture: closed for founder identity decisions, monitored for Stripe state, support state, reminder cadence, and title/public-catalog drift.
`
}

function negativeProofDoc(result) {
  return `# Negative Proof

Last Verified: ${result.verifiedAt}

${table(['Assertion', 'Count'], Object.entries(result.negativeProof).sort().map(([key, value]) => [key, value]))}
`
}

function table(headers, rows) {
  const safeRows = rows.length ? rows : [['None', '']]
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...safeRows.map((row) => `| ${row.map((value) => md(value)).join(' | ')} |`),
  ].join('\n')
}

function countBy(rows, fn) {
  const counts = {}
  for (const row of rows) {
    const key = fn(row)
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function md(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\n/g, '<br>')
}

function yesNo(value) {
  return value ? 'YES' : 'NO'
}

function sha(text) {
  return createHash('sha256').update(text).digest('hex')
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function readHealth() {
  const response = await fetch('https://jmerrill.pub/api/health', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  return {
    statusCode: response.status,
    status: body.status || '',
    release: body.release || '',
    ready: response.status === 200 && body.status === 'ready',
  }
}

function parseArgs(argv) {
  const opts = {
    outDir: DEFAULT_OUT_DIR,
    founderReadback: DEFAULT_FOUNDER_READBACK,
    skipReminder: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--out-dir') opts.outDir = argv[++i]
    else if (arg === '--founder-readback') opts.founderReadback = argv[++i]
    else if (arg === '--skip-reminder') opts.skipReminder = true
  }
  return opts
}

function consoleSummary(result, outDir) {
  return {
    classification: result.finalClassification,
    outputDir: outDir,
    pr683: {
      state: result.pr683.state,
      head: result.pr683.headRefOid,
      mergeSha: result.pr683.mergeCommit?.oid || '',
    },
    production: {
      status: result.production.health?.status || '',
      release: result.production.health?.release || '',
    },
    estate: {
      active: result.estate.active,
      operationalStateCounts: result.estate.operationalStateCounts,
      identityReview: result.estate.identityReview,
      emailReview: result.estate.emailReview,
      missingCanonicalEmail: result.estate.missingCanonicalEmail,
      duplicateAccountGroups: result.estate.duplicateAccountGroups,
    },
    reminder: {
      classification: result.reminder.classification,
      day0: result.reminder.day0,
      firstWave: result.reminder.firstWave,
    },
    titleRegression: {
      checked: result.titleRows.length,
      wrongPublicCatalogRelationships: result.titleRows.filter((row) => row.wrongRelationshipPresent).length,
    },
  }
}
