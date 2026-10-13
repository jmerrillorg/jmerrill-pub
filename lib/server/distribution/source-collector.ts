import { getDataverseServerConfig } from '../dataverse-server'
import { getDataverseRuntimeAccessToken, getGraphSharePointRuntimeAccessToken } from '../publisher-runtime-auth'
import { collectSource, sourceStore, type PriorEvidence } from './source-ledger'
import type { SourceStatement } from './source-parser'
import { digest } from './source-parser'
import { inspectKdp } from './kdp-source'

const drive='b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se'
const graph='https://graph.microsoft.com/v1.0/'
type Row=Record<string,unknown>
async function list(base:string,path:string,token:string):Promise<Row[]> {
  let next=base+path;const seen=new Set<string>(),rows:Row[]=[]
  while(next){if(!next.startsWith(base)||seen.has(next)||seen.size>=100)throw Error('SOURCE_PAGINATION_INVALID')
    seen.add(next);const r=await fetch(next,{headers:{Authorization:`Bearer ${token}`,Prefer:'odata.maxpagesize=5000'},signal:AbortSignal.timeout(30000),cache:'no-store'})
    if(!r.ok)throw Error(`SOURCE_READ_HTTP_${r.status}`)
    const b=await r.json();if(!Array.isArray(b.value))throw Error('SOURCE_READ_INVALID')
    rows.push(...b.value);next=b['@odata.nextLink']||''
  }return rows
}
export async function priorLedgerReader() {
  const config=getDataverseServerConfig();if(!config)throw Error('PRIOR_LEDGER_UNCONFIGURED')
  const token=await getDataverseRuntimeAccessToken(config.resourceUrl),base=config.webApiBaseUrl+'/'
  const lines=await list(base,'jm1pub_royaltylines',token)
  const transactions=await list(base,'jm1_royaltytransactions',token)
  const v2Statements=await list(base,'jmpv2_royaltystatements',token)
  const v2Payments=await list(base,'jmpv2_royaltypaymentevidences',token)
  const logs=await list(base,"jm1_executionlogs?$filter=contains(jm1_actiontype,'ROYALTY')",token)
  const at=new Date().toISOString()
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
  const store=await sourceStore(),token=await getGraphSharePointRuntimeAccessToken()
  const path=`04_Financials/${month.slice(0,4)}/${month.slice(5)}`
  const files=await list(graph,`drives/${drive}/root:/${path}:/children`,token)
  if(files.length>100)throw Error('SOURCE_FOLDER_REVIEW_REQUIRED')
  const prior=await priorLedgerReader(),results=[]
  for(const file of files){
    const name=String(file.name),id=String(file.id)
    try {
    const kdp=/^KDP_Prior_Month_Royalties-.*\.xlsx$/i.test(name)
    if(!kdp&&!/^(?:LSI POD Wholesale Comp Report|Ingram eBook Wholesale Comp Report).*\.xls$/i.test(name)){
      results.push({itemId:id,status:'UNSUPPORTED_SOURCE_REVIEW_REQUIRED'});continue
    }
    if(Number(file.size)>8*1024*1024)throw Error('SOURCE_SIZE_LIMIT')
    const r=await fetch(`${graph}drives/${drive}/items/${id}/content`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)})
    if(!r.ok)throw Error(`SOURCE_DOWNLOAD_HTTP_${r.status}`)
    const bytes=Buffer.from(await r.arrayBuffer())
    const mr=await fetch(`${graph}drives/${drive}/items/${id}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000),cache:'no-store'})
    if(!mr.ok)throw Error('SOURCE_METADATA_READ_FAILED')
    const fresh=await mr.json()
    if(fresh.eTag!==file.eTag||bytes.length!==Number(file.size))throw Error('SOURCE_CHANGED_DURING_READ')
    const now=new Date().toISOString()
    const provenance={driveId:drive,itemId:id,eTag:String(file.eTag),name,receivedAt:now,receiptMonth:now.slice(0,7),archiveMonth:month,archiveCreatedAt:String(file.createdDateTime)}
    if(kdp){
      const inspected=inspectKdp(bytes),hash=digest(bytes)
      await store.preserve(hash,bytes)
      const blob=store.container.getBlockBlobClient(`held-kdp/${hash}.json`)
      let idempotent=false
      try{await blob.uploadData(Buffer.from(JSON.stringify({provenance,...inspected})),{conditions:{ifNoneMatch:'*'}})}
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
