import { randomUUID } from 'node:crypto'
import { sourceStore } from './source-ledger'
import { collectMonth } from './source-collector'

export async function monitoredCollection(month:string, deps={sourceStore,collectMonth}) {
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('COLLECTION_MONTH_INVALID')
  const store=await deps.sourceStore(),blob=store.container.getBlockBlobClient(`monitor/${month}.json`)
  let state:{failures:number;nextAttemptAt?:string;claimUntil?:string;status?:string;attemptId?:string}={failures:0},etag:string|undefined
  try{const r=await blob.download();const chunks:Buffer[]=[];for await(const c of r.readableStreamBody!)chunks.push(Buffer.from(c));state=JSON.parse(Buffer.concat(chunks).toString());etag=r.etag}
  catch(e){if((e as {statusCode?:number}).statusCode!==404)throw e}
  if(state.claimUntil&&Date.parse(state.claimUntil)>Date.now())return {status:'CLAIMED_WAIT',month}
  if(state.status==='RUNNING')state.failures+=1
  if(state.failures>=3)return {status:'REVIEW_REQUIRED',month}
  if(state.nextAttemptAt&&Date.parse(state.nextAttemptAt)>Date.now())return {status:'NOT_DUE',month}
  const attemptId=randomUUID(),claimed={...state,attemptId,status:'RUNNING',claimUntil:new Date(Date.now()+20*60_000).toISOString()}
  let committed
  try{committed=await blob.uploadData(Buffer.from(JSON.stringify(claimed)),{conditions:etag?{ifMatch:etag}:{ifNoneMatch:'*'}})}
  catch(e){if([409,412].includes((e as {statusCode?:number}).statusCode||0))return {status:'CLAIMED_WAIT',month};throw e}
  try{
    const result=await deps.collectMonth(month)
    const completed={status:'COMPLETED',attemptId,failures:0,completedAt:new Date().toISOString(),nextAttemptAt:new Date(Date.now()+24*60*60_000).toISOString()}
    await blob.uploadData(Buffer.from(JSON.stringify(completed)),{conditions:{ifMatch:committed.etag}})
    return {...completed,month,result}
  }catch(e){
    const code=e instanceof Error&&/^[A-Z_0-9]+$/.test(e.message)?e.message:'COLLECTION_DEPENDENCY_FAILED'
    const failures=state.failures+1,status=failures>=3?'REVIEW_REQUIRED':'RETRY_PENDING'
    const failed={status,attemptId,failures,code,failedAt:new Date().toISOString(),nextAttemptAt:new Date(Date.now()+failures*15*60_000).toISOString()}
    await store.container.getBlockBlobClient(`failures/${attemptId}.json`).uploadData(Buffer.from(JSON.stringify({month,...failed})),{conditions:{ifNoneMatch:'*'}})
    await blob.uploadData(Buffer.from(JSON.stringify(failed)),{conditions:{ifMatch:committed.etag}})
    return {...failed,month}
  }
}
