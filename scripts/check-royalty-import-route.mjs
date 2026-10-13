import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
const route=readFileSync('app/api/publisher/royalties/import/route.ts','utf8')
for(const value of ['getPublisherOperatingCenterSession','collectSource','priorLedgerReader','SOURCE_REQUIRED_NO_ZERO_INFERENCE','COLLECTION_DISABLED'])assert.ok(route.includes(value),value)
assert.ok(!route.includes('dataverseCreate'))
assert.ok(!route.includes('IMPORTED — RECONCILED'))
const test=spawnSync(process.execPath,['--test','scripts/distributor_source_ledger.test.mjs','scripts/distributor_monitor.test.mjs'],{stdio:'inherit'})
process.exit(test.status??1)
