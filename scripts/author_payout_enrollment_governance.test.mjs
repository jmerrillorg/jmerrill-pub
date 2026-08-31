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
  AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET: process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET,
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
  process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET = 'mock-connect-enrollment-token-secret'
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
          if ((request.method || 'GET') === 'GET') {
            return {
              object: 'list',
              data: options.searchAccounts || (options.searchAccount ? [options.searchAccount] : []),
              has_more: false,
            }
          }
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

test('canonical identity policy declares one Connect account per royalty payee and duplicate-create prohibitions', () => {
  assert.equal(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.name, 'PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1')
  assert.equal(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.invariant, 'one_royalty_payee_one_canonical_stripe_connect_account')
  assert.ok(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.matchingPrecedence.includes('stored_dataverse_account_id'))
  assert.ok(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.matchingPrecedence.includes('exact_email'))
  assert.ok(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.allowedOperations.includes('refresh_account_link'))
  assert.ok(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.prohibitedOperations.includes('create_while_duplicate_review_pending'))
  assert.ok(stripe.PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1.prohibitedOperations.includes('shared_onboarding_link'))
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

test('existing Stripe metadata match is reused before creating a replacement account', async () => {
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
  assert.deepEqual(calls.map((call) => [call.method, call.path]), [['GET', '/v1/accounts']])
})

test('single exact-email connected account is reused before creating a duplicate', async () => {
  const calls = []
  installMockFetch(calls, {
    searchAccount: {
      id: 'acct_EmailOnlyAuthor',
      object: 'account',
      email: identity.authorEmail.toUpperCase(),
      metadata: {},
    },
  })

  const result = await stripe.resolveRecipientAccountId(identity)

  assert.equal(result.accountId, 'acct_EmailOnlyAuthor')
  assert.equal(result.reused, true)
  assert.equal(result.source, 'stripe_email_search')
  assert.deepEqual(calls.map((call) => [call.method, call.path]), [['GET', '/v1/accounts']])
})

test('multiple plausible connected accounts block creation and require duplicate review', async () => {
  const calls = []
  installMockFetch(calls, {
    searchAccounts: [
      {
        id: 'acct_MetadataAuthor',
        object: 'account',
        email: identity.authorEmail,
        metadata: {
          jm1_royalty_payee_id: identity.royaltyPayeeId,
        },
      },
      {
        id: 'acct_EmailAuthor',
        object: 'account',
        email: identity.authorEmail,
        metadata: {},
      },
    ],
  })

  await assert.rejects(
    () => stripe.resolveRecipientAccountId(identity),
    /CONNECT_DUPLICATE_REVIEW/,
  )
  assert.deepEqual(calls.map((call) => [call.method, call.path]), [['GET', '/v1/accounts']])
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
  assert.deepEqual(calls.map((call) => [call.method, call.path]), [['GET', '/v1/accounts'], ['POST', '/v1/accounts']])
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
  assert.match(calls[0].body.get('return_url'), /^https:\/\/jmerrill\.pub\/author\/financial-setup\?connect=return&token=/)
  assert.match(calls[0].body.get('refresh_url'), /^https:\/\/jmerrill\.pub\/api\/author\/stripe\/connect\/refresh\?token=/)
  assert.doesNotMatch(calls[0].body.get('return_url'), /author\/portal|contact=/)
  assert.doesNotMatch(calls[0].body.get('refresh_url'), /contact=/)
  assert.match(calls[0].headers['Idempotency-Key'], new RegExp(`jm1-connect-account-link-${identity.royaltyPayeeId}-`))
})

test('enrollment token preserves verified author, payee, and account context without exposing an activation code', () => {
  const token = stripe.createConnectEnrollmentToken(identity, 'acct_MockAuthorPayoutEnrollment', 1_800_000_000_000)
  const context = stripe.verifyConnectEnrollmentToken(token, 1_800_000_001_000)

  assert.equal(context.purpose, 'stripe_connect_direct_deposit_setup')
  assert.equal(context.contactId, identity.contactId)
  assert.equal(context.authorRelationshipId, identity.authorRelationshipId)
  assert.equal(context.royaltyPayeeId, identity.royaltyPayeeId)
  assert.equal(context.stripeAccountId, 'acct_MockAuthorPayoutEnrollment')
  assert.doesNotMatch(token, /JMP-AUTHOR|activation|recovery/i)
})

test('tampered, expired, and malformed enrollment contexts fail closed', () => {
  const token = stripe.createConnectEnrollmentToken(identity, 'acct_MockAuthorPayoutEnrollment', 1_800_000_000_000)

  assert.throws(() => stripe.verifyConnectEnrollmentToken(`${token}x`, 1_800_000_001_000), /connect_enrollment_context_invalid/)
  assert.throws(() => stripe.verifyConnectEnrollmentToken(token, 1_802_700_000_000), /connect_enrollment_context_expired/)
  assert.throws(() => stripe.verifyConnectEnrollmentToken('not-a-token', 1_800_000_001_000), /connect_enrollment_context_invalid/)
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

test('title-named payee account is classified as noncanonical retirement candidate', () => {
  assert.equal(stripe.classifyConnectedAccountForAuthorEstate({
    id: 'acct_TitleNamed',
    business_profile: { name: 'The Intentional Leader' },
    email: 'project@example.com',
    metadata: {},
  }, [identity]), 'NONCANONICAL_RETIREMENT_CANDIDATE')
})

test('drift detection surfaces duplicate, missing, stale, and title-name risks', () => {
  const missingIdentity = {
    ...identity,
    contactId: '33333333-3333-3333-3333-333333333333',
    authorRelationshipId: '44444444-4444-4444-4444-444444444444',
    royaltyPayeeId: '44444444-4444-4444-4444-444444444444',
    authorEmail: 'missing@example.com',
  }

  const findings = stripe.detectStripeConnectDrift([identity, missingIdentity], [
    {
      id: 'acct_MetadataAuthor',
      email: identity.authorEmail,
      metadata: { jm1_royalty_payee_id: identity.royaltyPayeeId },
      details_submitted: false,
      payouts_enabled: false,
    },
    {
      id: 'acct_EmailAuthor',
      email: identity.authorEmail,
      metadata: {},
      details_submitted: false,
      payouts_enabled: false,
    },
    {
      id: 'acct_TitleNamed',
      business_profile: { name: 'The Intentional Leader' },
      metadata: {},
    },
  ])

  assert.deepEqual(findings, [
    'AUTHOR_WITHOUT_CONNECT_STATE',
    'CONNECT_ACCOUNT_WITHOUT_DATAVERSE_LINK',
    'MULTIPLE_CONNECT_ACCOUNTS_FOR_PAYEE',
    'TITLE_NAME_USED_AS_PAYEE_ACCOUNT',
  ])
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

test('human status mapping uses author-readable setup states', () => {
  assert.equal(stripe.mapConnectHumanStatus({
    details_submitted: false,
    payouts_enabled: false,
    requirements: { currently_due: ['external_account'], past_due: [] },
  }), 'SETUP_IN_PROGRESS')

  assert.equal(stripe.mapConnectHumanStatus({
    details_submitted: true,
    payouts_enabled: false,
    requirements: { currently_due: ['verification.document'], past_due: [] },
  }), 'MORE_INFORMATION_NEEDED')

  assert.equal(stripe.mapConnectHumanStatus({
    details_submitted: true,
    payouts_enabled: false,
    requirements: { currently_due: [], past_due: [] },
  }), 'UNDER_REVIEW')

  assert.equal(stripe.mapConnectHumanStatus({
    details_submitted: true,
    payouts_enabled: true,
    requirements: { currently_due: [], past_due: [] },
  }), 'SETUP_COMPLETE')
})

test('author enrollment state mapping has no unknown state', () => {
  const states = [
    stripe.mapAuthorConnectEnrollmentState({ id: 'acct_ready', details_submitted: true, payouts_enabled: true, requirements: { currently_due: [], past_due: [] } }),
    stripe.mapAuthorConnectEnrollmentState({ id: 'acct_invited', details_submitted: false, payouts_enabled: false, requirements: { currently_due: [], past_due: [] } }, { invitationSent: true }),
    stripe.mapAuthorConnectEnrollmentState({ id: 'acct_incomplete', details_submitted: false, payouts_enabled: false, requirements: { currently_due: [], past_due: [] } }),
    stripe.mapAuthorConnectEnrollmentState({ id: 'acct_action', details_submitted: true, payouts_enabled: false, requirements: { currently_due: ['external_account'], past_due: [] } }),
    stripe.mapAuthorConnectEnrollmentState({ id: 'acct_review', details_submitted: true, payouts_enabled: false, requirements: { currently_due: [], past_due: [] } }),
    stripe.mapAuthorConnectEnrollmentState(null, { duplicateReview: true }),
    stripe.mapAuthorConnectEnrollmentState(null, { identityReview: true }),
  ]

  assert.deepEqual(states, [
    'PAYOUT_READY',
    'ONBOARDING_INVITED',
    'ONBOARDING_INCOMPLETE',
    'ACTION_REQUIRED',
    'UNDER_REVIEW',
    'DUPLICATE_REVIEW',
    'IDENTITY_REVIEW',
  ])
  assert.ok(!states.includes('UNKNOWN'))
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
  assert.match(routeSource, /resolveAuthorConnectStartContext/)
  assert.match(routeSource, /getDurableAuthorSession|getAuthorPortalContextFromCookies/)
  assert.doesNotMatch(routeSource, /x-author-access-code|validateAuthorPortalAccessCode/)
  assert.match(routeSource, /resolveGovernedAuthorConnectIdentity/)
})

test('financial setup page has a Connect-only return path and does not force activation-code copy for signed returns', () => {
  const pageSource = readFileSync('app/author/financial-setup/page.tsx', 'utf8')

  assert.match(pageSource, /ConnectReturnExperience/)
  assert.match(pageSource, /readConnectEnrollmentStatusFromToken/)
  assert.match(pageSource, /Set up direct deposit/)
  assert.match(pageSource, /verification code, that code comes from Stripe/)
  assert.doesNotMatch(pageSource, /future payment readiness/i)
  assert.doesNotMatch(pageSource, /payment readiness/i)
  assert.doesNotMatch(pageSource, /governed recovery|requirements object|Connect account status token|runtime/i)
})

test('Connect refresh route reissues a fresh link from signed context without author portal gate imports', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/refresh/route.ts', 'utf8')

  assert.match(routeSource, /createFreshConnectAccountLinkFromToken/)
  assert.match(routeSource, /NextResponse\.redirect/)
  assert.doesNotMatch(routeSource, /requireAuthorAccess|validateAuthorPortalAccessCode|AUTHOR_ONBOARDING_ACCESS_CODE/)
  assert.doesNotMatch(routeSource, /charges|payment_intents|payouts|transfers|invoices/i)
})

test('author-facing setup card uses direct-deposit language and no dead-end activation code', () => {
  const clientSource = readFileSync('app/author/_components/StripeConnectSetupCard.tsx', 'utf8')

  assert.match(clientSource, /Set Up Direct Deposit/)
  assert.match(clientSource, /J Merrill\s*\n\s*Publishing does not collect those details by email/)
  assert.doesNotMatch(clientSource, /future payment readiness|Open Author Payout Enrollment|activation code|recovery code/i)
})

test('invitation copy is setup-only and avoids royalty amount, timing, schedule, and activation-code prompts', () => {
  const serviceSource = readFileSync('lib/server/stripe/connect-author-pilot-service.ts', 'utf8')

  assert.match(serviceSource, /Set Up Direct Deposit with J Merrill Publishing/)
  assert.match(serviceSource, /Complete Stripe Connect Setup/)
  assert.match(serviceSource, /Stripe Connect as the secure setup process/)
  assert.doesNotMatch(serviceSource, /future royalty-payment delays|Set Up Your Royalty Payments|royalty amount|royalty schedule|activation code|recovery code/i)
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

test('Connect setup email is enabled unless the communication gate is explicitly disabled', () => {
  const source = readFileSync('lib/server/stripe/connect-author-pilot-service.ts', 'utf8')

  assert.match(source, /STRIPE_CONNECT_EMAIL_SEND/)
  assert.match(source, /isStripeConnectEmailSendEnabled/)
  assert.match(source, /configured !== 'false'/)
  assert.match(source, /configured !== 'disabled'/)
  assert.match(source, /configured !== '0'/)
  assert.match(source, /ACCOUNT_LINK_READY/)
  assert.match(source, /JACKIE_SEND_READY_NOT_SENT/)
  assert.match(source, /emailAutomationDisabled/)
  assert.match(source, /email-disabled/)
})

test('Connect setup communication template omits royalty-payment response language', () => {
  const sources = [
    readFileSync('lib/server/stripe/connect-author-pilot-service.ts', 'utf8'),
    readFileSync('scripts/stripe_connect_author_pilot.mjs', 'utf8'),
  ].join('\n')

  assert.match(sources, /Set Up Direct Deposit with J Merrill Publishing/)
  assert.match(sources, /Complete Stripe Connect setup/)
  assert.doesNotMatch(sources, /Set Up Your Royalty Payments/)
  assert.doesNotMatch(sources, /royalty-payment delays/)
  assert.doesNotMatch(sources, /projectTitle: 'Author Royalty Payments'/)
})

test('Connect Account Links use signed refresh and return contexts', async () => {
  const calls = []
  installMockFetch(calls)

  const { accountId } = await stripe.resolveRecipientAccountId(identity)
  await stripe.createRecipientAccountLink(accountId, identity)

  const linkRequest = calls.find((call) => call.path === '/v1/account_links')
  assert.ok(linkRequest)
  assert.match(linkRequest.body.get('refresh_url'), /\/api\/author\/stripe\/connect\/refresh\?token=/)
  assert.match(linkRequest.body.get('return_url'), /\/author\/financial-setup\?connect=return&token=/)
  assert.doesNotMatch(linkRequest.body.get('refresh_url'), /contact=/)
})

test('legacy Connect financial setup links bypass the generic activation-code gate', () => {
  const pageSource = readFileSync('app/author/financial-setup/page.tsx', 'utf8')
  const refreshSource = readFileSync('app/api/author/stripe/connect/refresh/route.ts', 'utf8')

  assert.match(pageSource, /isValidLegacyConnectContact/)
  assert.ok(pageSource.includes('redirect(`/api/author/stripe/connect/refresh?contact='))
  assert.match(pageSource, /ConnectReturnExperience/)
  assert.match(refreshSource, /createFreshConnectAccountLinkFromLegacyContact/)
  assert.match(refreshSource, /legacy_connect_account_missing/)
  assert.match(refreshSource, /The author was not sent to an activation-code gate/)
  assert.match(refreshSource, /P0_CONNECT_JOURNEY_REGRESSION/)
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

  assert.deepEqual(calls.map((call) => [call.method, call.path]), [['GET', '/v1/accounts'], ['POST', '/v1/accounts'], ['POST', '/v1/account_links']])
  assert.ok(calls.every((call) => !/^\/v1\/(charges|payment_intents|payouts|refunds|transfers)(\/|$)/.test(call.path)))
})

test('commissioning matrix captures the governed Connect journey and negative proof contract', () => {
  const routeSource = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')
  const refreshSource = readFileSync('app/api/author/stripe/connect/refresh/route.ts', 'utf8')
  const pageSource = readFileSync('app/author/financial-setup/page.tsx', 'utf8')
  const combined = `${routeSource}\n${refreshSource}\n${pageSource}`

  const negativeProof = {
    connect_return_requires_JMP_activation_code: pageSource.indexOf('if (token)') >= 0 && pageSource.indexOf('if (token)') < pageSource.indexOf('<AuthorGate scope="portal">') ? 0 : 1,
    connect_refresh_requires_JMP_activation_code: !/requireAuthorAccess|validateAuthorPortalAccessCode/.test(refreshSource) ? 0 : 1,
    expired_link_creates_new_Connect_account: !/resolveRecipientAccountId/.test(refreshSource) ? 0 : 1,
    arbitrary_contactId_query_grants_access: /nextUrl\.searchParams\.get\(['"]contact/.test(combined) &&
      /resolveGovernedAuthorConnectIdentity/.test(refreshSource) &&
      /legacy_connect_account_missing/.test(refreshSource) &&
      /assertConnectedAccountMatchesIdentity/.test(refreshSource) &&
      /persistConnectAccountLinkage/.test(refreshSource)
      ? 0
      : 1,
    bank_data_stored_in_JMP: !/bankAccountNumber|routingNumber|taxIdentifier|socialSecurity|taxId/i.test(combined) ? 0 : 1,
    royalty_amount_timing_schedule_in_setup_email: !/royalty amount|royalty timing|payment schedule|payment amount/i.test(readFileSync('lib/server/stripe/connect-author-pilot-service.ts', 'utf8')) ? 0 : 1,
    generic_Author_Hub_auth_weakened: /<AuthorGate scope="portal">/.test(pageSource) ? 0 : 1,
  }

  assert.deepEqual(negativeProof, {
    connect_return_requires_JMP_activation_code: 0,
    connect_refresh_requires_JMP_activation_code: 0,
    expired_link_creates_new_Connect_account: 0,
    arbitrary_contactId_query_grants_access: 0,
    bank_data_stored_in_JMP: 0,
    royalty_amount_timing_schedule_in_setup_email: 0,
    generic_Author_Hub_auth_weakened: 0,
  })
})
