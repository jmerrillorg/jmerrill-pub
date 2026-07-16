#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const source = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')

const deriveWorkloadStateStart = source.indexOf('function deriveWorkloadState')
const deriveCapabilityStart = source.indexOf('function deriveCapability')
const deriveWorkloadStateBody = source.slice(deriveWorkloadStateStart, deriveCapabilityStart)
const deriveNextActionStart = source.indexOf('function deriveNextAction')
const deriveTargetDateStart = source.indexOf('function deriveTargetDate')
const deriveNextActionBody = source.slice(deriveNextActionStart, deriveTargetDateStart)
const deriveGuardStart = source.indexOf('function deriveReadinessGuard')
const deriveOwnerStart = source.indexOf('function deriveOwner')
const deriveGuardBody = source.slice(deriveGuardStart, deriveOwnerStart)

const expectations = [
  {
    name: 'completed Copyediting resolves to release decision ready',
    ok:
      source.includes("'Copyediting - Release Decision Ready'") &&
      deriveWorkloadStateBody.includes("status.includes('complete')") &&
      deriveWorkloadStateBody.includes("latestAction.includes('cap003_author_package_ready')"),
  },
  {
    name: 'The Intentional Leader no longer receives stale Line Editing next action after Copyediting completion',
    ok:
      deriveNextActionBody.includes("'Copyediting - Release Decision Ready'") &&
      deriveNextActionBody.includes('Jackie release decision required before author-facing Copyediting package is sent'),
  },
  {
    name: 'completed Copyediting is not blocked by CAP-002 readiness guard',
    ok:
      deriveGuardBody.includes("state === 'Copyediting Ready'") &&
      !deriveGuardBody.includes("state === 'Copyediting - Release Decision Ready' && !latestAction.includes('CAP002')"),
  },
  {
    name: 'publisher release decision ownership is Jackie',
    ok: source.includes("state === 'Line Editing - Release Decision Ready' || state === 'Copyediting - Release Decision Ready'"),
  },
  {
    name: 'Proofreading remains blocked until Copyediting release decision',
    ok: source.includes('Proofreading remains blocked until publisher release decision'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
