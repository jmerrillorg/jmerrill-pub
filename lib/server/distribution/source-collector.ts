import { collectSource, sourceStore, type PriorEvidence } from './source-ledger'
import type { SourceStatement } from './source-parser'
import { digest } from './source-parser'
import { inspectKdp } from './kdp-source'

const drive='b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se'
const graph='https://graph.microsoft.com/v1.0/'
type Row=Record<string,unknown>
export async function readSourceList(base:string,path:string,token:string,request:typeof fetch=fetch):Promise<Row[]> {
  let next=base+path;const seen=new Set<string>(),rows:Row[]=[]
  while(next){if(!next.startsWith(base)||seen.has(next)||seen.size>=100)throw Error('SOURCE_PAGINATION_INVALID')
    seen.add(next);const r=await request(next,{headers:{Authorization:`Bearer ${token}`,Prefer:'odata.maxpagesize=5000'},signal:AbortSignal.timeout(30000),cache:'no-store'})
    if(!r.ok){
      const boundary=base===graph?'SHAREPOINT_ARCHIVE':path.split('?')[0].toUpperCase()
      throw Object.assign(Error(`SOURCE_${boundary}_HTTP_${r.status}`),{requestId:r.headers.get('request-id')||r.headers.get('x-ms-service-request-id')||null})
    }
    const b=await r.json();if(!Array.isArray(b.value))throw Error('SOURCE_READ_INVALID')
    rows.push(...b.value);next=b['@odata.nextLink']||''
  }return rows
}
async function ownerRead(body:{mode:string;month:string;itemId?:string}) {
  const base=process.env.JM1_DIAGNOSTIC_RUNNER_URL,key=process.env.JM1_DIAGNOSTIC_RUNNER_KEY
  if(!base||!key)throw Error('SOURCE_OWNER_UNCONFIGURED')
  const url=new URL('/api/publishing/distributor/sources',base)
  if(url.protocol!=='https:')throw Error('SOURCE_OWNER_URL_INVALID')
  const response=await fetch(url,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(180000),
    headers:{'content-type':'application/json','x-jm1-diagnostic-runner-key':key},body:JSON.stringify(body)})
  const result=await response.json()
  if(!response.ok)throw Object.assign(Error(/^DISTRIBUTOR_[A-Z_0-9]+$/.test(result.code)?result.code:'SOURCE_OWNER_READ_FAILED'),{requestId:result.requestId||null})
  return result
}
export async function priorLedgerReader(month=new Date().toISOString().slice(0,7)) {
  const result=await ownerRead({mode:'PRIOR_LEDGER',month})
  const rows=result.rows as Record<string,Row[]>
  const lines=rows.jm1pub_royaltylines,transactions=rows.jm1_royaltytransactions,
    v2Statements=rows.jmpv2_royaltystatements,v2Payments=rows.jmpv2_royaltypaymentevidences,logs=rows.jm1_executionlogs
  if(![lines,transactions,v2Statements,v2Payments,logs].every(Array.isArray))throw Error('PRIOR_LEDGER_READ_INVALID')
  const at=result.checkedAt
  return async(s:SourceStatement):Promise<PriorEvidence>=>{
    // A period collision is held even if legacy data has no distributor or ISBN.
    const references=[...v2Statements.map(r=>String(r.jmpv2_royaltystatementid)),
      ...v2Payments.map(r=>String(r.jmpv2_royaltypaymentevidenceid)),
      ...lines.filter(r=>!r.jm1_statementmonth||String(r.jm1_statementmonth).startsWith(s.salesPeriod)).map(r=>String(r.jm1pub_royaltylineid)),
      ...transactions.filter(r=>!r.jm1_periodstart||String(r.jm1_periodstart).startsWith(s.salesPeriod)).map(r=>String(r.jm1_royaltytransactionid)),
      ...logs.filter(r=>JSON.stringify(r).includes(s.sourceHash)||JSON.stringify(r).includes(s.statementId)||
        (/IMPORT/.test(String(r.jm1_actiontype))&&JSON.stringify(r).includes(s.salesPeriod))).map(r=>String(r.jm1_executionlogid))]
    return {checkedAt:at,references,status:references.length?'PRESENT_OR_AMBIGUOUS':'ABSENT'}
  }
}
export async function collectMonth(month:string) {
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('RECEIPT_MONTH_INVALID')
  const store=await sourceStore(),archive=await ownerRead({mode:'ARCHIVE_LIST',month})
  if(archive.driveId!==drive||!Array.isArray(archive.files))throw Error('SOURCE_ARCHIVE_INVALID')
  const files=archive.files as Row[]
  if(files.length>100)throw Error('SOURCE_FOLDER_REVIEW_REQUIRED')
  const prior=await priorLedgerReader(month),results=[]
  for(const file of files){
    const name=String(file.name),id=String(file.id)
    try {
    const kdp=/^KDP_Prior_Month_Royalties-.*\.xlsx$/i.test(name)
    if(!kdp&&!/^(?:LSI POD Wholesale Comp Report|Ingram eBook Wholesale Comp Report).*\.xls$/i.test(name)){
      results.push({itemId:id,status:'UNSUPPORTED_SOURCE_REVIEW_REQUIRED'});continue
    }
    if(Number(file.size)>8*1024*1024)throw Error('SOURCE_SIZE_LIMIT')
    const source=await ownerRead({mode:'SOURCE_READ',month,itemId:id})
    const bytes=Buffer.from(source.bytes,'base64')
    if(source.driveId!==drive||source.file.id!==id||source.file.eTag!==file.eTag||digest(bytes)!==source.sha256||bytes.length!==Number(file.size))throw Error('SOURCE_CHANGED_DURING_READ')
    const now=new Date().toISOString()
    const provenance={driveId:drive,itemId:id,eTag:String(file.eTag),name,receivedAt:now,receiptMonth:now.slice(0,7),archiveMonth:month,archiveCreatedAt:String(file.createdDateTime)}
    if(kdp){
      const inspected=inspectKdp(bytes),hash=digest(bytes)
      await store.preserve(hash,bytes)
      const blob=store.container.getBlockBlobClient(`held-kdp/${hash}.json`)
      let idempotent=false
      const authority={policy:'KDP_ONLINE_PRECEDENCE_2026_10_13',archivedTotalsAreAuthoritative:false,
        ...(hash==='6402315b90a21309163d08b42f6c1ddd9898bbc0cfdff491b566bdbbf58ae0ea'?{
          conflict:'ARCHIVED_USD_13_38_VS_ONLINE_USD_6_69',authoritativeOnlineUsdCents:669,
          onlineObservedAt:'2026-10-13T18:35:00Z',observationTimePrecision:'APPROXIMATE',
          onlineSource:'https://kdpreports.amazon.com/pmr',salesPeriod:'2026-08'}:{})}
      try{await blob.uploadData(Buffer.from(JSON.stringify({provenance,...inspected,authority})),{conditions:{ifNoneMatch:'*'}})}
      catch(e){if([409,412].includes((e as {statusCode?:number}).statusCode||0))idempotent=true;else throw e}
      results.push({itemId:id,sourceHash:hash,salesPeriod:inspected.salesPeriod,totalsByCurrency:inspected.totalsByCurrency,
        status:inspected.state,idempotent});continue
    }
    const result=await collectSource({bytes,provenance},store,prior)
    results.push({itemId:id,key:result.key,status:result.version.state,idempotent:result.idempotent,
      sourceHash:result.version.sourceHash,salesPeriod:result.version.parsed.salesPeriod,totals:result.version.parsed.totals,
      entitlement:result.version.entitlement})
    } catch(e) {
      const code=e instanceof Error&&/^[A-Z_0-9]+$/.test(e.message)?e.message:'SOURCE_DEPENDENCY_FAILED'
      results.push({itemId:id,status:'FAILED',code})
    }
  }
  const receipt={checkedAt:new Date().toISOString(),receiptMonth:month,folderItems:files.length,results,
    authorStatementsReleased:0,accountingPostings:0,payments:0}
  await store.container.getBlockBlobClient(`runs/${receipt.checkedAt.replace(/[:.]/g,'-')}.json`).uploadData(Buffer.from(JSON.stringify(receipt)),{conditions:{ifNoneMatch:'*'}})
  if(results.some(r=>r.status==='FAILED'))throw Error('SOURCE_ITEMS_FAILED_SEE_DURABLE_RECEIPT')
  return receipt
}
