import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'
const { readAuthorEditorialStage, selectTitleBoundEditorialStage } = createJiti(import.meta.url)('../lib/server/author-editorial-stage-readback.ts')
const titleId = 'daf8180f-85a3-f111-b8de-000d3a14673b'
const assetId = '7272744e-85a3-f111-b8de-6045bdd69678'
const config = {}

test('Operating Center consumes the directly title-bound record without requiring an asset', () => {
  const old = { _jm1pub_titleid_value: titleId, jm1pub_stagesequence: 1, createdon: '2026-08-29T08:40:45Z' }
  const current = { _jm1pub_titleid_value: titleId, jm1pub_stagesequence: 2, createdon: '2026-09-21T02:51:41Z' }
  const other = { _jm1pub_titleid_value: assetId, createdon: '2026-09-27T02:51:41Z' }
  assert.equal(selectTitleBoundEditorialStage([old, other, current], titleId), current)
  assert.equal(selectTitleBoundEditorialStage([other], titleId), null)
  assert.equal(selectTitleBoundEditorialStage([current], 'Whole'), null)
});

test('title-bound Developmental record supersedes an older asset-bound Review projection', async () => {
  const current = { _jm1pub_titleid_value: titleId, _jm1pub_publishingassetid_value: null,
    jm1pub_editorialstageid: 'ae3c9d5e-67b5-f111-aaab-000d3a10aa9c', jm1pub_stagetype: 100000001 }
  const calls = []
  const result = await readAuthorEditorialStage(config, { titleId, assetId, assetTitleId: titleId }, async (_, entity, query) => {
    calls.push(query); assert.equal(entity, 'jm1pub_editorialstages'); return current
  })
  assert.deepEqual(result, current)
  assert.equal(calls.length, 1)
  assert.match(calls[0].$filter, new RegExp(`_jm1pub_titleid_value eq ${titleId}`))
  assert.doesNotMatch(calls[0].$filter, /name|email|publishingasset/)
})
test('title stages remain visible when a format-specific publishing asset is absent', async () => {
  const current = { _jm1pub_titleid_value: titleId }
  assert.deepEqual(await readAuthorEditorialStage(config, { titleId }, async () => current), current)
})
test('legacy asset fallback requires exact asset-title and returned asset binding', async () => {
  let calls = 0
  const legacy = { _jm1pub_publishingassetid_value: assetId }
  const read = async () => (++calls === 1 ? null : legacy)
  assert.deepEqual(await readAuthorEditorialStage(config, { titleId, assetId, assetTitleId: titleId }, read), legacy)
  assert.equal(calls, 2)
})
test('cross-title records and mismatched asset relationships cannot supply a stage', async () => {
  assert.equal(await readAuthorEditorialStage(config, { titleId, assetId, assetTitleId: titleId },
    async () => ({ _jm1pub_titleid_value: assetId })), null)
  let calls = 0
  assert.equal(await readAuthorEditorialStage(config, { titleId, assetId, assetTitleId: assetId },
    async () => { calls++; return null }), null)
  assert.equal(calls, 1)
})
test('text identity and cross-title legacy fallback fail closed', async () => {
  await readAuthorEditorialStage(config, { titleId: 'Whole' }, async () => { throw new Error('must not query') })
  let calls = 0
  assert.equal(await readAuthorEditorialStage(config, { titleId, assetId, assetTitleId: titleId }, async () =>
    ++calls === 1 ? null : { _jm1pub_titleid_value: assetId, _jm1pub_publishingassetid_value: assetId }), null)
})
