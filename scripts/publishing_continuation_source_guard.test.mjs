import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'
import { fileURLToPath } from 'node:url'

const jiti = createJiti(import.meta.url, { alias: { '@': fileURLToPath(new URL('../', import.meta.url)) } })
const { continuationMatchesExistingSource } = jiti('../lib/server/publishing-intake-manuscript-binding.ts')

test('only a complete exact source marker identifies a continuation replay', () => {
  const hash = 'a'.repeat(64)
  assert.equal(continuationMatchesExistingSource(`CONTINUATION_MANUSCRIPT_UPLOADED sha256=${hash}; format=docx`, hash), true)
  for (const notes of ['', hash, `CONTINUATION_MANUSCRIPT_UPLOADED sha256=${'b'.repeat(64)}; format=docx`,
    `COMMENT CONTINUATION_MANUSCRIPT_UPLOADED sha256=${hash}; format=docx`,
    `CONTINUATION_MANUSCRIPT_UPLOADED sha256=${hash}; format=docx extra`]) {
    assert.equal(continuationMatchesExistingSource(notes, hash), false)
  }
  assert.equal(continuationMatchesExistingSource('', 'invalid'), false)
})
