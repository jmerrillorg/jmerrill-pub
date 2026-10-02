import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPackagePlan } from './catalog_package_v41_reconcile.mjs'

function row(sku, rowId, price) {
  return {
    jm1pub_canonicalsku: sku,
    jm1pub_catalogrowid: rowId,
    jm1pub_unitprice: price,
    jm1pub_category: 100000013,
    jm1pub_publishingtrackapplicability: 'J Merrill Publishing',
    jm1pub_scopegate: 100000002,
    jm1pub_sloteligibility: 100000000,
    jm1pub_productformcode: 100000008,
    jm1pub_releasemodelcode: 'N/A',
    jm1pub_productionmodecode: 'N/A',
    _transactioncurrencyid_value: '38afdf11-6491-f011-b4cc-7c1e525b3eb3',
  }
}

test('creates Premier and supersedes Signature without altering the child package', () => {
  const child = row('JMP-PKG-CHILD', 'CAT-105', 2495)
  const plan = buildPackagePlan([
    row('JMP-PKG-STARTER', 'CAT-108', null),
    row('JMP-PKG-PRO', 'CAT-106', null),
    row('JMP-PKG-SIGNATURE', 'CAT-107', 7500),
    child,
  ])
  assert.equal(plan.createPremier.jm1pub_canonicalsku, 'JMP-PKG-PREMIER')
  assert.equal(plan.createPremier.jm1pub_unitprice, 7500)
  assert.equal(plan.createPremier.jm1pub_catalogrowid, 'CAT-121')
  assert.equal(plan.createPremier['transactioncurrencyid@odata.bind'], '/transactioncurrencies(38afdf11-6491-f011-b4cc-7c1e525b3eb3)')
  assert.equal(plan.updates.length, 3)
  assert.equal(plan.updates.find((item) => item.row.jm1pub_canonicalsku === 'JMP-PKG-SIGNATURE').patch.jm1pub_contractstatus, 100000001)
  assert.equal(plan.updates.some((item) => item.row === child), false)
})

test('replay updates existing Premier rather than creating a duplicate', () => {
  const plan = buildPackagePlan([
    row('JMP-PKG-STARTER', 'CAT-108', 1999),
    row('JMP-PKG-PRO', 'CAT-106', 4500),
    row('JMP-PKG-SIGNATURE', 'CAT-107', 7500),
    row('JMP-PKG-PREMIER', 'CAT-121', 7500),
  ])
  assert.equal(plan.createPremier, null)
  assert.equal(plan.updates.length, 4)
})

test('fails closed on duplicate SKU, occupied row ID, or changed historical Signature price', () => {
  const base = [row('JMP-PKG-STARTER', 'CAT-108', null), row('JMP-PKG-PRO', 'CAT-106', null), row('JMP-PKG-SIGNATURE', 'CAT-107', 7500)]
  assert.throws(() => buildPackagePlan([...base, base[0]]), /Expected one row/)
  assert.throws(() => buildPackagePlan([...base, row('JMP-OTHER', 'CAT-121', 1)]), /occupied/)
  assert.throws(() => buildPackagePlan([...base.slice(0, 2), row('JMP-PKG-SIGNATURE', 'CAT-107', 7000)]), /differs/)
})
