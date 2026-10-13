import { NextResponse } from 'next/server'
import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { collectSource, sourceStore } from '@/lib/server/distribution/source-ledger'
import { priorLedgerReader } from '@/lib/server/distribution/source-collector'
import { digest } from '@/lib/server/distribution/source-parser'

export const runtime = 'nodejs'
export async function POST(req:Request) {
  const session=await getPublisherOperatingCenterSession()
  if(!session?.user?.email)return NextResponse.json({code:'UNAUTHORIZED'},{status:401})
  if(process.env.JM1_DISTRIBUTOR_COLLECTION_ENABLED!=='true')return NextResponse.json({code:'COLLECTION_DISABLED'},{status:503})
  const form=await req.formData().catch(()=>null),file=form?.get('file')
  // A missing distributor statement is not authority for a zero-sales report.
  if(form?.get('noActivity')==='true')return NextResponse.json({code:'SOURCE_REQUIRED_NO_ZERO_INFERENCE'},{status:422})
  if(form?.get('sourceSystem')!=='INGRAM')return NextResponse.json({code:'SOURCE_REVIEW_REQUIRED'},{status:422})
  if(!(file instanceof File)||file.size>8*1024*1024)return NextResponse.json({code:'SOURCE_FILE_INVALID'},{status:400})
  try {
    const bytes=Buffer.from(await file.arrayBuffer()),now=new Date().toISOString()
    const result=await collectSource({bytes,provenance:{driveId:'PUBLISHER_AUTHENTICATED_UPLOAD',itemId:digest(bytes),
      eTag:digest(bytes),name:file.name,receivedAt:now,receiptMonth:now.slice(0,7)}},await sourceStore(),await priorLedgerReader())
    return NextResponse.json({ok:true,state:result.version.state,idempotent:result.idempotent,receipt:result.key,
      reportingMonth:result.version.parsed.salesPeriod,receiptMonth:result.version.provenance.receiptMonth,
      parsed:{rows:result.version.parsed.rows.length,totals:result.version.parsed.totals},
      authorStatementsReleased:0,payments:0},{headers:{'Cache-Control':'no-store'}})
  }catch {return NextResponse.json({code:'SOURCE_NOT_ACCEPTED_RETRY_OR_REVIEW_REQUIRED'},{status:503})}
}
