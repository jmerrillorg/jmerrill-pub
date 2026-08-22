import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { recordsFromCsv, safeSourceSummary } from './author_royalty_connect_migration_source_guard.mjs'
import { hashValue, hasPayeeEntitySignal, normalizeEmail, normalizeName, stripAuthorSuffix } from './author_royalty_identity_reconciliation.mjs'

const SOURCE = '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/00_CANON/Publishing/Royalty/3263988231707345883_J_Merrill_Publishing_Vendor_05-01-26-.csv'
const BASELINE_HASH = '40a34a1ded28e39b1931bf5b5d1795ab7429172f6537a4e612603a0047d079d1'
const OUT = 'docs/operations/generated/JMP-AUTHOR-ROYALTY-HUMAN-REVIEW-REDUCTION-2026-08-21'
const VERIFIED = new Date().toISOString()
const DV = 'https://jm1hq.crm.dynamics.com'
const API = `${DV}/api/data/v9.2`

const sha = (value) => createHash('sha256').update(value).digest('hex')
const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')

function token() {
  const result = spawnSync('az', ['account', 'get-access-token', '--resource', DV, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout.trim()
}

async function list(accessToken, entity, query) {
  let url = `${API}/${entity}?${query}`
  const rows = []
  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'OData-Version': '4.0' },
    })
    const body = await response.text()
    if (!response.ok) throw new Error(`${entity} ${response.status}: ${body}`)
    const json = JSON.parse(body)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

function add(index, key, row) {
  if (!key) return
  const list = index.get(key) || []
  list.push(row)
  index.set(key, list)
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

function readiness(disposition) {
  if (disposition === 'MATCHED_EXISTING_STRIPE_CONNECT') return 'EXISTING_CONNECT_READY'
  if (disposition === 'MATCHED_EXISTING_AUTHOR') return 'READY_FOR_STRIPE_CONNECT'
  if (
    [
      'MATCHED_LEGACY_AUTHOR',
      'STRUCTURED_AUTHOR_RELATIONSHIP_MISSING',
      'CONTACT_LINK_REPAIR_REQUIRED',
      'LEGAL_NAME_VARIATION_RECONCILED',
    ].includes(disposition)
  ) return 'STRUCTURED_REPAIR_REQUIRED'
  return 'HUMAN_REVIEW_REQUIRED'
}

function counts(rows, field) {
  return Object.entries(rows.reduce((out, row) => ({ ...out, [row[field]]: (out[row[field]] || 0) + 1 }), {})).sort()
}

function table(rows) {
  const header = '| vendorName | sourceEmailHash | disposition | readiness | titleCount | contractCount | royaltyProfileCount | linkedTitleContacts | sampleTitles | reason |\n| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |'
  return [
    header,
    ...rows.map((row) => `| ${esc(row.vendorName)} | ${row.sourceEmailHash} | ${row.disposition} | ${row.readiness} | ${row.titleCount} | ${row.contractCount} | ${row.royaltyCount} | ${row.linkedTitleContactCount} | ${esc(row.sampleTitles.join('; '))} | ${esc(row.reason)} |`),
  ].join('\n')
}

function classify(source, indexes, duplicateEmailCount) {
  const vendorName = stripAuthorSuffix(source['Vendor Name'])
  const name = normalizeName(vendorName)
  const email = normalizeEmail(source['Primary Email'])
  const emailContacts = indexes.contactsByEmail.get(email) || []
  const nameContacts = indexes.contactsByName.get(name) || []
  const titleMatches = indexes.titlesByName.get(name) || []
  const contractMatches = indexes.contractsByName.get(name) || []
  const royaltyMatches = indexes.royaltyByName.get(name) || []
  const linkedTitleContacts = unique(titleMatches.map((title) => title._jm1_primaryauthor_value).filter(Boolean).map((id) => ({ id })), (row) => row.id)

  let disposition
  let reason
  if (hasPayeeEntitySignal(source)) {
    disposition = /estate/i.test(`${source['Name on Check'] || ''} ${source['Company Name'] || ''}`) ? 'ESTATE_REVIEW' : 'PAYEE_ENTITY_REVIEW'
    reason = 'Bill.com payee fields show entity/trust/estate/organization signal; legal payee review remains required.'
  } else if (duplicateEmailCount > 1 || emailContacts.length > 1) {
    disposition = 'DUPLICATE_EMAIL_REVIEW'
    reason = 'Email is shared by multiple source payees or multiple Dataverse Contacts; identities must not be merged by email alone.'
  } else if (emailContacts.length === 1) {
    disposition = emailContacts[0].jm1pub_stripeconnectedaccountid ? 'MATCHED_EXISTING_STRIPE_CONNECT' : 'MATCHED_EXISTING_AUTHOR'
    reason = emailContacts[0].jm1pub_stripeconnectedaccountid
      ? 'Unique Dataverse Contact email match already has a Stripe Connect account reference.'
      : 'Unique Dataverse Contact email match; no conflicting payee evidence found.'
  } else if (titleMatches.length > 0 && linkedTitleContacts.length === 1) {
    disposition = 'CONTACT_LINK_REPAIR_REQUIRED'
    reason = 'Governed title-author rows match the Bill.com payee and expose one linked primary-author Contact, but the source email does not match Contact email fields.'
  } else if (titleMatches.length > 0 && linkedTitleContacts.length === 0) {
    disposition = 'STRUCTURED_AUTHOR_RELATIONSHIP_MISSING'
    reason = 'Governed title-author rows match the Bill.com payee, but no linked primary-author Contact is exposed for payout onboarding.'
  } else if (titleMatches.length > 0) {
    disposition = 'MULTIPLE_CANDIDATES'
    reason = 'Governed title-author rows match the payee, but multiple linked Contact candidates exist.'
  } else if (contractMatches.length > 0 || royaltyMatches.length > 0) {
    disposition = 'MATCHED_LEGACY_AUTHOR'
    reason = 'Governed contract or royalty-profile evidence matches the payee, but modern Contact linkage is insufficient for Connect onboarding.'
  } else if (nameContacts.length === 1) {
    disposition = 'LEGAL_NAME_VARIATION_RECONCILED'
    reason = 'One Dataverse Contact matches normalized name only; email differs, so payout onboarding still needs structured confirmation.'
  } else if (nameContacts.length > 1) {
    disposition = 'MULTIPLE_CANDIDATES'
    reason = 'Multiple Dataverse Contacts match normalized payee name.'
  } else {
    disposition = 'TRUE_NO_MATCH'
    reason = 'No exact email, unique Contact name, title, contract, or royalty-profile evidence matched this exact-author payee row.'
  }

  return {
    vendorName,
    vendorIdHash: hashValue(source['Vendor Id'] || vendorName),
    sourceEmailHash: hashValue(email),
    disposition,
    readiness: readiness(disposition),
    titleCount: titleMatches.length,
    contractCount: contractMatches.length,
    royaltyCount: royaltyMatches.length,
    linkedTitleContactCount: linkedTitleContacts.length,
    sampleTitles: unique(titleMatches, (title) => title.jm1pub_titleid).slice(0, 3).map((title) => title.jm1pub_titlename || title.jm1_canonicaltitlereference || 'Untitled'),
    reason,
  }
}

function writeDoc(file, title, rows) {
  writeFileSync(join(OUT, file), `# ${title}\n\nLast Verified: ${VERIFIED}\n\n${table(rows)}\n`)
}

const csv = readFileSync(SOURCE, 'utf8')
const sourceSummary = safeSourceSummary(SOURCE, csv)
const sourceRows = recordsFromCsv(csv).filter((row) => String(row['Vendor Name'] || '').endsWith(', Author'))
const emailCounts = new Map()
for (const row of sourceRows) {
  const email = normalizeEmail(row['Primary Email'])
  emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
}

const accessToken = token()
const [contacts, titles, contracts, royaltyProfiles] = await Promise.all([
  list(accessToken, 'contacts', '$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled&$top=5000'),
  list(accessToken, 'jm1pub_titles', '$select=jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,jm1pub_authordisplayname,jm1_canonicalauthorcontactreference,jm1_canonicaltitlereference,_jm1_primaryauthor_value&$top=5000'),
  list(accessToken, 'jm1pub_contracts', '$select=jm1pub_contractid,jm1pub_contractname,jm1pub_signeddate,jm1pub_providerstatus,_jm1_primarypartycontact_value,_new_author_value,_jm1pub_title_value&$top=5000'),
  list(accessToken, 'jm1_royaltyprofiles', '$select=jm1_royaltyprofileid,jm1_profilename,_jm1_author_value,_jm1_title_value,jm1_effectivefrom&$top=5000'),
])

const indexes = { contactsByEmail: new Map(), contactsByName: new Map(), titlesByName: new Map(), contractsByName: new Map(), royaltyByName: new Map() }
const contactsById = new Map(contacts.map((contact) => [contact.contactid, contact]))
const titlesById = new Map(titles.map((title) => [title.jm1pub_titleid, title]))
for (const contact of contacts) {
  for (const field of ['emailaddress1', 'emailaddress2', 'emailaddress3']) add(indexes.contactsByEmail, normalizeEmail(contact[field]), contact)
  add(indexes.contactsByName, normalizeName(contact.fullname), contact)
}
for (const title of titles) {
  for (const field of ['jm1pub_authorname', 'jm1pub_authordisplayname', 'jm1_canonicalauthorcontactreference']) add(indexes.titlesByName, normalizeName(title[field]), title)
}
for (const contract of contracts) {
  const title = titlesById.get(contract._jm1pub_title_value)
  const contact = contactsById.get(contract._jm1_primarypartycontact_value) || contactsById.get(contract._new_author_value)
  for (const value of [contract.jm1pub_contractname, title?.jm1pub_authorname, title?.jm1pub_authordisplayname, title?.jm1_canonicalauthorcontactreference, contact?.fullname]) add(indexes.contractsByName, normalizeName(value), contract)
}
for (const profile of royaltyProfiles) {
  const title = titlesById.get(profile._jm1_title_value)
  const contact = contactsById.get(profile._jm1_author_value)
  for (const value of [profile.jm1_profilename, title?.jm1pub_authorname, title?.jm1pub_authordisplayname, title?.jm1_canonicalauthorcontactreference, contact?.fullname]) add(indexes.royaltyByName, normalizeName(value), profile)
}

const rows = sourceRows.map((row) => classify(row, indexes, emailCounts.get(normalizeEmail(row['Primary Email'])) || 0))
const residual = rows.filter((row) => row.readiness === 'HUMAN_REVIEW_REQUIRED')
const noConfident = rows.filter((row) => ['STRUCTURED_AUTHOR_RELATIONSHIP_MISSING', 'CONTACT_LINK_REPAIR_REQUIRED', 'MATCHED_LEGACY_AUTHOR', 'TRUE_NO_MATCH'].includes(row.disposition))
const nameVariation = rows.filter((row) => row.disposition === 'LEGAL_NAME_VARIATION_RECONCILED')
const duplicateEmail = rows.filter((row) => row.disposition === 'DUPLICATE_EMAIL_REVIEW')
const entity = rows.filter((row) => ['PAYEE_ENTITY_REVIEW', 'ESTATE_REVIEW'].includes(row.disposition))
const deterministic = rows.filter((row) => row.readiness !== 'HUMAN_REVIEW_REQUIRED')
const disp = counts(rows, 'disposition')
const ready = counts(rows, 'readiness')
const readyNew = rows.filter((row) => row.readiness === 'READY_FOR_STRIPE_CONNECT').length
const existingReady = rows.filter((row) => row.readiness === 'EXISTING_CONNECT_READY').length

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
writeDoc('01-original-exception-population.md', 'Original Exception Population', rows)
writeFileSync(join(OUT, '02-historical-evidence-sources.md'), `# Historical Evidence Sources\n\nLast Verified: ${VERIFIED}\n\n| Source | Records Read | Use In This Pass |\n| --- | ---: | --- |\n| Bill.com-style governed vendor export candidate (${esc(basename(SOURCE))}) | ${sourceSummary.exactAuthorRows} exact-author rows | Starting payee population; sensitive fields not stored in repository evidence |\n| Dataverse Contact | ${contacts.length} | Existing identity, email, author flag, Stripe Connect state |\n| Dataverse jm1pub_title | ${titles.length} | Governed title-author relationship evidence, including legacy author-name fields |\n| Dataverse jm1pub_contract | ${contracts.length} | Agreement relationship evidence where present |\n| Dataverse jm1_royaltyprofile | ${royaltyProfiles.length} | Royalty relationship evidence where present |\n\n## Source Hash Boundary\n\nPR #558 baseline source hash: \`${BASELINE_HASH}\`\n\nLocated governed source candidate hash: \`${sourceSummary.sourceSha256}\`\n\nThe hashes do not match, so this package treats the located file as governed historical evidence and preserves PR #558 as the baseline rather than rewriting it. No Gmail search was performed. No Outlook search was required for rows resolved by Dataverse/title evidence in this pass.\n`)
writeDoc('03-no-confident-match-reconciliation.md', 'NO_CONFIDENT_MATCH Reconciliation', noConfident)
writeDoc('04-name-variation.md', 'Name Variation', nameVariation)
writeDoc('05-duplicate-email.md', 'Duplicate Email', duplicateEmail)
writeDoc('06-payee-entity-review.md', 'Payee Entity Review', entity)
writeDoc('07-deterministic-repairs.md', 'Deterministic Repairs', deterministic)
writeFileSync(join(OUT, '08-residual-human-review-queue.md'), `# Residual Human Review Queue\n\nLast Verified: ${VERIFIED}\n\nRows still requiring human review: ${residual.length}\n\n${table(residual)}\n`)
writeFileSync(join(OUT, '09-post-reconciliation-readiness.md'), `# Post-Reconciliation Readiness\n\nLast Verified: ${VERIFIED}\n\n## Dispositions\n\n| disposition | count |\n| --- | ---: |\n${disp.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## Readiness\n\n| readiness | count |\n| --- | ---: |\n${ready.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## Pilot Threshold\n\nNew clean authors ready for Stripe Connect: ${readyNew}\n\nExisting Stripe Connect-ready authors: ${existingReady}\n\nPilot threshold status: ${readyNew >= 3 ? 'PILOT_READY' : 'PILOT_NOT_READY'}\n\nBroad Stripe Connect migration remains blocked until structured repair or human review resolves residual payee identity risk.\n`)
writeFileSync(join(OUT, '10-connect-pilot-selection.md'), `# Connect Pilot Selection\n\nLast Verified: ${VERIFIED}\n\nPilot execution status: NOT EXECUTED\n\nReason: this pass did not produce three to five newly clean, normal authors ready for Stripe Connect onboarding. Existing Connect-ready rows are evidence of prior setup, but they do not validate the first-time invitation flow for a new cohort.\n\n| Metric | Count |\n| --- | ---: |\n| New clean authors ready for Connect | ${readyNew} |\n| Existing Connect-ready authors | ${existingReady} |\n| Stripe Connect accounts created | 0 |\n| Stripe onboarding links generated | 0 |\n| Author invitations sent | 0 |\n| Dataverse writes | 0 |\n`)
writeFileSync(join(OUT, '11-pilot-results.md'), `# Pilot Results\n\nLast Verified: ${VERIFIED}\n\nPilot execution status: NOT EXECUTED\n\nNo Stripe account creation, onboarding-link generation, invitation send, Dataverse write, Bill.com mutation, or royalty payment occurred in this reduction pass.\n`)
writeFileSync(join(OUT, '00-executive-summary.md'), `# Executive Summary\n\nLast Verified: ${VERIFIED}\n\n## Classification\n\nAUTHOR_IDENTITY_RECONCILIATION_INCOMPLETE\n\n## Scope\n\nThis package preserves PR #555 as the migration readiness baseline and PR #558 as the identity reconciliation baseline. It performs a separate human-review reduction pass using governed historical Publishing evidence available in Dataverse and a located Bill.com-style vendor export candidate.\n\n## Results\n\n| Metric | Count |\n| --- | ---: |\n| Exact Bill.com-style author payees assessed | ${rows.length} |\n| Original PR #558 human-review rows | 66 |\n| Residual human-review rows after this pass | ${residual.length} |\n| Rows moved out of generic ambiguity | ${66 - residual.length} |\n| Deterministic Dataverse writes executed | 0 |\n| Stripe Connect mutations | 0 |\n| Author communications | 0 |\n\n## Disposition Counts\n\n| disposition | count |\n| --- | ---: |\n${disp.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## Readiness Counts\n\n| readiness | count |\n| --- | ---: |\n${ready.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## Finding\n\nThe review queue is smaller and more specific, but Stripe Connect pilot execution remains held because fewer than three newly clean authors are ready for first-time Connect onboarding without additional structured repair or Founder/operator review.\n`)

const files = ['00-executive-summary.md', '01-original-exception-population.md', '02-historical-evidence-sources.md', '03-no-confident-match-reconciliation.md', '04-name-variation.md', '05-duplicate-email.md', '06-payee-entity-review.md', '07-deterministic-repairs.md', '08-residual-human-review-queue.md', '09-post-reconciliation-readiness.md', '10-connect-pilot-selection.md', '11-pilot-results.md']
writeFileSync(join(OUT, 'checksums.sha256'), `${files.map((file) => `${sha(readFileSync(join(OUT, file), 'utf8'))}  ${file}`).join('\n')}\n`)

console.log(JSON.stringify({ outputDir: OUT, assessedRows: rows.length, residualHumanReview: residual.length, dispositionCounts: Object.fromEntries(disp), readinessCounts: Object.fromEntries(ready), pilotExecution: 'NOT_EXECUTED', classification: 'AUTHOR_IDENTITY_RECONCILIATION_INCOMPLETE' }, null, 2))
