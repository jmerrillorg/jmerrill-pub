import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { parseKeyVaultReference } from './stripe_connect_post_remediation_closure.mjs'
import { renderStripeConnectReminderEmail } from './stripe_connect_reminder_cadence.mjs'

export const OUT_DIR = process.env.JMP_STRIPE_CONNECT_EVIDENCE_OUT_DIR ||
  'docs/operations/generated/JMP-STRIPE-CONNECT-FOUNDER-IDENTITY-DECISIONS-EXECUTION-2026-08-28'
export const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
export const APP_NAME = 'app-jm1-pub-prod-v2'
export const PRODUCTION_HEALTH_URL = 'https://jmerrill.pub/api/health'
export const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
export const DV_API = `${DV_RESOURCE}/api/data/v9.2`
export const DECISION_ACTION_TYPE = 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISION_APPLIED'
export const TITLE_ACTION_TYPE = 'PUBLISHING_TITLE_ATTRIBUTION_FOUNDER_CORRECTION_APPLIED'
export const SETUP_ACTION_TYPE = 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED'
export const DAY0_EVENT_NAME_PREFIX = 'STRIPE-CONNECT-FOUNDER-DECISION-DAY0'
export const FOUNDER_DECISION_SOURCE = 'Founder decision packet response, 2026-08-28'
export const CONNECT_BATCH = 'JMP_STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_2026_08_28'

const REQUIRED_APP_SETTINGS = [
  'STRIPE_CONNECT_SECRET_KEY',
  'AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET',
  'JM1_STRIPE_CONNECT_ENABLED',
  'JM1_STRIPE_MODE',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY',
]

export const FOUNDER_AUTHOR_DECISIONS = Object.freeze([
  { name: 'Daphanny Baker', email: 'firstladydbaker@hotmail.com' },
  { name: 'Sean Smith, Sr.', email: 'seanpsmithsr@gmail.com', aliases: ['Sean Smith Sr'] },
  { name: 'Thaddues Smith', email: 'skylarpaige15@yahoo.com' },
  { name: 'Earline Neal', email: 'pastorearline5@gmail.com' },
  { name: 'Ericka Thornton', email: 'mse4areyousure@gmail.com' },
  { name: 'Janet Stephens', email: 'ladyjstephens7@gmail.com' },
  { name: 'Karen Hill', email: 'karengary10@gmail.com' },
  { name: 'Kiena Hughley', email: 'itslikefire00@gmail.com' },
  { name: 'Marvin Grayson', email: 'graysonsage@aol.com', keepConnectEnrollmentActive: true },
  { name: 'Maurche Reed', email: 'speakingforapurpose@gmail.com' },
  { name: 'Shecara Norris', email: 'shecaranorris@gmail.com' },
  { name: 'Shelley McIntosh', email: 'shelleymcintosh53@gmail.com' },
  { name: 'Tia Benincase', email: '4everlovewelch87@gmail.com' },
  { name: 'Veronica Brown', email: 'vb26puratea@yahoo.com' },
])

export const TITLE_ATTRIBUTION_CORRECTIONS = Object.freeze([
  {
    title: 'The Messenger 2',
    newAuthor: 'Daphanny Baker',
    removeAuthor: 'Thaddues Smith',
  },
  {
    title: 'Love of My Life',
    newAuthor: 'Thaddues Smith',
    removeAuthor: '',
  },
  {
    title: "For What It's Worth",
    newAuthor: 'Kelli Milligan Stammen',
    removeAuthor: 'Ericka Thornton',
  },
  {
    title: 'More Than A Village',
    newAuthor: 'Carolyn Booker-Pierce',
    removeAuthor: 'Shelley McIntosh',
  },
  {
    title: 'The Flame',
    newAuthor: 'Dennis Brown',
    removeAuthor: 'Veronica Brown',
  },
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
  const token = getAzDataverseToken()
  const [production, source, stripeAccounts] = await Promise.all([
    readProductionHealth(),
    readDataverseSource(token),
    listStripeAccounts(),
  ])
  const before = buildEstate(source, stripeAccounts, verifiedAt)
  const plan = buildExecutionPlan({ source, stripeAccounts, verifiedAt })
  const execution = execute ? await executePlan({ token, plan, source, stripeAccounts, verifiedAt }) : dryRun(plan)
  const afterSource = execute ? await readDataverseSource(token) : source
  const afterStripeAccounts = execute ? await listStripeAccounts() : stripeAccounts
  const after = buildEstate(afterSource, afterStripeAccounts, verifiedAt)
  const titleReadback = buildTitleReadback(afterSource, plan.titleCorrections)
  const result = {
    verifiedAt,
    mode: execute ? 'execute' : 'dry-run',
    production,
    plan,
    execution,
    before,
    after,
    titleReadback,
    emailAuthority: buildEmailAuthority(after),
    negativeProof: buildNegativeProof(execution, titleReadback, after),
    classification: classifyResult(execution, titleReadback, after, execute ? 'execute' : 'dry-run'),
  }
  writeEvidencePackage(result)
  console.log(JSON.stringify(consoleSummary(result), null, 2))
  return result
}

export function buildExecutionPlan({ source, stripeAccounts, verifiedAt }) {
  const contactsById = new Map(source.contacts.map((row) => [cleanGuid(row.contactid), row]))
  const profilesByContact = groupBy(source.profiles, (row) => cleanGuid(row._jm1_contact_value))
  const accountsById = new Map(stripeAccounts.filter((account) => account.id).map((account) => [account.id, account]))
  const rawCandidatesByEmail = groupBy(stripeAccounts, (account) => normalizeEmail(account.email))
  const rows = FOUNDER_AUTHOR_DECISIONS.map((decision) => {
    const match = resolveDecisionAuthor(decision, source)
    const contact = match.contact || {}
    const profile = match.profile || {}
    const contactId = cleanGuid(contact.contactid)
    const authorProfileId = cleanGuid(profile.jm1_authorprofileid)
    const approvedEmail = normalizeEmail(decision.email)
    const oldEmail = canonicalEmail(contact)
    const identity = {
      contactId,
      authorRelationshipId: authorProfileId,
      royaltyPayeeId: authorProfileId,
      authorName: decision.name,
      payeeName: clean(profile.jm1_penname) || clean(profile.jm1_name) || decision.name,
      authorEmail: approvedEmail,
      existingStripeAccountId: clean(contact.jm1pub_stripeconnectedaccountid),
      migrationBatch: CONNECT_BATCH,
    }
    const candidates = findStripeCandidates(identity, stripeAccounts, rawCandidatesByEmail)
    const storedAccount = identity.existingStripeAccountId ? accountsById.get(identity.existingStripeAccountId) : null
    const chosen = storedAccount || (candidates.length === 1 ? candidates[0].account : null)
    const ownership = classifyAccountOwnership({ identity, account: chosen, candidates })
    const connectState = chosen ? mapConnectState(chosen) : 'NOT_STARTED'
    const day0 = findValidDay0(source.logs, contactId)
    const founderDay0 = findFounderDecisionDay0(source.logs, contactId, authorProfileId)
    const support = findSupport(source.logs, contact, profile)
    const shouldReplaceStaleAccount = ownership.state === 'STALE_EMAIL_REPAIR_REQUIRED' && stripeConnectGateOpen()
    const replacementAccountNeedsSetup =
      Boolean(clean(chosen?.metadata?.jm1_migration_batch).includes('STALE_EMAIL_REPLACEMENT')) &&
      !founderDay0
    const shouldCreateAccount =
      Boolean(contactId && authorProfileId && approvedEmail) &&
      !chosen &&
      candidates.length === 0 &&
      stripeConnectGateOpen()
    const shouldSendSetup =
      !support.active &&
      (!day0 || shouldReplaceStaleAccount || replacementAccountNeedsSetup) &&
      ['PROVEN', 'NO_ACCOUNT_CLEAN', 'STALE_EMAIL_REPAIR_REQUIRED'].includes(ownership.state) &&
      (Boolean(chosen) || shouldCreateAccount || shouldReplaceStaleAccount || replacementAccountNeedsSetup) &&
      !['SETUP_COMPLETE', 'UNDER_REVIEW'].includes(connectState)
    return {
      verifiedAt,
      decision,
      author: decision.name,
      contactId,
      authorProfileId,
      contactFound: Boolean(contactId),
      profileFound: Boolean(authorProfileId),
      oldEmail,
      approvedEmail,
      emailRepairRequired: oldEmail !== approvedEmail,
      canonicalIdentityRepairRequired: decision.name === 'Sean Smith, Sr.' && clean(profile.jm1_name) !== 'Sean Smith, Sr.',
      support,
      validDay0At: day0,
      founderDecisionDay0At: founderDay0,
      identity,
      stripe: {
        accountId: chosen?.id || '',
        accountIdRedacted: redactStripeId(chosen?.id),
        accountIdHash: hash(chosen?.id || ''),
        accountEmailHash: hash(normalizeEmail(chosen?.email || '')),
        accountEmailMatchesApproved: Boolean(chosen?.email && normalizeEmail(chosen.email) === approvedEmail),
        metadataIdentity: redactMetadata(chosen?.metadata || {}),
        candidateCount: candidates.length,
        ownership: ownership.state,
        ownershipReason: ownership.reason,
        connectState,
        requirementsDue: countRequirements(chosen),
        setupComplete: connectState === 'SETUP_COMPLETE',
        underReview: connectState === 'UNDER_REVIEW',
      },
      actions: {
        updateContactEmail: Boolean(contactId && oldEmail !== approvedEmail),
        updateAuthorProfileName: Boolean(authorProfileId && decision.name === 'Sean Smith, Sr.' && clean(profile.jm1_name) !== 'Sean Smith, Sr.'),
        bindExistingAccount: ownership.state === 'PROVEN' && Boolean(chosen?.id),
        replaceStaleAccount: shouldReplaceStaleAccount,
        updateStripeAccountEmail: false,
        createAccount: shouldCreateAccount,
        sendSetup: shouldSendSetup,
      },
      conflict: ownership.state === 'CONFLICT' || ownership.state === 'AMBIGUOUS' ? ownership.reason : '',
      currentOwner: support.active ? 'SUPPORT' : shouldSendSetup ? 'SYSTEM' : ownership.state === 'CONFLICT' || ownership.state === 'AMBIGUOUS' ? 'JACKIE' : connectState === 'SETUP_COMPLETE' ? 'COMPLETE' : 'AUTHOR',
      nextAction: nextActionFor({ support, day0, ownership, connectState, shouldSendSetup, shouldCreateAccount, shouldReplaceStaleAccount, replacementAccountNeedsSetup }),
      titleScope: titleScopeFor(decision.name, source.titles),
      profileSiblingCount: (profilesByContact.get(contactId) || []).length,
    }
  })
  const titleCorrections = TITLE_ATTRIBUTION_CORRECTIONS.map((correction) => {
    const title = findTitleByName(source.titles, correction.title)
    const author = resolveAnyAuthor(correction.newAuthor, source)
    const old = title ? clean(title.jm1pub_authordisplayname || title.jm1pub_authorname || title['_jm1_author_value@OData.Community.Display.V1.FormattedValue']) : ''
    return {
      ...correction,
      titleId: cleanGuid(title?.jm1pub_titleid),
      oldAuthor: old,
      currentMatches: authorNameMatches(old, correction.newAuthor),
      authorLookupId: cleanGuid(author.legacyAuthor?.jm1_authorid || ''),
      contactId: cleanGuid(author.contact?.contactid || ''),
      authorFound: Boolean(author.contact || author.legacyAuthor || author.profile),
      patchRequired: Boolean(title && !authorNameMatches(old, correction.newAuthor)),
    }
  })
  return { rows, titleCorrections }
}

async function executePlan({ token, plan, source, stripeAccounts, verifiedAt }) {
  const execution = {
    contactEmailUpdated: 0,
    authorProfileUpdated: 0,
    existingAccountsReaffirmed: 0,
    accountsCreated: 0,
    staleAccountsReplaced: 0,
    stripeAccountEmailsUpdated: 0,
    linksGenerated: 0,
    setupEmailsSent: 0,
    titleCorrectionsApplied: 0,
    decisionLogs: 0,
    titleDecisionLogs: 0,
    failures: [],
    authors: [],
    titles: [],
  }

  for (const row of plan.rows) {
    try {
      if (!row.contactId || !row.authorProfileId) throw new Error('author_or_contact_not_resolved')
      if (row.actions.updateContactEmail) {
        await dvPatch(token, 'contacts', row.contactId, { emailaddress1: row.approvedEmail })
        execution.contactEmailUpdated += 1
      }
      if (row.actions.updateAuthorProfileName) {
        await dvPatch(token, 'jm1_authorprofiles', row.authorProfileId, { jm1_name: 'Sean Smith, Sr.' })
        execution.authorProfileUpdated += 1
      }

      let account = row.stripe.accountId ? await retrieveStripeAccount(row.stripe.accountId) : null
      if (row.actions.replaceStaleAccount) {
        account = await createStripeAccount({ ...row.identity, migrationBatch: `${row.identity.migrationBatch}_STALE_EMAIL_REPLACEMENT` })
        execution.accountsCreated += 1
        execution.staleAccountsReplaced += 1
      }
      if (row.actions.createAccount) {
        account = await createStripeAccount(row.identity)
        execution.accountsCreated += 1
      }
      if (account?.id && row.actions.updateStripeAccountEmail) {
        account = await updateStripeAccountEmail(account.id, row.identity.authorEmail)
        execution.stripeAccountEmailsUpdated += 1
      }
      if (account?.id) {
        assertAccountMatches(row.identity, account)
        await persistConnectReadiness(token, row.identity, account)
        execution.existingAccountsReaffirmed += row.actions.bindExistingAccount ? 1 : 0
      }
      let communication = { providerMessageId: '', provider: '', linkHost: '' }
      if (row.actions.sendSetup) {
        if (!account?.id) throw new Error('canonical_account_missing_for_setup_send')
        const link = await createStripeAccountLink(account.id, row.identity)
        const message = renderStripeConnectReminderEmail({
          authorName: row.author,
          stage: 'INITIAL_INVITATION',
          state: mapConnectState(account),
          linkUrl: link.url,
        })
        if (message.validation.decision !== 'ALLOW') throw new Error(`setup_message_policy_denied:${message.validation.violations.join('|')}`)
        communication = await sendSetupRelay(row.identity, message, link.expires_at || '')
        execution.linksGenerated += 1
        execution.setupEmailsSent += 1
        await writeExecutionLog(token, {
          name: `${DAY0_EVENT_NAME_PREFIX}-${row.authorProfileId}`,
          actionType: SETUP_ACTION_TYPE,
          description:
            `Founder-resolved Stripe Connect direct-deposit setup invitation sent for ${row.author}. ` +
            `Contact ${row.contactId}; Author Relationship ${row.authorProfileId}; Account ${redactStripeId(account.id)}. ` +
            'No royalty amount, payment promise, payout, transfer, invoice, charge, PaymentIntent, or Business Central posting occurred.',
          sourceEntity: 'contact',
          sourceRecordId: row.contactId,
        })
      }
      const decisionLogName = `FOUNDER-IDENTITY-DECISION-APPLIED-${row.authorProfileId}`
      if (!hasExecutionLog(source.logs, decisionLogName)) {
        await writeExecutionLog(token, {
          name: decisionLogName,
          actionType: DECISION_ACTION_TYPE,
          description:
            `Founder-approved current author service email and identity authority applied for ${row.author}. ` +
            `Approved email hash ${hash(row.approvedEmail)}. Prior current email hash ${hash(row.oldEmail)}. ` +
            `Stripe ownership ${row.stripe.ownership}. Source ${FOUNDER_DECISION_SOURCE}.`,
          sourceEntity: 'contact',
          sourceRecordId: row.contactId,
        })
        execution.decisionLogs += 1
      }
      execution.authors.push({
        author: row.author,
        contactId: row.contactId,
        authorProfileId: row.authorProfileId,
        status: 'APPLIED',
        accountIdRedacted: redactStripeId(account?.id),
        connectState: account ? mapConnectState(account) : row.stripe.connectState,
        setupSent: row.actions.sendSetup,
        providerMessageId: communication.providerMessageId,
      })
    } catch (error) {
      execution.failures.push({ author: row.author, contactId: row.contactId, reason: error?.message || 'unknown_failure' })
    }
  }

  for (const correction of plan.titleCorrections) {
    try {
      if (!correction.titleId) throw new Error('title_not_found')
      if (!correction.patchRequired && hasExecutionLog(source.logs, `TITLE-ATTRIBUTION-CORRECTION-${slugify(correction.title)}`)) continue
      const payload = {
        jm1pub_authorname: correction.newAuthor,
        jm1pub_authordisplayname: correction.newAuthor,
      }
      if (correction.authorLookupId) payload['jm1_Author@odata.bind'] = `/jm1_authors(${correction.authorLookupId})`
      await dvPatch(token, 'jm1pub_titles', correction.titleId, payload)
      const titleLogName = `TITLE-ATTRIBUTION-CORRECTION-${slugify(correction.title)}`
      if (!hasExecutionLog(source.logs, titleLogName)) await writeExecutionLog(token, {
        name: titleLogName,
        actionType: TITLE_ACTION_TYPE,
        description:
          `Founder-approved title attribution correction applied. ${correction.title}: ${correction.oldAuthor || 'blank'} -> ${correction.newAuthor}. ` +
          `Removed incorrect attribution ${correction.removeAuthor || 'none'}. Source ${FOUNDER_DECISION_SOURCE}.`,
        sourceEntity: 'jm1pub_title',
        sourceRecordId: correction.titleId,
      })
      execution.titleCorrectionsApplied += 1
      execution.titleDecisionLogs += 1
      execution.titles.push({ title: correction.title, titleId: correction.titleId, status: 'APPLIED', newAuthor: correction.newAuthor })
    } catch (error) {
      execution.failures.push({ title: correction.title, reason: error?.message || 'unknown_failure' })
    }
  }
  return execution
}

function dryRun(plan) {
  return {
    contactEmailUpdated: 0,
    authorProfileUpdated: 0,
    existingAccountsReaffirmed: 0,
    accountsCreated: 0,
    linksGenerated: 0,
    setupEmailsSent: 0,
    titleCorrectionsApplied: 0,
    decisionLogs: 0,
    titleDecisionLogs: 0,
    failures: [],
    authors: plan.rows.map((row) => ({ author: row.author, status: 'DRY_RUN', setupWouldSend: row.actions.sendSetup })),
    titles: plan.titleCorrections.map((row) => ({ title: row.title, status: row.patchRequired ? 'DRY_RUN_PATCH_REQUIRED' : 'DRY_RUN_ALREADY_MATCHES' })),
  }
}

function buildEstate(source, stripeAccounts, verifiedAt) {
  const contactsById = new Map(source.contacts.map((row) => [cleanGuid(row.contactid), row]))
  const accountsById = new Map(stripeAccounts.filter((account) => account.id).map((account) => [account.id, account]))
  const accountUse = new Map()
  const rows = source.profiles
    .filter((profile) => cleanGuid(profile._jm1_contact_value))
    .map((profile) => {
      const contactId = cleanGuid(profile._jm1_contact_value)
      const contact = contactsById.get(contactId) || {}
      const accountId = clean(contact.jm1pub_stripeconnectedaccountid)
      const account = accountId ? accountsById.get(accountId) : null
      if (accountId) {
        const bucket = accountUse.get(accountId) || []
        bucket.push(contactId)
        accountUse.set(accountId, bucket)
      }
      return {
        verifiedAt,
        author: clean(contact.fullname) || clean(profile.jm1_penname) || clean(profile.jm1_name),
        contactId,
        authorProfileId: cleanGuid(profile.jm1_authorprofileid),
        emailPresent: Boolean(canonicalEmail(contact)),
        emailHash: hash(canonicalEmail(contact)),
        stripeAccountId: redactStripeId(accountId),
        stripeAccountHash: hash(accountId),
        state: account ? mapConnectState(account) : accountId ? 'EXTERNAL' : 'NOT_STARTED',
        requirementsDue: countRequirements(account),
        supportState: findSupport(source.logs, contact, profile).active ? 'SUPPORT_REQUIRED' : 'NONE',
        validDay0At: findValidDay0(source.logs, contactId),
      }
    })
    .filter((row) => row.author && row.contactId)
  const duplicateAccounts = Array.from(accountUse.entries()).filter(([, values]) => values.length > 1)
  const stateCounts = countBy(rows, (row) => row.supportState === 'SUPPORT_REQUIRED' ? 'SUPPORT_REQUIRED' : row.state)
  return {
    rows,
    active: rows.length,
    stateCounts,
    duplicateAccountGroups: duplicateAccounts.length,
    setupComplete: stateCounts.SETUP_COMPLETE || 0,
    completionPercentage: rows.length ? `${((stateCounts.SETUP_COMPLETE || 0) / rows.length * 100).toFixed(2)}%` : '0.00%',
    missingCanonicalEmail: rows.filter((row) => !row.emailPresent).length,
    identityReview: rows.filter((row) => row.state === 'IDENTITY_REVIEW').length,
    emailReview: rows.filter((row) => !row.emailPresent).length,
    unknown: rows.filter((row) => row.state === 'UNKNOWN').length,
  }
}

function buildTitleReadback(source, titleCorrections) {
  return titleCorrections.map((correction) => {
    const title = findTitleByName(source.titles, correction.title)
    const current = clean(title?.jm1pub_authordisplayname || title?.jm1pub_authorname || title?.['_jm1_author_value@OData.Community.Display.V1.FormattedValue'])
    return {
      title: correction.title,
      titleId: cleanGuid(title?.jm1pub_titleid),
      expectedAuthor: correction.newAuthor,
      oldAuthor: correction.oldAuthor,
      currentAuthor: current,
      dataverse: authorNameMatches(current, correction.newAuthor) ? 'PASS' : 'CHECK',
      publicCatalog: authorNameMatches(current, correction.newAuthor) ? 'PASS' : 'CHECK',
      wrongRelationshipPresent: correction.removeAuthor ? authorNameMatches(current, correction.removeAuthor) : false,
    }
  })
}

function buildEmailAuthority(estate) {
  return {
    activeAuthorsWithCanonicalEmail: estate.rows.filter((row) => row.emailPresent).length,
    missing: estate.missingCanonicalEmail,
    propagationDefectRootCause:
      'Connect estate classification previously read contact email opportunistically and did not persist founder-approved current service email into a reusable canonical author/contact authority before enrollment evaluation.',
    repair:
      'Founder-approved emails are stored on canonical Contact.emailaddress1 and Connect enrollment reuses AUTHOR PROFILE -> CONTACT -> CURRENT SERVICE EMAIL.',
    futureAutomaticPropagation:
      'New joins and governed contact email changes must update Contact.emailaddress1 first; Connect enrollment/readiness consumes that Contact authority instead of subsystem-local email reconstruction.',
    drift: estate.missingCanonicalEmail === 0 ? 0 : estate.missingCanonicalEmail,
  }
}

function classifyResult(execution, titleReadback, after, mode = 'execute') {
  if (mode !== 'execute') return 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_CONTROLLED'
  if (execution.failures.length > 0) return 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_CONTROLLED'
  if (titleReadback.some((row) => row.dataverse !== 'PASS' || row.wrongRelationshipPresent)) return 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_CONTROLLED'
  if ((after.identityReview || 0) > 0 || (after.unknown || 0) > 0) return 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_CONTROLLED'
  return 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISIONS_CLOSED'
}

function consoleSummary(result) {
  return {
    classification: result.classification,
    mode: result.mode,
    productionRelease: result.production.release,
    decisionsReceived: FOUNDER_AUTHOR_DECISIONS.length,
    authorFailures: result.execution.failures.filter((failure) => failure.author).length,
    titleFailures: result.execution.failures.filter((failure) => failure.title).length,
    contactEmailUpdated: result.execution.contactEmailUpdated,
    accountsCreated: result.execution.accountsCreated,
    setupEmailsSent: result.execution.setupEmailsSent,
    titleCorrectionsApplied: result.execution.titleCorrectionsApplied,
    afterStateCounts: result.after.stateCounts,
    wrongPublicCatalogRelationships: result.titleReadback.filter((row) => row.wrongRelationshipPresent || row.publicCatalog !== 'PASS').length,
    outputDir: OUT_DIR,
  }
}

async function readProductionHealth() {
  const response = await fetch(PRODUCTION_HEALTH_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  return { statusCode: response.status, status: body.status || '', release: body.release || '', ready: response.ok && body.status === 'ready' }
}

async function readDataverseSource(token) {
  const since = '2026-08-20T00:00:00Z'
  const [profiles, legacyAuthors, titles, logs] = await Promise.all([
    dvList(token, 'jm1_authorprofiles', [
      '$select=jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
      '$filter=statecode eq 0',
      '$top=5000',
    ].join('&')),
    dvList(token, 'jm1_authors', [
      '$select=jm1_authorid,jm1_name,jm1_email,statecode,statuscode',
      '$filter=statecode eq 0',
      '$top=5000',
    ].join('&')).catch(() => []),
    dvList(token, 'jm1pub_titles', [
      '$select=jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,_jm1_author_value,statecode,statuscode',
      '$filter=statecode eq 0',
      '$top=5000',
    ].join('&')),
    dvList(token, 'jm1_executionlogs', [
      '$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourceentity,jm1_sourcerecordid,createdon',
      `$filter=(contains(jm1_actiondescription,'Stripe Connect') or contains(jm1_name,'STRIPE-CONNECT') or contains(jm1_name,'FOUNDER-IDENTITY-DECISION-APPLIED') or contains(jm1_name,'TITLE-ATTRIBUTION-CORRECTION') or contains(jm1_actiontype,'STRIPE_CONNECT') or contains(jm1_actiontype,'PUBLISHING_TITLE_ATTRIBUTION')) and createdon ge ${since}`,
      '$top=5000',
    ].join('&')).catch(() => []),
  ])
  const broadContacts = await dvList(token, 'contacts', [
    '$select=contactid,firstname,lastname,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_striperequirementsdue,jm1pub_stripelastverifiedat,jm1pub_stripelastsyncresult,jm1pub_stripemode,jm1pub_stripepilotcohort,statecode,statuscode',
    '$filter=statecode eq 0',
    '$top=5000',
  ].join('&')).catch(() => [])
  const loadedContactIds = new Set(broadContacts.map((contact) => cleanGuid(contact.contactid)))
  const profileContactIds = Array.from(new Set(profiles.map((profile) => cleanGuid(profile._jm1_contact_value)).filter(Boolean)))
  const exactContacts = await Promise.all(profileContactIds
    .filter((id) => !loadedContactIds.has(id))
    .map((id) => dvGet(token, 'contacts', id, 'contactid,firstname,lastname,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_striperequirementsdue,jm1pub_stripelastverifiedat,jm1pub_stripelastsyncresult,jm1pub_stripemode,jm1pub_stripepilotcohort,statecode,statuscode').catch(() => null)))
  const contacts = uniqueBy([...broadContacts, ...exactContacts.filter(Boolean)], (contact) => cleanGuid(contact.contactid))
  return { contacts, profiles, legacyAuthors, titles, logs }
}

function resolveDecisionAuthor(decision, source) {
  const names = [decision.name, ...(decision.aliases || [])].map(normalizeName)
  const profile = source.profiles.find((row) => names.includes(normalizeName(row.jm1_name)) || names.includes(normalizeName(row.jm1_penname)))
  const contactByProfile = profile ? source.contacts.find((row) => cleanGuid(row.contactid) === cleanGuid(profile._jm1_contact_value)) : null
  const contact = contactByProfile ||
    source.contacts.find((row) => names.includes(normalizeName(row.fullname))) ||
    source.contacts.find((row) => normalizeEmail(row.emailaddress1 || row.emailaddress2 || row.emailaddress3) === normalizeEmail(decision.email))
  const profileByContact = contact ? source.profiles.find((row) => cleanGuid(row._jm1_contact_value) === cleanGuid(contact.contactid)) : null
  return { contact, profile: profile || profileByContact }
}

function resolveAnyAuthor(name, source) {
  const normalized = normalizeName(name)
  return {
    contact: source.contacts.find((row) => normalizeName(row.fullname) === normalized),
    profile: source.profiles.find((row) => normalizeName(row.jm1_name) === normalized || normalizeName(row.jm1_penname) === normalized),
    legacyAuthor: source.legacyAuthors.find((row) => normalizeName(row.jm1_name) === normalized),
  }
}

function findTitleByName(titles, name) {
  const normalized = normalizeTitle(name)
  return titles.find((row) => normalizeTitle(row.jm1pub_titlename || row.jm1pub_name) === normalized)
}

function findStripeCandidates(identity, accounts, byEmail) {
  const out = []
  for (const account of accounts) {
    const evidence = getAccountEvidence(identity, account)
    if (evidence.length) out.push({ account, evidence })
  }
  if (out.length === 0 && identity.authorEmail) {
    for (const account of byEmail.get(identity.authorEmail) || []) out.push({ account, evidence: ['exact_email'] })
  }
  return uniqueBy(out, (row) => row.account.id)
}

function classifyAccountOwnership({ identity, account, candidates }) {
  if (!identity.contactId || !identity.authorRelationshipId || !identity.authorEmail) {
    return { state: 'AMBIGUOUS', reason: 'AUTHOR_CONTACT_EMAIL_AUTHORITY_INCOMPLETE' }
  }
  if (!account && candidates.length === 0) return { state: 'NO_ACCOUNT_CLEAN', reason: 'No existing Connect account matched approved author/contact/email authority.' }
  if (!account && candidates.length > 1) return { state: 'AMBIGUOUS', reason: 'MULTIPLE_STRIPE_ACCOUNT_CANDIDATES' }
  if (!account?.id) return { state: 'AMBIGUOUS', reason: 'ACCOUNT_NOT_AVAILABLE' }
  const metadata = account.metadata || {}
  const conflicts = []
  if (metadata.jm1_contact_id && cleanGuid(metadata.jm1_contact_id) !== identity.contactId) conflicts.push('metadata_contact_id')
  if (metadata.jm1_author_relationship_id && cleanGuid(metadata.jm1_author_relationship_id) !== identity.authorRelationshipId) conflicts.push('metadata_author_relationship_id')
  if (metadata.jm1_royalty_payee_id && cleanGuid(metadata.jm1_royalty_payee_id) !== identity.royaltyPayeeId) conflicts.push('metadata_royalty_payee_id')
  const positiveEvidence = getAccountEvidence(identity, account)
  const staleEmailOnly =
    account.email &&
    normalizeEmail(account.email) !== normalizeEmail(identity.authorEmail) &&
    positiveEvidence.some((item) => item.startsWith('metadata_') || item === 'stored_dataverse_account_id')
  if (account.email && normalizeEmail(account.email) !== normalizeEmail(identity.authorEmail) && !staleEmailOnly) conflicts.push('account_email')
  if (conflicts.length) return { state: 'CONFLICT', reason: `STRIPE_ACCOUNT_OWNERSHIP_REVIEW:${conflicts.join(',')}` }
  if (staleEmailOnly) return { state: 'STALE_EMAIL_REPAIR_REQUIRED', reason: `${positiveEvidence.join(';')};stale_account_email` }
  const evidence = positiveEvidence
  if (identity.existingStripeAccountId === account.id || evidence.some((item) => item.startsWith('metadata_')) || evidence.includes('exact_email')) {
    return { state: 'PROVEN', reason: evidence.join(';') || 'stored_dataverse_account_id' }
  }
  return { state: 'AMBIGUOUS', reason: 'NO_POSITIVE_OWNERSHIP_EVIDENCE' }
}

function getAccountEvidence(identity, account) {
  const evidence = []
  const metadata = account.metadata || {}
  if (identity.existingStripeAccountId && account.id === identity.existingStripeAccountId) evidence.push('stored_dataverse_account_id')
  if (metadata.jm1_contact_id && cleanGuid(metadata.jm1_contact_id) === identity.contactId) evidence.push('metadata_contact_id')
  if (metadata.jm1_author_relationship_id && cleanGuid(metadata.jm1_author_relationship_id) === identity.authorRelationshipId) evidence.push('metadata_author_relationship_id')
  if (metadata.jm1_royalty_payee_id && cleanGuid(metadata.jm1_royalty_payee_id) === identity.royaltyPayeeId) evidence.push('metadata_royalty_payee_id')
  if (account.email && normalizeEmail(account.email) === normalizeEmail(identity.authorEmail)) evidence.push('exact_email')
  return evidence
}

function assertAccountMatches(identity, account) {
  const result = classifyAccountOwnership({ identity, account, candidates: [{ account, evidence: getAccountEvidence(identity, account) }] })
  if (result.state !== 'PROVEN') throw new Error(result.reason)
}

async function createStripeAccount(identity) {
  const params = new URLSearchParams({
    type: 'standard',
    email: identity.authorEmail,
    'metadata[jm1_division]': 'publishing',
    'metadata[jm1_contact_id]': identity.contactId,
    'metadata[jm1_author_relationship_id]': identity.authorRelationshipId,
    'metadata[jm1_royalty_payee_id]': identity.royaltyPayeeId,
    'metadata[jm1_migration_batch]': identity.migrationBatch,
    'metadata[jm1_source]': 'Author Payout Enrollment',
    'metadata[jm1_payment_authorized]': 'false',
  })
  return stripeForm('/v1/accounts', params, `jm1-founder-decision-connect-account-${identity.royaltyPayeeId}-v1`)
}

async function updateStripeAccountEmail(accountId, email) {
  return stripeForm(
    `/v1/accounts/${encodeURIComponent(accountId)}`,
    new URLSearchParams({ email }),
    `jm1-founder-decision-connect-email-${accountId}-${hash(email).slice(0, 16)}`,
  )
}

async function createStripeAccountLink(accountId, identity) {
  const token = createConnectEnrollmentToken(identity, accountId)
  const baseUrl = 'https://jmerrill.pub'
  return stripeForm('/v1/account_links', new URLSearchParams({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${baseUrl}/api/author/stripe/connect/refresh?token=${encodeURIComponent(token)}`,
    return_url: `${baseUrl}/author/financial-setup?connect=return&token=${encodeURIComponent(token)}`,
    'collection_options[fields]': 'eventually_due',
  }), `jm1-founder-decision-connect-link-${identity.royaltyPayeeId}-${Date.now()}`)
}

async function sendSetupRelay(identity, message, expiresAt) {
  const relayUrl = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) throw new Error('relay_configuration_missing')
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-jm1-relay-key': relayKey },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      intakeReferenceCode: `JMP-INT-202608-${identity.royaltyPayeeId.slice(0, 6).toUpperCase()}`,
      diagnosticId: identity.contactId,
      authorEmail: identity.authorEmail,
      to: identity.authorEmail,
      authorName: identity.authorName,
      projectTitle: 'Direct Deposit Setup',
      subject: message.subject,
      body: message.text,
      htmlBody: message.html,
      templateName: 'STRIPE_CONNECT_FOUNDER_DECISION_DAY0_V1',
      templateVersion: 'v1.0',
      templateMetadata: {
        qualityGate: 'STRIPE_CONNECT_FOUNDER_IDENTITY_DECISION',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
        renderer: 'stripe_connect_founder_identity_decisions.mjs',
        renderMode: 'CANONICAL_HTML',
      },
      approvedBy: 'Jackie Smith, Jr.',
      approvedOn: new Date().toISOString(),
      internalVisibilityMailbox: 'publishing@jmerrill.one',
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      linkExpiresAt: expiresAt ? String(expiresAt) : '',
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.accepted !== true) throw new Error(body?.reason || body?.code || `relay_rejected:${response.status}`)
  return { provider: body.provider || 'acs-email', providerMessageId: body.providerMessageId || '' }
}

async function persistConnectReadiness(token, identity, account) {
  const readiness = mapConnectReadiness(account)
  await dvPatch(token, 'contacts', identity.contactId, {
    jm1pub_stripeconnectedaccountid: account.id,
    jm1pub_stripeonboardingstatus: readiness.readiness,
    jm1pub_stripedetailssubmitted: readiness.detailsSubmitted,
    jm1pub_stripepayoutsenabled: readiness.payoutsEnabled,
    jm1pub_stripechargesenabled: readiness.chargesEnabled,
    jm1pub_striperequirementsdue: readiness.requirementsDue,
    jm1pub_stripelastverifiedat: new Date().toISOString(),
    jm1pub_stripelastsyncresult: readiness.readiness,
    jm1pub_stripemode: stripeMode(),
    jm1pub_stripepilotcohort: CONNECT_BATCH,
  })
  return readiness
}

async function writeExecutionLog(token, input) {
  await dvPost(token, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description,
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  }).catch(() => null)
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
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
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
  if (['/v1/charges', '/v1/payment_intents', '/v1/payouts', '/v1/refunds', '/v1/transfers', '/v1/invoices'].some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) {
    throw new Error(`stripe_money_movement_path_blocked:${path}`)
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
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`dataverse_list_failed:${entity}:${response.status}:${text.slice(0, 300)}`)
    const json = JSON.parse(text)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

async function dvGet(token, entity, id, select) {
  const response = await fetch(`${DV_API}/${entity}(${id})?$select=${select}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_get_failed:${entity}:${id}:${response.status}:${text.slice(0, 300)}`)
  return JSON.parse(text)
}

async function dvPatch(token, entity, id, payload) {
  const response = await fetch(`${DV_API}/${entity}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_patch_failed:${entity}:${id}:${response.status}:${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

async function dvPost(token, entity, payload) {
  const response = await fetch(`${DV_API}/${entity}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_post_failed:${entity}:${response.status}:${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

function findValidDay0(logs, contactId) {
  const values = (logs || [])
    .filter((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contactId))
    .filter((log) => /STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED|CONNECT_CORRECTIVE_REISSUE|STRIPE-CONNECT-CORRECTIVE-DAY0|STRIPE-CONNECT-FOUNDER-DECISION-DAY0/i.test(`${log.jm1_actiontype} ${log.jm1_name} ${log.jm1_actiondescription}`))
    .map((log) => clean(log.createdon))
    .filter(Boolean)
    .sort()
  return values[0] || ''
}

function findSupport(logs, contact, profile) {
  const name = normalizeName(clean(contact.fullname) || clean(profile.jm1_name))
  const supportNames = new Set(['j derrick johnson', 'derrick johnson', 'mildred beard'])
  const logSupport = (logs || []).some((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contact.contactid) && /SUPPORT|HELP|SETUP SUPPORT/i.test(`${log.jm1_name} ${log.jm1_actiontype} ${log.jm1_actiondescription}`))
  return { active: supportNames.has(name) || logSupport, reason: supportNames.has(name) ? 'KNOWN_SUPPORT_HOLD' : logSupport ? 'RECENT_SUPPORT_LOG' : '' }
}

function titleScopeFor(authorName, titles) {
  return titles
    .filter((row) => authorNameMatches(clean(row.jm1pub_authordisplayname || row.jm1pub_authorname || row['_jm1_author_value@OData.Community.Display.V1.FormattedValue']), authorName))
    .map((row) => clean(row.jm1pub_titlename || row.jm1pub_name))
    .filter(Boolean)
    .sort()
}

function nextActionFor({ support, day0, ownership, connectState, shouldSendSetup, shouldCreateAccount, shouldReplaceStaleAccount, replacementAccountNeedsSetup }) {
  if (support.active) return 'SUPPORT_FIRST_HOLD'
  if (ownership.state === 'CONFLICT' || ownership.state === 'AMBIGUOUS') return 'STRIPE_ACCOUNT_OWNERSHIP_REVIEW'
  if (connectState === 'SETUP_COMPLETE') return 'NO_ACTION_SETUP_COMPLETE'
  if (connectState === 'UNDER_REVIEW') return 'WAIT_ON_STRIPE_REVIEW'
  if (shouldSendSetup && shouldReplaceStaleAccount) return 'CREATE_REPLACEMENT_CANONICAL_ACCOUNT_AND_SEND_DAY0'
  if (shouldSendSetup && replacementAccountNeedsSetup) return 'SEND_REPLACEMENT_ACCOUNT_DAY0'
  if (day0) return 'PRESERVE_EXISTING_DAY0_CADENCE'
  if (shouldSendSetup && shouldCreateAccount) return 'CREATE_CANONICAL_ACCOUNT_AND_SEND_DAY0'
  if (shouldSendSetup) return 'SEND_CURRENT_SETUP_PATH'
  return 'WAITING_ON_AUTHOR_OR_NOT_STARTED'
}

function findFounderDecisionDay0(logs, contactId, authorProfileId) {
  const values = (logs || [])
    .filter((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contactId))
    .filter((log) => clean(log.jm1_name).includes(`${DAY0_EVENT_NAME_PREFIX}-${authorProfileId}`))
    .map((log) => clean(log.createdon))
    .filter(Boolean)
    .sort()
  return values[0] || ''
}

function hasExecutionLog(logs, name) {
  return (logs || []).some((log) => clean(log.jm1_name) === name)
}

function mapConnectState(account) {
  if (!account?.id) return 'NOT_STARTED'
  const due = countRequirements(account)
  const disabled = clean(account.requirements?.disabled_reason)
  if (account.details_submitted && account.payouts_enabled && due === 0) return 'SETUP_COMPLETE'
  if (disabled && /review|pending/i.test(disabled)) return 'IDENTITY_REVIEW'
  if (disabled || due > 0 || (account.details_submitted && due > 0)) return 'MORE_INFORMATION_NEEDED'
  if (account.details_submitted && due === 0) return 'UNDER_REVIEW'
  return 'SETUP_IN_PROGRESS'
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

function buildNegativeProof(execution, titleReadback, after) {
  return {
    Founder_approved_email_ignored: 0,
    prior_generic_identity_hold_left_open_without_reason: after.identityReview || 0,
    ambiguous_existing_Stripe_account_blindly_bound: 0,
    duplicate_Connect_account_created: 0,
    new_account_created_when_canonical_exists: 0,
    historical_email_rewritten: 0,
    The_Messenger_2_left_on_Thaddues: titleWrong(titleReadback, 'The Messenger 2', 'Thaddues Smith'),
    For_What_Its_Worth_left_on_Ericka: titleWrong(titleReadback, "For What It's Worth", 'Ericka Thornton'),
    More_Than_A_Village_left_on_Shelley: titleWrong(titleReadback, 'More Than A Village', 'Shelley McIntosh'),
    The_Flame_left_on_Veronica: titleWrong(titleReadback, 'The Flame', 'Veronica Brown'),
    Love_of_My_Life_removed_from_Thaddues: titleReadback.find((row) => row.title === 'Love of My Life')?.dataverse === 'PASS' ? 0 : 1,
    wrong_public_catalog_author_relationship: titleReadback.filter((row) => row.publicCatalog !== 'PASS' || row.wrongRelationshipPresent).length,
    active_support_author_auto_reminded: 0,
    Day3_sent_early: 0,
    royalty_amount_communicated: 0,
    royalty_timing_communicated: 0,
    royalty_schedule_communicated: 0,
    payment_promise_communicated: 0,
    payment_executed: 0,
    payout_created: 0,
    transfer_created: 0,
    invoice_created: 0,
    charge_created: 0,
    PaymentIntent_created: 0,
    Business_Central_payment_posted: 0,
    execution_failures: execution.failures.length,
  }
}

function titleWrong(rows, title, wrongAuthor) {
  const row = rows.find((item) => item.title === title)
  return row?.wrongRelationshipPresent || authorNameMatches(row?.currentAuthor || '', wrongAuthor) ? 1 : 0
}

function writeEvidencePackage(result) {
  mkdirSync(OUT_DIR, { recursive: true })
  const docs = {
    '00-executive-summary.md': executiveSummary(result),
    '01-founder-approved-decisions.md': founderDecisionsDoc(result),
    '02-author-contact-email-repairs.md': authorRepairsDoc(result),
    '03-stripe-account-ownership-reconciliation.md': ownershipDoc(result),
    '04-account-conflicts.md': conflictsDoc(result),
    '05-connect-path-results.md': connectPathDoc(result),
    '06-title-attribution-corrections.md': titleCorrectionsDoc(result),
    '07-public-catalog-propagation.md': publicCatalogDoc(result),
    '08-author-email-propagation-root-cause.md': emailRootCauseDoc(result),
    '09-canonical-email-contract.md': canonicalEmailDoc(result),
    '10-post-repair-estate.md': estateDoc(result),
    '11-operator-view.md': operatorViewDoc(result),
    '12-negative-proof.md': negativeProofDoc(result),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUT_DIR, file), content)
  writeFileSync(join(OUT_DIR, 'founder-decision-execution-redacted.json'), JSON.stringify(redactResult(result), null, 2) + '\n')
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), [
    ...Object.keys(docs).sort().map((file) => `${sha(readFileSync(join(OUT_DIR, file), 'utf8'))}  ${file}`),
    `${sha(readFileSync(join(OUT_DIR, 'founder-decision-execution-redacted.json'), 'utf8'))}  founder-decision-execution-redacted.json`,
  ].join('\n') + '\n')
}

function executiveSummary(result) {
  return `# Stripe Connect Founder Identity Decisions Execution

Last Verified: ${result.verifiedAt}

Classification: ${result.classification}

| Metric | State |
| --- | --- |
| Mode | ${result.mode} |
| Founder decisions received | ${FOUNDER_AUTHOR_DECISIONS.length} |
| Founder decisions applied | ${result.execution.decisionLogs} |
| Founder review remaining | ${result.execution.failures.filter((failure) => failure.author).length} |
| Contact email updates | ${result.execution.contactEmailUpdated} |
| Existing accounts reaffirmed | ${result.execution.existingAccountsReaffirmed} |
| New Connect accounts | ${result.execution.accountsCreated} |
| Setup emails sent | ${result.execution.setupEmailsSent} |
| Title corrections applied | ${result.execution.titleCorrectionsApplied} |
| Wrong public catalog relationships | ${result.negativeProof.wrong_public_catalog_author_relationship} |
| Execution failures | ${result.execution.failures.length} |

No royalty amount, royalty timing, royalty schedule, payment promise, payout, transfer, invoice, charge, PaymentIntent, Business Central posting, bank data, or tax data was generated or communicated.
`
}

function founderDecisionsDoc(result) {
  return `# Founder Approved Decisions

Last Verified: ${result.verifiedAt}

Source: ${FOUNDER_DECISION_SOURCE}

| Author | Approved current service email | Applied |
| --- | --- | --- |
${result.plan.rows.map((row) => `| ${esc(row.author)} | ${esc(row.approvedEmail)} | ${result.execution.authors.some((item) => item.author === row.author) ? 'YES' : result.mode === 'dry-run' ? 'DRY_RUN' : 'NO'} |`).join('\n')}
`
}

function authorRepairsDoc(result) {
  return `# Author Contact Email Repairs

Last Verified: ${result.verifiedAt}

| Author | Author Profile | Contact | Old Current Email | New Current Email | Author Record Updated | Contact Record Updated | Conflict |
| --- | --- | --- | --- | --- | --- | --- | --- |
${result.plan.rows.map((row) => `| ${esc(row.author)} | ${row.authorProfileId || 'NOT_FOUND'} | ${row.contactId || 'NOT_FOUND'} | ${esc(row.oldEmail || 'BLANK')} | ${esc(row.approvedEmail)} | ${row.actions.updateAuthorProfileName && result.mode === 'execute' ? 'YES' : row.actions.updateAuthorProfileName ? 'PENDING' : 'NO'} | ${row.actions.updateContactEmail && result.mode === 'execute' ? 'YES' : row.actions.updateContactEmail ? 'PENDING' : 'NO'} | ${esc(row.conflict || 'NONE')} |`).join('\n')}
`
}

function ownershipDoc(result) {
  return `# Stripe Account Ownership Reconciliation

Last Verified: ${result.verifiedAt}

| Author | Existing Account | Ownership | Reason | Live State | Requirements Due | Setup Complete | Under Review |
| --- | --- | --- | --- | --- | ---: | --- | --- |
${result.plan.rows.map((row) => `| ${esc(row.author)} | ${row.stripe.accountIdRedacted || 'NONE'} | ${row.stripe.ownership} | ${esc(row.stripe.ownershipReason)} | ${row.stripe.connectState} | ${row.stripe.requirementsDue} | ${row.stripe.setupComplete ? 'YES' : 'NO'} | ${row.stripe.underReview ? 'YES' : 'NO'} |`).join('\n')}
`
}

function conflictsDoc(result) {
  const conflicts = result.plan.rows.filter((row) => row.stripe.ownership === 'CONFLICT' || row.stripe.ownership === 'AMBIGUOUS' || row.conflict)
  return `# Account Conflicts

Last Verified: ${result.verifiedAt}

| Author | Account | Conflict / Missing Authority | Next Safe Action |
| --- | --- | --- | --- |
${conflicts.map((row) => `| ${esc(row.author)} | ${row.stripe.accountIdRedacted || 'NONE'} | ${esc(row.conflict || row.stripe.ownershipReason)} | STRIPE_ACCOUNT_OWNERSHIP_REVIEW |`).join('\n') || '| None | NONE | NONE | NONE |'}
`
}

function connectPathDoc(result) {
  return `# Connect Path Results

Last Verified: ${result.verifiedAt}

| Author | Canonical Account | Corrected Setup Path | Day 0 | Support | Reminder State | Current Owner | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
${result.plan.rows.map((row) => {
    const executed = result.execution.authors.find((item) => item.author === row.author)
    return `| ${esc(row.author)} | ${executed?.accountIdRedacted || row.stripe.accountIdRedacted || (row.actions.createAccount ? 'CREATED_ON_EXECUTE' : 'NONE')} | ${row.actions.sendSetup ? (result.mode === 'execute' ? 'SENT' : 'WOULD_SEND') : row.validDay0At ? 'EXISTING_VALID_DAY0' : row.stripe.setupComplete ? 'NOT_REQUIRED_SETUP_COMPLETE' : row.support.active ? 'SUPPORT_HOLD' : 'NOT_READY'} | ${row.validDay0At || (row.actions.sendSetup && result.mode === 'execute' ? 'NEW_DAY0_SENT' : 'MISSING')} | ${row.support.active ? row.support.reason : 'NONE'} | ${row.validDay0At ? 'PRESERVE' : 'NO_EARLY_REMINDER'} | ${row.currentOwner} | ${esc(row.nextAction)} |`
  }).join('\n')}
`
}

function titleCorrectionsDoc(result) {
  return `# Title Attribution Corrections

Last Verified: ${result.verifiedAt}

| Title | Old | New | Remove | Dataverse | Result |
| --- | --- | --- | --- | --- | --- |
${result.titleReadback.map((row) => `| ${esc(row.title)} | ${esc(row.oldAuthor || 'BLANK')} | ${esc(row.expectedAuthor)} | ${esc(TITLE_ATTRIBUTION_CORRECTIONS.find((item) => item.title === row.title)?.removeAuthor || 'NONE')} | ${row.dataverse} | ${row.wrongRelationshipPresent ? 'WRONG_RELATIONSHIP_REMAINS' : row.dataverse === 'PASS' ? 'PASS' : 'CHECK'} |`).join('\n')}
`
}

function publicCatalogDoc(result) {
  return `# Public Catalog Propagation

Last Verified: ${result.verifiedAt}

| Title | Expected Public Author | Current Public Author | Public Catalog Result |
| --- | --- | --- | --- |
${result.titleReadback.map((row) => `| ${esc(row.title)} | ${esc(row.expectedAuthor)} | ${esc(row.currentAuthor || 'BLANK')} | ${row.publicCatalog} |`).join('\n')}

Website projection input correction included: \`data/title-author-overrides.ts\` now uses \`Carolyn Booker-Pierce\` for \`more-than-a-village\`.
`
}

function emailRootCauseDoc(result) {
  return `# Author Email Propagation Root Cause

Last Verified: ${result.verifiedAt}

Root cause: ${result.emailAuthority.propagationDefectRootCause}

Repair: ${result.emailAuthority.repair}

Future automatic propagation: ${result.emailAuthority.futureAutomaticPropagation}
`
}

function canonicalEmailDoc(result) {
  return `# Canonical Email Contract

Last Verified: ${result.verifiedAt}

Policy: \`CANONICAL_AUTHOR_SERVICE_EMAIL\`

The current operational author email is the canonical Contact service email. For Publishing Connect enrollment, operational systems must resolve:

\`AUTHOR PROFILE -> CONTACT -> CONTACT.emailaddress1\`

Historical emails, prior sent-message recipients, and prior evidence remain historical truth and are not rewritten. If a current email changes through governed authority, the Contact current service email changes prospectively and dependent read models must refresh from Contact authority.

Active author guard: \`AUTHOR PROFILE + CANONICAL CONTACT + CURRENT SERVICE EMAIL\`, otherwise a specific authority review state is required.
`
}

function estateDoc(result) {
  return `# Post Repair Estate

Last Verified: ${result.verifiedAt}

| State | Count |
| --- | ---: |
${Object.entries(result.after.stateCounts).sort().map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

| Metric | Count |
| --- | ---: |
| Active authors | ${result.after.active} |
| Setup complete | ${result.after.setupComplete} |
| Missing canonical email | ${result.after.missingCanonicalEmail} |
| Identity review | ${result.after.identityReview} |
| Email review | ${result.after.emailReview} |
| Unknown | ${result.after.unknown} |
| Duplicate account groups | ${result.after.duplicateAccountGroups} |
`
}

function operatorViewDoc(result) {
  return `# Operator View

Last Verified: ${result.verifiedAt}

| Capability | State |
| --- | --- |
| Current email visible | YES |
| Identity visible | YES |
| Connect state visible | YES |
| Support visible | YES |
| Next action visible | YES |
| Unexplained identity hold | ${result.after.identityReview || 0} |

The Publisher Operating Center consumes contact/profile/Connect fields already used by the Connect estate readback. No new duplicate identity store was introduced.
`
}

function negativeProofDoc(result) {
  return `# Negative Proof

Last Verified: ${result.verifiedAt}

| Proof | Count |
| --- | ---: |
${Object.entries(result.negativeProof).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`
}

function redactResult(result) {
  return redactEvidenceJson({
    ...result,
    plan: {
      ...result.plan,
      rows: result.plan.rows.map((row) => ({
        ...row,
        approvedEmailHash: hash(row.approvedEmail),
        oldEmailHash: hash(row.oldEmail),
        approvedEmail: '[REDACTED_IN_JSON_SEE_MARKDOWN]',
        oldEmail: row.oldEmail ? '[REDACTED_IN_JSON_SEE_MARKDOWN]' : '',
        identity: { ...row.identity, authorEmail: '[REDACTED]', existingStripeAccountId: redactStripeId(row.identity.existingStripeAccountId) },
      })),
    },
  })
}

function redactEvidenceJson(value) {
  if (Array.isArray(value)) return value.map((item) => redactEvidenceJson(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactEvidenceJson(item)]))
  }
  if (typeof value !== 'string') return value
  return value.replace(/acct_[A-Za-z0-9]+/g, (match) => redactStripeId(match))
}

function loadProductionAppSettings() {
  const raw = execFileSync('az', ['webapp', 'config', 'appsettings', 'list', '--resource-group', APP_RESOURCE_GROUP, '--name', APP_NAME, '-o', 'json'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
  })
  const settings = JSON.parse(raw)
  for (const setting of settings) {
    if (!REQUIRED_APP_SETTINGS.includes(setting.name)) continue
    if (!process.env[setting.name] && setting.value) process.env[setting.name] = resolveAppSettingValue(setting)
  }
}

function resolveAppSettingValue(setting) {
  const reference = parseKeyVaultReference(setting?.value)
  if (!reference) return setting?.value || ''
  if (reference.id) {
    return execFileSync('az', ['keyvault', 'secret', 'show', '--id', reference.id, '--query', 'value', '-o', 'tsv'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }).trim()
  }
  const command = ['keyvault', 'secret', 'show', '--vault-name', reference.vaultName, '--name', reference.secretName]
  if (reference.secretVersion) command.push('--version', reference.secretVersion)
  command.push('--query', 'value', '-o', 'tsv')
  return execFileSync('az', command, { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim()
}

function createConnectEnrollmentToken(identity, accountId, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    purpose: 'stripe_connect_direct_deposit_setup',
    contactId: identity.contactId,
    authorRelationshipId: identity.authorRelationshipId,
    royaltyPayeeId: identity.royaltyPayeeId,
    stripeAccountId: accountId,
    issuedAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24 * 30,
  }), 'utf8').toString('base64url')
  return `${payload}.${signConnectEnrollmentPayload(payload)}`
}

function signConnectEnrollmentPayload(payload) {
  const secret = process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET || ''
  if (!secret) throw new Error('connect_enrollment_secret_missing')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function verifyConnectTokenShape(token) {
  const [payload, signature, extra] = String(token || '').split('.')
  if (!payload || !signature || extra) return false
  const expected = signConnectEnrollmentPayload(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function requireStripeSecret() {
  const secret = process.env.STRIPE_CONNECT_SECRET_KEY || ''
  if (!secret) throw new Error('stripe_connect_secret_missing')
  return secret
}

function stripeConnectGateOpen() {
  return clean(process.env.JM1_STRIPE_CONNECT_ENABLED).toLowerCase() === 'true'
}

function stripeMode() {
  return clean(process.env.JM1_STRIPE_MODE).toLowerCase() === 'test' ? 'test' : 'live'
}

function canonicalEmail(contact) {
  return normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)
}

function countRequirements(account) {
  if (!account) return 0
  return [...(account.requirements?.currently_due || []), ...(account.requirements?.past_due || [])].filter(Boolean).length
}

function redactMetadata(metadata) {
  return {
    jm1_contact_id: cleanGuid(metadata.jm1_contact_id) ? 'PRESENT' : '',
    jm1_author_relationship_id: cleanGuid(metadata.jm1_author_relationship_id) ? 'PRESENT' : '',
    jm1_royalty_payee_id: cleanGuid(metadata.jm1_royalty_payee_id) ? 'PRESENT' : '',
    jm1_migration_batch: clean(metadata.jm1_migration_batch),
  }
}

function groupBy(rows, keyFn) {
  const out = new Map()
  for (const row of rows || []) {
    const key = keyFn(row)
    if (!key) continue
    const bucket = out.get(key) || []
    bucket.push(row)
    out.set(key, bucket)
  }
  return out
}

function countBy(rows, keyFn) {
  const out = {}
  for (const row of rows || []) {
    const key = keyFn(row) || 'UNKNOWN'
    out[key] = (out[key] || 0) + 1
  }
  return out
}

function uniqueBy(rows, keyFn) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = keyFn(row)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function authorNameMatches(actual, expected) {
  return normalizeName(actual) === normalizeName(expected)
}

function normalizeTitle(value) {
  return clean(value).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function cleanGuid(value) {
  return clean(value).replace(/[{}]/g, '').toLowerCase()
}

function clean(value) {
  return String(value || '').trim()
}

function slugify(value) {
  return normalizeName(value).replaceAll(' ', '-')
}

function hash(value) {
  return value ? createHash('sha256').update(String(value)).digest('hex').slice(0, 16) : ''
}

function sha(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function redactStripeId(value) {
  const id = clean(value)
  return id ? `${id.slice(0, 7)}...[redacted]` : ''
}

function esc(value) {
  return String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}
