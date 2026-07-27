import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyFailures, expectedForRoute, normalizeBaseUrl, summarize } from './production_health_gate.mjs'

test('health gate route expectations match JM1-INFRA-005', () => {
  assert.equal(expectedForRoute('/'), 200)
  assert.equal(expectedForRoute('/books'), 200)
  assert.equal(expectedForRoute('/authors'), 200)
  assert.equal(expectedForRoute('/author'), 200)
  assert.equal(expectedForRoute('/author/portal'), 200)
  assert.equal(expectedForRoute('/author/financial-setup'), 200)
  assert.equal(expectedForRoute('/api/author/context'), 401)
})

test('base URL must be https', () => {
  assert.equal(normalizeBaseUrl('https://jmerrill.pub/'), 'https://jmerrill.pub')
  assert.throws(() => normalizeBaseUrl('http://jmerrill.pub'), /https base URL/)
})

test('server function failures are classified separately from static pages', () => {
  const classification = classifyFailures([
    { ok: true, route: '/', surface: 'public_page', status: 200 },
    { ok: false, route: '/api/author/context', surface: 'protected_server_function', status: 500 },
  ])

  assert.equal(classification, 'Server Function Failure')
})

test('repeated timeout or network failures classify as platform availability', () => {
  const classification = classifyFailures([
    { ok: false, route: '/', surface: 'public_page', status: null, failureType: 'timeout' },
    { ok: false, route: '/books', surface: 'public_page', status: null, failureType: 'network_error' },
    { ok: true, route: '/api/author/context', surface: 'protected_server_function', status: 401 },
  ])

  assert.equal(classification, 'Platform Availability')
})

test('summary passes only when every probe matches expected behavior', () => {
  assert.deepEqual(
    summarize([
      { ok: true, latencyMs: 100 },
      { ok: true, latencyMs: 250 },
    ]),
    {
      result: 'PASS',
      totalProbes: 2,
      failedProbes: 0,
      maxLatencyMs: 250,
      classification: null,
    },
  )

  assert.equal(
    summarize([
      { ok: true, latencyMs: 100 },
      { ok: false, latencyMs: 50, route: '/', surface: 'public_page', status: 503 },
    ]).result,
    'FAIL',
  )
})
