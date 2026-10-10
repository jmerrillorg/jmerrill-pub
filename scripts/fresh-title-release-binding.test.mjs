import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyFreshTitleReleaseBinding } from './fresh-title-release-binding.mjs'

const releaseSha = '92ff89abe797737f6bd9b6d62de48d5cd754084a'
const packageSha = '14fc42c5b9af6f785f458704ce53d57240d99b82932568b8d676affa71219a97'
const valid = {
  approvedSourceSha: releaseSha,
  runSha: releaseSha,
  workflowSha: releaseSha,
  checkoutSha: releaseSha,
  runRef: 'refs/heads/main',
  expectedRef: 'refs/heads/main',
  packageSha256: packageSha,
  expectedPackageSha256: packageSha,
}

test('accepts the explicitly approved canonical source and package', () => {
  assert.deepEqual(verifyFreshTitleReleaseBinding(valid), { allowed: true, problems: [] })
})

test('fails closed when the approved source SHA is absent', () => {
  const result = verifyFreshTitleReleaseBinding({ ...valid, approvedSourceSha: '' })
  assert.equal(result.allowed, false)
  assert.ok(result.problems.includes('approvedSourceSha:INVALID'))
})

test('rejects a run SHA different from the human-approved SHA', () => {
  const result = verifyFreshTitleReleaseBinding({ ...valid, runSha: '1b39a2a5fa81089efaba4a4be53723ae2a3d5e1f' })
  assert.ok(result.problems.includes('runSha:NOT_APPROVED'))
})

test('rejects workflow or checkout source drift', () => {
  assert.ok(verifyFreshTitleReleaseBinding({ ...valid, workflowSha: '1b39a2a5fa81089efaba4a4be53723ae2a3d5e1f' }).problems.includes('workflowSha:NOT_APPROVED'))
  assert.ok(verifyFreshTitleReleaseBinding({ ...valid, checkoutSha: '1b39a2a5fa81089efaba4a4be53723ae2a3d5e1f' }).problems.includes('checkoutSha:NOT_APPROVED'))
})

test('rejects a different deployment ref', () => {
  const result = verifyFreshTitleReleaseBinding({ ...valid, runRef: 'refs/heads/codex/pub-role-import-normalization' })
  assert.ok(result.problems.includes('runRef:MISMATCH'))
})

test('rejects an unexpected artifact checksum', () => {
  const result = verifyFreshTitleReleaseBinding({ ...valid, packageSha256: '0'.repeat(64) })
  assert.ok(result.problems.includes('packageSha256:MISMATCH'))
})

test('rejects a caller-selected noncanonical expected ref', () => {
  const result = verifyFreshTitleReleaseBinding({ ...valid, expectedRef: 'refs/heads/release' })
  assert.ok(result.problems.includes('expectedRef:NOT_CANONICAL_MAIN'))
})
