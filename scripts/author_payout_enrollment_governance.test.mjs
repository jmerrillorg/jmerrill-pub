import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const stripe = jiti('../lib/server/stripe/author-workspace-stripe.ts')
const webhook = jiti('../lib/server/stripe/author-workspace-webhook.ts')

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_ENV = {
  STRIPE_CONNECT_SECRET_KEY: process.env.STRIPE_CONNECT_SECRET_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  JM1_STRIPE_SECRET_KEY: process.env.JM1_STRIPE_SECRET_KEY,
  JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED: process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED,
}

const identity = Object.freeze({
  contactId: '11111111-1111-1111-1111-111111111111',
  authorRelationshipId: '22222222-2222-2222-2222-222222222222',
  royaltyPayeeId: '22222222-2222-2222-2222-222222222222',
  authorName: 'Edith Clay',
  payeeName: 'Edith Clay',
  authorEmail: 'edith@example.com',
  existingStripeAccountId: '',
  migrationBatch: 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
})

function resetEnv() {
  process.env.STRIPE_CONNECT_SECRET_KEY = 'mock-connect-secret-not-a-stripe-key'
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.JM1_STRIPE_SECRET_KEY
  process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED = 'false'
}

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function installMockFetch(calls, options = {}) {
  globalThis.fetch = async (url, request = {}) => {
    const body = request.body instanceof URLSearchParams ? new URLSearchParams(request.body) : request.body
    const path = new URL(String(url)).pathname
    calls.push({
      url: String(url),
      path,
      body,
      headers: request.headers || {},
      method: request.method || 'GET',
    })

    return {
      ok: true,
      status: 200,
      async json() {
        if (path.endsWith('/accounts/search')) {
          return { object: 'search_result', data: options.searchAccount ? [options.searchAccount] : [] }
        }
        if (path.startsWith('/v1/accounts/acct_')) {
          return options.retrieveAccount || {
            id: path.split('/').pop(),
            object: 'account',
            email: identity.authorEmail,
            metadata: {
              jm1_contact_id: identity.contactId,
              jm1_author_relationship_id: identity.authorRelationshipId,
              jm1_royalty_payee_id: identity.royaltyPayeeId,
            },
            details_submitted: false,
            payouts_enabled: false,
            charges_enabled: false,
            requirements: { currently_due: [], past_due: [] },
          }
        }
        if (path === '/v1/accounts') {
          return {
            id: 'acct_MockAuthorPayoutEnrollment',
            object: 'account',
            email: identity.authorEmail,
            metadata: {
              jm1_contact_id: identity.contactId,
              jm1_author_relationship_id: identity.authorRelationshipId,
              jm1_royalty_payee_id: identity.royaltyPayeeId,
            },
          }
        }
        if (path === '/v1/account_links') {
          return {
            id: 'link_mock_author_payout_enrollment',
            object: 'account_link',
            url: 'mock-account-link-returned-only-to-route-response',
            expires_at: 1800000000,
          }
        }
        return { id: 'mock' }
      },
    }
  }
}

test.beforeEach(() => {
  resetEnv()
})

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  restoreEnv()
})

test('connected-account payload is author/payee scoped and omits title metadata and payout capabilities', () => {
  const params = stripe.buildRecipientAccountParams(identity)

  assert.equal(params.get('type'), 'standard')
  assert.equal(params.get('email'), identity.authorEmail)
  assert.equal(params.get('business_type'), null)
  assert.equal(params.get('business_profile[name]'), null)
  assert.equal(params.get('metadata[jm1_contact_id]'), identity.contactId)
  assert.equal(params.get('metadata[jm1_author_relationship_id]'), identity.authorRelationshipId)
  assert.equal(params.get('metadata[jm1_royalty_payee_id]'), identity.royaltyPayeeId)
  assert.equal(params.get('metadata[jm1_title]'), null)
  assert.equal(params.get('metadata[jm1_reference]'), null)
  assert.equal(params.get('capabilities[card_payments][requested]'), null)
  assert.equal(params.get('capabilities[transfers][requested]'), null)
  assert.equal(params.get('metadata[jm1_payment_authorized]'), 'false')
})

test('future prohibited capabilities and title metadata fail validation', () => {
  const params = stripe.buildRecipientAccountParams(identity)
  params.set('capabilities[transfers][requested]', 'true')
  assert.throws(() => stripe.assertEnrollmentAccountParams(params), /stripe_enrollment_prohibited_capability/)

  params.delete('capabilities[transfers][requested]')
  params.set('metadata[jm1_title]', 'The Intentional Leader')
  assert.throws(() => stripe.assertEnrollmentAccountParams(params), /stripe_enrollment_title_metadata_blocked/)
})

test('existing Dataverse connected account is retrieved and reused only after identity match', async () => {
  const calls = []
  installMockFetch(calls)

  const result = await stripe.resolveRecipientAccountId({
    ...identity,
    existingStripeAccountId: 'acct_ExistingAuthor',
  })

  assert.deepEqual(result, {
    accountId: 'acct_ExistingAuthor',
    reused: true,
    source: 'dataverse_existing',
  })
  assert.deepEqual(calls.map((call) => call.path), ['/v1/accounts/acct_ExistingAuthor'])
})

test('existing Stripe search match is reused before creating a replacement account', async () => {
  const calls = []
  installMockFetch(calls, {
    searchAccount: {
      id: 'acct_SearchAuthor',
      object: 'account',
      email: identity.authorEmail,
      metadata: {
        jm1_contact_id: identity.contactId,
        jm1_author_relationship_id: identity.authorRelationshipId,
        jm1_royalty_payee_id: identity.royaltyPayeeId,
      },
    },
  })

  const result = await stripe.resolveRecipientAccountId(identity)

  assert.equal(result.accountId, 'acct_SearchAuthor')
  assert.equal(result.reused, true)
  assert.equal(result.source, 'stripe_identity_search')
  assert.deepEqual(calls.map((call) => call.path), ['/v1/accounts/search'])
})

test('new connected account creation uses royalty-payee idempotency and no money movement', async () => {
  const calls = []
  installMockFetch(calls)

  const result = await stripe.resolveRecipientAccountId(identity)

  assert.deepEqual(result, {
    accountId: 'acct_MockAuthorPayoutEnrollment',
    reused: false,
    source: 'created',
  })
  assert.deepEqual(calls.map((call) => call.path), ['/v1/accounts/search', '/v1/accounts'])
  assert.equal(calls[1].headers['Idempotency-Key'], `jm1-author-payout-enrollment-account-${identity.royaltyPayeeId}-v1`)
  assert.equal(calls[1].body.get('metadata[jm1_royalty_payee_id]'), identity.royaltyPayeeId)
})

test('account-link creation is unique to the verified account and identity', async () => {
  const calls = []
  installMockFetch(calls)

  const link = await stripe.createRecipientAccountLink('acct_MockAuthorPayoutEnrollment', identity)

  assert.equal(link.url, 'mock-account-link-returned-only-to-route-response')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/v1/account_links')
  assert.equal(calls[0].body.get('type'), 'account_onboarding')
  assert.equal(calls[0].body.get('account'), 'acct_MockAuthorPayoutEnrollment')
  assert.match(calls[0].headers['Idempotency-Key'], new RegExp(`jm1-connect-account-link-${identity.royaltyPayeeId}-`))
})

test('wrong-author Stripe account metadata fails closed', () => {
  assert.throws(
    () => stripe.assertConnectedAccountMatchesIdentity({
      id: 'acct_wrong',
      email: identity.authorEmail,
      metadata: {
        jm1_contact_id: '33333333-3333-3333-3333-333333333333',
        jm1_author_relationship_id: identity.authorRelationshipId,
        jm1_royalty_payee_id: identity.royaltyPayeeId,
      },
    }, identity),
    /stripe_connect_identity_mismatch:jm1_contact_id/,
  )
})

test('status mapping separates started, submitted, requirements, and ready states', () => {
  assert.equal(stripe.mapConnectAccountReadiness({
    details_submitted: false,
    payouts_enabled: false,
    requirements: { currently_due: ['external_account'], past_due: [] },
  }).readiness, 'ONBOARDING_STARTED_OR_PENDING')

  assert.equal(stripe.mapConnectAccountReadiness({
    details_submitted: true,
    payouts_enabled: false,
    requirements: { currently_due: ['verification.document'], past_due: [] },
  }).readiness, 'ONBOARDING_SUBMITTED_REQUIREMENTS_PENDING')

  assert.equal(stripe.mapConnectAccountReadiness({
    details_submitted: true,
    payouts_enabled: true,
    requirements: { currently_due: [], past_due: [] },
  }).readiness, 'READY_FOR_ROYALTIES')
})

test('webhook classifier recognizes account.updated for automatic status synchronization', () => {
  const result = webhook.classifyStripeConnectAccountUpdateEvent({
    id: 'evt_account',
    type: 'account.updated',
    data: {
      object: {
        id: 'acct_author',
        object: 'account',
        metadata: { jm1_royalty_payee_id: identity.royaltyPayeeId },
      },
    },
  })

  assert.equal(result.process, true)
  assert.equal(result.safeEvent.accountId, 'acct_author')
})

test('route no longer trusts posted Stripe account ids or title-specific constants', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')

  assert.doesNotMatch(routeSource, /body\?\.stripeAccountId|existingStripeAccountId/)
  assert.doesNotMatch(routeSource, /COMMISSIONING_REFERENCE|The Intentional Leader/)
  assert.match(routeSource, /validateAuthorPortalAccessCode/)
  assert.match(routeSource, /resolveGovernedAuthorConnectIdentity/)
})

test('client no longer sends body-provided stripeAccountId from session storage', () => {
  const clientSource = readFileSync('app/author/_components/StripeConnectSetupCard.tsx', 'utf8')

  assert.doesNotMatch(clientSource, /stripeAccountId/)
  assert.doesNotMatch(clientSource, /existingStripeAccountId/)
})

test('enrollment source cannot create or alter a royalty payable or trigger payment', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')

  assert.doesNotMatch(routeSource, /createCommissioningCheckoutSession|checkoutUrl|paymentStatus/)
  assert.doesNotMatch(routeSource, /updateCommissioningOpportunityPaymentStatus|royaltyPayable|payableAmount/i)
})

test('payment operations fail closed while the commissioning payment gate is false', async () => {
  const calls = []
  installMockFetch(calls)
  process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED = 'false'

  await assert.rejects(
    () => stripe.createCommissioningCheckoutSession(),
    /commissioning_payment_gate_closed/,
  )
  assert.equal(calls.length, 0)
})

test('enrollment workflow never calls Stripe money-movement APIs', async () => {
  const calls = []
  installMockFetch(calls)

  const { accountId } = await stripe.resolveRecipientAccountId(identity)
  await stripe.createRecipientAccountLink(accountId, identity)

  assert.deepEqual(calls.map((call) => call.path), ['/v1/accounts/search', '/v1/accounts', '/v1/account_links'])
  assert.ok(calls.every((call) => !/^\/v1\/(charges|payment_intents|payouts|refunds|transfers)(\/|$)/.test(call.path)))
})
