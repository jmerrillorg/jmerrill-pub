#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const server = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const cap010 = readFileSync('scripts/cap010_operational_refresh.mjs', 'utf8')

const runtimeCombined = `${server}\n${client}\n${cap010}`

const forbidden = [
  'CAPACITY BLOCKED',
  'CAPACITY WATCH',
  'capacity guard passes',
  'Capacity warnings',
  'downstreamCapacityRisk',
  "downstreamCapacityWarnings",
  'Capacity {item.',
]

const expectations = [
  {
    name: 'workload model exposes advisory levels instead of binary capacity blocking',
    ok:
      server.includes("workloadLevel: 'available' | 'normal' | 'elevated' | 'high' | 'overdue-risk' | 'resource-attention'") &&
      server.includes('function deriveWorkloadLevel') &&
      client.includes('Workload advisories') &&
      client.includes('workloadLabel(item.workloadLevel)'),
  },
  {
    name: 'queue metadata is title scoped and supports multiple concurrent instances',
    ok:
      server.includes('queuePosition') &&
      server.includes('downstreamQueueSize') &&
      server.includes('countWorkloadByCapability') &&
      server.includes('activeInstancesByCapability') &&
      !server.includes('another active instance exists') &&
      !server.includes('single active instance'),
  },
  {
    name: 'author-review and release dependencies are named as approval dependencies, not capacity blockers',
    ok:
      server.includes('Proofreading awaits author approval') &&
      server.includes('Proofreading awaits author response') &&
      server.includes('Proofreading awaits publisher release decision') &&
      cap010.includes('Proofreading awaits governed author response'),
  },
  {
    name: 'forbidden false-capacity language is absent from runtime surfaces',
    ok: forbidden.every((needle) => !runtimeCombined.includes(needle)),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
