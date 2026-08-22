import { createHash } from 'node:crypto'

const AUTHOR_SUFFIX_PATTERN = /\s*,\s*Author\s*$/i
const PAYEE_ENTITY_PATTERN = /\b(LLC|L\.L\.C\.|INC|INC\.|CORP|CORPORATION|COMPANY|CO\.|FOUNDATION|MINISTRIES|CHURCH|TRUST|ESTATE)\b/i

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hashValue(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)
}

export function stripAuthorSuffix(value) {
  return String(value || '').trim().replace(AUTHOR_SUFFIX_PATTERN, '')
}

export function hasPayeeEntitySignal(record) {
  return ['Name on Check', 'Company Name']
    .map((field) => String(record[field] || ''))
    .some((value) => PAYEE_ENTITY_PATTERN.test(value))
}

export function buildIndex(records, keyFn) {
  const index = new Map()
  for (const record of records) {
    const keys = keyFn(record).filter(Boolean)
    for (const key of keys) {
      const existing = index.get(key) || []
      existing.push(record)
      index.set(key, existing)
    }
  }
  return index
}

export function readinessForDisposition(disposition) {
  if (disposition === 'MATCHED_EXISTING_STRIPE_CONNECT') return 'EXISTING_CONNECT_READY'
  if (disposition === 'MATCHED_EXISTING_AUTHOR_RELATIONSHIP') return 'READY_FOR_STRIPE_CONNECT'
  if (
    [
      'DUPLICATE_EMAIL_REVIEW',
      'SHARED_EMAIL_REVIEW',
      'PAYEE_ENTITY_REVIEW',
      'MULTIPLE_PAYEE_RELATIONSHIP_REVIEW',
      'NAME_VARIATION',
      'AUTHOR_RELATIONSHIP_MISSING',
      'TITLE_RELATIONSHIP_MISSING',
      'MULTIPLE_CANDIDATE_MATCHES',
      'NO_CONFIDENT_MATCH',
    ].includes(disposition)
  ) {
    return 'HUMAN_REVIEW_REQUIRED'
  }
  return 'OTHER_HOLD'
}

export function classifyReconciliationRow({
  sourceRecord,
  sourceEmailCount = 1,
  emailContacts = [],
  nameContacts = [],
  emailAuthors = [],
  nameAuthors = [],
  relationshipCounts = {},
}) {
  const reasons = []
  const candidates = []
  let disposition

  if (hasPayeeEntitySignal(sourceRecord)) {
    disposition = 'PAYEE_ENTITY_REVIEW'
    reasons.push('Bill.com payee fields indicate an entity, trust, estate, or organization relationship requiring human payee review')
  } else if (sourceEmailCount > 1) {
    disposition = 'DUPLICATE_EMAIL_REVIEW'
    reasons.push('source email is reused by multiple exact author vendors')
  } else if (emailContacts.length > 1) {
    disposition = 'DUPLICATE_EMAIL_REVIEW'
    reasons.push('multiple Dataverse contacts share the source email')
  } else if (emailContacts.length === 1) {
    const contact = emailContacts[0]
    candidates.push({ type: 'contact', id: contact.contactid, name: contact.fullname })
    if (contact.jm1pub_stripeconnectedaccountid) {
      disposition = 'MATCHED_EXISTING_STRIPE_CONNECT'
      reasons.push('unique contact email match with Stripe Connect account field populated')
    } else {
      disposition = 'MATCHED_EXISTING_AUTHOR_RELATIONSHIP'
      reasons.push('unique contact email match')
    }
  } else if (emailAuthors.length === 1) {
    const author = emailAuthors[0]
    candidates.push({ type: 'jm1_author', id: author.jm1_authorid, name: author.jm1_name })
    disposition = 'MATCHED_EXISTING_AUTHOR_RELATIONSHIP'
    reasons.push('unique jm1_author email match')
  } else if (nameAuthors.length === 1 && nameContacts.length === 0) {
    const author = nameAuthors[0]
    candidates.push({ type: 'jm1_author', id: author.jm1_authorid, name: author.jm1_name })
    disposition = 'NAME_VARIATION'
    reasons.push('unique jm1_author name match only; source email did not match')
  } else if (nameContacts.length === 1 && nameAuthors.length === 0) {
    const contact = nameContacts[0]
    candidates.push({ type: 'contact', id: contact.contactid, name: contact.fullname })
    disposition = 'NAME_VARIATION'
    reasons.push('unique contact name match only; source email did not match')
  } else if (nameContacts.length + nameAuthors.length > 1) {
    disposition = 'MULTIPLE_CANDIDATE_MATCHES'
    reasons.push('multiple candidate records by normalized name')
  } else {
    disposition = 'NO_CONFIDENT_MATCH'
    reasons.push('no exact email or unique normalized-name match found in queried canonical surfaces')
  }

  const totalRelationships =
    Number(relationshipCounts.title || 0) +
    Number(relationshipCounts.contract || 0) +
    Number(relationshipCounts.royaltyProfile || 0)

  if (disposition === 'MATCHED_EXISTING_AUTHOR_RELATIONSHIP' && totalRelationships === 0) {
    disposition = 'AUTHOR_RELATIONSHIP_MISSING'
    reasons.push('identity candidate found but no title, contract, or royalty-profile relationship found')
  }

  return {
    vendorName: stripAuthorSuffix(sourceRecord['Vendor Name']),
    vendorId: sourceRecord['Vendor Id'] || '',
    sourceEmailHash: hashValue(normalizeEmail(sourceRecord['Primary Email'])),
    disposition,
    readiness: readinessForDisposition(disposition),
    candidates,
    reason: [...new Set(reasons)].join(' | '),
  }
}

