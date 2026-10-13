import test from 'node:test'
import assert from 'node:assert/strict'
import {createJiti} from 'jiti'
const jiti=createJiti(import.meta.url)
const {collectSource}=jiti('../lib/server/distribution/source-ledger.ts')
const {parseIngram,minor}=jiti('../lib/server/distribution/source-parser.ts')
const header='publisher_number\tisbn_13\ttitle\tbinding_type\tMTD_net_quantity\tMTD_net_pub_comp\treporting_currency_code\tperiod_name\tmarket\tsales_category'
const bytes=Buffer.from(header+'\n6116305\t9781961475571\tSynthetic\tPaperback\t2\t7.04\tUSD\tSEP-26\tUS\tRetail\n')
const provenance={driveId:'drive',itemId:'item',eTag:'v1',name:'source.xls',receivedAt:'2026-10-07T00:00:00Z',receiptMonth:'2026-10'}
const absent=async()=>({checkedAt:'2026-10-13T00:00:00Z',status:'ABSENT',references:[]})
class Store{
  entries=new Map();raw=new Map();n=0;fail=false
  async preserve(hash,b){if(this.raw.has(hash))assert.deepEqual(this.raw.get(hash),b);this.raw.set(hash,b)}
  async read(key){return structuredClone(this.entries.get(key)||null)}
  async commit(key,value,etag){if(this.fail){this.fail=false;throw Error('SIMULATED_FAILURE')};if(this.entries.get(key)?.etag!==etag)return false;this.entries.set(key,{value,etag:String(++this.n)});return true}
}
test('tab separated .xls preserves sales and receipt periods and publisher proceeds',()=>{const s=parseIngram(bytes);assert.equal(s.salesPeriod,'2026-09');assert.equal(s.totals.publisherProceedsMinor,704);assert.equal(s.rows[0].units,2);assert.equal(minor('-.03'),-3);assert.throws(()=>minor('unknown'));assert.throws(()=>minor('1.001'))})
test('atomic concurrent replay creates one statement/version',async()=>{const store=new Store();const results=await Promise.all([collectSource({bytes,provenance},store,absent),collectSource({bytes,provenance},store,absent)]);assert.equal(store.entries.size,1);assert.equal([...store.entries.values()][0].value.versions.length,1);assert.equal(results.filter(r=>r.idempotent).length,1)})
test('failure after raw custody recovers same source without duplicate',async()=>{const store=new Store();store.fail=true;await assert.rejects(collectSource({bytes,provenance},store,absent),/SIMULATED/);assert.equal(store.raw.size,1);assert.equal(store.entries.size,0);await collectSource({bytes,provenance},store,absent);assert.equal(store.raw.size,1);assert.equal(store.entries.size,1)})
test('prior read failure never implies absent',async()=>{const s=new Store();await assert.rejects(collectSource({bytes,provenance},s,async()=>{throw Error('DENIED')}),/DENIED/);assert.equal(s.entries.size,0)})
test('legacy collision remains held without active normalized statement',async()=>{const s=new Store();const r=await collectSource({bytes,provenance},s,async()=>({checkedAt:'2026-10-13T00:00:00Z',status:'PRESENT_OR_AMBIGUOUS',references:['legacy']}));assert.equal(r.version.state,'PRIOR_IMPORT_REVIEW_REQUIRED');assert.equal([...s.entries.values()][0].value.activeSourceHash,null)})
test('corrected statement retained but cannot replace original or duplicate payable',async()=>{const s=new Store();const a=await collectSource({bytes,provenance},s,absent);const changed=Buffer.from(bytes.toString().replace('7.04','8.04'));const b=await collectSource({bytes:changed,provenance:{...provenance,eTag:'v2'}},s,absent);assert.equal(b.version.state,'CORRECTION_REVIEW_REQUIRED');assert.equal([...s.entries.values()][0].value.activeSourceHash,a.version.sourceHash);assert.equal((await collectSource({bytes:changed,provenance},s,absent)).idempotent,true)})
test('format-only variant does not create additional active sales',async()=>{const s=new Store();await collectSource({bytes,provenance},s,absent);const b=await collectSource({bytes:Buffer.from(bytes.toString().replaceAll('\n','\r\n')),provenance},s,absent);assert.equal(b.version.state,'DUPLICATE_CONTENT')})
test('ambiguous repeated product tuple held, never silently collapsed',()=>{const duplicate=Buffer.concat([bytes,Buffer.from(bytes.toString().split('\n')[1]+'\n')]);assert.throws(()=>parseIngram(duplicate),/DUPLICATE_ROW_IDENTITY/)})
test('receipt month mismatch rejected',async()=>{await assert.rejects(collectSource({bytes,provenance:{...provenance,receiptMonth:'2026-09'}},new Store(),absent),/PROVENANCE/)})
