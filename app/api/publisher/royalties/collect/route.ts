import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { collectMonth } from '@/lib/server/distribution/source-collector'
import { monitoredCollection } from '@/lib/server/distribution/collection-monitor'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:Request) {
  const wanted=Buffer.from(process.env.JM1_ORCHESTRATION_WORKER_KEY||''),actual=Buffer.from(request.headers.get('x-jm1-orchestration-worker-key')||'')
  if(!wanted.length||wanted.length!==actual.length||!timingSafeEqual(wanted,actual))return NextResponse.json({code:'UNAUTHORIZED'},{status:401})
  if(process.env.JM1_DISTRIBUTOR_COLLECTION_ENABLED!=='true')return NextResponse.json({code:'COLLECTION_DISABLED'},{status:503})
  try {
    const body=await request.json()
    if(Object.keys(body).some(k=>!['receiptMonth','scheduled'].includes(k)))return NextResponse.json({code:'UNEXPECTED_FIELD'},{status:400})
    if(body.scheduled===true){
      const now=new Date(),months=[0,1,2].map(n=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-n,1)).toISOString().slice(0,7))
      const scoped=process.env.JM1_DISTRIBUTOR_COLLECTION_MONTH?[process.env.JM1_DISTRIBUTOR_COLLECTION_MONTH]:months
      const results=[];for(const month of scoped)results.push(await monitoredCollection(month))
      return NextResponse.json({results},{headers:{'Cache-Control':'no-store'}})
    }
    const month=body.receiptMonth||new Date().toISOString().slice(0,7)
    if(process.env.JM1_DISTRIBUTOR_COLLECTION_MONTH && month!==process.env.JM1_DISTRIBUTOR_COLLECTION_MONTH)throw Error('COLLECTION_MONTH_OUT_OF_SCOPE')
    return NextResponse.json(await collectMonth(month),{headers:{'Cache-Control':'no-store'}})
  }catch(e){const code=e instanceof Error&&/^[A-Z_0-9]+$/.test(e.message)?e.message:'COLLECTION_DEPENDENCY_FAILED'
    console.error('Publishing distributor collection held',{code})
    return NextResponse.json({code},{status:503})}
}
