import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { createJiti } from 'jiti'
import { zipSync, strToU8 } from 'fflate'
import { NextRequest } from 'next/server.js'

const jiti = createJiti(import.meta.url, { alias: { '@': new URL('..', import.meta.url).pathname } })
const { POST } = await jiti.import('../app/api/publishing/intake/route.ts')
const { intakeRecordId, intakeFingerprint, readReceiptNotes } = await jiti.import('../lib/publishing/intake/receipt.ts')
const harmlessDocx = zipSync({
  '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
  '_rels/.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
  'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Internal synthetic fixture only. ${'Test '.repeat(39000)}</w:t></w:r></w:p></w:body></w:document>`),
}, { level: 0 })

const fixture = (key) => ({
  firstName: 'Internal', lastName: 'Fixture', email: 'fixture@example.invalid',
  streetAddress: '1 Test Street', city: 'Test', stateProvince: 'VA', postalCode: '20000', country: 'United States',
  bookTitle: 'Synthetic receipt fixture', genre: 'Test', wordCount: 1000,
  workType: 'Full-length Book', manuscriptStatus: 'Complete', manuscriptSubmissionChoice: 'now',
  publishedBefore: 'First book', bookDescription: 'Harmless internal fixture for verifying intake receipt and recovery behavior.',
  consent: true, rightsAttestation: true, serviceCommunicationConsent: true, marketingConsent: false,
  turnstileToken: 'synthetic-token', idempotencyKey: key,
})

async function exercise(mode, action) {
  const originalFetch = globalThis.fetch
  const originalEnv = { ...process.env }
  Object.assign(process.env, {
    NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'synthetic-only',
    PUBLISHER_RUNTIME_AUTH_MODE: 'MANAGED_IDENTITY', IDENTITY_ENDPOINT: 'https://identity.invalid/token', IDENTITY_HEADER: 'synthetic-only',
    DATAVERSE_RESOURCE_URL: 'https://fixture.crm.invalid', DATAVERSE_ENVIRONMENT_URL: 'https://fixture.crm.invalid',
    DATAVERSE_WEB_API_BASE_URL: 'https://fixture.crm.invalid/api/data/v9.2',
    JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL: 'https://relay.invalid', JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY: 'synthetic-only',
  })
  process.env.AZURE_STORAGE_CONNECTION_STRING = `DefaultEndpointsProtocol=https;AccountName=fixturequeue;AccountKey=${Buffer.from('synthetic-only').toString('base64')};EndpointSuffix=core.windows.net`
  process.env.INTAKE_DEADLETTER_QUEUE_NAME = 'fixture-recovery'
  const state = { rows: new Map(), calls: [], creates: 0, uploads: 0, acknowledgments: 0, notifications: 0, recovery: [] }
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input)
    const method = options.method || 'GET'
    state.calls.push({ url, method })
    assert.ok(options.signal, `Dependency call must have a deadline: ${url}`)
    if (url.includes('siteverify')) return Response.json({ success: true })
    if (url.startsWith('https://fixturequeue.queue.core.windows.net/')) {
      const encoded = /<MessageText>(.*?)<\/MessageText>/.exec(options.body)?.[1]
      const receipt = JSON.parse(Buffer.from(encoded, 'base64').toString())
      assert.equal(receipt.schema, 'JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1')
      assert.doesNotMatch(JSON.stringify(receipt), /fixture@example|Test Street|Harmless\.docx|Synthetic receipt fixture/)
      state.recovery.push(receipt)
      return new Response(null, { status: 201 })
    }
    if (url.startsWith('https://identity.invalid/')) return Response.json({ access_token: 'synthetic-only' })
    if (url.startsWith('https://fixture.crm.invalid/')) {
      if (method === 'GET') {
        if (mode === 'malformed-readback') return Response.json({ unexpected: true })
        if (mode === 'conflicting-readback') return Response.json({ value: [{ jm1_intakereferencecode: 'A' }, { jm1_intakereferencecode: 'B' }] })
        return Response.json({ value: [...state.rows.values()] })
      }
      if (method === 'POST') {
        state.creates++
        if (mode === 'denied') return Response.json({ error: { code: '0x80040220', message: 'Missing Create privilege' } }, { status: 403 })
        const row = JSON.parse(options.body)
        assert.equal(row.jm1_acknowledgmentstatus, 835500002, 'Legacy acknowledgment flow must remain held before finalization')
        assert.equal(row.jm1_stage0handoffstatus, 835500003, 'Receipt must not enqueue the legacy diagnostic handoff')
        if (state.rows.has(row.jm1_publishingintakeid)) return Response.json({ error: {} }, { status: 409 })
        state.rows.set(row.jm1_publishingintakeid, row)
        if (mode === 'ambiguous-create' && state.creates === 1) throw new DOMException('Synthetic timeout', 'TimeoutError')
        return new Response(null, { status: 204 })
      }
      if (method === 'PATCH') {
        const row = [...state.rows.values()][0]
        const body = JSON.parse(options.body)
        if (mode === 'finalize-failure' && body.jm1_additionalnotes) return new Response(null, { status: 503 })
        Object.assign(row, body)
        return new Response(null, { status: 204 })
      }
    }
    if (url.startsWith('https://graph.microsoft.com/')) {
      assert.equal(state.rows.size, 1, 'No upload or workspace may precede durable reservation')
      if (mode === 'dependency-failure') throw new DOMException('Synthetic timeout', 'TimeoutError')
      if (url.includes('/drives?')) return Response.json({ value: [{ id: 'fixture-drive', name: 'Documents' }] })
      if (url.endsWith('/drives')) return Response.json({ value: [{ id: 'fixture-drive', name: 'Documents' }] })
      if (method === 'PUT') {
        state.uploads++
        if (mode === 'upload-failure') return new Response(null, { status: 503 })
        if (url.includes('.source.bin')) {
          assert.deepEqual(new Uint8Array(options.body), harmlessDocx)
        }
        if (url.includes('source-artifact-manifest.json')) {
          const manifest = JSON.parse(new TextDecoder().decode(options.body))
          assert.equal(manifest.sourceArtifact.immutable, false)
          assert.equal(manifest.sourceArtifact.originalBytes.immutable, true)
          assert.equal(manifest.sourceArtifact.originalBytes.sizeBytes, harmlessDocx.length)
        }
      }
      return Response.json({ id: 'fixture-item', name: 'Fixture', webUrl: 'https://jmerrillfoundation.sharepoint.com/sites/publishing/fixture' })
    }
    if (url.startsWith('https://relay.invalid/')) {
      if (url.endsWith('send-author-acknowledgment')) {
        assert.equal(JSON.parse(options.body).to, 'fixture@example.invalid')
        state.acknowledgments++
        return Response.json({ communicationComplete: true, providerMessageId: 'synthetic-receipt' }, { status: 202 })
      }
      if (url.endsWith('send-join-internal-notification')) {
        state.notifications++
        const body = JSON.parse(options.body)
        assert.equal(body.recipient, 'publishing@jmerrill.one')
        assert.match(body.nextAction, /Jackie Smith, Jr./)
        return new Response(null, { status: mode === 'notification-failure' ? 503 : 202 })
      }
    }
    throw new Error(`Unexpected external effect: ${method} ${url}`)
  }
  const key = randomUUID()
  const submit = async (changes = {}) => {
    const form = new FormData()
    for (const [field, value] of Object.entries({ ...fixture(key), ...changes })) form.append(field, String(value))
    form.append('manuscriptFile', new Blob([harmlessDocx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'Harmless.docx')
    const response = await POST(new NextRequest('https://jmerrill.pub/api/publishing/intake', {
      method: 'POST', headers: { origin: 'https://jmerrill.pub', 'x-forwarded-for': randomUUID() }, body: form,
    }))
    return { status: response.status, body: await response.json() }
  }
  try { await action({ state, submit }) } finally {
    globalThis.fetch = originalFetch
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
    Object.assign(process.env, originalEnv)
  }
}

test('receipt keys and payload fingerprints survive restart; altered content is distinct', () => {
  const key = randomUUID()
  assert.equal(intakeRecordId(key), intakeRecordId(key))
  assert.match(intakeRecordId(key), /^[a-f0-9-]{36}$/)
  assert.equal(intakeFingerprint({ b: 2, a: 1, turnstileToken: 'old' }), intakeFingerprint({ a: 1, b: 2, turnstileToken: 'new' }))
  assert.notEqual(intakeFingerprint({ a: 1 }), intakeFingerprint({ a: 2 }))
})

test('original Create denial cannot leave an uploaded orphan or author message', () => exercise('denied', async ({ state, submit }) => {
  const result = await submit()
  assert.equal(result.status, 502)
  assert.equal(state.rows.size, 0)
  assert.equal(state.uploads, 0)
  assert.equal(state.acknowledgments, 0)
  assert.equal(state.recovery.length, 1)
  assert.equal(state.recovery[0].failedOperationType, 'DATAVERSE_INTAKE_CREATE')
}))

test('complete receipt and duplicate retry create one inquiry, upload and notification set', () => exercise('success', async ({ state, submit }) => {
  const first = await submit()
  assert.equal(first.status, 201, JSON.stringify(first.body))
  assert.equal(readReceiptNotes([...state.rows.values()][0].jm1_additionalnotes).accepted, true)
  const second = await submit({ turnstileToken: 'fresh-token' })
  assert.equal(second.status, 201)
  assert.equal(second.body.reference, first.body.reference)
  assert.equal(state.creates, 1)
  assert.equal(state.uploads, 3, 'Exact inert source bytes, one DOCX and one source manifest')
  assert.equal(state.notifications, 1)
  assert.equal(state.acknowledgments, 1)
  assert.equal([...state.rows.values()][0].jm1_stage0handoffstatus, 835500003)
  const conflict = await submit({ bookTitle: 'Changed fixture' })
  assert.equal(conflict.status, 409)
  assert.equal(state.creates, 1)
}))

for (const mode of ['upload-failure', 'dependency-failure', 'finalize-failure', 'ambiguous-create']) {
  test(`${mode} preserves pending custody and replay performs no extra effects`, () => exercise(mode, async ({ state, submit }) => {
    const first = await submit()
    assert.equal(first.status, 202, JSON.stringify(first.body))
    assert.equal(state.rows.size, 1)
    assert.equal(state.acknowledgments, 0)
    const count = state.uploads
    const second = await submit()
    assert.equal(second.status, 202)
    assert.equal(second.body.reference, first.body.reference)
    assert.equal(state.uploads, count)
  }))
}

test('notification dependency failure does not misreport an already accepted receipt', () => exercise('notification-failure', async ({ state, submit }) => {
  assert.equal((await submit()).status, 201)
  assert.equal(state.rows.size, 1)
  assert.equal(state.recovery[0].failedOperationType, 'PUBLISHING_NOTIFICATION')
}))

test('concurrent identical submissions cannot duplicate custody or author communication', () => exercise('success', async ({ state, submit }) => {
  const results = await Promise.all([submit(), submit()])
  assert.ok(results.every(result => result.status === 201 || result.status === 202))
  assert.equal(results[0].body.reference, results[1].body.reference)
  assert.equal(state.rows.size, 1)
  assert.equal(state.uploads, 3)
  assert.equal(state.acknowledgments, 1)
}))

for (const mode of ['malformed-readback', 'conflicting-readback']) {
  test(`${mode} cannot be mistaken for an absent inquiry`, () => exercise(mode, async ({ state, submit }) => {
    assert.equal((await submit()).status, 500)
    assert.equal(state.creates, 0)
    assert.equal(state.uploads, 0)
    assert.equal(state.acknowledgments, 0)
  }))
}
