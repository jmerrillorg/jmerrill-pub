import { unzipSync, strFromU8 } from 'fflate'
import { XMLParser } from 'fast-xml-parser'
import { digest, minor } from './source-parser'

const array = <T>(value:T|T[]|undefined):T[] => value === undefined ? [] : Array.isArray(value) ? value : [value]
export function excelMinor(value:string) {
  if(!/^-?\d+(?:\.\d+)?$/.test(value))throw Error('KDP_MONEY_INVALID')
  const scaled=Number(value)*100,rounded=Math.round(scaled)
  // Excel serializes binary floats; accept only sub-cent representation noise.
  if(!Number.isSafeInteger(rounded)||Math.abs(scaled-rounded)>1e-8)throw Error('KDP_SUBCENT_REVIEW_REQUIRED')
  return minor((rounded/100).toFixed(2))
}
// Read all stored rows, not only Excel's visible filter result. Never rewrite the workbook.
export function inspectKdp(bytes:Buffer) {
  if(bytes.length>8*1024*1024)throw Error('KDP_SIZE_LIMIT')
  let expanded=0
  const files=unzipSync(bytes,{filter:file=>{
    expanded+=file.originalSize
    if(expanded>32*1024*1024)throw Error('KDP_EXPANDED_SIZE_LIMIT')
    return /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(file.name)
  }})
  const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false})
  const read=(name:string)=>{if(!files[name])throw Error('KDP_PART_MISSING');const xml=strFromU8(files[name]);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('KDP_XML_UNSAFE');return parser.parse(xml)}
  const text=(v:any):string=>typeof v==='string'?v:String(v?.['#text']||'')
  const strings=array<any>(read('xl/sharedStrings.xml').sst?.si).map(si=>si.t!==undefined?text(si.t):array<any>(si.r).map(r=>text(r.t)).join(''))
  const relationships=array<any>(read('xl/_rels/workbook.xml.rels').Relationships?.Relationship)
  const sheets=array<any>(read('xl/workbook.xml').workbook?.sheets?.sheet)
  if(sheets.length!==6)throw Error('KDP_SHEET_COVERAGE_REVIEW_REQUIRED')
  const tables=sheets.map(sheet=>{
    const rel=relationships.find(r=>r['@_Id']===sheet['@_r:id'])
    if(!rel||!/^worksheets\/sheet\d+\.xml$/.test(rel['@_Target']))throw Error('KDP_RELATIONSHIP_INVALID')
    const ws=read(`xl/${rel['@_Target']}`).worksheet
    const rows=array<any>(ws?.sheetData?.row).map(row=>{
      const values:string[]=[]
      for(const c of array<any>(row.c)){
        if(c.f!==undefined)throw Error('KDP_FORMULA_REVIEW_REQUIRED')
        const letters=/^([A-Z]+)\d+$/.exec(c['@_r'])?.[1];if(!letters)throw Error('KDP_CELL_INVALID')
        const index=[...letters].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1
        if(index>100)throw Error('KDP_COLUMN_LIMIT')
        values[index]=c['@_t']==='s'?strings[Number(c.v)]:text(c.v??c.is?.t)
      }
      return values
    })
    return {name:String(sheet['@_name']),rows,filter:ws.autoFilter||null}
  })
  const periods=[...new Set(tables.map(t=>t.rows[0]?.[0]==='Sales Period'?t.rows[0]?.[1]:''))]
  if(periods.length!==1)throw Error('KDP_PERIOD_CONFLICT')
  const match=/^(January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2})$/.exec(periods[0])
  if(!match)throw Error('KDP_PERIOD_INVALID')
  const salesPeriod=`${match[2]}-${String('January February March April May June July August September October November December'.split(' ').indexOf(match[1])+1).padStart(2,'0')}`
  const total=tables.find(t=>t.name==='Total Earnings');if(!total)throw Error('KDP_TOTALS_MISSING')
  const headers=total.rows[1],get=(row:string[],field:string)=>{const i=headers.indexOf(field);if(i<0||headers.lastIndexOf(field)!==i)throw Error('KDP_HEADER_INVALID');return row[i]||''}
  const rows=total.rows.slice(2).filter(r=>r.some(Boolean)).map((r,i)=>{
    const units=Number(get(r,'Net Units Sold or Combined KENP')),currency=get(r,'Currency')
    if(!Number.isSafeInteger(units)||!get(r,'ASIN/ISBN')||!get(r,'Marketplace')||!get(r,'Payout Plan')||! /^[A-Z]{3}$/.test(currency))throw Error('KDP_ROW_INVALID')
    return {sourceRow:i+3,identifier:get(r,'ASIN/ISBN'),title:get(r,'Title'),marketplace:get(r,'Marketplace'),
      payoutPlan:get(r,'Payout Plan'),units,currency,publisherProceedsMinor:excelMinor(get(r,'Earnings')),raw:r}
  })
  const totals:Record<string,number>={}
  for(const r of rows)totals[r.currency]=(totals[r.currency]||0)+r.publisherProceedsMinor
  return {provider:'KDP',salesPeriod,sourceHash:digest(bytes),rows,totalsByCurrency:totals,
    sheetNames:tables.map(t=>t.name),filters:tables.map(t=>({sheet:t.name,filter:t.filter})),
    accountBinding:'UNPROVEN',state:'SOURCE_CAPTURED_ACCOUNT_BINDING_REQUIRED',payablesCreated:0}
}
