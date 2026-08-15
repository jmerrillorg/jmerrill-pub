import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repoRoot = path.resolve(import.meta.dirname, '..')
const packageDir = path.join(
  repoRoot,
  'docs/operations/generated/CC010-POST-ACTIVATION-STAGE-COMMISSIONING-2026-08-14',
)

const read = (name) => readFileSync(path.join(packageDir, name), 'utf8')

test('CC-010 post-activation evidence keeps commissioning holds explicit', () => {
  assert.equal(existsSync(packageDir), true)
  const files = readdirSync(packageDir).filter((name) => name !== 'checksums.sha256')
  assert.equal(files.length, 19)

  const summary = read('00-executive-summary.md')
  assert.match(summary, /PR #505 CANONICALIZED/)
  assert.match(summary, /DEVELOPMENTAL OUTPUT\/PACKAGE LIVE-PROVEN/)
  assert.match(summary, /NO CLEAN REAL BOUNDARY YET/)
  assert.match(summary, /RUNTIME_VERSION_DRIFT_OPEN/)

  const developmental = read('03-developmental-live-proof.md')
  assert.match(developmental, /Claude provider live invocation/)
  assert.match(developmental, /NOT CERTIFIED IN THIS RUNTIME/)

  const revision = read('04-author-revision-loop.md')
  assert.match(revision, /ADMIN_REPLAY_REQUIRES_ORIGINAL_EVENT_ID_AND_REASON/)

  const finalState = read('18-final-cc010-state.md')
  assert.match(finalState, /conditional_approvals_treated_as_final \| 0/)
  assert.match(finalState, /public_pen_name_leaks \| 0/)
  assert.match(finalState, /Copy \| PARTIAL/)
  assert.match(finalState, /Proof \| PARTIAL/)
})

test('public author identity corrections stay in the shared resolver', () => {
  const resolver = readFileSync(path.join(repoRoot, 'lib/catalog/public-author-identity.ts'), 'utf8')
  assert.match(resolver, /R\. Dorian Night/)
  assert.match(resolver, /J\. Derrick Johnson/)
  assert.match(resolver, /the-sun-the-shadow-and-the-silence/)
  assert.match(resolver, /101-wisdom-lessons-for-life-and-living/)
})
