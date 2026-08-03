import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bootstrap = readFileSync('scripts/jm1_bootstrap.mjs', 'utf8')
const schema = JSON.parse(readFileSync('docs/schemas/jm1-bootstrap-manifest.schema.json', 'utf8'))
const handoff = JSON.parse(readFileSync('docs/operations/active/the-intentional-leader/CURRENT-STATE.json', 'utf8'))

test('bootstrap manifest schema declares required authority layers', () => {
  assert.equal(schema.properties.bootstrapVersion.const, '1.0.0')
  assert.deepEqual(schema.required.slice(0, 10), [
    'bootstrapVersion',
    'generatedAt',
    'status',
    'repository',
    'enterpriseCanon',
    'repositoryCanon',
    'runtimeCanon',
    'initiativeContext',
    'executionAuthority',
    'conflicts',
  ])
})

test('new thread loads ACS sender and Reply-To canon', () => {
  assert.match(bootstrap, /sender: 'publishing@email\.jmerrill\.one'/)
  assert.match(bootstrap, /replyTo: 'publishing@jmerrill\.one'/)
  assert.match(bootstrap, /archiveMailbox: 'publishing@jmerrill\.one'/)
  assert.match(bootstrap, /authorFacingDeliveryChannel: 'EMAIL FIRST'/)
})

test('portal is optional and noncanonical mail providers fail closed by canon', () => {
  assert.match(bootstrap, /portalRequired: false/)
  assert.match(bootstrap, /gmailFallback: 'NOT CANONICAL'/)
  assert.match(bootstrap, /outlookFallback: 'NOT CANONICAL UNLESS SPECIFICALLY AUTHORIZED'/)
})

test('print production canon blocks stale Vellum and forced later recto starts', () => {
  assert.match(bootstrap, /nativeVellumProjectRequired: false/)
  assert.match(bootstrap, /trim: '6 x 9'/)
  assert.match(bootstrap, /chapter1: 'RECTO'/)
  assert.match(bootstrap, /subsequentChapters: 'NATURAL_FLOW'/)
  assert.match(bootstrap, /soulDiveInToc: false/)
})

test('handoff carries current approval and clock state', () => {
  assert.equal(handoff.authorResponseState, 'APPROVED')
  assert.equal(handoff.responseClockState, 'NOT STARTED / NOT REQUIRED - AUTHOR RESPONDED')
  assert.equal(handoff.proofGenerated, 'YES')
  assert.equal(handoff.proofDelivered, 'YES')
  assert.equal(handoff.authorApproval, 'YES')
  assert.equal(handoff.protectedArtifactMutation, 'PENDING')
  assert.equal(handoff.interiorLayoutGate, 'PENDING COMPLETION')
  assert.equal(handoff.additionalAuthorEmail, 'NOT AUTHORIZED')
  assert.equal(handoff.staleHandoffFacts, 0)
  assert.equal(handoff.unsupportedLiveStateClaims, 0)
  assert.equal(handoff.artifacts[0].pageCount, 275)
  assert.equal(handoff.imprint, 'J Merrill Publishing')
})

test('bootstrap resolves current main dynamically and does not hard-code historical main', () => {
  const currentOriginMain = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim()
  const output = execFileSync('npm', ['run', 'jm1-bootstrap', '--', '--initiative', 'The Intentional Leader', '--mode', 'author-communication'], { encoding: 'utf8' })
  assert.match(output, new RegExp(`CONTROLLING_MAIN_SHA: ${currentOriginMain}`))
  assert.doesNotMatch(bootstrap, /c7cc31bca52f5c73b34d15c0262728e95cac7cb5/)
})

test('bootstrap command creates manifest outputs for The Intentional Leader pilot', () => {
  const output = execFileSync(
    'npm',
    ['run', 'jm1-bootstrap', '--', '--initiative', 'The Intentional Leader', '--mode', 'author-communication'],
    { encoding: 'utf8' },
  )
  assert.match(output, /BOOTSTRAP PASS WITH HOLDS/)
  assert.match(output, /ENTERPRISE_CANON: LOADED/)
  assert.match(output, /REPOSITORY_CANON: LOADED/)
  assert.match(output, /RUNTIME_CANON: VERIFIED/)
  assert.match(output, /INITIATIVE_CONTEXT: LOADED/)

  const manifest = JSON.parse(readFileSync('.bootstrap/current-bootstrap.json', 'utf8'))
  assert.equal(manifest.runtimeCanon.communication.sender, 'publishing@email.jmerrill.one')
  assert.equal(manifest.runtimeCanon.communication.replyTo, 'publishing@jmerrill.one')
  assert.equal(manifest.runtimeCanon.communication.portalRequired, false)
  assert.equal(manifest.runtimeCanon.communication.internalArtifactsExposed, 0)
  assert.equal(manifest.repositoryCanon.printProduction.nativeVellumProjectRequired, false)
  assert.equal(manifest.repositoryCanon.printProduction.subsequentChapters, 'NATURAL_FLOW')
  assert.equal(manifest.repositoryCanon.printProduction.soulDiveInToc, false)
  assert.equal(manifest.initiativeContext.currentApproval.authorResponse, 'APPROVED')
  assert.equal(manifest.initiativeContext.responseClock.state, 'NOT STARTED / NOT REQUIRED - AUTHOR RESPONDED')
})

test('bootstrap contains stale handoff and dirty worktree fail-closed controls', () => {
  assert.match(bootstrap, /STALE_HANDOFF_RECORD/)
  assert.match(bootstrap, /STALE_BRANCH_AUTHORITY/)
  assert.match(bootstrap, /PRODUCTION_MUTATION_AUTHORITY_ABSENT/)
  assert.match(bootstrap, /dirtyPaths/)
  assert.match(bootstrap, /outOfScopePaths/)
})
