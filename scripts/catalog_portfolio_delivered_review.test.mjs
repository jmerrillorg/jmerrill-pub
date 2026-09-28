import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/server/catalog-portfolio.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
const text = (value) => String(value ?? '').trim()
const dependencies = {
  './dataverse-server': {
    dataverseFormatted: (row, key) => text(row[`${key}@OData.Community.Display.V1.FormattedValue`]),
    dataverseLookupId: (row, key) => text(row[key]),
    stringValue: text,
  },
  './author-portal-status': { normalizeWorkspaceText: (value) => text(value).toLowerCase() },
}
vm.runInNewContext(compiled, { exports, require: (name) => dependencies[name] }, { filename: 'catalog-portfolio.ts' })

const title = {
  jm1pub_titleid: 'daf8180f-85a3-f111-b8de-000d3a14673b',
  jm1pub_titlename: 'Whole',
  jm1pub_stage: 100000006,
  'jm1pub_stage@OData.Community.Display.V1.FormattedValue': 'Editorial',
}
const stage = {
  jm1pub_editorialstageid: 'ae3c9d5e-67b5-f111-aaab-000d3a10aa9c',
  _jm1pub_titleid_value: title.jm1pub_titleid,
  jm1pub_name: 'Developmental Editing - Whole',
  jm1pub_stagestatus: 100000002,
  'jm1pub_stagestatus@OData.Community.Display.V1.FormattedValue': 'Plan Delivered',
}
const gate = {
  _jm1pub_titleid_value: title.jm1pub_titleid,
  _jm1pub_editorialstageid_value: stage.jm1pub_editorialstageid,
  jm1pub_gatestatus: 196650002,
  jm1pub_authordecision: null,
  jm1pub_authordecisionon: null,
}

test('a delivered stage with an exact pending author gate remains in the active pipeline', () => {
  const result = exports.classifyTitlePortfolio({ title, assets: [], stages: [stage], approvalGates: [gate] })
  assert.equal(result.state, 'active_pipeline')
})

test('a delivered stage cannot borrow another title or stage gate', () => {
  for (const mismatchedGate of [
    { ...gate, _jm1pub_titleid_value: 'another-title' },
    { ...gate, _jm1pub_editorialstageid_value: 'another-stage' },
    { ...gate, jm1pub_authordecision: 1 },
    { ...gate, jm1pub_gatestatus: 196650001 },
  ]) {
    const result = exports.classifyTitlePortfolio({ title, assets: [], stages: [stage], approvalGates: [mismatchedGate] })
    assert.equal(result.state, 'reconciliation_required')
  }
})
