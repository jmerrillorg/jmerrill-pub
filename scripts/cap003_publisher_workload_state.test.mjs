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
    name: 'released Copyediting package resolves to author review before release-ready fallback',
    ok:
      source.includes("'Copyediting - Author Review'") &&
      deriveWorkloadStateBody.indexOf("return 'Copyediting - Author Review'") > -1 &&
      deriveWorkloadStateBody.indexOf("return 'Copyediting - Author Review'") <
        deriveWorkloadStateBody.indexOf("return 'Copyediting - Release Decision Ready'") &&
      deriveWorkloadStateBody.includes("latestAction.includes('cap003_author_package_delivered')") &&
      deriveWorkloadStateBody.includes("latestAction.includes('cap003_author_review_opened')"),
  },
  {
    name: 'The Intentional Leader no longer receives stale Line Editing next action after Copyediting release',
    ok:
      deriveNextActionBody.includes("'Copyediting - Release Decision Ready'") &&
      deriveNextActionBody.includes("'Copyediting - Author Review'") &&
      deriveNextActionBody.includes('Await author response; Proofreading awaits author approval'),
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
    name: 'released Copyediting package ownership shifts to Author',
    ok:
      source.includes("if (state.includes('Author Review')) return 'Author'") &&
      source.includes("if (state === 'Copyediting - Author Review') return 'Await author response'"),
  },
  {
    name: 'Proofreading waits on Copyediting author response without capacity blockade language',
    ok:
      source.includes('Proofreading awaits publisher release decision') &&
      source.includes('Proofreading awaits author response') &&
      !deriveNextActionBody.includes('capacity guard passes'),
  },
  {
    name: 'approved Copyediting exit can move to Proofreading Ready before Proofreading begins',
    ok:
      deriveNextActionBody.includes("'Proofreading Ready'") &&
      deriveNextActionBody.includes('Begin CAP-004 Proofreading when authorized') &&
      source.includes('Prepare/start CAP-004 Proofreading when authorized') &&
      source.includes('Copyediting exit is complete') &&
      !deriveNextActionBody.includes("!['Line Editing - Author Review', 'Copyediting - Release Decision Ready', 'Copyediting - Author Review'].includes(state)"),
  },
  {
    name: 'active Proofreading stage renders as in-progress work rather than stale ready state',
    ok:
      deriveWorkloadStateBody.includes("return 'Proofreading In Progress'") &&
      deriveNextActionBody.includes("'Proofreading In Progress'") &&
      deriveNextActionBody.includes('Continue Proofreading pass and internal QA') &&
      source.includes("if (state === 'Proofreading In Progress') return 'Continue Proofreading pass and internal QA'") &&
      source.includes("if (state === 'Proofreading In Progress') return 'Not yet released'") &&
      source.includes("if (state === 'Proofreading In Progress') return 'No restart required; Proofreading is underway'"),
  },
  {
    name: 'delivered Proofreading plan resolves to author review ownership',
    ok:
      source.includes("`${dataverseFormatted(editorialStage, 'jm1pub_stagetype')} ${stringValue(editorialStage.jm1pub_name)}`") &&
      source.includes("`${dataverseFormatted(latestStage || {}, 'jm1pub_stagetype')} ${stringValue(latestStage?.jm1pub_name)}`") &&
      deriveWorkloadStateBody.includes("status.includes('plan delivered')") &&
      deriveWorkloadStateBody.includes("latestAction.includes('proofreading_author_package_released')") &&
      deriveNextActionBody.includes("'Proofreading - Author Review'") &&
      deriveNextActionBody.includes('Await author Proofreading response') &&
      source.includes("if (workloadState === 'Proofreading - Author Review') return 'Author Proofreading response pending'") &&
      source.includes("if (state.includes('Author Review')) return 'Author'"),
  },
  {
    name: 'Publisher Operating Center exposes author response queue and recovery actions',
    ok:
      source.includes('export type PublisherAuthorResponseQueueItem') &&
      source.includes('buildAuthorResponseQueue') &&
      source.includes('AUTHOR_RESPONSE_RECONCILE_REQUESTED') &&
      source.includes('AUTHOR_RESPONSE_FAILED_TRANSITION_RETRY_REQUESTED') &&
      source.includes('STALE — SLA BREACH'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
