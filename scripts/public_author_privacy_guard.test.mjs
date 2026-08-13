import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  isSuppressedPublicAuthorSlug,
  resolvePublicAuthorIdentity,
  suppressesPersonalAuthorIdentity,
} from '../lib/catalog/public-author-identity.ts'

const personalName = 'Felix Catheline'
const anonymousIdentity = resolvePublicAuthorIdentity({
  titleSlug: 'the-paper-champ',
  title: 'The Paper Champ',
  legalAuthorName: personalName,
})

function projectTitle(input) {
  const identity = resolvePublicAuthorIdentity(input)
  const publicAttribution = identity.publicAuthorName
  return {
    title: input.title,
    authorDisplayName: publicAttribution,
    authors: identity.exposeAuthorProfile
      ? [
          {
            name: publicAttribution,
            slug: identity.publicSlug,
          },
        ]
      : [],
  }
}

function projectPublicDirectory(titles) {
  const bySlug = new Map()
  for (const title of titles) {
    for (const author of title.authors) {
      if (!author.name || !author.slug) continue
      bySlug.set(author.slug, author.name)
    }
  }
  return Array.from(bySlug, ([slug, name]) => ({ slug, name }))
}

test('PUBLIC author without pen name uses governed public name', () => {
  const identity = resolvePublicAuthorIdentity({
    titleSlug: 'visible-title',
    title: 'Visible Title',
    legalAuthorName: 'Visible Author',
    governedPublicAuthorName: 'Visible Author',
  })
  assert.equal(identity.mode, 'PUBLIC')
  assert.equal(identity.publicAuthorName, 'Visible Author')
  assert.equal(identity.exposeAuthorProfile, true)
})

test('ANONYMOUS author does not expose personal identity', () => {
  assert.equal(anonymousIdentity.mode, 'ANONYMOUS')
  assert.equal(anonymousIdentity.publicAuthorName, 'Anonymous')
  assert.equal(anonymousIdentity.exposeAuthorProfile, false)
  assert.equal(anonymousIdentity.exposeBiography, false)
  assert.equal(anonymousIdentity.exposeHeadshot, false)
})

test('anonymous title remains publicly discoverable where appropriate', () => {
  const title = projectTitle({
    titleSlug: 'the-paper-champ',
    title: 'The Paper Champ',
    legalAuthorName: personalName,
  })
  assert.equal(title.title, 'The Paper Champ')
})

test('anonymous title uses governed anonymous attribution', () => {
  const title = projectTitle({
    titleSlug: 'the-paper-champ',
    title: 'The Paper Champ',
    legalAuthorName: personalName,
  })
  assert.equal(title.authorDisplayName, 'Anonymous')
  assert.notEqual(title.authorDisplayName, personalName)
})

test('HIDDEN author does not appear publicly under shared suppression semantics', () => {
  const hidden = {
    mode: 'HIDDEN',
    publicAttribution: '',
    publicAuthorName: '',
    publicSlug: '',
    exposeAuthorProfile: false,
    exposeBiography: false,
    exposeHeadshot: false,
    reason: 'fixture',
  }
  assert.equal(suppressesPersonalAuthorIdentity(hidden), true)
  const resolved = resolvePublicAuthorIdentity({
    title: 'Hidden Title',
    legalAuthorName: 'Private Legal Name',
    hiddenPublication: true,
  })
  assert.equal(resolved.mode, 'HIDDEN')
  assert.equal(resolved.publicAuthorName, '')
  assert.equal(resolved.exposeAuthorProfile, false)
})

test('PEN_NAME exposes only governed pen name', () => {
  const identity = resolvePublicAuthorIdentity({
    title: 'Pen Name Title',
    legalAuthorName: 'John Smith',
    authorPenName: 'J. Alexander',
  })
  assert.equal(suppressesPersonalAuthorIdentity(identity), false)
  assert.equal(identity.mode, 'PEN_NAME')
  assert.equal(identity.publicAuthorName, 'J. Alexander')
  assert.equal(identity.publicSlug, 'j-alexander')
  assert.equal(JSON.stringify(projectTitle({
    title: 'Pen Name Title',
    legalAuthorName: 'John Smith',
    authorPenName: 'J. Alexander',
  })).includes('John Smith'), false)
})

test('title-specific pen name overrides author-level public name', () => {
  const identity = resolvePublicAuthorIdentity({
    title: 'Specific Pen Title',
    legalAuthorName: 'Jane Legal',
    governedPublicAuthorName: 'Jane Public',
    authorPenName: 'Jane House Name',
    titleRelationshipPenName: 'J. Specific',
  })
  assert.equal(identity.mode, 'PEN_NAME')
  assert.equal(identity.publicAuthorName, 'J. Specific')
})

test('author-level pen name is used when no title override exists', () => {
  const identity = resolvePublicAuthorIdentity({
    title: 'Author Pen Title',
    legalAuthorName: 'Jane Legal',
    governedPublicAuthorName: 'Jane Public',
    authorPenName: 'Jane House Name',
  })
  assert.equal(identity.mode, 'PEN_NAME')
  assert.equal(identity.publicAuthorName, 'Jane House Name')
})

test('public API/read model does not leak internal legal name', () => {
  const title = projectTitle({
    titleSlug: 'the-paper-champ',
    title: 'The Paper Champ',
    legalAuthorName: personalName,
  })
  assert.equal(JSON.stringify(title).includes(personalName), false)
})

test('JSON-LD and metadata source paths use display attribution instead of legal identity', () => {
  const bookPage = readFileSync('app/books/[id]/page.tsx', 'utf8')
  assert.match(bookPage, /catalogAuthorDisplayName\(book\)/)
  assert.doesNotMatch(bookPage, /jm1pub_authorname/)
})

test('sitemap does not expose suppressed author profile', () => {
  assert.equal(anonymousIdentity.exposeAuthorProfile, false)
  assert.equal(projectTitle({ titleSlug: 'the-paper-champ', title: 'The Paper Champ', legalAuthorName: personalName }).authors.length, 0)
})

test('direct anonymous-author profile does not reveal identity', () => {
  const authorPage = readFileSync('app/authors/[slug]/page.tsx', 'utf8')
  const middleware = readFileSync('middleware.ts', 'utf8')
  assert.equal(isSuppressedPublicAuthorSlug('felix-catheline'), true)
  assert.equal(isSuppressedPublicAuthorSlug('visible-author'), false)
  assert.match(authorPage, /isSuppressedPublicAuthorSlug/)
  assert.match(authorPage, /redirect\('\/authors'\)/)
  assert.match(middleware, /isSuppressedPublicAuthorSlug/)
  assert.doesNotMatch(authorPage, /Felix Catheline/)
})

test('catalog rebuild preserves privacy from title slug alone', () => {
  const rebuilt = resolvePublicAuthorIdentity({
    titleSlug: 'the-paper-champ',
    title: 'The Paper Champ',
    publicAuthorName: personalName,
  })
  assert.equal(rebuilt.mode, 'ANONYMOUS')
  assert.equal(rebuilt.publicAuthorName, 'Anonymous')
})

test('deployment/static regeneration preserves privacy at the shared policy boundary', () => {
  const serverCatalog = readFileSync('lib/server/dataverse/catalog.ts', 'utf8')
  assert.match(serverCatalog, /resolvePublicAuthorIdentity/)
  assert.match(serverCatalog, /suppressAuthorProfile/)
  assert.match(serverCatalog, /publicAttribution/)
})

test('public API/read model returns resolved public identity for pen name author', () => {
  const projected = projectTitle({
    title: 'Pen Name API Title',
    legalAuthorName: 'John Smith',
    titleRelationshipPenName: 'J. Alexander',
  })
  assert.equal(projected.authorDisplayName, 'J. Alexander')
  assert.equal(JSON.stringify(projected).includes('John Smith'), false)
})

test('JSON-LD and metadata can use pen name through catalog display name', () => {
  const bookPage = readFileSync('app/books/[id]/page.tsx', 'utf8')
  assert.match(bookPage, /catalogAuthorDisplayName\(book\)/)
  assert.match(bookPage, /ContributorByline/)
})

test('marketing output uses resolved public identity source', () => {
  const displaySource = readFileSync('lib/catalog/display.ts', 'utf8')
  assert.match(displaySource, /title\.authorDisplayName/)
  assert.doesNotMatch(displaySource, /legalAuthorName/)
})

test('author directory uses pen name and avoids duplicate legal-name entry', () => {
  const penTitle = projectTitle({
    title: 'Directory Pen Title',
    legalAuthorName: 'John Smith',
    titleRelationshipPenName: 'J. Alexander',
  })
  const entries = projectPublicDirectory([penTitle])
  assert.deepEqual(entries, [{ slug: 'j-alexander', name: 'J. Alexander' }])
  assert.equal(entries.some((entry) => entry.name === 'John Smith' || entry.slug === 'john-smith'), false)
})

test('legal/internal records remain intact outside public projection', () => {
  const legalRecord = { legalAuthorName: 'John Smith', contractRelationship: true, royaltyRelationship: true }
  const publicTitle = projectTitle({
    title: 'Internal Preserved Title',
    legalAuthorName: legalRecord.legalAuthorName,
    titleRelationshipPenName: 'J. Alexander',
  })
  assert.equal(legalRecord.legalAuthorName, 'John Smith')
  assert.equal(legalRecord.contractRelationship, true)
  assert.equal(legalRecord.royaltyRelationship, true)
  assert.equal(JSON.stringify(publicTitle).includes('John Smith'), false)
})
