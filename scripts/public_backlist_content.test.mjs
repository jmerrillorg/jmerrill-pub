import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'
const { getPublicBacklistContent, applyPublicBacklistAuthor } = await import('../data/public-backlist-content.ts')
const snapshot = JSON.parse(readFileSync(new URL('../data/public-backlist-presentation.json', import.meta.url)))

test('every public source row and existing recovery destination is individually bound', () => {
  assert.equal(snapshot.productionTitleCount, 113)
  assert.equal(Object.keys(snapshot.titles).length, 128)
  for (const entry of Object.values(snapshot.titles)) {
    const input = { id: entry.titleId, slug: entry.slug, primaryIsbn: entry.isbns[0], isbnByFormat: [] }
    assert.equal(getPublicBacklistContent(input)?.titleId, entry.titleId)
    if (entry.titleId !== entry.slug) assert.equal(getPublicBacklistContent({ ...input, slug: entry.slug+'-edition' })?.titleId, entry.titleId)
    assert.equal(getPublicBacklistContent({ ...input, id: 'unrelated' }), undefined)
    assert.equal(getPublicBacklistContent({ ...input, id: entry.slug, primaryIsbn: '9780000000000' }), undefined)
    for (const source of entry.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/)
    if (entry.coverUrl) assert.ok(existsSync(new URL('../public'+entry.coverUrl, import.meta.url)))
  }
})

test('author content requires public-persona and exact work binding; replay is stable', () => {
  for (const [slug, entry] of Object.entries(snapshot.authors)) {
    const input = { slug, name: entry.name, shortBio: '', photoUrl: '' }
    const titles = entry.titleIds.map(id => ({ id, slug: snapshot.titles[id]?.slug || id, primaryIsbn: '', isbnByFormat: [], authors: [{slug,name:entry.name}] }))
    const result = applyPublicBacklistAuthor(input, titles)
    if (entry.biography) assert.equal(result.shortBio, entry.biography)
    if (entry.photoUrl) assert.equal(result.photoUrl, entry.photoUrl)
    assert.deepEqual(applyPublicBacklistAuthor(result, titles), result)
    assert.deepEqual(applyPublicBacklistAuthor(input, []), input)
    assert.deepEqual(applyPublicBacklistAuthor({...input, name:'Unrelated persona'}, titles), {...input,name:'Unrelated persona'})
  }
  assert.equal(snapshot.authors['taye-knox']?.photoUrl, undefined)
  assert.equal(snapshot.authors['r-dorian-night']?.photoUrl, undefined)
})

test('presentation omits placeholder author text, private contacts and copied template descriptions', () => {
  for (const author of Object.values(snapshot.authors)) {
    assert.doesNotMatch(author.biography || '', /the author is…|\b\d{5}-\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]+/i)
  }
  const gelatin = Object.values(snapshot.titles).find(entry => entry.slug==='the-never-before-told-story-of-the-gelatin-monster')
  assert.doesNotMatch(gelatin?.longDescription || '', /oil-rich Sofalia|Queen Aisha/)
  const runtime = readFileSync(new URL('../lib/server/dataverse/catalog.ts', import.meta.url),'utf8')
  assert.match(runtime, /ASSET_SELECT,[\s\S]*?'_jm1pub_titleid_value'/)
  assert.match(runtime, /_jm1pub_publishingassetid_value/)
  assert.match(runtime, /'jm1_catalogidentifiernormalized'/)
  assert.match(runtime, /\^\(978\|979\)\\d\{10\}\$/)
  const deployment = readFileSync(new URL('../.github/workflows/azure-app-service-premium.yml', import.meta.url),'utf8')
  assert.match(deployment, /"data\/\*\*"/)
  assert.match(deployment, /\.release == \$sha and \.status == "ready"/)
})
