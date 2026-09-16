import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const books = JSON.parse(await readFile(new URL('data/books.json', root), 'utf8'))
const titleAuthorOverridesSource = await readFile(new URL('data/title-author-overrides.ts', root), 'utf8')
const authorAliasesSource = await readFile(new URL('data/author-name-to-master-name.ts', root), 'utf8')
const catalogSource = await readFile(new URL('lib/server/dataverse/catalog.ts', root), 'utf8')
const authorRouteSource = await readFile(new URL('app/authors/[slug]/page.tsx', root), 'utf8')

const titleAuthorOverrides = objectLiteralFromSource(titleAuthorOverridesSource, 'titleAuthorOverrides')
const authorAliases = objectLiteralFromSource(authorAliasesSource, 'authorNameToMasterName')

const expectedAuthorRoutes = {
  'kimberly-reeder': {
    name: 'Kimberly Reeder',
    titles: ['girl-did-you-know'],
  },
  'alesia-corpening': {
    name: 'Alesia Corpening',
    titles: ['a-truebies-guide-part-2'],
  },
  'jackie-smith-jr': {
    name: 'Jackie Smith, Jr.',
    titles: [
      'department-of-the-air-force-mission-driven-leadership',
      'establishing-glory',
      'establishing-glory-2',
      'establishing-glory-3',
    ],
  },
  'will-harris': {
    name: 'Will Harris',
    titles: ['music-ministry-unplugged', 'taylor-made'],
  },
}

test('P0 public author route fallback is wired into the Dataverse catalog resolver', () => {
  assert.match(catalogSource, /mergeRepositoryAuthorSummaries\(buildAuthorSummaries\(contactRows, titles\)\)/)
  assert.match(catalogSource, /if \(!summary\) return resolveRepositoryPublicAuthorBySlug\(slug\)/)
  assert.match(catalogSource, /const authorTitles = mergeCatalogTitleSummaries\(/)
  assert.match(catalogSource, /export function resolveRepositoryPublicAuthorBySlug/)
})

test('public author route awaits dynamic params before resolving the slug', () => {
  assert.match(authorRouteSource, /type Props = \{ params: Promise<\{ slug: string \}> \}/)
  assert.match(authorRouteSource, /const \{ slug \} = await params/)
  assert.doesNotMatch(authorRouteSource, /params\.slug/)
})

test('known production author URLs resolve to governed repository catalog identities and titles', () => {
  const authors = buildRepositoryAuthors()

  for (const [slug, expected] of Object.entries(expectedAuthorRoutes)) {
    const author = authors.get(slug)
    assert.ok(author, `Expected ${slug} to resolve`)
    assert.equal(author.name, expected.name)
    assert.deepEqual(author.titles.sort(), expected.titles.sort())
  }
})

test('public author fallback does not leak titles across corrected governed author identities', () => {
  const authors = buildRepositoryAuthors()

  assert.equal(authors.get('alesia-corpening')?.titles.includes('aligned'), false)
  assert.equal(authors.get('alesia-corpening')?.titles.includes('connected'), false)
  assert.equal(authors.get('dennis-brown')?.titles.includes('aligned'), true)
  assert.equal(authors.get('dennis-brown')?.titles.includes('connected'), true)
})

function buildRepositoryAuthors() {
  const authors = new Map()

  for (const book of books) {
    const name = canonicalAuthorName(titleAuthorOverrides[book.id] || book.author)
    if (!name) continue
    const slug = slugify(name)
    const current = authors.get(slug) || { slug, name, titles: [] }
    current.titles.push(book.id)
    authors.set(slug, current)
  }

  return authors
}

function canonicalAuthorName(value) {
  const cleaned = String(value || '').trim()
  return authorAliases[cleaned] || cleaned
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function objectLiteralFromSource(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`)
  assert.notEqual(start, -1, `Missing ${exportName}`)
  const open = source.indexOf('{', start)
  let depth = 0
  let end = -1
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      end = index + 1
      break
    }
  }
  assert.notEqual(end, -1, `Could not parse ${exportName}`)
  return Function(`"use strict"; return (${source.slice(open, end)});`)()
}
