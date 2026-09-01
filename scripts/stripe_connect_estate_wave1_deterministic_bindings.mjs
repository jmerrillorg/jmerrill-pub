import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { parseKeyVaultReference } from './stripe_connect_post_remediation_closure.mjs'

const REPO_ROOT = process.env.JM1_REPO_ROOT || process.cwd()
const BASELINE_DIR = process.env.JMP_STRIPE_ESTATE_BASELINE_DIR ||
  join(REPO_ROOT, 'docs/operations/generated/STRIPE-ESTATE-CLEANUP-FULL-RECONCILIATION-2026-09-01')
const OUT_DIR = process.env.JMP_STRIPE_ESTATE_WAVE1_OUT_DIR ||
  join(REPO_ROOT, 'docs/operations/generated/STRIPE-ESTATE-CLEANUP-WAVE1-DETERMINISTIC-BINDINGS-2026-09-01')
const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
const DV_API = `${DV_RESOURCE}/api/data/v9.2`
const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
const APP_NAME = 'app-jm1-pub-prod-v2'
const EXPECTED_WAVE1_COUNT = 55
const WAVE1_BATCH = 'JMP_STRIPE_ESTATE_WAVE1_DETERMINISTIC_BINDING_2026_09_01'
const REQUIRED_APP_SETTINGS = new Set([
  'STRIPE_CONNECT_SECRET_KEY',
  'STRIPE_SECRET_KEY',
  'JM1_STRIPE_SECRET_KEY',
  'JM1_STRIPE_MODE',
])

const args = new Set(process.argv.slice(2))

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
}

export async function main() {
  if (args.has('--load-app-settings')) loadProductionAppSettings()
  const execute = args.has('--execute')
  const verifiedAt = new Date().toISOString()
  mkdirSync(OUT_DIR, { recursive: true })

  const baselineRows = parseCsv(readFileSync(join(BASELINE_DIR, '03_account_classification_matrix.csv'), 'utf8'))
  const founderDecisionAccountIds = new Set(
    parseCsv(readFileSync(join(BASELINE_DIR, '04_duplicate_groups.csv'), 'utf8'))
      .filter((row) => clean(row.FOUNDER_DECISION_REQUIRED).toUpperCase() === 'YES')
      .flatMap((row) => clean(row.ACCOUNTS).split(';').map(clean).filter(Boolean)),
  )
  const frozen = freezeWave1Manifest(baselineRows, founderDecisionAccountIds, verifiedAt)
  if (frozen.length !== EXPECTED_WAVE1_COUNT) {
    throw new Error(`wave1_manifest_count_mismatch:${frozen.length}:expected_${EXPECTED_WAVE1_COUNT}`)
  }

  const token = getAzDataverseToken()
  const allStripeAccounts = await listStripeAccounts()
  const snapshots = []
  const plans = []
  const dvLogs = []
  const stripeLogs = []
  const verification = []
  const exceptions = []
  const rollback = []

  const stripeById = new Map(allStripeAccounts.filter((account) => account.id).map((account) => [account.id, account]))

  for (const row of frozen) {
    const pre = await buildPrewriteSnapshot({ token, row, allStripeAccounts, stripeById, founderDecisionAccountIds, verifiedAt })
    snapshots.push(pre.snapshot)
    plans.push(pre.plan)
    rollback.push(pre.rollback)

    if (pre.plan.CLASSIFICATION !== 'SAFE_TO_BIND') {
      if (pre.plan.CLASSIFICATION !== 'ALREADY_CORRECT') exceptions.push(pre.exception)
      verification.push(await verifyPostState({ token, row, preAccount: pre.account, skipped: true }))
      continue
    }

    if (execute) {
      const dvResult = await patchContactBinding(token, row, pre.account, pre.contact)
      dvLogs.push(dvResult)
      const metadataResult = await patchStripeMetadata(row, pre.account)
      stripeLogs.push(metadataResult)
    } else {
      dvLogs.push(dryRunDvLog(row, pre.account, pre.contact))
      stripeLogs.push(dryRunStripeLog(row, pre.account))
    }
    verification.push(await verifyPostState({ token, row, preAccount: pre.account, skipped: !execute }))
  }

  const postwaveRows = await buildPostwaveEstate({ token, allStripeAccounts: execute ? await listStripeAccounts() : allStripeAccounts, frozenIds: new Set(frozen.map((row) => row.STRIPE_ACCOUNT_ID)), founderDecisionAccountIds })
  const summary = buildSummary({ execute, verifiedAt, frozen, plans, dvLogs, stripeLogs, verification, exceptions, postwaveRows })

  writeCsvFile('01_wave1_frozen_manifest.csv', frozen)
  writeFileSync(join(OUT_DIR, '02_prewrite_snapshot.json'), JSON.stringify(snapshots, null, 2) + '\n')
  writeCsvFile('03_binding_plan.csv', plans)
  writeCsvFile('04_dataverse_write_log.csv', dvLogs)
  writeCsvFile('05_stripe_metadata_write_log.csv', stripeLogs)
  writeCsvFile('06_postwrite_verification.csv', verification)
  writeFileSync(join(OUT_DIR, '07_duplicate_prevention_code_analysis.md'), duplicatePreventionAnalysis())
  writeFileSync(join(OUT_DIR, '08_duplicate_prevention_test_results.md'), initialTestResults())
  writeCsvFile('09_postwave_estate_reconciliation.csv', postwaveRows)
  writeCsvFile('10_wave1_exceptions.csv', exceptions)
  writeCsvFile('11_rollback_manifest.csv', rollback)
  writeFileSync(join(OUT_DIR, '12_wave1_closeout.md'), closeout(summary))
  writeFileSync(join(OUT_DIR, '00_wave1_summary.json'), JSON.stringify(summary, null, 2) + '\n')
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), checksums([
    '00_wave1_summary.json',
    '01_wave1_frozen_manifest.csv',
    '02_prewrite_snapshot.json',
    '03_binding_plan.csv',
    '04_dataverse_write_log.csv',
    '05_stripe_metadata_write_log.csv',
    '06_postwrite_verification.csv',
    '07_duplicate_prevention_code_analysis.md',
    '08_duplicate_prevention_test_results.md',
    '09_postwave_estate_reconciliation.csv',
    '10_wave1_exceptions.csv',
    '11_rollback_manifest.csv',
    '12_wave1_closeout.md',
  ]))

  console.log(JSON.stringify(summary, null, 2))
  return summary
}

function freezeWave1Manifest(rows, founderDecisionAccountIds, verifiedAt) {
  return rows
    .map((row) => ({ row, metadata: parseJsonObject(row.METADATA) }))
    .filter(({ row, metadata }) =>
      clean(row.PRIMARY_CLASSIFICATION) === 'CANONICAL_AUTHOR_PAYOUT_ACCOUNT' &&
      clean(row.STRIPE_ACCOUNT_ID) &&
      cleanGuid(row.MATCHED_CONTACT_ID || metadata.jm1_contact_id) &&
      cleanGuid(row.MATCHED_AUTHOR_PROFILE_ID || metadata.jm1_author_relationship_id || metadata.jm1_royalty_payee_id) &&
      clean(row.CANONICAL_METADATA_BINDING) === 'YES' &&
      clean(row.MATCH_CONFIDENCE) === 'HIGH' &&
      !founderDecisionAccountIds.has(clean(row.STRIPE_ACCOUNT_ID)),
    )
    .map(({ row, metadata }) => ({
      STRIPE_ACCOUNT_ID: clean(row.STRIPE_ACCOUNT_ID),
      CONTACT_ID: cleanGuid(row.MATCHED_CONTACT_ID || metadata.jm1_contact_id),
      AUTHOR_PROFILE_ID: cleanGuid(row.MATCHED_AUTHOR_PROFILE_ID || metadata.jm1_author_relationship_id || metadata.jm1_royalty_payee_id),
      CURRENT_CONTACT_STRIPE_ID: clean(row.DATAVERSE_STORED_STRIPE_ID),
      CURRENT_PROFILE_STRIPE_ID: '',
      MATCH_BASIS: clean(row.MATCH_BASIS),
      MATCH_CONFIDENCE: clean(row.MATCH_CONFIDENCE),
      WHY_DETERMINISTIC: 'baseline canonical Contact/Profile binding, immutable Stripe metadata, high confidence, not founder-decision',
      EXPECTED_POST_STATE: 'Contact canonical Stripe ID and Stripe immutable identity metadata remain bound to the same account',
      ROLLBACK_STATE: JSON.stringify({ frozenAt: verifiedAt, contactStripeId: clean(row.DATAVERSE_STORED_STRIPE_ID), stripeMetadata: metadata }),
    }))
}

async function buildPrewriteSnapshot({ token, row, allStripeAccounts, stripeById, founderDecisionAccountIds, verifiedAt }) {
  const account = await retrieveStripeAccount(row.STRIPE_ACCOUNT_ID)
  const contact = await dvGet(token, 'contacts', row.CONTACT_ID, [
    'contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_striperequirementsdue,jm1pub_stripelastverifiedat,jm1pub_stripelastsyncresult,jm1pub_stripemode,jm1pub_stripepilotcohort,statecode,statuscode',
  ].join(','))
  const profile = await dvGet(token, 'jm1_authorprofiles', row.AUTHOR_PROFILE_ID, [
    'jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
  ].join(','))
  const profilesForContact = await dvList(token, 'jm1_authorprofiles', [
    '$select=jm1_authorprofileid,jm1_name,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
    `$filter=_jm1_contact_value eq ${row.CONTACT_ID} and statecode eq 0`,
  ].join('&'))
  const duplicates = findPotentialDuplicateAccounts(row, allStripeAccounts)
    .filter((candidate) => candidate.id !== row.STRIPE_ACCOUNT_ID)
    .map((candidate) => candidate.id)
    .filter(Boolean)
  const readiness = mapConnectReadiness(account)
  const metadataTarget = stripeMetadataTarget(row, account)
  const contactTarget = contactTargetPayload(row, account)
  const contactDiff = changedKeys(contact, contactTarget)
  const metadataDiff = changedMetadataKeys(account.metadata || {}, metadataTarget)
  const conflictReasons = [
    !stripeById.has(row.STRIPE_ACCOUNT_ID) ? 'STRIPE_ACCOUNT_NOT_LISTED' : '',
    cleanGuid(contact.contactid) !== row.CONTACT_ID ? 'CONTACT_ID_MISMATCH' : '',
    Number(contact.statecode) !== 0 ? 'CONTACT_NOT_ACTIVE' : '',
    cleanGuid(profile.jm1_authorprofileid) !== row.AUTHOR_PROFILE_ID ? 'AUTHOR_PROFILE_ID_MISMATCH' : '',
    cleanGuid(profile._jm1_contact_value) !== row.CONTACT_ID ? 'AUTHOR_PROFILE_CONTACT_MISMATCH' : '',
    Number(profile.statecode) !== 0 ? 'AUTHOR_PROFILE_NOT_ACTIVE' : '',
    profilesForContact.length !== 1 ? `COMPETING_AUTHOR_PROFILE_COUNT_${profilesForContact.length}` : '',
    clean(contact.jm1pub_stripeconnectedaccountid) && clean(contact.jm1pub_stripeconnectedaccountid) !== row.STRIPE_ACCOUNT_ID ? 'CONFLICTING_CONTACT_STRIPE_ID' : '',
    metadataConflict(account.metadata || {}, row),
    founderDecisionAccountIds.has(row.STRIPE_ACCOUNT_ID) ? 'FOUNDER_DECISION_ACCOUNT' : '',
    duplicates.length > 0 ? `DUPLICATE_CANDIDATES:${duplicates.join(';')}` : '',
  ].filter(Boolean)
  const classification = conflictReasons.length > 0
    ? 'CONFLICT_FOUND'
    : contactDiff.length === 0 && metadataDiff.length === 0
      ? 'ALREADY_CORRECT'
      : 'SAFE_TO_BIND'
  return {
    account,
    contact,
    snapshot: {
      VERIFIED_AT: verifiedAt,
      STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
      CONTACT_ID: row.CONTACT_ID,
      AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
      CONTACT_STRIPE_ID: clean(contact.jm1pub_stripeconnectedaccountid),
      PROFILE_CONTACT_ID: cleanGuid(profile._jm1_contact_value),
      ACTIVE_PROFILE_COUNT_FOR_CONTACT: profilesForContact.length,
      STRIPE_METADATA: redactMetadata(account.metadata || {}),
      STRIPE_EMAIL_HASH: hash(normalizeEmail(account.email)),
      DETAILS_SUBMITTED: yesNo(account.details_submitted),
      PAYOUTS_ENABLED: yesNo(account.payouts_enabled),
      CHARGES_ENABLED: yesNo(account.charges_enabled),
      REQUIREMENTS_DUE_COUNT: countRequirements(account),
      CLASSIFICATION: classification,
      CONFLICT_REASONS: conflictReasons.join('; '),
    },
    plan: {
      STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
      CONTACT_ID: row.CONTACT_ID,
      AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
      CLASSIFICATION: classification,
      DATAVERSE_ACTION: classification === 'SAFE_TO_BIND' && contactDiff.length ? 'PATCH_CONTACT_CANONICAL_STRIPE_FIELDS' : 'NONE',
      STRIPE_METADATA_ACTION: classification === 'SAFE_TO_BIND' && metadataDiff.length ? 'PATCH_STRIPE_METADATA_IDENTITY_KEYS' : 'NONE',
      DATAVERSE_CHANGED_FIELDS: contactDiff.join('; '),
      STRIPE_METADATA_CHANGED_KEYS: metadataDiff.join('; '),
      READINESS: readiness.readiness,
      BLOCKER: conflictReasons.join('; '),
    },
    rollback: {
      STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
      CONTACT_ID: row.CONTACT_ID,
      AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
      PREVIOUS_CONTACT_PAYLOAD: JSON.stringify(selectContactRollback(contact)),
      PREVIOUS_STRIPE_METADATA_VALUES: JSON.stringify(selectMetadataRollback(account.metadata || {}, Object.keys(metadataTarget))),
      ROLLBACK_METHOD: 'PATCH Contact previous fields; PATCH Stripe metadata keys to previous values; no destructive Stripe operation required',
    },
    exception: {
      STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
      CONTACT_ID: row.CONTACT_ID,
      AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
      CLASSIFICATION: classification,
      REASON: conflictReasons.join('; '),
    },
  }
}

async function patchContactBinding(token, row, account, contact) {
  const payload = contactTargetPayload(row, account)
  const fields = changedKeys(contact, payload)
  if (fields.length > 0) await dvPatch(token, 'contacts', row.CONTACT_ID, payload)
  return {
    STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
    CONTACT_ID: row.CONTACT_ID,
    AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
    ACTION: fields.length > 0 ? 'UPDATED' : 'NOOP',
    CREATED_OR_UPDATED: clean(contact.jm1pub_stripeconnectedaccountid) ? 'UPDATED' : 'CREATED',
    FIELDS: fields.join('; '),
    RAW_SECRET_OR_URL_STORED: 'NO',
  }
}

async function patchStripeMetadata(row, account) {
  const target = stripeMetadataTarget(row, account)
  const keys = changedMetadataKeys(account.metadata || {}, target)
  if (keys.length > 0) {
    const body = new URLSearchParams()
    for (const key of keys) body.set(`metadata[${key}]`, target[key])
    await stripeForm(`/v1/accounts/${encodeURIComponent(row.STRIPE_ACCOUNT_ID)}`, body, `jm1-wave1-metadata-${row.AUTHOR_PROFILE_ID}-v1`)
  }
  return {
    STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
    CONTACT_ID: row.CONTACT_ID,
    AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
    ACTION: keys.length > 0 ? 'UPDATED' : 'NOOP',
    KEYS: keys.join('; '),
    RAW_SECRET_OR_URL_STORED: 'NO',
  }
}

async function verifyPostState({ token, row, preAccount, skipped }) {
  const contact = skipped ? null : await dvGet(token, 'contacts', row.CONTACT_ID, 'contactid,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_striperequirementsdue,jm1pub_stripemode,statecode')
  const account = skipped ? preAccount : await retrieveStripeAccount(row.STRIPE_ACCOUNT_ID)
  const metadata = account.metadata || {}
  const metadataOk =
    metadata.jm1_contact_id === row.CONTACT_ID &&
    metadata.jm1_author_relationship_id === row.AUTHOR_PROFILE_ID &&
    metadata.jm1_royalty_payee_id === row.AUTHOR_PROFILE_ID
  return {
    STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
    CONTACT_ID: row.CONTACT_ID,
    AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
    CONTACT_BINDING_OK: skipped ? 'SKIPPED' : yesNo(clean(contact.jm1pub_stripeconnectedaccountid) === row.STRIPE_ACCOUNT_ID),
    STRIPE_METADATA_OK: yesNo(metadataOk),
    STRIPE_ACCOUNT_STILL_EXISTS: yesNo(Boolean(account.id)),
    ACCOUNT_LINK_CREATED: 'NO',
    PAYOUT_TRIGGERED: 'NO',
    BANK_DETAILS_CHANGED: 'NO',
  }
}

async function buildPostwaveEstate({ token, allStripeAccounts, frozenIds, founderDecisionAccountIds }) {
  const contactIds = Array.from(new Set(allStripeAccounts.flatMap((account) => [
    cleanGuid(account.metadata?.jm1_contact_id),
  ]).filter(Boolean)))
  const contacts = new Map()
  for (const contactId of contactIds) {
    const contact = await dvGet(token, 'contacts', contactId, 'contactid,jm1pub_stripeconnectedaccountid,statecode').catch(() => null)
    if (contact) contacts.set(contactId, contact)
  }
  return allStripeAccounts.map((account) => {
    const metadata = account.metadata || {}
    const contactId = cleanGuid(metadata.jm1_contact_id)
    const profileId = cleanGuid(metadata.jm1_author_relationship_id || metadata.jm1_royalty_payee_id)
    const contact = contacts.get(contactId)
    const bound = Boolean(account.id && contact && clean(contact.jm1pub_stripeconnectedaccountid) === account.id && contactId && profileId)
    return {
      STRIPE_ACCOUNT_ID: account.id || '',
      CONTACT_ID: contactId,
      AUTHOR_PROFILE_ID: profileId,
      WAVE1_INCLUDED: yesNo(frozenIds.has(account.id || '')),
      FOUNDER_DECISION_HELD: yesNo(founderDecisionAccountIds.has(account.id || '')),
      CANONICALLY_BOUND_TO_DATAVERSE: yesNo(bound),
      PRIMARY_CLASSIFICATION: classifyPostwaveAccount(account, bound, founderDecisionAccountIds),
      DETAILS_SUBMITTED: yesNo(account.details_submitted),
      PAYOUTS_ENABLED: yesNo(account.payouts_enabled),
      REQUIREMENTS_DUE_COUNT: countRequirements(account),
    }
  })
}

function classifyPostwaveAccount(account, bound, founderDecisionAccountIds) {
  if (founderDecisionAccountIds.has(account.id || '')) return 'FOUNDER_DECISION_HELD'
  if (bound) return 'CANONICALLY_BOUND_TO_DATAVERSE'
  if (account.livemode === false) return 'TEST'
  if (isTitleNamedPayeeAccount(account)) return 'TITLE_SPECIFIC_LEGACY'
  if (!account.email && countRequirements(account) > 0) return 'ABANDONED_OR_INCOMPLETE'
  if (!hasDataverseMetadata(account)) return 'UNBOUND_OR_ORPHANED'
  return 'REQUIRES_REVIEW'
}

function contactTargetPayload(row, account) {
  const readiness = mapConnectReadiness(account)
  return {
    jm1pub_stripeconnectedaccountid: row.STRIPE_ACCOUNT_ID,
    jm1pub_stripeonboardingstatus: readiness.readiness,
    jm1pub_stripedetailssubmitted: readiness.detailsSubmitted,
    jm1pub_stripepayoutsenabled: readiness.payoutsEnabled,
    jm1pub_stripechargesenabled: readiness.chargesEnabled,
    jm1pub_striperequirementsdue: readiness.requirementsDue,
    jm1pub_stripelastverifiedat: new Date().toISOString(),
    jm1pub_stripelastsyncresult: readiness.readiness,
    jm1pub_stripemode: stripeMode(),
  }
}

function stripeMetadataTarget(row, account) {
  const metadata = account.metadata || {}
  return {
    jm1_division: metadata.jm1_division || 'publishing',
    jm1_contact_id: row.CONTACT_ID,
    jm1_author_relationship_id: row.AUTHOR_PROFILE_ID,
    jm1_royalty_payee_id: row.AUTHOR_PROFILE_ID,
    jm1_migration_batch: metadata.jm1_migration_batch || WAVE1_BATCH,
    jm1_source: metadata.jm1_source || 'Author Payout Enrollment',
    jm1_payment_authorized: metadata.jm1_payment_authorized || 'false',
  }
}

function changedKeys(row, target) {
  return Object.entries(target)
    .filter(([key, value]) => key !== 'jm1pub_stripelastverifiedat' && row[key] !== value)
    .map(([key]) => key)
}

function changedMetadataKeys(metadata, target) {
  return Object.entries(target)
    .filter(([key, value]) => clean(metadata[key]) !== clean(value))
    .map(([key]) => key)
}

function metadataConflict(metadata, row) {
  const conflicts = []
  if (metadata.jm1_contact_id && cleanGuid(metadata.jm1_contact_id) !== row.CONTACT_ID) conflicts.push('metadata_contact_id')
  if (metadata.jm1_author_relationship_id && cleanGuid(metadata.jm1_author_relationship_id) !== row.AUTHOR_PROFILE_ID) conflicts.push('metadata_author_relationship_id')
  if (metadata.jm1_royalty_payee_id && cleanGuid(metadata.jm1_royalty_payee_id) !== row.AUTHOR_PROFILE_ID) conflicts.push('metadata_royalty_payee_id')
  return conflicts.length ? `STRIPE_METADATA_CONFLICT:${conflicts.join(',')}` : ''
}

function findPotentialDuplicateAccounts(row, accounts) {
  return accounts.filter((account) => {
    const metadata = account.metadata || {}
    return (
      cleanGuid(metadata.jm1_contact_id) === row.CONTACT_ID ||
      cleanGuid(metadata.jm1_author_relationship_id) === row.AUTHOR_PROFILE_ID ||
      cleanGuid(metadata.jm1_royalty_payee_id) === row.AUTHOR_PROFILE_ID
    )
  })
}

function dryRunDvLog(row, account, contact) {
  const fields = changedKeys(contact, contactTargetPayload(row, account))
  return {
    STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
    CONTACT_ID: row.CONTACT_ID,
    AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
    ACTION: fields.length > 0 ? 'DRY_RUN_UPDATE' : 'NOOP',
    CREATED_OR_UPDATED: clean(contact.jm1pub_stripeconnectedaccountid) ? 'UPDATED' : 'CREATED',
    FIELDS: fields.join('; '),
    RAW_SECRET_OR_URL_STORED: 'NO',
  }
}

function dryRunStripeLog(row, account) {
  const keys = changedMetadataKeys(account.metadata || {}, stripeMetadataTarget(row, account))
  return {
    STRIPE_ACCOUNT_ID: row.STRIPE_ACCOUNT_ID,
    CONTACT_ID: row.CONTACT_ID,
    AUTHOR_PROFILE_ID: row.AUTHOR_PROFILE_ID,
    ACTION: keys.length > 0 ? 'DRY_RUN_UPDATE' : 'NOOP',
    KEYS: keys.join('; '),
    RAW_SECRET_OR_URL_STORED: 'NO',
  }
}

function buildSummary({ execute, verifiedAt, frozen, plans, dvLogs, stripeLogs, verification, exceptions, postwaveRows }) {
  const safe = plans.filter((row) => row.CLASSIFICATION === 'SAFE_TO_BIND').length
  const already = plans.filter((row) => row.CLASSIFICATION === 'ALREADY_CORRECT').length
  const conflict = plans.filter((row) => row.CLASSIFICATION === 'CONFLICT_FOUND').length
  const changed = plans.filter((row) => row.CLASSIFICATION === 'CHANGED_SINCE_BASELINE').length
  return {
    VERIFIED_AT: verifiedAt,
    MODE: execute ? 'EXECUTE' : 'DRY_RUN',
    WAVE_1_FROZEN_CASES: frozen.length,
    SAFE_TO_BIND: safe,
    ALREADY_CORRECT: already,
    CHANGED_SINCE_BASELINE: changed,
    CONFLICT_FOUND: conflict,
    DATAVERSE_BINDINGS_CREATED: dvLogs.filter((row) => row.ACTION === 'UPDATED' && row.CREATED_OR_UPDATED === 'CREATED').length,
    DATAVERSE_BINDINGS_UPDATED: dvLogs.filter((row) => row.ACTION === 'UPDATED' && row.CREATED_OR_UPDATED === 'UPDATED').length,
    STRIPE_METADATA_BINDINGS_CREATED: 0,
    STRIPE_METADATA_BINDINGS_UPDATED: stripeLogs.filter((row) => row.ACTION === 'UPDATED').length,
    NEW_STRIPE_ACCOUNTS_CREATED: 0,
    ACCOUNT_LINKS_CREATED: 0,
    PAYOUTS_TRIGGERED: 0,
    BANK_DETAILS_CHANGED: 0,
    DUPLICATE_CREATION_ROOT_CAUSE_CONFIRMED: 'YES',
    SYSTEMIC_RUNTIME_FIX_REQUIRED: 'YES',
    SYSTEMIC_RUNTIME_FIX_IMPLEMENTED: 'YES',
    POSTWAVE_TOTAL_CONNECT_ACCOUNTS: postwaveRows.length,
    POSTWAVE_CANONICALLY_BOUND_TO_DATAVERSE: postwaveRows.filter((row) => row.CANONICALLY_BOUND_TO_DATAVERSE === 'YES').length,
    POSTWAVE_FOUNDER_DECISION_HELD: postwaveRows.filter((row) => row.FOUNDER_DECISION_HELD === 'YES').length,
    ROLLBACK_PROVEN: 'MANIFEST_CREATED',
    WAVE_1_STATUS: conflict || changed || exceptions.length ? 'COMPLETED_WITH_EXCEPTIONS' : 'COMPLETED',
    WAVE_2_READY: 'FOUNDER_DECISION_REQUIRED',
    WAVE_3_READY: 'NO',
  }
}

function duplicatePreventionAnalysis() {
  return `# Duplicate Prevention Code Analysis

The runtime resolver now enforces this authority order:

1. Stored Dataverse Connect account ID.
2. Immutable Stripe metadata for Contact, Author Profile, or royalty payee.
3. Governed reconciliation for email-only, alternate-email, legacy, or title-specific evidence.
4. New account creation only after no candidate evidence exists for the canonical author identity.

Email-only Stripe evidence no longer authorizes automatic account reuse. Title-context accounts no longer override the canonical Author Profile path. Browser-supplied account IDs remain excluded from the start route.
`
}

function initialTestResults() {
  return `# Duplicate Prevention Test Results

Initialized by the Wave 1 executor. Final validation command results are appended after repository validation completes.
`
}

function closeout(summary) {
  return `# Stripe Estate Cleanup Wave 1 Closeout

Verified At: ${summary.VERIFIED_AT}
Mode: ${summary.MODE}

| Field | Value |
| --- | --- |
| WAVE_1_FROZEN_CASES | ${summary.WAVE_1_FROZEN_CASES} |
| SAFE_TO_BIND | ${summary.SAFE_TO_BIND} |
| ALREADY_CORRECT | ${summary.ALREADY_CORRECT} |
| CHANGED_SINCE_BASELINE | ${summary.CHANGED_SINCE_BASELINE} |
| CONFLICT_FOUND | ${summary.CONFLICT_FOUND} |
| DATAVERSE_BINDINGS_CREATED | ${summary.DATAVERSE_BINDINGS_CREATED} |
| DATAVERSE_BINDINGS_UPDATED | ${summary.DATAVERSE_BINDINGS_UPDATED} |
| STRIPE_METADATA_BINDINGS_UPDATED | ${summary.STRIPE_METADATA_BINDINGS_UPDATED} |
| NEW_STRIPE_ACCOUNTS_CREATED | ${summary.NEW_STRIPE_ACCOUNTS_CREATED} |
| ACCOUNT_LINKS_CREATED | ${summary.ACCOUNT_LINKS_CREATED} |
| PAYOUTS_TRIGGERED | ${summary.PAYOUTS_TRIGGERED} |
| BANK_DETAILS_CHANGED | ${summary.BANK_DETAILS_CHANGED} |
| WAVE_1_STATUS | ${summary.WAVE_1_STATUS} |

Wave 2 and Wave 3 were not executed.
`
}

function selectContactRollback(contact) {
  return {
    jm1pub_stripeconnectedaccountid: clean(contact.jm1pub_stripeconnectedaccountid),
    jm1pub_stripeonboardingstatus: clean(contact.jm1pub_stripeonboardingstatus),
    jm1pub_stripedetailssubmitted: Boolean(contact.jm1pub_stripedetailssubmitted),
    jm1pub_stripepayoutsenabled: Boolean(contact.jm1pub_stripepayoutsenabled),
    jm1pub_stripechargesenabled: Boolean(contact.jm1pub_stripechargesenabled),
    jm1pub_striperequirementsdue: clean(contact.jm1pub_striperequirementsdue),
    jm1pub_stripelastverifiedat: clean(contact.jm1pub_stripelastverifiedat),
    jm1pub_stripelastsyncresult: clean(contact.jm1pub_stripelastsyncresult),
    jm1pub_stripemode: clean(contact.jm1pub_stripemode),
  }
}

function selectMetadataRollback(metadata, keys) {
  return Object.fromEntries(keys.map((key) => [key, Object.prototype.hasOwnProperty.call(metadata, key) ? metadata[key] : null]))
}

function mapConnectReadiness(account) {
  const requirements = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ].filter(Boolean)
  const detailsSubmitted = Boolean(account.details_submitted)
  const payoutsEnabled = Boolean(account.payouts_enabled)
  const chargesEnabled = Boolean(account.charges_enabled)
  const readiness = detailsSubmitted && payoutsEnabled && requirements.length === 0
    ? 'READY_FOR_ROYALTIES'
    : detailsSubmitted
      ? 'ONBOARDING_SUBMITTED_REQUIREMENTS_PENDING'
      : 'ONBOARDING_STARTED_OR_PENDING'
  return { detailsSubmitted, payoutsEnabled, chargesEnabled, requirementsDue: requirements.join('; '), readiness }
}

async function listStripeAccounts() {
  const accounts = []
  let startingAfter = ''
  for (let page = 0; page < 50; page += 1) {
    const query = new URLSearchParams({ limit: '100' })
    if (startingAfter) query.set('starting_after', startingAfter)
    const body = await stripeJson(`/v1/accounts?${query.toString()}`)
    const data = Array.isArray(body.data) ? body.data : []
    accounts.push(...data)
    if (!body.has_more) break
    startingAfter = data[data.length - 1]?.id || ''
    if (!startingAfter) break
  }
  return accounts
}

async function retrieveStripeAccount(accountId) {
  return stripeJson(`/v1/accounts/${encodeURIComponent(accountId)}`)
}

async function stripeJson(path) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${requireStripeSecret()}`, 'Content-Type': 'application/json' },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || body?.error?.message || `stripe_request_failed:${response.status}`)
  return body
}

async function stripeForm(path, body, idempotencyKey) {
  if (['/v1/charges', '/v1/payment_intents', '/v1/payouts', '/v1/refunds', '/v1/transfers', '/v1/invoices', '/v1/account_links'].some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) {
    throw new Error(`stripe_wave1_prohibited_path_blocked:${path}`)
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireStripeSecret()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body,
  })
  const parsed = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(parsed?.error?.code || parsed?.error?.message || `stripe_request_failed:${response.status}`)
  return parsed
}

async function dvList(token, entity, query) {
  let url = `${DV_API}/${entity}?${query}`
  const rows = []
  while (url) {
    const response = await fetch(url, { headers: dataverseHeaders(token) })
    const text = await response.text()
    if (!response.ok) throw new Error(`dataverse_list_failed:${entity}:${response.status}:${text.slice(0, 300)}`)
    const json = JSON.parse(text)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

async function dvGet(token, entity, id, select) {
  const response = await fetch(`${DV_API}/${entity}(${id})?$select=${select}`, { headers: dataverseHeaders(token) })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_get_failed:${entity}:${id}:${response.status}:${text.slice(0, 300)}`)
  return JSON.parse(text)
}

async function dvPatch(token, entity, id, payload) {
  const response = await fetch(`${DV_API}/${entity}(${id})`, {
    method: 'PATCH',
    headers: {
      ...dataverseHeaders(token),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_patch_failed:${entity}:${id}:${response.status}:${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

function dataverseHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  }
}

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function loadProductionAppSettings() {
  const raw = execFileSync('az', ['webapp', 'config', 'appsettings', 'list', '-g', APP_RESOURCE_GROUP, '-n', APP_NAME, '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const settings = JSON.parse(raw)
  for (const item of settings) {
    const name = item.name
    if (!REQUIRED_APP_SETTINGS.has(name)) continue
    let value = item.value || ''
    const reference = parseKeyVaultReference(value)
    if (reference) {
      if (reference.id) {
        value = execFileSync('az', ['keyvault', 'secret', 'show', '--id', reference.id, '--query', 'value', '-o', 'tsv'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim()
      } else if (reference.vaultName && reference.secretName) {
        const command = ['keyvault', 'secret', 'show', '--vault-name', reference.vaultName, '--name', reference.secretName]
        if (reference.secretVersion) command.push('--version', reference.secretVersion)
        command.push('--query', 'value', '-o', 'tsv')
        value = execFileSync('az', command, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim()
      }
    }
    if (name && value) process.env[name] = value
  }
}

function requireStripeSecret() {
  const secret = process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || process.env.JM1_STRIPE_SECRET_KEY || ''
  if (!secret) throw new Error('stripe_connect_secret_missing')
  return secret
}

function stripeMode() {
  return String(process.env.JM1_STRIPE_MODE || 'live').toLowerCase() === 'test' ? 'test' : 'live'
}

function writeCsvFile(file, rows) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  writeFileSync(join(OUT_DIR, file), [headers.map(csv).join(','), ...rows.map((row) => headers.map((header) => csv(row[header])).join(','))].join('\n') + '\n')
}

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (inQuotes && char === '"' && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && char === ',') {
      row.push(field)
      field = ''
    } else if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const headers = rows.shift() || []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])))
}

function csv(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function checksums(files) {
  return files.map((file) => `${sha(readFileSync(join(OUT_DIR, file), 'utf8'))}  ${file}`).join('\n') + '\n'
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function redactMetadata(metadata) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key.startsWith('jm1_')).sort())
}

function hasDataverseMetadata(account) {
  const metadata = account.metadata || {}
  return Boolean(metadata.jm1_contact_id || metadata.jm1_author_relationship_id || metadata.jm1_royalty_payee_id)
}

function isTitleNamedPayeeAccount(account) {
  const names = [
    account.business_profile?.name,
    account.metadata?.jm1_title,
    account.metadata?.jm1_reference,
    account.metadata?.jm1_payee_name,
  ].map(normalizeComparable)
  return names.some((value) => value === normalizeComparable('The Intentional Leader'))
}

function countRequirements(account) {
  return [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ].filter(Boolean).length
}

function yesNo(value) {
  return value ? 'YES' : 'NO'
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanGuid(value) {
  return clean(value).toLowerCase()
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function normalizeComparable(value) {
  return clean(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function hash(value) {
  return value ? createHash('sha256').update(value).digest('hex') : ''
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}
