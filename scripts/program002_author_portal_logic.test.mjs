import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  buildPortalTaskState,
  createAuthorPortalSession,
  parseAuthorPortalAccessRegistry,
  readAuthorPortalSession,
  resolveAuthorPortalAccessGrant,
} from '../lib/server/author-portal-access.ts'

test('parses access registry entries', () => {
  const entries = parseAuthorPortalAccessRegistry(
    JSON.stringify([
      { code: 'abc', intakeReference: 'JMP-1', title: 'Example', scope: 'project' },
      { code: '', intakeReference: 'skip' },
    ]),
  )

  assert.equal(entries.length, 1)
  assert.equal(entries[0].code, 'abc')
  assert.equal(entries[0].intakeReference, 'JMP-1')
})

test('builds and verifies signed portal session', () => {
  process.env.AUTHOR_PORTAL_SESSION_SECRET = 'unit-test-secret'
  const session = createAuthorPortalSession({
    code: 'abc',
    intakeReference: 'JMP-INT-1',
    title: 'Example',
  })

  const parsed = readAuthorPortalSession(session)
  assert.ok(parsed)
  assert.equal(parsed?.intakeReference, 'JMP-INT-1')
  assert.equal(parsed?.title, 'Example')
})

test('returning author with editorial workspace skips repeated setup', () => {
  const tasks = buildPortalTaskState({
    isReturningAuthor: true,
    hasEditorialWorkspace: true,
    hasContract: true,
    hasStripeAccount: true,
  })

  assert.equal(tasks.authorProfileRequired, false)
  assert.equal(tasks.paymentRoyaltyRequired, false)
})

test('new author still sees onboarding and payment setup', () => {
  const tasks = buildPortalTaskState({
    isReturningAuthor: false,
    hasEditorialWorkspace: false,
    hasContract: false,
    hasStripeAccount: false,
  })

  assert.equal(tasks.authorProfileRequired, true)
  assert.equal(tasks.paymentRoyaltyRequired, true)
})

test('global access code can be scoped by explicit reference', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    { code: 'shared-code', intakeReference: 'JMP-INT-1', title: 'First' },
  ])

  const grant = resolveAuthorPortalAccessGrant({
    code: 'shared-code',
    requestedReference: 'JMP-INT-2',
  })

  assert.ok(grant)
  assert.equal(grant?.intakeReference, 'JMP-INT-2')
})

test('expired access code is rejected', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    { code: 'expired-code', intakeReference: 'JMP-INT-OLD', expiresAt: '2026-01-01T00:00:00.000Z' },
  ])

  const grant = resolveAuthorPortalAccessGrant({
    code: 'expired-code',
    requestedReference: 'JMP-INT-OLD',
  })

  assert.equal(grant, null)
})

test('legacy hashed access record resolves contact-scoped project access', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = ''
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = 'pepper'
  process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash: createHash('sha256').update('pepperportal-code').digest('hex'),
      contactId: 'contact-123',
      projectId: 'JMP-INT-202607-0W5PTQ',
      projectIds: ['JMP-INT-202607-0W5PTQ', 'JMP-INT-LONGWATCH'],
      titleName: 'The Intentional Leader',
      expiresOn: '2099-01-01T00:00:00.000Z',
    },
  ])

  const grant = resolveAuthorPortalAccessGrant({
    code: 'portal-code',
    requestedReference: 'JMP-INT-LONGWATCH',
  })

  assert.ok(grant)
  assert.equal(grant?.contactId, 'contact-123')
  assert.equal(grant?.intakeReference, 'JMP-INT-LONGWATCH')
  assert.deepEqual(grant?.projectIds, ['JMP-INT-202607-0W5PTQ', 'JMP-INT-LONGWATCH'])
})
