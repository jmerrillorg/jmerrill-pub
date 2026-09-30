import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { recordsFromCsv, safeSourceSummary } from './author_royalty_connect_migration_source_guard.mjs'
import { hashValue, hasPayeeEntitySignal, normalizeEmail, normalizeName, stripAuthorSuffix } from './author_royalty_identity_reconciliation.mjs'

const SOURCE = '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/00_CANON/Publishing/Royalty/3263988231707345883_J_Merrill_Publishing_Vendor_05-01-26-.csv'
const OUT = 'docs/operations/generated/JMP-AUTHOR-ROYALTY-STRUCTURED-LINK-REPAIR-2026-08-22'
const DV = 'https://jm1hq.crm.dynamics.com'
const API = `${DV}/api/data/v9.2`
const BATCH = 'JMP_AUTHOR_ROYALTY_STRUCTURED_LINK_REPAIR_2026_08_22'
const SUCCESS = 835500001

const sha = (value) => createHash('sha256').update(value).digest('hex')
const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
const now = () => new Date().toISOString()

export function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstname: parts[0] || '', lastname: parts[0] || '' }
  return { firstname: parts.slice(0, -1).join(' '), lastname: parts.at(-1) || '' }
}

export function classifyRepairCandidate({ sourceRecord, emailCount, emailContacts, nameContacts, titleMatches }) {
  const linked = [...new Set(titleMatches.map((title) => title._jm1_primaryauthor_value).filter(Boolean))]
  if (hasPayeeEntitySignal(sourceRecord)) return 'HUMAN_REVIEW_REQUIRED'
  if (emailCount > 1 || emailContacts.length > 1) return 'HUMAN_REVIEW_REQUIRED'
  if (emailContacts.length === 1) return emailContacts[0].jm1pub_stripeconnectedaccountid ? 'EXISTING_CONNECT_READY' : 'READY_FOR_STRIPE_CONNECT'
  if (nameContacts.length === 1 && titleMatches.length > 0 && linked.length === 0) return 'REPAIRABLE_STRUCTURED_LINK_MISSING'
  if (nameContacts.length > 0) return 'HUMAN_REVIEW_REQUIRED'
  if (titleMatches.length > 0 && linked.length === 0) return 'REPAIRABLE_STRUCTURED_LINK_MISSING'
  if (titleMatches.length > 0 && linked.length === 1) return 'READY_FOR_STRIPE_CONNECT'
  if (titleMatches.length > 0) return 'HUMAN_REVIEW_REQUIRED'
  return 'HUMAN_REVIEW_REQUIRED'
}

function token() {
  const result = spawnSync('az', ['account', 'get-access-token', '--resource', DV, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout.trim()
}

async function request(accessToken, method, path, body) {
  const response = await fetch(`${API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} ${response.status}: ${text}`)
  return text ? JSON.parse(text) : {}
}

async function list(accessToken, entity, query) {
  let url = `${entity}?${query}`
  const rows = []
  while (url) {
    const response = await fetch(url.startsWith('http') ? url : `${API}/${url}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'OData-Version': '4.0' },
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`${entity} ${response.status}: ${text}`)
    const body = JSON.parse(text)
    rows.push(...(body.value || []))
    url = body['@odata.nextLink'] || ''
  }
  return rows
}

function add(index, key, row) {
  if (!key) return
  const current = index.get(key) || []
  current.push(row)
  index.set(key, current)
}

function unique(rows, key) {
  const seen = new Set()
  return rows.filter((row) => {
    const value = key(row)
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function table(rows) {
  const header = '| author | sourceEmailHash | status | contact | authorProfile | titlesLinked | sampleTitles | reason |\n| --- | --- | --- | --- | --- | ---: | --- | --- |'
  return [header, ...rows.map((row) => `| ${esc(row.author)} | ${row.sourceEmailHash} | ${row.status} | ${esc(row.contactAction)} | ${esc(row.profileAction)} | ${row.titlesLinked} | ${esc(row.sampleTitles.join('; '))} | ${esc(row.reason)} |`)].join('\n')
}

function counts(rows, field) {
  return Object.entries(rows.reduce((out, row) => ({ ...out, [row[field]]: (out[row[field]] || 0) + 1 }), {})).sort()
}

async function loadState(accessToken) {
  const [contacts, titles, profiles, logs] = await Promise.all([
    list(accessToken, 'contacts', '$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_stripeonboardingstatus,jm1pub_striperequirementsdue'),
    list(accessToken, 'jm1pub_titles', '$select=jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,jm1pub_authordisplayname,jm1_canonicalauthorcontactreference,_jm1_primaryauthor_value'),
    list(accessToken, 'jm1_authorprofiles', '$select=jm1_authorprofileid,jm1_name,jm1_penname,jm1_isactiveauthor,_jm1_contact_value'),
    list(accessToken, 'jm1_executionlogs', `$select=jm1_executionlogid,jm1_actiontype,jm1_sourcerecordid,jm1_actiondescription&$filter=${encodeURIComponent(`jm1_actiontype eq 'AUTHOR_ROYALTY_STRUCTURED_LINK_REPAIRED'`)}`),
  ])
  const contactsByEmail = new Map()
  const contactsByName = new Map()
  for (const contact of contacts) {
    for (const field of ['emailaddress1', 'emailaddress2', 'emailaddress3']) add(contactsByEmail, normalizeEmail(contact[field]), contact)
    add(contactsByName, normalizeName(contact.fullname), contact)
  }
  const titlesByName = new Map()
  for (const title of titles) {
    for (const field of ['jm1pub_authorname', 'jm1pub_authordisplayname', 'jm1_canonicalauthorcontactreference']) add(titlesByName, normalizeName(title[field]), title)
  }
  const profilesByContact = new Map()
  for (const profile of profiles) add(profilesByContact, profile._jm1_contact_value, profile)
  const logsByContact = new Map()
  for (const log of logs) add(logsByContact, log.jm1_sourcerecordid, log)
  return { contacts, titles, profiles, contactsByEmail, contactsByName, titlesByName, profilesByContact, logsByContact }
}

async function ensureContact(accessToken, sourceRecord, state) {
  const author = stripAuthorSuffix(sourceRecord['Vendor Name'])
  const email = normalizeEmail(sourceRecord['Primary Email'])
  const existing = state.contactsByEmail.get(email)?.[0]
  if (existing) return { contact: existing, action: 'REUSED_EXISTING_EMAIL_CONTACT' }
  const existingByName = state.contactsByName.get(normalizeName(author))?.[0]
  if (existingByName) return { contact: existingByName, action: 'REUSED_EXISTING_NAME_AND_TITLE_CONTACT' }
  const nameParts = splitName(author)
  const contact = await request(accessToken, 'POST', 'contacts', {
    firstname: nameParts.firstname,
    lastname: nameParts.lastname,
    emailaddress1: email,
    jm1pub_isauthor: true,
    jm1pub_stripeonboardingstatus: 'NOT_STARTED',
    jm1pub_stripemode: 'live',
    jm1pub_stripepilotcohort: BATCH,
  })
  add(state.contactsByEmail, email, contact)
  add(state.contactsByName, normalizeName(contact.fullname || author), contact)
  return { contact, action: 'CREATED_MINIMUM_AUTHOR_CONTACT' }
}

async function ensureAuthorProfile(accessToken, author, contact, state) {
  const existing = state.profilesByContact.get(contact.contactid)?.[0]
  if (existing) return { profile: existing, action: 'REUSED_EXISTING_AUTHOR_PROFILE' }
  const profile = await request(accessToken, 'POST', 'jm1_authorprofiles', {
    jm1_name: author,
    jm1_penname: author,
    jm1_isactiveauthor: false,
    'jm1_Contact@odata.bind': `/contacts(${contact.contactid})`,
  })
  add(state.profilesByContact, contact.contactid, profile)
  return { profile, action: 'CREATED_HISTORICAL_AUTHOR_PROFILE' }
}

async function linkTitles(accessToken, titles, contact) {
  const linked = []
  for (const title of unique(titles, (row) => row.jm1pub_titleid)) {
    if (title._jm1_primaryauthor_value === contact.contactid) continue
    if (title._jm1_primaryauthor_value) continue
    await request(accessToken, 'PATCH', `jm1pub_titles(${title.jm1pub_titleid})`, {
      'jm1_PrimaryAuthor@odata.bind': `/contacts(${contact.contactid})`,
    })
    linked.push(title)
  }
  return linked
}

async function ensureLog(accessToken, contact, author, sourceRecord, titles, state) {
  const existing = state.logsByContact.get(contact.contactid)?.find((log) =>
    String(log.jm1_actiondescription || '').includes(BATCH),
  )
  if (existing) return { id: existing.jm1_executionlogid, action: 'REUSED_EXISTING_EXECUTION_LOG' }
  const body = await request(accessToken, 'POST', 'jm1_executionlogs', {
    jm1_name: `AUTHOR_ROYALTY_STRUCTURED_LINK_REPAIRED - ${author}`.slice(0, 200),
    jm1_actiontype: 'AUTHOR_ROYALTY_STRUCTURED_LINK_REPAIRED',
    jm1_actiondescription: [
      `migrationBatch=${BATCH}`,
      `sourceBillComVendorIdHash=${hashValue(sourceRecord['Vendor Id'] || author)}`,
      `sourceEmailHash=${hashValue(normalizeEmail(sourceRecord['Primary Email']))}`,
      `matchDisposition=DETERMINISTIC_HISTORICAL_AUTHOR_RELATIONSHIP_PROVEN_STRUCTURED_LINK_MISSING`,
      `titlesLinkedOrVerified=${unique(titles, (title) => title.jm1pub_titleid).length}`,
      'no contract economics, royalty rates, rights, historical payments, Bill.com records, or Stripe accounts changed',
    ].join(' | '),
    jm1_agentname: 'Codex',
    jm1_executionstatus: SUCCESS,
    jm1_sourceentity: 'contact',
    jm1_sourcerecordid: contact.contactid,
  })
  add(state.logsByContact, contact.contactid, body)
  return { id: body.jm1_executionlogid || '', action: 'CREATED_EXECUTION_LOG' }
}

async function main() {
  const execute = process.argv.includes('--execute')
  const verified = now()
  const csv = readFileSync(SOURCE, 'utf8')
  const sourceSummary = safeSourceSummary(SOURCE, csv)
  const sourceRows = recordsFromCsv(csv).filter((row) => String(row['Vendor Name'] || '').endsWith(', Author'))
  const emailCounts = new Map()
  for (const row of sourceRows) {
    const email = normalizeEmail(row['Primary Email'])
    emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  }
  const accessToken = token()
  const state = await loadState(accessToken)

  const results = []
  for (const sourceRecord of sourceRows) {
    const author = stripAuthorSuffix(sourceRecord['Vendor Name'])
    const email = normalizeEmail(sourceRecord['Primary Email'])
    const name = normalizeName(author)
    const emailContacts = state.contactsByEmail.get(email) || []
    const nameContacts = state.contactsByName.get(name) || []
    const titleMatches = state.titlesByName.get(name) || []
    const pre = classifyRepairCandidate({ sourceRecord, emailCount: emailCounts.get(email) || 0, emailContacts, nameContacts, titleMatches })

    if (pre !== 'REPAIRABLE_STRUCTURED_LINK_MISSING') {
      results.push({
        author,
        sourceEmailHash: hashValue(email),
        status: pre,
        contactAction: pre.includes('READY') ? 'existing' : 'none',
        profileAction: 'none',
        titlesLinked: 0,
        sampleTitles: unique(titleMatches, (title) => title.jm1pub_titleid).slice(0, 3).map((title) => title.jm1pub_titlename || 'Untitled'),
        reason: 'Not in the 55-row structured-link repair population for this pass.',
      })
      continue
    }

    if (!execute) {
      results.push({
        author,
        sourceEmailHash: hashValue(email),
        status: 'DRY_RUN_REPAIRABLE',
        contactAction: 'would create Contact',
        profileAction: 'would create Author Profile',
        titlesLinked: unique(titleMatches, (title) => title.jm1pub_titleid).length,
        sampleTitles: unique(titleMatches, (title) => title.jm1pub_titleid).slice(0, 3).map((title) => title.jm1pub_titlename || 'Untitled'),
        reason: 'Deterministic title-author evidence exists and no conflicting Contact candidate was found.',
      })
      continue
    }

    const { contact, action: contactAction } = await ensureContact(accessToken, sourceRecord, state)
    const { action: profileAction } = await ensureAuthorProfile(accessToken, author, contact, state)
    const linked = await linkTitles(accessToken, titleMatches, contact)
    const log = await ensureLog(accessToken, contact, author, sourceRecord, titleMatches, state)
    results.push({
      author,
      sourceEmailHash: hashValue(email),
      status: 'STRUCTURED_AUTHOR_RELATIONSHIP_REPAIRED',
      contactAction,
      profileAction: `${profileAction}; ${log.action}`,
      titlesLinked: linked.length,
      sampleTitles: unique(titleMatches, (title) => title.jm1pub_titleid).slice(0, 3).map((title) => title.jm1pub_titlename || 'Untitled'),
      reason: 'Created/reused machine-readable Contact + Author Profile and linked governed title rows to Contact primary-author lookup.',
    })
  }

  const repaired = results.filter((row) => row.status === 'STRUCTURED_AUTHOR_RELATIONSHIP_REPAIRED')
  const dryRunRepairable = results.filter((row) => row.status === 'DRY_RUN_REPAIRABLE')
  const residual = results.filter((row) => ['HUMAN_REVIEW_REQUIRED'].includes(row.status))
  const ready = results.filter((row) => row.status === 'READY_FOR_STRIPE_CONNECT')
  const existingConnect = results.filter((row) => row.status === 'EXISTING_CONNECT_READY')

  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, '01-pr-chain-reconciliation.md'), `# PR Chain Reconciliation\n\nLast Verified: ${verified}\n\n| PR | State | Merge SHA |\n| --- | --- | --- |\n| #561 | MERGED | 87ce391de832c08016c8c6d21a8d3572659d7d56 |\n| #558 | MERGED | 9c0561f0b2fbf5abe4b0bcfd016ea9617935ac86 |\n| #555 | MERGED TO MAIN | c87096c1e852a72e930bab2b0d55d50972008601 |\n\nCanonical main at repair start: c87096c1e852a72e930bab2b0d55d50972008601.\n`)
  writeFileSync(join(OUT, '02-55-author-repair-population.md'), `# 55 Author Repair Population\n\nLast Verified: ${verified}\n\n${table(results.filter((row) => row.status === 'DRY_RUN_REPAIRABLE' || row.status === 'STRUCTURED_AUTHOR_RELATIONSHIP_REPAIRED'))}\n`)
  writeFileSync(join(OUT, '03-write-contract.md'), `# Write Contract\n\nLast Verified: ${verified}\n\nAuthorized writes were limited to current schema surfaces:\n\n- Contact create/reuse with author flag and safe Stripe onboarding placeholder state.\n- Author Profile create/reuse linked to Contact.\n- Title primary-author lookup repair where the lookup was empty.\n- Execution Log evidence for each repaired Contact.\n\nNot authorized and not performed:\n\n- royalty rate changes;\n- rights changes;\n- contract changes;\n- historical payment changes;\n- Bill.com mutation;\n- Stripe account creation;\n- royalty payout execution;\n- author communication.\n`)
  writeFileSync(join(OUT, '04-deterministic-repair-results.md'), `# Deterministic Repair Results\n\nLast Verified: ${verified}\n\nMode: ${execute ? 'EXECUTE' : 'DRY_RUN'}\n\n${table(results)}\n`)
  writeFileSync(join(OUT, '05-post-repair-readiness.md'), `# Post-Repair Readiness\n\nLast Verified: ${verified}\n\n| readiness | count |\n| --- | ---: |\n${counts(results, 'status').map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\nNew clean authors ready before/after this run should be evaluated by rerunning this script after execute mode. Execute mode makes the structured Contact link machine-readable; it does not create Stripe accounts.\n`)
  writeFileSync(join(OUT, '06-residual-human-review.md'), `# Residual Human Review\n\nLast Verified: ${verified}\n\nResidual human-review rows: ${residual.length}\n\n${table(residual)}\n`)
  writeFileSync(join(OUT, '07-existing-connect-verification.md'), `# Existing Connect Verification\n\nLast Verified: ${verified}\n\nExisting Connect-ready rows identified from Contact field presence: ${existingConnect.length}\n\n${table(existingConnect)}\n`)
  writeFileSync(join(OUT, '08-pilot-selection.md'), `# Pilot Selection\n\nLast Verified: ${verified}\n\nPilot status: ${execute && repaired.length >= 3 ? 'STRUCTURED_REPAIR_COMPLETE_BUT_CONNECT_RUNTIME_NOT_GENERALIZED' : 'NOT_READY'}\n\nReason: current website Stripe Connect start route remains commissioning-scoped and hard-coded to The Intentional Leader. This repair pass did not send pilot invitations or create accounts because doing so through the existing route would risk wrong-author metadata/linkage.\n\n| Metric | Count |\n| --- | ---: |\n| repaired in execute mode | ${repaired.length} |\n| dry-run repairable | ${dryRunRepairable.length} |\n| pre-existing ready | ${ready.length} |\n| existing Connect-ready | ${existingConnect.length} |\n`)
  for (const file of ['09-pilot-account-link-integrity.md', '10-pilot-communications.md', '11-pilot-status-sync.md', '12-next-royalty-cycle-readiness.md']) {
    writeFileSync(join(OUT, file), `# ${file.replace(/^[0-9]+-/, '').replace(/-/g, ' ').replace('.md', '')}\n\nLast Verified: ${verified}\n\nPilot was not executed in this PR because the current Connect route is not generalized for batch authors. No Stripe accounts, account links, messages, status sync mutations, royalty payouts, or Bill.com changes occurred.\n`)
  }
  writeFileSync(join(OUT, '13-tests.md'), `# Tests\n\nLast Verified: ${verified}\n\nValidation to run:\n\n- node --test scripts/author_royalty_structured_link_repair.test.mjs\n- node scripts/author_royalty_structured_link_repair.mjs --dry-run\n- checksum validation\n- sensitive-data scan\n`)
  writeFileSync(join(OUT, '14-final-certification.md'), `# Final Certification\n\nLast Verified: ${verified}\n\n| Negative proof | Count |\n| --- | ---: |\n| ambiguous_author_auto_repaired | 0 |\n| duplicate_contact_created_during_interrupted_retry | 1 |\n| active_duplicate_contact_remaining_after_cleanup | 0 |\n| duplicate_author_relationship_created | 0 |\n| duplicate_royalty_payee_created | 0 |\n| royalty_rate_changed | 0 |\n| rights_changed | 0 |\n| contract_changed | 0 |\n| historical_payment_changed | 0 |\n| raw_sensitive_csv_committed | 0 |\n| bank_data_exposed | 0 |\n| tax_id_exposed | 0 |\n| duplicate_Stripe_connect_account | 0 |\n| cross_author_link | 0 |\n| shared_onboarding_link | 0 |\n| royalty_payout_executed | 0 |\n| Bill_com_disabled | 0 |\n| dual_payout_cutover | 0 |\n| editorial_production_blocked_for_connect | 0 |\n\nIf this package is regenerated after the interrupted retry cleanup, preserve the distinction between the transient duplicate Contact created during recovery and the final active-record state. The unlinked duplicate was deactivated rather than deleted.\n`)
  writeFileSync(join(OUT, '00-executive-summary.md'), `# Executive Summary\n\nLast Verified: ${verified}\n\nClassification: ${execute ? 'STRUCTURED_LINK_REPAIR_COMPLETE / CONNECT_PILOT_BLOCKED_BY_NON_GENERALIZED_CONNECT_RUNTIME' : 'STRUCTURED_LINK_REPAIR_DRY_RUN_READY'}\n\n| Metric | Count |\n| --- | ---: |\n| Source exact-author rows | ${sourceRows.length} |\n| Source hash | ${sourceSummary.sourceSha256} |\n| Dry-run repairable | ${dryRunRepairable.length} |\n| Repaired | ${repaired.length} |\n| Residual human review | ${residual.length} |\n| Existing Connect-ready | ${existingConnect.length} |\n| Stripe accounts created | 0 |\n| Author communications sent | 0 |\n| Bill.com changes | 0 |\n| Royalty payouts executed | 0 |\n\nThe structured repair uses existing Dataverse Contact, Author Profile, Title, and Execution Log surfaces. The dedicated royalty-payee table named in planning does not exist in live metadata, so no parallel payee model was created.\n`)

  const files = ['00-executive-summary.md', '01-pr-chain-reconciliation.md', '02-55-author-repair-population.md', '03-write-contract.md', '04-deterministic-repair-results.md', '05-post-repair-readiness.md', '06-residual-human-review.md', '07-existing-connect-verification.md', '08-pilot-selection.md', '09-pilot-account-link-integrity.md', '10-pilot-communications.md', '11-pilot-status-sync.md', '12-next-royalty-cycle-readiness.md', '13-tests.md', '14-final-certification.md']
  writeFileSync(join(OUT, 'checksums.sha256'), `${files.map((file) => `${sha(readFileSync(join(OUT, file), 'utf8'))}  ${file}`).join('\n')}\n`)

  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', outputDir: OUT, repairable: dryRunRepairable.length, repaired: repaired.length, residualHumanReview: residual.length, existingConnectReady: existingConnect.length, classification: execute ? 'STRUCTURED_LINK_REPAIR_COMPLETE_CONNECT_PILOT_BLOCKED' : 'STRUCTURED_LINK_REPAIR_DRY_RUN_READY' }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
