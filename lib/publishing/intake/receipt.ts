import { createHash } from 'node:crypto'

export function intakeRecordId(key: string) {
  const hex = createHash('sha256').update(`JMP_INTAKE_RECEIPT_V1:${key}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function intakeFingerprint(input: Record<string, unknown>, manuscriptBytes?: ArrayBuffer) {
  const { turnstileToken: _token, idempotencyKey: _key, ...values } = input
  const sorted = Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)))
  const hash = createHash('sha256').update(JSON.stringify(sorted))
  if (manuscriptBytes) hash.update(Buffer.from(manuscriptBytes))
  return hash.digest('hex')
}

export function receiptNotes(fingerprint: string, accepted: boolean, notes: string) {
  return `Receipt fingerprint: ${fingerprint}\nReceipt: ${accepted ? 'ACCEPTED' : 'RESERVED'}\n${notes}`.slice(0, 950)
}

export function readReceiptNotes(notes: unknown) {
  const text = typeof notes === 'string' ? notes : ''
  return {
    fingerprint: /^Receipt fingerprint: ([a-f0-9]{64})\n/.exec(text)?.[1],
    accepted: !text.startsWith('Receipt fingerprint:') || text.includes('\nReceipt: ACCEPTED\n'),
  }
}
