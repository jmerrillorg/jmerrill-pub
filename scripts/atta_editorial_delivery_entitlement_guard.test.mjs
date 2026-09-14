#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const access = jiti('../lib/server/author-portal-access.ts')

const ATTA = {
  contactId: '60937251-d589-f111-ab10-6045bdd69678',
  contactEmail: 'zecatconserve@yahoo.com',
  opportunityId: '131da28b-919c-f111-b8dc-6045bdd69435',
  titleId: 'ca68c994-fd89-f111-ab10-00224820105b',
  intakeReference: 'JMP-INT-202607-422JSZ',
}

function evaluate(overrides = {}) {
  return access.evaluateAuthorWorkspaceEntitlement({
    joinedTheFamily: true,
    workspaceStatus: 'ACTIVE',
    ...ATTA,
    ...overrides,
  })
}

test('optional portal access missing does not invalidate certified editorial review delivery', () => {
  const dispatchSource = readFileSync('lib/server/publishing-dispatch-service.ts', 'utf8')

  assert.match(dispatchSource, /portalStatus: 'NOT_APPLICABLE'/)
  assert.match(dispatchSource, /Author Operating Center status .* is secondary and non-blocking/)
  assert.match(dispatchSource, /Portal status .* is secondary and not required for ordinary editorial review/)
})

test('joined-family author with active workspace but no scoped grant requires system attention', () => {
  const result = evaluate({ grants: [] })

  assert.equal(result.state, 'ERROR')
  assert.equal(result.entitlementActive, false)
  assert.equal(result.systemAttentionRequired, true)
  assert.equal(result.reason, 'PORTAL_ENTITLEMENT_MISSING')
})

test('scoped active grant clears missing-entitlement attention without binding other authors', () => {
  const result = evaluate({
    grants: [
      {
        status: 'active',
        purpose: 'initial_activation',
        accessCodeHash: 'safe-test-hash-not-used',
        contactId: ATTA.contactId,
        contactEmail: ATTA.contactEmail,
        opportunityId: ATTA.opportunityId,
        intakeReference: ATTA.intakeReference,
        projectIds: [ATTA.titleId, ATTA.opportunityId, ATTA.intakeReference],
        scope: 'relationship',
      },
    ],
  })

  assert.equal(result.state, 'INVITATION_PENDING')
  assert.equal(result.entitlementActive, true)
  assert.equal(result.systemAttentionRequired, false)
  assert.equal(result.matchingGrantCount, 1)
})

test('cross-author and cross-project grants do not satisfy Atta portal entitlement', () => {
  const result = evaluate({
    grants: [
      {
        status: 'active',
        contactId: ATTA.contactId,
        contactEmail: ATTA.contactEmail,
        opportunityId: '22222222-2222-2222-2222-222222222222',
        projectIds: ['33333333-3333-3333-3333-333333333333'],
      },
      {
        status: 'active',
        contactId: '44444444-4444-4444-4444-444444444444',
        contactEmail: 'other-author@example.com',
        opportunityId: ATTA.opportunityId,
        projectIds: [ATTA.titleId],
      },
    ],
  })

  assert.equal(result.state, 'ERROR')
  assert.equal(result.reason, 'PORTAL_ENTITLEMENT_MISSING')
  assert.equal(result.matchingGrantCount, 0)
})

test('duplicate provisioning replay keeps one effective entitlement classification', () => {
  const result = evaluate({
    grants: [
      {
        status: 'active',
        contactId: ATTA.contactId,
        opportunityId: ATTA.opportunityId,
        projectIds: [ATTA.titleId],
      },
      {
        status: 'active',
        contactId: ATTA.contactId,
        opportunityId: ATTA.opportunityId,
        projectIds: [ATTA.titleId],
      },
    ],
  })

  assert.equal(result.entitlementActive, true)
  assert.equal(result.systemAttentionRequired, false)
  assert.equal(result.matchingGrantCount, 2)
})

test('signed-in or consumed grant is treated as active author access', () => {
  const result = evaluate({
    grants: [
      {
        status: 'active',
        contactId: ATTA.contactId,
        opportunityId: ATTA.opportunityId,
        externalUserIdentifier: '00000000-0000-0000-0000-000000000001',
      },
    ],
  })

  assert.equal(result.state, 'ACTIVE')
  assert.equal(result.entitlementActive, true)
  assert.equal(result.reason, 'PORTAL_ENTITLEMENT_BOUND_TO_AUTHOR')
})
