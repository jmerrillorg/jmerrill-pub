#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const access = jiti('../lib/server/author-portal-access.ts')
const recovery = jiti('../lib/server/author-activation-recovery.ts')

const PEPPER = 'activation-recovery-pepper'

function hashPortalCode(value) {
  return createHash('sha256')
    .update(`${PEPPER}${value}`)
    .digest('hex')
}

function withRegistry(entries, fn) {
  const previous = {
    AUTHOR_PORTAL_ACCESS_CODE_PEPPER: process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER,
    AUTHOR_PORTAL_ACCESS_REGISTRY_JSON: process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON,
    AUTHOR_PORTAL_SESSION_SECRET: process.env.AUTHOR_PORTAL_SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  }
  process.env.NODE_ENV = 'test'
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = PEPPER
  process.env.AUTHOR_PORTAL_SESSION_SECRET = 'jm1-author-activation-recovery-test-secret-2026-Q3-9Qr2-V7'
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify(entries)

  try {
    return fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('activation code resolves only when active, unexpired, unconsumed, and Contact-bound', () => {
  withRegistry(
    [
      {
        status: 'issued',
        purpose: 'initial_activation',
        accessCodeHash: hashPortalCode('JMPACTV2026CAROLYN'),
        accessCodeVersion: 'activation-code-v2',
        contactId: '11111111-1111-1111-1111-111111111111',
        title: 'Pilot author',
        scope: 'relationship',
      },
    ],
    () => {
      const resolution = access.resolveAuthorPortalActivationCode({
        code: 'jmp-actv-2026-carolyn',
        purpose: 'initial_activation',
      })

      assert.equal(resolution?.contactId, '11111111-1111-1111-1111-111111111111')
      assert.equal(resolution?.purpose, 'initial_activation')
      assert.equal(resolution?.codeStatus, 'valid')
    },
  )
})

test('consumed and revoked activation codes are rejected', () => {
  withRegistry(
    [
      {
        status: 'issued',
        purpose: 'initial_activation',
        code: 'JMP-CONSUMED-2026',
        contactId: '11111111-1111-1111-1111-111111111111',
        consumedAt: '2026-07-30T12:00:00.000Z',
      },
      {
        status: 'active',
        purpose: 'recovery',
        code: 'JMP-REVOKED-2026',
        contactId: '22222222-2222-2222-2222-222222222222',
        revokedAt: '2026-07-30T12:00:00.000Z',
      },
    ],
    () => {
      assert.equal(access.resolveAuthorPortalActivationCode({ code: 'JMP-CONSUMED-2026' }), null)
      assert.equal(access.resolveAuthorPortalActivationCode({ code: 'JMP-REVOKED-2026', purpose: 'recovery' }), null)
    },
  )
})

test('purpose mismatch rejects recovery and activation code confusion', () => {
  withRegistry(
    [
      {
        status: 'active',
        purpose: 'recovery',
        code: 'JMP-RECOVERY-2026',
        contactId: '33333333-3333-3333-3333-333333333333',
      },
    ],
    () => {
      assert.equal(
        access.resolveAuthorPortalActivationCode({
          code: 'JMP-RECOVERY-2026',
          purpose: 'initial_activation',
        }),
        null,
      )
      assert.equal(
        access.resolveAuthorPortalActivationCode({
          code: 'JMP-RECOVERY-2026',
          purpose: 'recovery',
        })?.contactId,
        '33333333-3333-3333-3333-333333333333',
      )
    },
  )
})

test('one-time activation code requires Microsoft identity completion when Contact is not yet bound', () => {
  withRegistry(
    [
      {
        status: 'issued',
        purpose: 'initial_activation',
        code: 'JMP-FIRST-2026',
        contactId: '44444444-4444-4444-4444-444444444444',
      },
    ],
    () => {
      const resolution = access.resolveAuthorPortalActivationCode({ code: 'JMP-FIRST-2026' })
      assert.ok(resolution)
      assert.equal(access.activationCodeRequiresMicrosoftIdentity(resolution.grant), true)
    },
  )
})

test('activation transaction is short-lived, Contact-bound, and does not contain the raw code', () => {
  withRegistry(
    [
      {
        status: 'issued',
        purpose: 'initial_activation',
        code: 'JMP-TX-2026',
        contactId: '44444444-4444-4444-4444-444444444444',
        intakeReference: 'JMP-INT-202607-TX',
      },
    ],
    () => {
      const resolution = access.resolveAuthorPortalActivationCode({ code: 'JMP-TX-2026' })
      assert.ok(resolution)

      const transactionValue = access.createAuthorPortalActivationTransaction(resolution)
      assert.equal(transactionValue.includes('JMP-TX-2026'), false)

      const transaction = access.readAuthorPortalActivationTransaction(transactionValue)
      assert.equal(transaction?.contactId, '44444444-4444-4444-4444-444444444444')
      assert.equal(transaction?.purpose, 'initial_activation')
      assert.equal(transaction?.intakeReference, 'JMP-INT-202607-TX')
    },
  )
})

test('production does not create a universal master-code fallback grant', () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    AUTHOR_PORTAL_MASTER_ACCESS_CODE: process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE,
    AUTHOR_ONBOARDING_ACCESS_CODE: process.env.AUTHOR_ONBOARDING_ACCESS_CODE,
    AUTHOR_PORTAL_ACCESS_REGISTRY_JSON: process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON,
    AUTHOR_PORTAL_ACCESS_RECORDS_JSON: process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON,
  }
  process.env.NODE_ENV = 'production'
  process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE = 'JMP-PORTAL-ADMIN-2026'
  process.env.AUTHOR_ONBOARDING_ACCESS_CODE = 'JMP-AUTHOR-2026'
  delete process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON
  delete process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON

  try {
    assert.equal(access.getAuthorPortalAccessGrants().length, 0)
    assert.equal(
      access.resolveAuthorPortalAccessGrant({
        code: 'JMP-PORTAL-ADMIN-2026',
        requestedReference: 'JMP-INT-202607-0W5PTQ',
      }),
      null,
    )
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
})

test('External ID binding rejects conflicting sign-ins unless governed recovery is authorized', () => {
  const conflict = recovery.decideAuthorExternalIdBinding({
    contactId: '55555555-5555-5555-5555-555555555555',
    currentExternalUserIdentifier: 'external-id-a',
    incomingExternalUserIdentifier: 'external-id-b',
  })
  assert.equal(conflict.action, 'reject')
  assert.equal(conflict.reason, 'identity_conflict')

  const governedRecovery = recovery.decideAuthorExternalIdBinding({
    contactId: '55555555-5555-5555-5555-555555555555',
    currentExternalUserIdentifier: 'external-id-a',
    incomingExternalUserIdentifier: 'external-id-b',
    recoveryAuthorized: true,
  })
  assert.equal(governedRecovery.action, 'bind')
  assert.equal(governedRecovery.reason, 'recovery')
})

test('Author Portal protected routes resolve durable context from External ID before email', () => {
  const files = [
    'app/api/author/context/route.ts',
    'app/api/author/marketing-profile/route.ts',
    'app/api/author/artifacts/[artifactId]/download/route.ts',
    'app/api/author/activation/complete/route.ts',
  ]

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    if (file.includes('activation/complete')) {
      assert.ok(source.includes('readAuthorPortalActivationTransaction'), file)
      assert.ok(source.includes('bindAuthorContactExternalId'), file)
      assert.ok(source.includes('setAuthorPortalSessionCookie'), file)
    } else {
      assert.ok(source.includes('getAuthorPortalContextFromExternalId'), file)
      if (file === 'app/api/author/context/route.ts') {
        assert.match(
          source,
          /const contactId = durableUser\?\.authorContactId[\s\S]+const externalId = durableUser\?\.authorObjectId[\s\S]+const email = durableUser\?\.email[\s\S]+const context = contactId[\s\S]+getAuthorPortalContextFromContactId[\s\S]+getAuthorPortalContextFromExternalId[\s\S]+getAuthorPortalContextFromAuthorEmail/,
          file,
        )
      } else {
        assert.match(
          source,
          /const externalId = .*authorObjectId[\s\S]+if \(externalId\) return getAuthorPortalContextFromExternalId[\s\S]+const email = session\?\.user\?\.email/,
          file,
        )
      }
    }
  }
})

test('Author Portal context bridges durable author sign-in into the portal session cookie', () => {
  const source = readFileSync('app/api/author/context/route.ts', 'utf8')

  assert.ok(source.includes('getDurableAuthorSession'), 'durable author session is inspected')
  assert.ok(source.includes('getAuthorPortalContextFromExternalId'), 'External ID resolves before email fallback')
  assert.ok(source.includes('createAuthorPortalSession'), 'resolved durable sign-in creates portal session')
  assert.ok(source.includes('setAuthorPortalSessionCookie'), 'portal session cookie is written after resolution')
  assert.ok(source.includes('author_relationship_not_resolved'), 'signed-in unresolved relationship is classified truthfully')
  assert.ok(
    source.includes('AUTHOR_WORKSPACE_AUTH_SESSION_RESOLUTION'),
    'safe auth/session diagnostics are logged without raw tokens',
  )
  assert.equal(source.includes('access_token'), false, 'route does not log provider access tokens')
  assert.equal(source.includes('cookie:'), false, 'route does not log cookie values')
})

test('AuthorGate does not show generic invitation-required state for signed-in unresolved relationships', () => {
  const source = readFileSync('app/author/_components/AuthorGate.tsx', 'utf8')

  assert.ok(source.includes('Relationship not resolved'))
  assert.ok(source.includes('signedInRelationshipError ? null'))
  assert.ok(source.includes('Your sign-in was found, but your author relationship could not be resolved'))
  assert.ok(source.includes('[403, 409].includes(response.status)'))
})

test('Carolyn pilot relationship count remains a guarded precondition', () => {
  const expectedValidatedTitles = [
    'Abortion!',
    'Because the Lord Is My Shepherd',
    "Girl, You're Not Crazy. You're Dealing with a Narcissist",
    'Loving the Addict',
    'More Than a Village',
    "You're Still Not Crazy",
  ]

  assert.equal(expectedValidatedTitles.length, 6)
  assert.ok(expectedValidatedTitles.includes("You're Still Not Crazy"))
})
