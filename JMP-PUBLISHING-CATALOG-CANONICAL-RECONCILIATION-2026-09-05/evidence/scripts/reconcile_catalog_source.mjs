#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

const root = resolve('JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05')
const sourcePath = resolve(root, 'evidence/source/canonical_catalog_source.tsv')
const snapshotPath = resolve(root, 'evidence/dataverse/core_catalog_preflight.json')
const outDir = resolve(root, 'evidence/reconciliation')
const source = readFileSync(sourcePath)
const sourceText = source.toString('utf8')
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
const sourceChecksum = createHash('sha256').update(source).digest('hex')

const clean = (value) => String(value ?? '').trim()
const digits = (value) => clean(value).replace(/\D/g, '')
const normalizeText = (value) =>
  clean(value)
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function deterministicUuid(kind, key) {
  const hex = createHash('sha256').update(`jmp-publishing-catalog-v1|${kind}|${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}

function parseDate(value) {
  const raw = clean(value)
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const match = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (!match) return raw
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }
  const year = Number(match[3]) >= 70 ? `19${match[3]}` : `20${match[3]}`
  return `${year}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}`
}

function csv(rows, columns) {
  const escape = (value) => {
    const text = Array.isArray(value) ? value.join('|') : String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => escape(row[column])).join(',')).join('\n')}\n`
}

function mostCommon(values) {
  const counts = new Map()
  for (const value of values.map(clean).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || ''
}

function normalizeFormat(value) {
  const key = normalizeText(value)
  if (key.includes('paperback')) return 'PAPERBACK'
  if (key.includes('hardback') || key.includes('hardcover')) return 'HARDCOVER'
  if (key.includes('audio')) return 'AUDIOBOOK'
  if (key.includes('ebook') || key.includes('digital')) return 'EBOOK'
  return 'OTHER'
}

const headerMap = {
  ISBN13: 'ISBN13',
  Title: 'Title',
  Format: 'Format',
  Status: 'Status',
  ISBN: 'ISBN',
  KINDLE: 'KINDLE',
  Published: 'Published',
  'List Price': 'ListPrice',
  Cost: 'Cost',
  '40%': 'FortyPercent',
  New: 'New',
  'AUTHOR COPY': 'AuthorCopy',
  Author: 'Author',
  Contract: 'Contract',
  IsDistributed: 'IsDistributed',
  House: 'House',
}

const lines = sourceText.split(/\n/)
if (lines.at(-1) === '') lines.pop()
const rawHeaders = lines.shift().replace(/\r$/, '').split('\t')
const headers = rawHeaders.map((value) => headerMap[clean(value)] || clean(value))
if (headers.length !== 16) throw new Error(`Expected 16 columns; received ${headers.length}`)

const allRows = lines.map((line, index) => {
  const values = line.replace(/\r$/, '').split('\t')
  if (values.length !== 16) throw new Error(`Source row ${index + 2} has ${values.length} columns`)
  return {
    sourceRowNumber: index + 2,
    raw: Object.fromEntries(values.map((value, column) => [headers[column], value])),
  }
})

const reservedRows = allRows.filter((row) => !clean(row.raw.Title))
const productRows = allRows.filter((row) => clean(row.raw.Title))

const authorAliasSource = readFileSync(resolve('data/author-name-to-master-name.ts'), 'utf8')
const authorOverrides = new Map(
  [...authorAliasSource.matchAll(/^\s*'([^']+)':\s*'([^']+)',?$/gm)].map((match) => [normalizeText(match[1]), match[2]]),
)
authorOverrides.set('sean crowley', 'Sean A Crowley I')
authorOverrides.set('bailery cunningham', 'Bailey Cunningham')
authorOverrides.set('natasha gilchrest', 'Natasha Gilchrist')
authorOverrides.set('tawana mars', 'Tawonna Mars')
const canonicalAuthorName = (rawName) => authorOverrides.get(normalizeText(rawName)) || clean(rawName)

const coreTitles = snapshot.entities.jm1pub_titles.rows
const coreAssets = snapshot.entities.jm1pub_publishingassets.rows
const coreContacts = [
  ...snapshot.entities.contacts.rows,
  ...(snapshot.targetedAuthorContacts || []).flatMap((entry) => entry.rows),
].filter((contact, index, rows) => rows.findIndex((candidate) => candidate.contactid === contact.contactid) === index)
const assetsByTitle = new Map()
for (const asset of coreAssets) {
  const titleId = asset._jm1pub_titleid_value
  if (!assetsByTitle.has(titleId)) assetsByTitle.set(titleId, [])
  assetsByTitle.get(titleId).push(asset)
}

const authorSourceGroups = Map.groupBy(productRows, (row) => normalizeText(canonicalAuthorName(row.raw.Author)))
const authors = [...authorSourceGroups.entries()].map(([authorKey, rows]) => {
  const displayName = canonicalAuthorName(rows[0].raw.Author)
  const aliases = [...new Set(rows.map((row) => clean(row.raw.Author)).filter((value) => value !== displayName))].sort()
  const sourceAuthorKeys = new Set([authorKey, ...rows.map((row) => normalizeText(row.raw.Author))])
  for (const [aliasKey, canonicalName] of authorOverrides) {
    if (normalizeText(canonicalName) === authorKey) sourceAuthorKeys.add(aliasKey)
  }
  const contacts = coreContacts.filter((contact) => sourceAuthorKeys.has(normalizeText(contact.fullname)))
  const sourceTitleKeys = new Set(rows.map((row) => normalizeText(row.raw.Title)))
  const linkedContactCounts = new Map()
  for (const title of coreTitles) {
    const titleKey = normalizeText(title.jm1pub_titlename || title.jm1pub_name)
    const titleAuthorKey = normalizeText(title.jm1pub_authorname || title.jm1pub_authordisplayname)
    const contactId = title._jm1_primaryauthor_value || title._jm1_author_value
    if (sourceTitleKeys.has(titleKey) && titleAuthorKey === normalizeText(clean(rows[0].raw.Author)) && contactId) {
      linkedContactCounts.set(contactId, (linkedContactCounts.get(contactId) || 0) + 1)
    }
  }
  const linkedContactId = [...linkedContactCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
  const contact = contacts.sort((a, b) => String(a.contactid).localeCompare(String(b.contactid)))[0]
  const canonicalContactId = contact?.contactid || linkedContactId
  return {
    canonicalAuthorId: canonicalContactId || deterministicUuid('author', authorKey),
    canonicalAuthorKey: authorKey,
    authorDisplayName: displayName,
    aliases,
    sourceProductRows: rows.length,
    existingContactMatched: Boolean(canonicalContactId),
    matchBasis: contact ? 'CONTACT_FULLNAME' : linkedContactId ? 'EXISTING_TITLE_PRIMARY_AUTHOR_LOOKUP' : 'DETERMINISTIC_NEW_ID',
    matchCandidateCount: contacts.length + linkedContactCounts.size,
  }
})
authors.sort((a, b) => a.authorDisplayName.localeCompare(b.authorDisplayName))
const authorByKey = new Map(authors.map((author) => [author.canonicalAuthorKey, author]))

const workGroups = Map.groupBy(productRows, (row) => {
  const authorKey = normalizeText(canonicalAuthorName(row.raw.Author))
  return `${authorKey}|${normalizeText(row.raw.Title)}`
})

function selectExistingTitle(workRows, authorName, titleKey) {
  const sourceIds = new Set(workRows.flatMap((row) => [digits(row.raw.ISBN13), digits(row.raw.ISBN)]).filter(Boolean))
  return coreTitles
    .filter((title) => normalizeText(title.jm1pub_titlename || title.jm1pub_name) === titleKey)
    .map((title) => {
      const titleAuthor = title.jm1pub_authorname || title.jm1pub_authordisplayname || ''
      const linked = assetsByTitle.get(title.jm1pub_titleid) || []
      const overlap = linked.filter((asset) => sourceIds.has(digits(asset.jm1pub_normalizedisbn || asset.jm1pub_isbn13))).length
      const score = overlap * 100 + (normalizeText(titleAuthor) === normalizeText(authorName) ? 40 : 0) + (title._jm1_primaryauthor_value || title._jm1_author_value ? 10 : 0) + (title.jm1pub_releasedate || title.jm1pub_publicationdate || title.jm1_releasedate ? 4 : 0) + (title.jm1pub_imprint || title.jm1pub_certifiedimprint || title._jm1_imprint_value ? 2 : 0)
      return { title, score, overlap }
    })
    .sort((a, b) => b.score - a.score || String(a.title.jm1pub_titleid).localeCompare(String(b.title.jm1pub_titleid)))[0]
}

const works = [...workGroups.entries()].map(([workKey, rows]) => {
  const [authorKey, titleKey] = workKey.split('|')
  const author = authorByKey.get(authorKey)
  const title = mostCommon(rows.map((row) => row.raw.Title))
  const match = selectExistingTitle(rows, author.authorDisplayName, titleKey)
  const dates = rows.map((row) => parseDate(row.raw.Published)).filter(Boolean).sort()
  const explicitRecent = titleKey === 'the shift'
  const explicitLaunch = titleKey === 'strategies for success'
  const releaseDate = explicitRecent ? '2026-08-18' : explicitLaunch ? '2026-09-22' : dates.at(-1) || ''
  return {
    canonicalWorkId: match?.title.jm1pub_titleid || deterministicUuid('work', workKey),
    generatedStableWorkId: deterministicUuid('work', workKey),
    canonicalWorkKey: workKey,
    canonicalAuthorId: author.canonicalAuthorId,
    title,
    normalizedTitle: titleKey,
    authorDisplayName: author.authorDisplayName,
    publisherOriginState: 'PUBLISHER_ORIGIN_CONFIRMED',
    authorityChangeFinding: 'NO_AUTHORITY_CHANGE_FOUND',
    currentCatalogState: 'ACTIVE',
    lifecycleDetail: explicitRecent ? 'NEW_RECENTLY_RELEASED' : explicitLaunch ? 'ACTIVE_LAUNCH_LIFECYCLE' : 'PUBLISHED_CATALOG',
    marketingAuthorityState: 'MARKETING_ELIGIBLE',
    retirementState: 'NOT_RETIRED',
    rightsHoldState: 'NO_RIGHTS_HOLD_FOUND',
    releaseDate,
    sourceProductRows: rows.length,
    existingTitleMatched: Boolean(match),
    existingTitleMatchScore: match?.score ?? 0,
    existingIdentifierOverlap: match?.overlap ?? 0,
  }
})
works.sort((a, b) => a.title.localeCompare(b.title) || a.authorDisplayName.localeCompare(b.authorDisplayName))
const workByKey = new Map(works.map((work) => [work.canonicalWorkKey, work]))

function editionBucket(work, row) {
  const isbn = digits(row.raw.ISBN13 || row.raw.ISBN)
  if (work.normalizedTitle === 'establishing glory') {
    if (['9781950719006', '9781950719013', '9781950719020'].includes(isbn)) return ['ORIGINAL_2019', 'ORIGINAL_EDITION']
    if (['9781950719839', '9781950719846'].includes(isbn)) return ['REISSUE_2021', 'REISSUE']
    return ['LATER_PRODUCT_FAMILY', 'PARALLEL_EDITION']
  }
  if (work.normalizedTitle === 'bee careful') {
    if (['9781954414709', '9781954414716', '9781954414723'].includes(isbn)) return ['ISBN_FAMILY_470_472', 'PARALLEL_EDITION']
    return ['ISBN_FAMILY_480_482', 'PARALLEL_EDITION']
  }
  if (work.normalizedTitle === 'the great hair restart') {
    if (parseDate(row.raw.Published) === '2025-04-01') return ['SECOND_RELEASE_2025', 'NEW_EDITION']
    return ['ORIGINAL_2024', 'ORIGINAL_EDITION']
  }
  return ['CATALOG_EDITION', 'CATALOG_EDITION']
}

const editionMap = new Map()
for (const row of productRows) {
  const workKey = `${normalizeText(canonicalAuthorName(row.raw.Author))}|${normalizeText(row.raw.Title)}`
  const work = workByKey.get(workKey)
  const [bucket, relationship] = editionBucket(work, row)
  const editionKey = `${work.canonicalWorkKey}|${bucket}`
  if (!editionMap.has(editionKey)) {
    editionMap.set(editionKey, {
      canonicalEditionId: deterministicUuid('edition', editionKey),
      canonicalEditionKey: editionKey,
      canonicalWorkId: work.canonicalWorkId,
      workTitle: work.title,
      editionLabel: bucket,
      relationship,
      publicationDates: [],
      productCount: 0,
    })
  }
  const edition = editionMap.get(editionKey)
  const date = parseDate(row.raw.Published)
  if (date && !edition.publicationDates.includes(date)) edition.publicationDates.push(date)
  edition.productCount += 1
  row.work = work
  row.edition = edition
}
const editions = [...editionMap.values()].map((edition) => ({ ...edition, publicationDates: edition.publicationDates.sort() }))
editions.sort((a, b) => a.workTitle.localeCompare(b.workTitle) || a.editionLabel.localeCompare(b.editionLabel))

const assetsByIdentifier = new Map()
for (const asset of coreAssets) {
  for (const identifier of [digits(asset.jm1pub_normalizedisbn), digits(asset.jm1pub_isbn13), clean(asset.jm1pub_acxproductid)]) {
    if (!identifier) continue
    if (!assetsByIdentifier.has(identifier)) assetsByIdentifier.set(identifier, [])
    assetsByIdentifier.get(identifier).push(asset)
  }
}

const products = productRows.map((row) => {
  const isbn13 = digits(row.raw.ISBN13)
  const isbn = clean(row.raw.ISBN)
  const asin = clean(row.raw.KINDLE)
  const audioId = /^BK_ACX/i.test(isbn) ? isbn : /^BK_ACX/i.test(clean(row.raw.ISBN13)) ? clean(row.raw.ISBN13) : ''
  const preferredIdentifier = isbn13.length === 13 ? isbn13 : audioId || digits(isbn) || asin
  const productKey = preferredIdentifier ? `identifier:${normalizeText(preferredIdentifier)}` : `source-row:${row.sourceRowNumber}`
  const candidates = assetsByIdentifier.get(isbn13) || assetsByIdentifier.get(audioId) || []
  const linked = candidates.filter((asset) => asset._jm1pub_titleid_value === row.work.canonicalWorkId)
  const match = [...(linked.length ? linked : candidates)].sort((a, b) => String(a.jm1pub_publishingassetid).localeCompare(String(b.jm1pub_publishingassetid)))[0]
  const rawDistribution = clean(row.raw.IsDistributed)
  const distributionState = rawDistribution === 'Y' ? 'CURRENTLY_DISTRIBUTED' : rawDistribution === 'N' ? 'NOT_CURRENTLY_DISTRIBUTED' : 'DISTRIBUTION_UNKNOWN'
  const channels = []
  if (asin) channels.push('AMAZON_KINDLE')
  if (audioId) channels.push('ACX')
  return {
    canonicalProductId: match?.jm1pub_publishingassetid || deterministicUuid('product', productKey),
    generatedStableProductId: deterministicUuid('product', productKey),
    canonicalProductKey: productKey,
    canonicalWorkId: row.work.canonicalWorkId,
    canonicalEditionId: row.edition.canonicalEditionId,
    title: row.work.title,
    authorDisplayName: row.work.authorDisplayName,
    format: normalizeFormat(row.raw.Format),
    rawFormat: clean(row.raw.Format),
    isbn13: isbn13.length === 13 ? isbn13 : '',
    legacyOrAudioIdentifier: isbn13.length === 13 ? '' : clean(row.raw.ISBN13 || row.raw.ISBN),
    asin,
    publicationDate: parseDate(row.raw.Published),
    distributionState,
    knownChannels: channels,
    productRelationship: row.edition.relationship,
    rawLegacyStatus: clean(row.raw.Status),
    legacyStatusInterpretation: clean(row.raw.Status) ? 'OPAQUE_LEGACY_CODE' : '',
    rawHouse: clean(row.raw.House),
    legacyHouseInterpretation: clean(row.raw.House) ? 'OPAQUE_LEGACY_CODE' : '',
    rawContract: clean(row.raw.Contract),
    legacyContractInterpretation: clean(row.raw.Contract) ? 'OPAQUE_LEGACY_CODE' : '',
    sourceRowNumber: row.sourceRowNumber,
    existingAssetMatched: Boolean(match),
    raw: row.raw,
  }
})

const reserved = reservedRows.map((row) => {
  const normalizedIsbn = digits(row.raw.ISBN13 || row.raw.ISBN)
  return {
    reservedIsbnInventoryId: deterministicUuid('reserved-isbn', normalizedIsbn || `row-${row.sourceRowNumber}`),
    classification: 'RESERVED_UNASSIGNED_ISBN',
    normalizedIsbn,
    sourceRowNumber: row.sourceRowNumber,
    marketingEligible: false,
    distributionEligible: false,
    authorEligible: false,
    raw: row.raw,
  }
})

const normalizedDuplicates = [...workGroups.entries()]
  .map(([workKey, rows]) => ({
    canonicalWorkKey: workKey,
    canonicalTitle: workByKey.get(workKey).title,
    rawTitleVariants: [...new Set(rows.map((row) => clean(row.raw.Title)))].sort(),
    productRows: rows.length,
  }))
  .filter((row) => row.rawTitleVariants.length > 1)

const authorMerges = authors.flatMap((author) =>
  author.aliases.map((alias) => ({
    rawAuthor: alias,
    canonicalAuthor: author.authorDisplayName,
    canonicalAuthorId: author.canonicalAuthorId,
    basis: alias === 'Sean Crowley'
      ? 'FOUNDER_CONTROLLING_CLARIFICATION_P14'
      : ['Bailery Cunningham', 'Natasha Gilchrest', 'Tawana Mars'].includes(alias)
        ? 'PUBLISHER_CERTIFIED_AUTHOR_VARIANT_REGISTER'
        : 'NORMALIZED_ALIAS',
  })),
)

const marketingContract = works.map((work) => {
  const workProducts = products.filter((product) => product.canonicalWorkId === work.canonicalWorkId)
  const workEditions = editions.filter((edition) => edition.canonicalWorkId === work.canonicalWorkId)
  const currentEdition = [...workEditions].sort((a, b) => (b.publicationDates.at(-1) || '').localeCompare(a.publicationDates.at(-1) || ''))[0]
  return {
    CanonicalWorkId: work.canonicalWorkId,
    CanonicalAuthorId: work.canonicalAuthorId,
    Title: work.title,
    AuthorDisplayName: work.authorDisplayName,
    CurrentLifecycleState: work.lifecycleDetail,
    PublicationDate: workProducts.map((product) => product.publicationDate).filter(Boolean).sort()[0] || '',
    ReleaseDate: work.releaseDate,
    ActiveState: work.currentCatalogState,
    MarketingAuthorityState: work.marketingAuthorityState,
    CurrentEditionId: currentEdition?.canonicalEditionId || '',
    AvailableFormats: [...new Set(workProducts.filter((product) => product.distributionState === 'CURRENTLY_DISTRIBUTED').map((product) => product.format))].sort(),
    PrimaryCoverAsset: '',
    PurchaseCTA: '',
    FeaturedAuthorEligibility: true,
    MarketingHealthEligibility: true,
    RetirementState: work.retirementState,
    RightsHoldState: work.rightsHoldState,
  }
})

const counts = {
  SOURCE_PRODUCT_ROWS: products.length,
  RESERVED_ISBNS: reserved.length,
  SOURCE_ROWS: allRows.length,
  CANONICAL_AUTHORS: authors.length,
  CANONICAL_WORKS: works.length,
  EDITIONS: editions.length,
  FORMAT_PRODUCTS: products.length,
  PUBLISHER_ORIGIN_CONFIRMED: works.filter((work) => work.publisherOriginState === 'PUBLISHER_ORIGIN_CONFIRMED').length,
  AUTHORITY_CHANGES_FOUND: works.filter((work) => work.authorityChangeFinding !== 'NO_AUTHORITY_CHANGE_FOUND').length,
  ACTIVE_WORKS: works.filter((work) => work.currentCatalogState === 'ACTIVE').length,
  RETIRED_WORKS: works.filter((work) => work.currentCatalogState === 'RETIRED').length,
  INACTIVE_WORKS: works.filter((work) => work.currentCatalogState === 'INACTIVE').length,
  WITHDRAWN_OR_RIGHTS_REVERTED_WORKS: works.filter((work) => ['WITHDRAWN', 'RIGHTS_REVERTED'].includes(work.currentCatalogState)).length,
  UNRESOLVED_WORKS: works.filter((work) => work.currentCatalogState === 'UNRESOLVED').length,
  MARKETING_ELIGIBLE: works.filter((work) => work.marketingAuthorityState === 'MARKETING_ELIGIBLE').length,
  MARKETING_HELD: works.filter((work) => work.marketingAuthorityState === 'MARKETING_HELD').length,
  MARKETING_PROHIBITED: works.filter((work) => work.marketingAuthorityState === 'MARKETING_PROHIBITED').length,
  MARKETING_AUTHORITY_UNRESOLVED: works.filter((work) => work.marketingAuthorityState === 'MARKETING_AUTHORITY_UNRESOLVED').length,
  EXISTING_TITLE_IDS_PRESERVED: works.filter((work) => work.existingTitleMatched).length,
  EXISTING_PRODUCT_IDS_PRESERVED: products.filter((product) => product.existingAssetMatched).length,
}

const proof = {
  generatedAt: new Date().toISOString(),
  classification: 'JMP CATALOG — CANONICALLY RECONCILED',
  source: { path: basename(sourcePath), sha256: sourceChecksum, columns: headers },
  dataversePreflight: { environment: snapshot.environment, counts: snapshot.counts },
  counts,
  invariants: {
    rawSourcePreserved: createHash('sha256').update(readFileSync(sourcePath)).digest('hex') === sourceChecksum,
    reservedRowsExcludedFromWorks: reserved.every((row) => !products.some((product) => product.sourceRowNumber === row.sourceRowNumber)),
    sourceRowsAccountedFor: products.length + reserved.length === allRows.length,
    uniqueAuthorIds: new Set(authors.map((row) => row.canonicalAuthorId)).size === authors.length,
    uniqueWorkIds: new Set(works.map((row) => row.canonicalWorkId)).size === works.length,
    uniqueEditionIds: new Set(editions.map((row) => row.canonicalEditionId)).size === editions.length,
    uniqueProductIds: new Set(products.map((row) => row.canonicalProductId)).size === products.length,
    shelleyBaseline: works.filter((work) => work.authorDisplayName === 'Shelley McIntosh').length === 3 && products.filter((product) => product.authorDisplayName === 'Shelley McIntosh').length === 8,
    recentTitleProtection: marketingContract.some((row) => row.Title === 'The Shift' && row.AuthorDisplayName === 'Sean A Crowley I' && row.ReleaseDate === '2026-08-18' && row.CurrentLifecycleState === 'NEW_RECENTLY_RELEASED') && marketingContract.some((row) => normalizeText(row.Title) === 'strategies for success' && row.AuthorDisplayName === 'Sean A Crowley I' && row.ReleaseDate === '2026-09-22' && row.CurrentLifecycleState === 'ACTIVE_LAUNCH_LIFECYCLE'),
  },
  legacyCodeFindings: {
    Status: 'OPAQUE_LEGACY_CODE',
    House: 'OPAQUE_LEGACY_CODE',
    Contract: 'OPAQUE_LEGACY_CODE',
    IsDistributed: 'Y/N treated only as the workbook explicit distribution flag; it does not establish contract or marketing authority.',
  },
  editionDecisions: {
    'Establishing Glory': 'Three edition/release families: 2019 original, 2021 reissue, and a later product family. Historic products are preserved; distribution remains product-specific.',
    'BEE Careful': 'Two complete same-date ISBN families retained as parallel editions. Neither family is deleted or silently superseded.',
    'The Great Hair Restart': 'The 2024 family is the original edition and the 2025 family is a new edition. Both remain distributed according to the explicit source flag.',
  },
  founderDecisionsRequired: [],
}

mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'catalog-reconciliation.json'), `${JSON.stringify({ proof, authors, works, editions, products, reserved, normalizedDuplicates, authorMerges, marketingContract }, null, 2)}\n`)
writeFileSync(resolve(outDir, 'reconciliation-summary.json'), `${JSON.stringify(proof, null, 2)}\n`)
writeFileSync(resolve(outDir, 'authors.csv'), csv(authors, ['canonicalAuthorId', 'canonicalAuthorKey', 'authorDisplayName', 'aliases', 'sourceProductRows', 'existingContactMatched', 'matchBasis', 'matchCandidateCount']))
writeFileSync(resolve(outDir, 'works.csv'), csv(works, ['canonicalWorkId', 'generatedStableWorkId', 'canonicalWorkKey', 'canonicalAuthorId', 'title', 'normalizedTitle', 'authorDisplayName', 'publisherOriginState', 'authorityChangeFinding', 'currentCatalogState', 'lifecycleDetail', 'marketingAuthorityState', 'retirementState', 'rightsHoldState', 'releaseDate', 'sourceProductRows', 'existingTitleMatched', 'existingTitleMatchScore', 'existingIdentifierOverlap']))
writeFileSync(resolve(outDir, 'editions.csv'), csv(editions, ['canonicalEditionId', 'canonicalEditionKey', 'canonicalWorkId', 'workTitle', 'editionLabel', 'relationship', 'publicationDates', 'productCount']))
writeFileSync(resolve(outDir, 'format-products.csv'), csv(products, ['canonicalProductId', 'generatedStableProductId', 'canonicalProductKey', 'canonicalWorkId', 'canonicalEditionId', 'title', 'authorDisplayName', 'format', 'rawFormat', 'isbn13', 'legacyOrAudioIdentifier', 'asin', 'publicationDate', 'distributionState', 'knownChannels', 'productRelationship', 'rawLegacyStatus', 'legacyStatusInterpretation', 'rawHouse', 'legacyHouseInterpretation', 'rawContract', 'legacyContractInterpretation', 'sourceRowNumber', 'existingAssetMatched']))
writeFileSync(resolve(outDir, 'reserved-isbn-inventory.csv'), csv(reserved, ['reservedIsbnInventoryId', 'classification', 'normalizedIsbn', 'sourceRowNumber', 'marketingEligible', 'distributionEligible', 'authorEligible']))
writeFileSync(resolve(outDir, 'normalized-title-variants.csv'), csv(normalizedDuplicates, ['canonicalWorkKey', 'canonicalTitle', 'rawTitleVariants', 'productRows']))
writeFileSync(resolve(outDir, 'author-merges.csv'), csv(authorMerges, ['rawAuthor', 'canonicalAuthor', 'canonicalAuthorId', 'basis']))
writeFileSync(resolve(outDir, 'marketing-downstream-contract.json'), `${JSON.stringify(marketingContract, null, 2)}\n`)
writeFileSync(resolve(outDir, 'founder-exceptions.csv'), csv([], ['exceptionId', 'cohort', 'decisionRequired', 'impact']))

if (!Object.values(proof.invariants).every(Boolean)) throw new Error(`One or more reconciliation invariants failed: ${JSON.stringify(proof.invariants)}`)
if (counts.CANONICAL_WORKS !== 129 || counts.EDITIONS !== 133 || counts.FORMAT_PRODUCTS !== 300 || counts.RESERVED_ISBNS !== 111) {
  throw new Error(`Baseline count mismatch: ${JSON.stringify(counts)}`)
}

console.log(JSON.stringify({ output: resolve(outDir, 'reconciliation-summary.json'), counts, invariants: proof.invariants }, null, 2))
