const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function canonicalAuthorContactReference(contactId) {
  if (contactId == null || contactId === '') return 'UNRESOLVED'
  const value = String(contactId).trim()
  if (!GUID.test(value)) throw new Error('INVALID_CANONICAL_AUTHOR_CONTACT_ID')
  return `contact:${value.toLowerCase()}`
}

export function isCanonicalAuthorContactReference(value) {
  return value === 'UNRESOLVED' || (typeof value === 'string' && /^contact:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
}
