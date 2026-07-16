#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const auth = readFileSync('lib/server/author-durable-auth.ts', 'utf8')
const authorPortalPage = readFileSync('app/author/portal/page.tsx', 'utf8')
const publisherClient = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const signInStart = auth.indexOf('async signIn')
const jwtStart = auth.indexOf('async jwt')
const signInBody = auth.slice(signInStart, jwtStart)
const jwtBody = auth.slice(jwtStart)

const expectations = [
  {
    name: 'publisher identity is evaluated before author identity in sign-in',
    ok:
      signInBody.indexOf('const publisherIdentity = getAuthorizedPublisherIdentity') >= 0 &&
      signInBody.indexOf('const publisherIdentity = getAuthorizedPublisherIdentity') <
        signInBody.indexOf('await resolveAuthorizedAuthorEmail'),
  },
  {
    name: 'jwt assigns publisher role regardless of provider path',
    ok:
      jwtBody.includes("token.role = 'publisher'") &&
      jwtBody.indexOf('const publisherIdentity = getAuthorizedPublisherIdentity') <
        jwtBody.indexOf("if (account?.provider === PUBLISHER_OPERATING_CENTER_PROVIDER_ID)"),
  },
  {
    name: 'author portal redirects publisher sessions by default',
    ok:
      authorPortalPage.includes('getPublisherOperatingCenterSession') &&
      authorPortalPage.includes("redirect('/publisher/operating-center')"),
  },
  {
    name: 'publisher can deliberately switch to author view',
    ok:
      authorPortalPage.includes("searchParams?.view !== 'author'") &&
      publisherClient.includes('href="/author/portal?view=author"') &&
      publisherClient.includes('Switch to Author View'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
