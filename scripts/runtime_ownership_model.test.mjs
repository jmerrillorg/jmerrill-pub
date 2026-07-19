#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const server = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const inventory = JSON.parse(readFileSync('data/publisher-runtime-ownership/process-inventory.json', 'utf8'))
const report = readFileSync('docs/operations/generated/2026-07-19-JM1-Production-Runtime-Ownership-Audit.md', 'utf8')

const requiredModes = [
  'AUTOMATIC_EVENT_DRIVEN',
  'AUTOMATIC_SCHEDULED',
  'SYSTEM_ACTION_MANUALLY_TRIGGERED',
  'PUBLISHER_MANUAL',
  'CODY_ASSISTED_BRIDGE',
  'CODY_ENGINEERING_ONLY',
  'EXTERNAL_PARTY',
  'NOT_IMPLEMENTED',
]

const requiredStates = [
  'NOT_TRIGGERED',
  'QUEUED',
  'EXECUTING',
  'VALIDATING',
  'COMPLETED',
  'EXCEPTION',
  'WAITING_FOR_HUMAN',
  'WAITING_FOR_EXTERNAL_PARTY',
]

const activeTitles = new Map(inventory.activeTitleFindings.map((item) => [item.title, item]))
const processModes = new Set(inventory.processes.map((item) => item.primaryMode))

const expectations = [
  {
    name: 'Publisher read model exposes separate runtime ownership fields',
    ok:
      server.includes('export type PublisherExecutionMode') &&
      server.includes('export type PublisherExecutionState') &&
      server.includes('export type PublisherExecutionOwner') &&
      server.includes('businessOwner') &&
      server.includes('executionOwner') &&
      server.includes('executionMode') &&
      server.includes('executionState') &&
      server.includes('exactBlocker'),
  },
  {
    name: 'all approved execution modes and states are represented',
    ok:
      requiredModes.every((mode) => server.includes(`'${mode}'`) && processModes.has(mode)) &&
      requiredStates.every((state) => server.includes(`'${state}'`)),
  },
  {
    name: 'routine workload owner no longer defaults to Cody',
    ok:
      !server.includes("return 'Cody'") &&
      !server.includes("owner: 'Cody'") &&
      server.includes("return 'Publisher'") &&
      server.includes("'Cody Bridge'"),
  },
  {
    name: 'Publisher Today displays execution owner, runtime, awaiting party, and exact blocker',
    ok:
      client.includes('Execution Owner') &&
      client.includes('Execution State') &&
      client.includes('Runtime') &&
      client.includes('Awaiting') &&
      client.includes('Exact blocker') &&
      client.includes('executionOwnerLabel'),
  },
  {
    name: 'The Intentional Leader is author-owned at Proofreading Author Review, not Cody-owned',
    ok:
      activeTitles.get('The Intentional Leader')?.executionMode === 'EXTERNAL_PARTY' &&
      activeTitles.get('The Intentional Leader')?.executionState === 'WAITING_FOR_EXTERNAL_PARTY' &&
      activeTitles.get('The Intentional Leader')?.executionOwner === 'Author',
  },
  {
    name: 'parallel developmental and editorial titles are explicit Cody bridges',
    ok:
      activeTitles.get('Before You Were Born')?.executionOwner === 'Cody Bridge' &&
      activeTitles.get("The General's Will and Last Testament")?.executionOwner === 'Cody Bridge' &&
      activeTitles.get('The Long Watch')?.executionOwner === 'Cody Bridge' &&
      activeTitles.get('Before You Were Born')?.costCategory === 'Codex interactive/model',
  },
  {
    name: 'report preserves final boundary doctrine',
    ok:
      report.includes("Cody is the engineering, deployment, and exception-remediation executor, not JM1's default production runtime.") &&
      report.includes('Routine publishing work must execute through a verified governed runtime') &&
      report.includes('Cody-assisted bridge'),
  },
  {
    name: 'audit covers every required process family',
    ok:
      inventory.processes.length >= 20 &&
      [
        'Editorial Review',
        'Developmental Editing',
        'Line Editing',
        'Copyediting',
        'Proofreading',
        'Internal QA',
        'Package generation',
        'Package release',
        'Cover Creative Brief',
        'Cover Concept Development',
        'Interior Layout',
        'Production QA',
        'Distribution readiness',
        'Royalty ingestion',
        'Royalty normalization',
        'Royalty decision processing',
        'Royalty statement generation',
        'Publisher Today refresh',
        'Author Workspace refresh',
        'SharePoint stage synchronization',
      ].every((name) => inventory.processes.some((process) => process.name === name)),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
