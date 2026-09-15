#!/usr/bin/env node

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import {
  COMPLETION_STATES,
  V1V2_AUTOMATION_CAPABILITY_REGISTRY,
  automationCapabilityGraph,
  summarizeAutomationCapabilities,
  wholeCanaryReadback,
} from '../lib/publishing/automation-capability-registry.mjs'

const REQUIRED_FIELDS = [
  'CapabilityId',
  'CapabilityName',
  'BusinessPurpose',
  'Trigger',
  'SourceSystem',
  'EventType',
  'Handler',
  'V2Authority',
  'LifecycleEffect',
  'CommunicationEffect',
  'ExternalEffect',
  'IdempotencyKey',
  'FailureRoute',
  'NotificationPolicy',
  'ProductionStatus',
  'Owner',
  'EvidenceReference',
  'SupersededV1Implementation',
  'RootCauseClassification',
]

const REQUIRED_P0_IDS = [
  'P0-AGREEMENT-COMPLETION-DETECTION',
  'P0-SIGNED-AGREEMENT-ARTIFACT-INGESTION',
  'P0-ADOBE-AUDIT-EVIDENCE',
  'P0-STAGE-05-RECOMPUTATION',
  'P0-PAYMENT-ELECTION-TRIGGER',
  'P0-PAYMENT-ELECTION-COMMUNICATION',
  'P0-PAYMENT-ELECTION-CAPTURE',
  'P0-PAYMENT-SCHEDULE-GENERATION',
  'P0-PAYMENT-REQUEST-ORCHESTRATION',
  'P0-PAYMENT-STATE-INGESTION',
  'P0-AUTHOR-EMAIL-INGESTION',
  'P0-PROVIDER-EMAIL-INGESTION',
  'P0-DETERMINISTIC-LIFECYCLE-ADVANCEMENT',
  'P0-AUTOMATION-EXCEPTION-VISIBILITY',
  'P0-FOUNDER-DECISION-ROUTING',
]

test('V1/V2 automation registry covers every required P0 capability with no unknown dispositions', () => {
  const ids = new Set(V1V2_AUTOMATION_CAPABILITY_REGISTRY.map((row) => row.CapabilityId))
  for (const id of REQUIRED_P0_IDS) assert.ok(ids.has(id), `${id} missing`)

  for (const row of V1V2_AUTOMATION_CAPABILITY_REGISTRY) {
    for (const field of REQUIRED_FIELDS) {
      const value = row[field]
      assert.ok(Array.isArray(value) ? value.length > 0 : String(value || '').trim(), `${row.CapabilityId} missing ${field}`)
    }
    assert.ok(COMPLETION_STATES.includes(row.ProductionStatus), `${row.CapabilityId} has invalid disposition`)
  }

  const summary = summarizeAutomationCapabilities()
  assert.equal(summary.UnknownCapabilityDispositions, 0)
  assert.equal(summary.P1UnownedMissingMigrations, 0)
})

test('Whole canary remains blocked at payment election and never creates payment request before author selection', () => {
  const canary = wholeCanaryReadback()
  assert.equal(canary.CurrentState, 'AGREEMENT_EXECUTED_PAYMENT_OPTION_PENDING')
  assert.equal(canary.PaymentElection, 'PENDING_AUTHOR_SELECTION')
  assert.equal(canary.PaymentRequestCreated, 'NO')
  assert.equal(canary.FirstBreak, 'PAYMENT_ELECTION_TRIGGER_NOT_DURABLY_BOUND_AFTER_AGREEMENT_COMPLETION')
})

test('automation graph preserves durable source to notification chain', () => {
  assert.deepEqual(automationCapabilityGraph(), [
    'EVENT_SOURCE',
    'EVENT_INGESTION',
    'CORRELATION',
    'AUTHORITY_VALIDATION',
    'EVENT_LEDGER',
    'STATE_GATE_RECOMPUTATION',
    'ACTION_REQUEST_OR_DECISION_REQUEST',
    'COMMUNICATION_OR_EXTERNAL_ACTION',
    'EVIDENCE',
    'OPERATING_CENTER_PROJECTION',
    'NOTIFICATION',
  ])
})

test('Publisher Operating Center exposes automation health as read-only registry projection', () => {
  const source = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
  assert.match(source, /summarizeAutomationCapabilities/)
  assert.match(source, /automationHealth/)
  assert.match(source, /WholeCanary/)
  assert.doesNotMatch(source, /dataversePatch\(.*automationHealth/s)
})
