import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const stripe = jiti('../lib/server/stripe/author-workspace-stripe.ts')

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_ENV = {
  STRIPE_CONNECT_SECRET_KEY: process.env.STRIPE_CONNECT_SECRET_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  JM1_STRIPE_SECRET_KEY: process.env.JM1_STRIPE_SECRET_KEY,
  JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED: process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED,
}

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

function installMockFetch(calls) {
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body instanceof URLSearchParams ? new URLSearchParams(options.body) : options.body
    calls.push({
      url: String(url),
      path: new URL(String(url)).pathname,
      body,
      headers: options.headers || {},
    })

    return {
      ok: true,
      status: 200,
      async json() {
        if (String(url).endsWith('/v1/accounts')) {
          return { id: 'acct_mock_author_payout_enrollment', object: 'account' }
        }
        if (String(url).endsWith('/v1/account_links')) {
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

test('new connected-account payload omits card_payments and transfers', () => {
  const params = stripe.buildRecipientAccountParams()

  assert.equal(params.get('type'), 'standard')
  assert.equal(params.get('capabilities[card_payments][requested]'), null)
  assert.equal(params.get('capabilities[transfers][requested]'), null)
  assert.equal(params.get('metadata[jm1_source]'), 'Author Payout Enrollment')
  assert.equal(params.get('metadata[jm1_payment_authorized]'), 'false')
})

test('future prohibited connected-account capabilities fail automated validation', () => {
  const params = stripe.buildRecipientAccountParams()
  params.set('capabilities[card_payments][requested]', 'true')

  assert.throws(
    () => stripe.assertEnrollmentAccountParams(params),
    /stripe_enrollment_prohibited_capability:capabilities\[card_payments\]\[requested\]/,
  )

  params.delete('capabilities[card_payments][requested]')
  params.set('capabilities[transfers][requested]', 'true')

  assert.throws(
    () => stripe.assertEnrollmentAccountParams(params),
    /stripe_enrollment_prohibited_capability:capabilities\[transfers\]\[requested\]/,
  )
})

test('existing connected accounts are reused and duplicate account creation is prevented', async () => {
  const calls = []
  installMockFetch(calls)

  const first = await stripe.resolveRecipientAccountId('acct_1TxbEkJeQmkHf2Em')
  const second = await stripe.resolveRecipientAccountId(' acct_1TxbEkJeQmkHf2Em ')

  assert.deepEqual(first, { accountId: 'acct_1TxbEkJeQmkHf2Em', reused: true })
  assert.deepEqual(second, { accountId: 'acct_1TxbEkJeQmkHf2Em', reused: true })
  assert.equal(calls.length, 0)
})

test('new connected account creation calls only the enrollment account endpoint without prohibited capabilities', async () => {
  const calls = []
  installMockFetch(calls)

  const result = await stripe.resolveRecipientAccountId('')

  assert.deepEqual(result, { accountId: 'acct_mock_author_payout_enrollment', reused: false })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/v1/accounts')
  assert.equal(calls[0].body.get('capabilities[card_payments][requested]'), null)
  assert.equal(calls[0].body.get('capabilities[transfers][requested]'), null)
})

test('account link creation is server-side and does not use money-movement endpoints', async () => {
  const calls = []
  installMockFetch(calls)

  const link = await stripe.createRecipientAccountLink('acct_mock_author_payout_enrollment')

  assert.equal(link.url, 'mock-account-link-returned-only-to-route-response')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/v1/account_links')
  assert.equal(calls[0].body.get('type'), 'account_onboarding')
  assert.equal(calls[0].body.get('account'), 'acct_mock_author_payout_enrollment')
})

test('Account Link URLs are not persisted or logged by the enrollment route', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')
  const executionLogBlock = routeSource.slice(
    routeSource.indexOf('writeSafeExecutionLog({'),
    routeSource.indexOf('return NextResponse.json({'),
  )

  assert.ok(executionLogBlock.includes('No Account Link URL'))
  assert.doesNotMatch(executionLogBlock, /link\.url|onboardingUrl|https:\/\/connect\.stripe/i)
  assert.match(routeSource, /onboardingUrl: link\.url/)
})

test('enrollment source cannot create or alter a royalty payable or trigger payment', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')

  assert.doesNotMatch(routeSource, /createCommissioningCheckoutSession|createCommissioningCheckout|checkoutUrl|paymentStatus/)
  assert.doesNotMatch(routeSource, /updateCommissioningOpportunityPaymentStatus|dataversePatch|royaltyPayable|payableAmount/i)
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

  const { accountId } = await stripe.resolveRecipientAccountId('')
  await stripe.createRecipientAccountLink(accountId)

  assert.deepEqual(calls.map((call) => call.path), ['/v1/accounts', '/v1/account_links'])
  assert.ok(calls.every((call) => !/^\/v1\/(charges|payment_intents|payouts|refunds|transfers)(\/|$)/.test(call.path)))
})
