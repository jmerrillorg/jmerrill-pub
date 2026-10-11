import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { hagherBacklistContent, hagherAuthor, getHagherBacklistContent } from '../data/hagher-backlist-content.ts'

test('exact governed title IDs, ISBNs, dates and private-source provenance are bound', () => {
  for (const [slug, entry] of Object.entries(hagherBacklistContent)) {
    assert.equal(getHagherBacklistContent(slug, entry.titleId), entry)
    assert.equal(getHagherBacklistContent(slug, slug), entry)
    assert.equal(getHagherBacklistContent(slug, 'unrelated-title'), undefined)
    assert.ok(entry.metadataSource.startsWith('08_Backlist/Hagher, Iyorwuese/'))
    assert.equal(Object.keys(entry.isbns).length, 3)
    for (const isbn of Object.values(entry.isbns)) {
      const sum = [...isbn.slice(0, 12)].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0)
      assert.equal((10 - sum % 10) % 10, Number(isbn[12]))
    }
    assert.ok(entry.longDescription.length > entry.shortDescription.length)
  }
  assert.equal(hagherBacklistContent['a-portrait-of-paradise'].releaseDate, '2026-04-21')
  assert.equal(hagherBacklistContent['the-conquest-of-azenga'].releaseDate, '2026-06-23')
  assert.match(hagherAuthor.biography, /High Commissioner to Canada/)
})

test('published pictures preserve exact governed source bytes', () => {
  const expected = {
    'author_headshot.jpg': '8f16b0a7b0c47e1a813478c31f31f47c868849dc20e88032b5846d39a9b754eb',
    '9781961475670_FC.jpg': '5cf31e28bfd3eb7dbd091445a4ccbce5f9c65b5d3eb5d039fafae3d642033be3',
    '9781961475786_FC.jpg': 'c934be40907de06bccd2f7e7ddb32c307cd53a562b19300191cb0cd77f76fa49',
  }
  for (const [name, hash] of Object.entries(expected)) {
    const bytes = readFileSync(new URL('../public/backlist/iyorwuese-hagher/' + name, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash)
  }
})

test('focused presentation distinguishes edition metadata from retailer availability', () => {
  const book = readFileSync(new URL('../app/books/[id]/page.tsx', import.meta.url), 'utf8')
  const author = readFileSync(new URL('../app/authors/[slug]/page.tsx', import.meta.url), 'utf8')
  assert.match(book, /Published edition metadata/)
  assert.match(book, /authorSlug === 'iyorwuese-hagher' \? 'Edition' : 'Live'/)
  assert.match(author, /author.slug !== 'iyorwuese-hagher' \? <CTASection/)
  assert.match(author, /whitespace-pre-line text-white\/80/)
})
