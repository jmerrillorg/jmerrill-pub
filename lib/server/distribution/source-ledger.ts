import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob'
import { digest, parseIngram, type SourceStatement } from './source-parser'

export type SourceProvenance = { driveId: string; itemId: string; eTag: string; name: string; receivedAt: string; receiptMonth: string; archiveMonth?:string; archiveCreatedAt?:string }
export type PriorEvidence = { checkedAt: string; references: string[]; status: 'ABSENT' | 'PRESENT_OR_AMBIGUOUS' }
export type SourceVersion = { sourceHash: string; semanticHash: string; provenance: SourceProvenance; parsed: SourceStatement;
  state: 'NORMALIZED_SOURCE_ONLY' | 'DUPLICATE_CONTENT' | 'CORRECTION_REVIEW_REQUIRED' | 'PRIOR_IMPORT_REVIEW_REQUIRED';
  prior: PriorEvidence; recordedAt: string; entitlement: 'HELD_AGREEMENT_MAPPING_REQUIRED' }
export type Ledger = { schema: 1; statementId: string; activeSourceHash: string | null; versions: SourceVersion[] }
export interface LedgerStore {
  read(key: string): Promise<{value: Ledger; etag: string} | null>
  preserve(hash: string, bytes: Buffer): Promise<void>
  commit(key: string, value: Ledger, etag?: string): Promise<boolean>
}
export async function collectSource(input: { bytes: Buffer; provenance: SourceProvenance }, store: LedgerStore,
  priorRead: (s: SourceStatement) => Promise<PriorEvidence>) {
  const {provenance:p,bytes} = input
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.receiptMonth) || !Number.isFinite(Date.parse(p.receivedAt)) ||
      p.receivedAt.slice(0,7) !== p.receiptMonth || !p.driveId || !p.itemId || !p.eTag) throw Error('SOURCE_PROVENANCE_INVALID')
  const parsed = parseIngram(bytes), key = digest(`${parsed.provider}:${parsed.account}:${parsed.kind}:${parsed.totals.currency}:${parsed.salesPeriod}`)
  // Raw custody precedes the atomic ledger commit; recovery reuses identical bytes.
  await store.preserve(parsed.sourceHash,bytes)
  for (let attempt=0; attempt<4; attempt++) {
    const current = await store.read(key)
    const existing = current?.value.versions.find(v=>v.sourceHash===parsed.sourceHash)
    if (existing) return {key,version:existing,idempotent:true}
    const prior = await priorRead(parsed)
    if (!Number.isFinite(Date.parse(prior.checkedAt)) || !Array.isArray(prior.references) ||
        !['ABSENT','PRESENT_OR_AMBIGUOUS'].includes(prior.status) ||
        (prior.status === 'ABSENT' && prior.references.length)) throw Error('PRIOR_LEDGER_UNPROVEN')
    const sameContent = current?.value.versions.some(v=>v.semanticHash===parsed.semanticHash)
    const state: SourceVersion['state'] = sameContent ? 'DUPLICATE_CONTENT' : current ? 'CORRECTION_REVIEW_REQUIRED' :
      prior.status === 'ABSENT' ? 'NORMALIZED_SOURCE_ONLY' : 'PRIOR_IMPORT_REVIEW_REQUIRED'
    const version: SourceVersion = {sourceHash:parsed.sourceHash,semanticHash:parsed.semanticHash,provenance:p,parsed,state,prior,
      recordedAt:new Date().toISOString(),entitlement:'HELD_AGREEMENT_MAPPING_REQUIRED'}
    const ledger: Ledger = {schema:1,statementId:parsed.statementId,
      activeSourceHash:current?.value.activeSourceHash || (state==='NORMALIZED_SOURCE_ONLY'?parsed.sourceHash:null),
      versions:[...(current?.value.versions||[]),version]}
    if (await store.commit(key,ledger,current?.etag)) return {key,version,idempotent:false}
  }
  throw Error('SOURCE_LEDGER_CONCURRENT_RETRY_REQUIRED')
}
const status = (e: unknown) => (e as {statusCode?:number})?.statusCode
export class BlobLedgerStore implements LedgerStore {
  constructor(readonly container: ContainerClient) {}
  async read(key:string) {
    try { const r=await this.container.getBlobClient(`statements/${key}.json`).download();
      const chunks:Buffer[]=[];for await(const c of r.readableStreamBody!)chunks.push(Buffer.from(c));
      const value=JSON.parse(Buffer.concat(chunks).toString()) as Ledger
      if(value.schema!==1||!Array.isArray(value.versions)||!r.etag)throw Error('SOURCE_LEDGER_INVALID')
      return {value,etag:r.etag}
    }catch(e){if(status(e)===404)return null;throw e}
  }
  async preserve(hash:string,bytes:Buffer) {
    const blob=this.container.getBlockBlobClient(`originals/${hash}.bin`)
    try{await blob.uploadData(bytes,{conditions:{ifNoneMatch:'*'},blobHTTPHeaders:{blobContentType:'application/octet-stream'}})}
    catch(e){if(![409,412].includes(status(e)||0))throw e}
    if(digest(await blob.downloadToBuffer())!==hash)throw Error('SOURCE_CUSTODY_HASH_MISMATCH')
  }
  async commit(key:string,value:Ledger,etag?:string) {
    try{await this.container.getBlockBlobClient(`statements/${key}.json`).uploadData(Buffer.from(JSON.stringify(value)),{
      conditions:etag?{ifMatch:etag}:{ifNoneMatch:'*'},blobHTTPHeaders:{blobContentType:'application/json'}});return true}
    catch(e){if([409,412].includes(status(e)||0))return false;throw e}
  }
}
export async function sourceStore() {
  const connection=process.env.AZURE_STORAGE_CONNECTION_STRING
  if(!connection)throw Error('SOURCE_STORE_UNCONFIGURED')
  const container=BlobServiceClient.fromConnectionString(connection).getContainerClient('jm1-publishing-distributor-sources')
  await container.createIfNotExists()
  if((await container.getProperties()).blobPublicAccess)throw Error('SOURCE_STORE_NOT_PRIVATE')
  return new BlobLedgerStore(container)
}
