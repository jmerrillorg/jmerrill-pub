#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const route = readFileSync('app/api/author/marketing-profile/route.ts', 'utf8')
const workspace = readFileSync('app/author/_components/AuthorPortalWorkspace.tsx', 'utf8')

const expectations = [
  {
    name: 'route returns submitted status',
    ok: route.includes("status: 'submitted'"),
  },
  {
    name: 'route returns idempotent already-submitted status',
    ok: route.includes("status: 'already-submitted'") && route.includes('idempotent: true'),
  },
  {
    name: 'route returns saved-but-review-pending response when execution logging fails',
    ok: route.includes("status: 'submitted-review-pending'") && route.includes('{ status: 202 }'),
  },
  {
    name: 'route catches unexpected failures as structured JSON',
    ok: route.includes("status: 'server-error'") && route.includes('correlationId: correlationSeed'),
  },
  {
    name: 'client does not surface raw Failed to fetch',
    ok: workspace.includes("message === 'Failed to fetch'") && workspace.includes('We could not reach the publishing system.'),
  },
  {
    name: 'client sends credentials and blocks duplicate clicks while saving',
    ok: workspace.includes("credentials: 'same-origin'") && workspace.includes("if (marketingSaveState === 'saving') return"),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        failures: failures.map((failure) => failure.name),
      },
      null,
      2,
    ),
  )
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
