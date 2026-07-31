#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const auth = readFileSync('lib/server/author-durable-auth.ts', 'utf8')

const expectations = [
  {
    name: 'CIAM array email claims are collected',
    ok:
      auth.includes("...getProfileStringValues(profile, 'emails')") &&
      auth.includes("...getProfileStringValues(profile, 'otherMails')"),
  },
  {
    name: 'alternate Dataverse email fields are authorized',
    ok:
      auth.includes('emailaddress2 eq') &&
      auth.includes('emailaddress3 eq') &&
      auth.includes('adx_identity_username eq'),
  },
  {
    name: 'immutable External ID object candidates are evaluated',
    ok:
      auth.includes('collectIdentityObjectIdCandidates') &&
      auth.includes('getAuthorizedAuthorEmailByObjectId') &&
      auth.includes('externaluseridentifier eq'),
  },
  {
    name: 'object-id authorization remains Dataverse-backed',
    ok:
      auth.indexOf('const objectIds = collectIdentityObjectIdCandidates') >
        auth.indexOf('const candidates = collectIdentityEmailCandidates') &&
      auth.indexOf('for (const objectId of objectIds)') <
        auth.indexOf('for (const candidate of candidates)') &&
      auth.includes("dataverseFirst(config, 'contacts'"),
  },
  {
    name: 'durable author sessions expose External ID object binding',
    ok:
      auth.includes('token.authorObjectId') &&
      auth.includes('session.user as { authorObjectId?: string }'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
