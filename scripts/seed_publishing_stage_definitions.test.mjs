import assert from 'node:assert/strict'
import test from 'node:test'
import {
  expectedStageDefinitions, planStageDefinitionSeed, seedStageDefinitions,
} from './seed_publishing_stage_definitions.mjs'

test('stage definitions match the sixteen-stage canon and form one forward chain', () => {
  const rows = expectedStageDefinitions()
  assert.equal(rows.length, 16)
  assert.equal(new Set(rows.map((row) => row.jmpv2_stagedefinitionid)).size, 16)
  assert.equal(rows[0].jmpv2_stagecode, '01_INQUIRY')
  assert.equal(rows[15].jmpv2_stagecode, '16_POST_PUBLICATION')
  for (let index = 0; index < rows.length; index += 1) {
    assert.equal(rows[index].jmpv2_validnextstagecode, rows[index + 1]?.jmpv2_stagecode || null)
  }
})

test('seed planner is idempotent and rejects duplicate or drifted live authority', () => {
  const rows = expectedStageDefinitions()
  assert.equal(planStageDefinitionSeed(rows).missing.length, 0)
  assert.equal(planStageDefinitionSeed(rows.slice(0, 4)).missing.length, 12)
  assert.throws(() => planStageDefinitionSeed([...rows, rows[0]]), /DEFINITION_DUPLICATE/)
  assert.throws(() => planStageDefinitionSeed([{ ...rows[0], jmpv2_stagelabel: 'Other' }]), /DEFINITION_DRIFT/)
  assert.throws(() => planStageDefinitionSeed([{ ...rows[0], jmpv2_stagecode: 'UNKNOWN' }]), /UNKNOWN_CODE/)
})

test('dry run cannot write and apply creates only missing definitions with readback', async () => {
  const rows = expectedStageDefinitions()
  let live = rows.slice(0, 15)
  const writes = []
  const deps = {
    base: 'https://test.crm.dynamics.com/api/data/v9.2', token: 'fixture',
    read: async () => live,
    write: async (_url, _token, options) => {
      writes.push(options)
      live = [...live, JSON.parse(options.body)]
    },
  }
  assert.deepEqual(await seedStageDefinitions(deps), {
    mode: 'DRY_RUN', expectedCount: 16, existingBefore: 15, created: 0, missingAfter: 1,
  })
  assert.equal(writes.length, 0)
  assert.deepEqual(await seedStageDefinitions({ ...deps, apply: true }), {
    mode: 'APPLIED', expectedCount: 16, existingBefore: 15, created: 1, missingAfter: 0,
  })
  assert.equal(writes[0].headers['If-None-Match'], '*')
  assert.equal((await seedStageDefinitions({ ...deps, apply: true })).created, 0)
})
