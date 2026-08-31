import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const otp = jiti('../lib/server/author-email-otp.ts')

const CONTACT_ID = '11111111-1111-1111-1111-111111111111'

async function withOtpEnv(fn) {
  const previous = {
    AUTHOR_EMAIL_OTP_SECRET: process.env.AUTHOR_EMAIL_OTP_SECRET,
    AUTHOR_EMAIL_OTP_TTL_SECONDS: process.env.AUTHOR_EMAIL_OTP_TTL_SECONDS,
    AUTHOR_EMAIL_OTP_RESEND_COOLDOWN_SECONDS: process.env.AUTHOR_EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
    AUTHOR_EMAIL_OTP_REQUEST_LIMIT: process.env.AUTHOR_EMAIL_OTP_REQUEST_LIMIT,
    AUTHOR_EMAIL_OTP_CONTACT_LOGIN_FIELDS: process.env.AUTHOR_EMAIL_OTP_CONTACT_LOGIN_FIELDS,
    AUTHOR_PORTAL_SESSION_SECRET: process.env.AUTHOR_PORTAL_SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  }
  process.env.NODE_ENV = 'test'
  process.env.AUTHOR_EMAIL_OTP_SECRET = 'author-email-otp-test-secret-2026'
  process.env.AUTHOR_EMAIL_OTP_TTL_SECONDS = '600'
  process.env.AUTHOR_EMAIL_OTP_RESEND_COOLDOWN_SECONDS = '60'
  process.env.AUTHOR_EMAIL_OTP_REQUEST_LIMIT = '5'
  delete process.env.AUTHOR_EMAIL_OTP_CONTACT_LOGIN_FIELDS
  process.env.AUTHOR_PORTAL_SESSION_SECRET = 'author-portal-session-test-secret-2026-strong-enough'

  try {
    return await fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

class MemoryOtpStore {
  records = []

  async create(record) {
    this.records.push({ ...record, rowId: `row-${this.records.length + 1}`, etag: `"${this.records.length + 1}"` })
  }

  async findActiveByChallenge(challengeId) {
    return this.records.find((record) => record.challengeId === challengeId) || null
  }

  async listRecentByEmailHash(emailHash, sinceIso) {
    const since = Date.parse(sinceIso)
    return this.records.filter((record) => record.emailHash === emailHash && Date.parse(record.issuedAt) >= since)
  }

  async update(record, patch) {
    if (record.etag && record.etag !== (this.records.find((entry) => entry.rowId === record.rowId)?.etag || '')) {
      throw new Error('precondition_failed')
    }
    Object.assign(record, patch, { etag: `"${Number(record.etag?.replace(/\D/g, '') || 0) + 1}"` })
  }
}

function authorContact(email = 'Author@Example.test') {
  return {
    contactId: CONTACT_ID,
    email: email.toLowerCase(),
    primaryEmail: email.toLowerCase(),
    name: 'Active Author',
    authorProfileId: '22222222-2222-2222-2222-222222222222',
  }
}

test('OTP request for an active author creates durable hashed challenge and sends through author email path', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    const sent = []
    const result = await otp.requestAuthorEmailOtp('Author@Example.test', {
      store,
      resolveContact: async (email) => authorContact(email),
      sendEmail: async (message) => {
        sent.push(message)
        return { provider: 'acs-email', providerMessageId: 'message-1' }
      },
    })

    assert.equal(result.accepted, true)
    assert.equal(store.records.length, 1)
    assert.equal(sent.length, 1)
    assert.match(sent[0].code, /^\d{6}$/)
    assert.equal(store.records[0].otpHash.includes(sent[0].code), false)
    assert.equal(JSON.stringify(store.records[0]).includes(sent[0].code), false)
    assert.equal(store.records[0].contactId, CONTACT_ID)
  })
})

test('unknown or ineligible author receives generic response without challenge or email', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    const sent = []
    const result = await otp.requestAuthorEmailOtp('unknown@example.test', {
      store,
      resolveContact: async () => null,
      sendEmail: async (message) => {
        sent.push(message)
        return { provider: 'acs-email', providerMessageId: 'message-1' }
      },
    })

    assert.equal(result.accepted, true)
    assert.equal(store.records.length, 0)
    assert.equal(sent.length, 0)
    assert.match(result.challengeId, /^[0-9a-f-]{36}$/)
  })
})

test('valid OTP creates author identity once and rejects replay', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    let code = ''
    const request = await otp.requestAuthorEmailOtp('author@example.test', {
      store,
      resolveContact: async (email) => authorContact(email),
      sendEmail: async (message) => {
        code = message.code
        return { provider: 'acs-email', providerMessageId: 'message-1' }
      },
    })

    const verified = await otp.verifyAuthorEmailOtp({
      email: 'author@example.test',
      challengeId: request.challengeId,
      code,
    }, { store })
    assert.equal(verified?.contactId, CONTACT_ID)
    assert.equal(store.records[0].status, 'consumed')

    const replay = await otp.verifyAuthorEmailOtp({
      email: 'author@example.test',
      challengeId: request.challengeId,
      code,
    }, { store })
    assert.equal(replay, null)
  })
})

test('invalid, expired, and max-attempt OTP states fail closed', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    let code = ''
    const now = new Date('2026-08-31T12:00:00.000Z')
    const request = await otp.requestAuthorEmailOtp('author@example.test', {
      now: () => now,
      store,
      resolveContact: async (email) => authorContact(email),
      sendEmail: async (message) => {
        code = message.code
        return { provider: 'acs-email', providerMessageId: 'message-1' }
      },
    })

    const invalid = await otp.verifyAuthorEmailOtp({
      email: 'author@example.test',
      challengeId: request.challengeId,
      code: code === '000000' ? '111111' : '000000',
    }, { now: () => new Date('2026-08-31T12:01:00.000Z'), store })
    assert.equal(invalid, null)
    assert.equal(store.records[0].attempts, 1)
    assert.equal(store.records[0].status, 'issued')

    store.records[0].attempts = 5
    const tooMany = await otp.verifyAuthorEmailOtp({
      email: 'author@example.test',
      challengeId: request.challengeId,
      code,
    }, { now: () => new Date('2026-08-31T12:02:00.000Z'), store })
    assert.equal(tooMany, null)
    assert.equal(store.records[0].status, 'failed')

    const expiredStore = new MemoryOtpStore()
    let expiredCode = ''
    const expiredRequest = await otp.requestAuthorEmailOtp('author@example.test', {
      now: () => now,
      store: expiredStore,
      resolveContact: async (email) => authorContact(email),
      sendEmail: async (message) => {
        expiredCode = message.code
        return { provider: 'acs-email', providerMessageId: 'message-2' }
      },
    })
    const expired = await otp.verifyAuthorEmailOtp({
      email: 'author@example.test',
      challengeId: expiredRequest.challengeId,
      code: expiredCode,
    }, { now: () => new Date('2026-08-31T12:11:00.000Z'), store: expiredStore })
    assert.equal(expired, null)
    assert.equal(expiredStore.records[0].status, 'expired')
  })
})

test('resend cooldown suppresses duplicate challenge delivery', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    const sent = []
    const now = new Date('2026-08-31T12:00:00.000Z')
    const deps = {
      now: () => now,
      store,
      resolveContact: async (email) => authorContact(email),
      sendEmail: async (message) => {
        sent.push(message)
        return { provider: 'acs-email', providerMessageId: `message-${sent.length}` }
      },
    }

    await otp.requestAuthorEmailOtp('author@example.test', deps)
    await otp.requestAuthorEmailOtp('author@example.test', deps)

    assert.equal(store.records.length, 1)
    assert.equal(sent.length, 1)
  })
})

test('alternate Contact email sends OTP to submitted login email but resolves canonical Contact', async () => {
  await withOtpEnv(async () => {
    const store = new MemoryOtpStore()
    const sent = []
    const result = await otp.requestAuthorEmailOtp('ALT@Example.test', {
      store,
      resolveContact: async () => ({
        contactId: CONTACT_ID,
        email: 'alt@example.test',
        primaryEmail: 'primary@example.test',
        name: 'Active Author',
        authorProfileId: '22222222-2222-2222-2222-222222222222',
      }),
      sendEmail: async (message) => {
        sent.push(message)
        return { provider: 'acs-email', providerMessageId: 'message-1' }
      },
    })

    assert.equal(result.accepted, true)
    assert.equal(store.records.length, 1)
    assert.equal(store.records[0].contactId, CONTACT_ID)
    assert.equal(store.records[0].contactEmail, 'alt@example.test')
    assert.equal(sent[0].to, 'alt@example.test')
  })
})

test('Contact login email resolver requires one Contact and exactly one active Author Profile', () => {
  const profileId = '22222222-2222-2222-2222-222222222222'
  const contact = {
    contactid: CONTACT_ID,
    fullname: 'Active Author',
    emailaddress1: 'primary@example.test',
    emailaddress2: 'alt@example.test',
    emailaddress3: '',
    jm1pub_isauthor: true,
  }
  const profile = {
    jm1_authorprofileid: profileId,
    _jm1_contact_value: CONTACT_ID,
  }

  const resolved = otp.resolveAuthorOtpContactFromRows({
    email: ' ALT@example.test ',
    contacts: [contact],
    profiles: [profile],
  })
  assert.equal(resolved?.contactId, CONTACT_ID)
  assert.equal(resolved?.email, 'alt@example.test')
  assert.equal(resolved?.primaryEmail, 'primary@example.test')
  assert.equal(resolved?.authorProfileId, profileId)

  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'alt@example.test',
      contacts: [contact, { ...contact, contactid: '33333333-3333-3333-3333-333333333333' }],
      profiles: [profile],
    }),
    null,
  )

  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'alt@example.test',
      contacts: [contact],
      profiles: [],
    }),
    null,
  )

  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'alt@example.test',
      contacts: [contact],
      profiles: [profile, { ...profile, jm1_authorprofileid: '44444444-4444-4444-4444-444444444444' }],
    }),
    null,
  )
})

test('Contact login resolver only accepts explicitly supported fields', () => {
  const contact = {
    contactid: CONTACT_ID,
    fullname: 'Active Author',
    emailaddress1: 'primary@example.test',
    emailaddress2: 'alt@example.test',
    adx_identity_username: 'portal-user@example.test',
    jm1pub_isauthor: true,
  }
  const profile = {
    jm1_authorprofileid: '22222222-2222-2222-2222-222222222222',
    _jm1_contact_value: CONTACT_ID,
  }

  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'portal-user@example.test',
      contacts: [contact],
      profiles: [profile],
    }),
    null,
  )
  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'portal-user@example.test',
      contacts: [contact],
      profiles: [profile],
      loginFields: ['adx_identity_username'],
    })?.contactId,
    CONTACT_ID,
  )
  assert.equal(
    otp.resolveAuthorOtpContactFromRows({
      email: 'alt@example.test',
      contacts: [{ ...contact, jm1pub_isauthor: false }],
      profiles: [profile],
    }),
    null,
  )
})

test('OTP email relay payload uses ACS-approved diagnostic and reference fields', async () => {
  await withOtpEnv(async () => {
    const previous = {
      relayUrl: process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL,
      relayKey: process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY,
      fetch: globalThis.fetch,
    }
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL = 'https://relay.example.test'
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY = 'relay-key'
    const calls = []
    globalThis.fetch = async (url, options) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(options.body)),
      })
      return new Response(JSON.stringify({
        accepted: true,
        provider: 'acs-email-relay',
        providerMessageId: 'message-1',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }

    try {
      await otp.sendAuthorOtpEmail({
        to: 'chosen2k7@gmail.com',
        authorName: 'Jackie Smith Jr',
        code: '123456',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        correlationId: 'AOC-OTP-dac575df-caa0-49c1-9069-ab99d0168631',
      })
    } finally {
      globalThis.fetch = previous.fetch
      if (previous.relayUrl === undefined) delete process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL
      else process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL = previous.relayUrl
      if (previous.relayKey === undefined) delete process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY
      else process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY = previous.relayKey
    }

    assert.equal(calls.length, 1)
    assert.match(calls[0].url, /\/api\/send-approved-author-response$/)
    assert.equal(calls[0].body.diagnosticId, 'dac575df-caa0-49c1-9069-ab99d0168631')
    assert.match(calls[0].body.intakeReferenceCode, /^JMP-INT-\d{6}-AOCOTP$/)
    assert.equal(calls[0].body.authorEmail, 'chosen2k7@gmail.com')
    assert.equal(calls[0].body.to, 'chosen2k7@gmail.com')
    assert.equal(calls[0].body.internalVisibilityMailbox, 'publishing@jmerrill.one')
    assert.equal(calls[0].body.futureSendRequiresInternalCopy, true)
    assert.equal(calls[0].body.futureSendRequiresDataverseLog, true)
  })
})

test('routine author login uses OTP provider and Contact-first context; activation code remains separate', () => {
  const gate = readFileSync('app/author/_components/AuthorGate.tsx', 'utf8')
  const auth = readFileSync('lib/server/author-durable-auth.ts', 'utf8')
  const context = readFileSync('app/api/author/context/route.ts', 'utf8')
  const stripeStart = readFileSync('app/api/author/stripe/connect/start/route.ts', 'utf8')

  assert.match(auth, /CredentialsProvider/)
  assert.match(auth, /AUTHOR_EMAIL_OTP_PROVIDER_ID/)
  assert.match(context, /getAuthorPortalContextFromContactId/)
  assert.match(context, /const contactId = durableUser\?\.authorContactId[\s\S]+const externalId = durableUser\?\.authorObjectId/)
  assert.match(gate, /Send Code/)
  assert.match(gate, /Activation or recovery/)
  assert.doesNotMatch(gate, /Sign in with your secure author account if it has already been activated/)
  assert.doesNotMatch(stripeStart, /x-author-access-code|validateAuthorPortalAccessCode|requireAuthorAccess/)
  assert.match(stripeStart, /resolveAuthorConnectStartContext/)
  assert.match(stripeStart, /resolveGovernedAuthorConnectIdentity/)
})
