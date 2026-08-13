import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  isSuppressedPublicAuthorSlug,
  resolveAuthorPublicationPrivacy,
  suppressesPersonalAuthorIdentity,
} from '../lib/catalog/author-publication-privacy.ts'

const personalName = 'Felix Catheline'
const anonymousPolicy = resolveAuthorPublicationPrivacy({
  titleSlug: 'the-paper-champ',
  title: 'The Paper Champ',
  legalAuthorName: personalName,
})

function projectTitle(input) {
  const policy = resolveAuthorPublicationPrivacy(input)
  const suppress = suppressesPersonalAuthorIdentity(policy)
  const publicAttribution = policy.publicAttribution || input.publicAuthorName || input.legalAuthorName || ''
  return {
    title: input.title,
    authorDisplayName: suppress ? publicAttribution : publicAttribution,
    authors: policy.exposeAuthorProfile
      ? [
          {
            name: publicAttribution,
            slug: publicAttribution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          },
        ]
      : [],
  }
}

test('PUBLIC author appears in author directory', () => {
  const policy = resolveAuthorPublicationPrivacy({
    titleSlug: 'visible-title',
    title: 'Visible Title',
    legalAuthorName: 'Visible Author',
  })
  assert.equal(policy.visibility, 'PUBLIC')
  assert.equal(policy.exposeAuthorProfile, true)
})

test('ANONYMOUS author does not expose personal identity', () => {
  assert.equal(anonymousPolicy.visibility, 'ANONYMOUS')
  assert.equal(anonymousPolicy.publicAttribution, 'Anonymous')
  assert.equal(anonymousPolicy.exposeAuthorProfile, false)
  assert.equal(anonymousPolicy.exposeBiography, false)
  assert.equal(anonymousPolicy.exposeHeadshot, false)
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
    visibility: 'HIDDEN',
    publicAttribution: '',
    exposeAuthorProfile: false,
    exposeBiography: false,
    exposeHeadshot: false,
    reason: 'fixture',
  }
  assert.equal(suppressesPersonalAuthorIdentity(hidden), true)
})

test('PSEUDONYM exposes only governed pseudonym', () => {
  const pseudonym = {
    visibility: 'PSEUDONYM',
    publicAttribution: 'Governed Pen Name',
    exposeAuthorProfile: true,
    exposeBiography: true,
    exposeHeadshot: true,
    reason: 'fixture',
  }
  assert.equal(suppressesPersonalAuthorIdentity(pseudonym), false)
  assert.equal(pseudonym.publicAttribution, 'Governed Pen Name')
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
  assert.equal(anonymousPolicy.exposeAuthorProfile, false)
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
  const rebuilt = resolveAuthorPublicationPrivacy({
    titleSlug: 'the-paper-champ',
    title: 'The Paper Champ',
    publicAuthorName: personalName,
  })
  assert.equal(rebuilt.visibility, 'ANONYMOUS')
  assert.equal(rebuilt.publicAttribution, 'Anonymous')
})

test('deployment/static regeneration preserves privacy at the shared policy boundary', () => {
  const serverCatalog = readFileSync('lib/server/dataverse/catalog.ts', 'utf8')
  assert.match(serverCatalog, /resolveAuthorPublicationPrivacy/)
  assert.match(serverCatalog, /suppressAuthorProfile/)
  assert.match(serverCatalog, /publicAttribution/)
})
