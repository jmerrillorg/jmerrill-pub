import test from 'node:test'
import assert from 'node:assert/strict'
import {createJiti} from 'jiti'
import {Readable} from 'node:stream'
const jiti=createJiti(import.meta.url)
const {monitoredCollection}=jiti('../lib/server/distribution/collection-monitor.ts')
const {excelMinor}=jiti('../lib/server/distribution/kdp-source.ts')
const {readSourceList}=jiti('../lib/server/distribution/source-collector.ts')
function fixture(){
  const values=new Map();let sequence=0,calls=0,fail=false
  const store={container:{getBlockBlobClient:path=>({
    async download(){const r=values.get(path);if(!r)throw {statusCode:404};return {etag:r.etag,readableStreamBody:Readable.from([r.bytes])}},
    async uploadData(bytes,{conditions}){const r=values.get(path);if((conditions.ifNoneMatch&&r)||(conditions.ifMatch&&r?.etag!==conditions.ifMatch))throw {statusCode:412};const etag=String(++sequence);values.set(path,{bytes,etag});return {etag}}
  })}}
  const deps={sourceStore:async()=>store,collectMonth:async()=>{calls++;if(fail)throw Error('SOURCE_READ_HTTP_503');return {results:[]}}}
  return {values,deps,get calls(){return calls},set fail(v){fail=v},due(){const k='monitor/2026-10.json',r=values.get(k),v=JSON.parse(r.bytes);v.nextAttemptAt='2020-01-01T00:00:00Z';r.bytes=Buffer.from(JSON.stringify(v))}}
}
test('scheduled collection excludes concurrent claims and records success before next due',async()=>{
  const f=fixture();const results=await Promise.all([monitoredCollection('2026-10',f.deps),monitoredCollection('2026-10',f.deps)])
  assert.equal(f.calls,1);assert.ok(results.some(r=>r.status==='COMPLETED'));assert.equal((await monitoredCollection('2026-10',f.deps)).status,'NOT_DUE')
})
test('failed collection retains receipt then recovers without deleting evidence',async()=>{
  const f=fixture();f.fail=true;const failed=await monitoredCollection('2026-10',f.deps);assert.equal(failed.status,'RETRY_PENDING');assert.ok(f.values.has(`failures/${failed.attemptId}.json`));f.due();f.fail=false
  assert.equal((await monitoredCollection('2026-10',f.deps)).status,'COMPLETED');assert.ok(f.values.has(`failures/${failed.attemptId}.json`))
})
test('retry exhaustion holds after three attempts',async()=>{
  const f=fixture();f.fail=true;for(let n=0;n<3;n++){await monitoredCollection('2026-10',f.deps);f.due()}
  assert.equal((await monitoredCollection('2026-10',f.deps)).status,'REVIEW_REQUIRED');assert.equal(f.calls,3)
})
test('expired claim is recovered and counted, without a permanent lock',async()=>{
  const f=fixture();f.values.set('monitor/2026-10.json',{etag:'old',bytes:Buffer.from(JSON.stringify({status:'RUNNING',failures:0,claimUntil:'2020-01-01T00:00:00Z'}))})
  assert.equal((await monitoredCollection('2026-10',f.deps)).status,'COMPLETED');assert.equal(f.calls,1)
})
test('Excel serialization noise is not a new sub-cent amount',()=>{
  assert.equal(excelMinor('9.7899999999999991'),979);assert.equal(excelMinor('13.38'),1338);assert.throws(()=>excelMinor('6.695'));assert.throws(()=>excelMinor(''))
})
test('read denial identifies exact boundary without exposing content or token',async()=>{
  await assert.rejects(readSourceList('https://graph.microsoft.com/v1.0/','drives/fixed/root:/archive:/children','secret',async()=>new Response('{}',{status:403,headers:{'request-id':'request-1'}})),e=>e.message==='SOURCE_SHAREPOINT_ARCHIVE_HTTP_403'&&e.requestId==='request-1')
})
test('pagination cannot send credentials outside the source origin',async()=>{
  let calls=0
  await assert.rejects(readSourceList('https://graph.microsoft.com/v1.0/','fixed','secret',async()=>{calls++;return new Response(JSON.stringify({value:[], '@odata.nextLink':'https://other.invalid/read'}))}),/PAGINATION_INVALID/)
  assert.equal(calls,1)
})
