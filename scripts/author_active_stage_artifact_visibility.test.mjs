#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const contextSource = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const downloadSource = readFileSync('app/api/author/artifacts/[artifactId]/download/route.ts', 'utf8')

const expectations = [
  {
    name: 'author artifacts require an active author action',
    ok:
      contextSource.includes('authorActionEvidence.authorActionAvailable') &&
      contextSource.includes('getAuthorFacingEditorialArtifacts(config, {') &&
      contextSource.includes('const activeArtifacts = authorActionAvailable ? row.artifacts : []') &&
      contextSource.includes('authorAccessState: authorActionAvailable ?'),
  },
  {
    name: 'notification pending hides prepared package downloads',
    ok:
      contextSource.includes('function isPackageReadyNotificationPending') &&
      contextSource.includes("return 'Notification Pending'") &&
      contextSource.includes("authorAccessState: authorActionAvailable ? ('AVAILABLE' as const) : ('HIDDEN' as const)") &&
      contextSource.includes("authorGateState: authorActionAvailable ? ('OPEN' as const) : ('CLOSED' as const)"),
  },
  {
    name: 'artifact query is scoped to current active editorial stage',
    ok:
      contextSource.includes('_jm1pub_editorialstageid_value eq ${activeStageId}') &&
      contextSource.includes('jm1pub_iscurrentapproved eq true'),
  },
  {
    name: 'historical or superseded artifacts are suppressed',
    ok:
      contextSource.includes('stringValue(row.jm1pub_supersededon)') &&
      downloadSource.includes('!stringValue(artifact.jm1pub_supersededon)'),
  },
  {
    name: 'download endpoint requires artifact to be visible in current author context',
    ok:
      downloadSource.includes('visibleArtifact') &&
      downloadSource.includes('context.projects') &&
      downloadSource.includes('!visibleArtifact'),
  },
  {
    name: 'download endpoint returns stable attachment headers',
    ok:
      downloadSource.includes('Content-Disposition') &&
      downloadSource.includes('filename*=UTF-8') &&
      downloadSource.includes('X-Content-Type-Options') &&
      downloadSource.includes('Content-Length'),
  },
  {
    name: 'copyediting artifacts get author-safe labels',
    ok:
      contextSource.includes('Copyedited Manuscript') &&
      contextSource.includes('Copyedit Package'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
