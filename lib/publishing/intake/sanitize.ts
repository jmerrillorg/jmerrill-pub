export type SanitizedString = {
  value: string
  rejected: boolean
}

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const HTML_TAG_PATTERN = /<[^>]*>/g

export function sanitizeString(value: unknown): SanitizedString {
  const raw = typeof value === 'string' ? value : value == null ? '' : String(value)
  const trimmed = raw.trim()

  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return { value: '', rejected: true }
  }

  return {
    value: trimmed.replace(HTML_TAG_PATTERN, '').trim(),
    rejected: false,
  }
}

export function hasHtml(value: unknown) {
  return typeof value === 'string' && HTML_TAG_PATTERN.test(value)
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '[masked-email]'
  return `${local.slice(0, 2)}***@${domain}`
}

export function maskName(name: string) {
  if (!name) return '[masked-name]'
  return `${name.slice(0, 1)}***`
}
