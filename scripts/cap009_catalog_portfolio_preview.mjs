#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const base = (process.env.DATAVERSE_WEB_API_BASE_URL || '').replace(/\/$/, '')
if (!base) throw new Error('DATAVERSE_WEB_API_BASE_URL is required.')

const tokenResult = spawnSync('az', ['account', 'get-access-token', '--resource', 'https://jm1hq.crm.dynamics.com', '--query', 'accessToken', '-o', 'tsv'], {
  encoding: 'utf8',
})
if (tokenResult.status !== 0) {
  throw new Error(`Unable to acquire Dataverse token: ${tokenResult.stderr}`)
}
const token = tokenResult.stdout.trim()
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
}

async function get(path) {
  const response = await fetch(`${base}${path}`, { headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

function formatted(row, field) {
  return row[`${field}@OData.Community.Display.V1.FormattedValue`] || row[field] || ''
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function uniq(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function classify(title, assets, stages) {
  const stage = formatted(title, 'jm1pub_stage')
  const catalog = formatted(title, 'jm1pub_publiccatalogstatus')
  const publication = title.jm1pub_publicationstatus || ''
  const slug = title.jm1pub_slug || ''
  const nStage = normalize(stage)
  const nCatalog = normalize(catalog)
  const nPublication = normalize(publication)
  const isbns = uniq(assets.map((asset) => asset.jm1pub_isbn13))
  const formats = uniq(assets.map((asset) => formatted(asset, 'jm1pub_assetformat')))
  const distribution = uniq(assets.map((asset) => formatted(asset, 'jm1pub_distributionstatus')))
  const evidence = []
  if (stage) evidence.push(`title stage: ${stage}`)
  if (catalog) evidence.push(`public catalog status: ${catalog}`)
  if (publication) evidence.push(`publication status: ${publication}`)
  if (slug) evidence.push(`catalog slug: ${slug}`)
  if (isbns.length) evidence.push(`ISBN-13 present: ${isbns.join(', ')}`)
  if (distribution.length) evidence.push(`distribution status: ${distribution.join(', ')}`)
  const activeStage = stages.find((row) => {
    const status = normalize(formatted(row, 'jm1pub_stagestatus'))
    const summary = normalize(row.jm1pub_authorsafesummary)
    return (
      ['not started', 'in progress', 'active', 'ready for author review', 'awaiting author response', 'author review', 'internal qa'].includes(status) ||
      (['complete', 'completed', 'delivered', 'approved'].includes(status) &&
        (summary.includes('author review') || summary.includes('ready for your review')))
    )
  })
  if (activeStage) evidence.push(`active editorial stage: ${activeStage.jm1pub_name} / ${formatted(activeStage, 'jm1pub_stagestatus')}`)

  if (nStage.includes('archive') || nStage.includes('historical') || nPublication.includes('archive') || nPublication.includes('retired')) {
    return { state: 'Archive / Historical', confidence: evidence.length ? 'high' : 'medium', evidence, formats, isbns, distribution }
  }
  const hasPublishedEvidence =
    nStage.includes('backlist') ||
    nStage.includes('published') ||
    nCatalog === 'public' ||
    nPublication.includes('published') ||
    nPublication.includes('distribution') ||
    Boolean(slug && assets.length > 0) ||
    isbns.length > 0
  if (activeStage || (['editorial', 'production'].some((value) => nStage.includes(value)) && !hasPublishedEvidence)) {
    return { state: 'Active Pipeline', confidence: 'high', evidence, formats, isbns, distribution }
  }
  if (
    hasPublishedEvidence
  ) {
    return {
      state: 'Published Catalog',
      confidence: nStage.includes('backlist') || nStage.includes('published') ? 'high' : 'medium',
      evidence,
      formats,
      isbns,
      distribution,
    }
  }
  if (nStage.includes('hold') || nStage.includes('ongoing') || nPublication.includes('hold') || nPublication.includes('pause')) {
    return { state: 'External Hold', confidence: evidence.length ? 'medium' : 'low', evidence, formats, isbns, distribution }
  }
  return { state: 'Reconciliation Required', confidence: 'low', evidence, formats, isbns, distribution }
}

const [titlesResponse, assetsResponse, stagesResponse] = await Promise.all([
  get('/jm1pub_titles?$select=jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus,jm1pub_slug,_jm1_author_value,createdon,modifiedon&$top=500'),
  get('/jm1pub_publishingassets?$select=jm1pub_publishingassetid,jm1pub_assetformat,jm1pub_distributionstatus,jm1pub_isbn13,_jm1pub_titleid_value,createdon,modifiedon&$top=500'),
  get('/jm1pub_editorialstages?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagesequence,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon&$top=500'),
])

const rows = titlesResponse.value.map((title) => {
  const titleId = title.jm1pub_titleid
  const assets = assetsResponse.value.filter((asset) => asset._jm1pub_titleid_value === titleId)
  const assetIds = new Set(assets.map((asset) => asset.jm1pub_publishingassetid))
  const stages = stagesResponse.value.filter((stage) => stage._jm1pub_titleid_value === titleId || assetIds.has(stage._jm1pub_publishingassetid_value))
  const c = classify(title, assets, stages)
  return {
    title: title.jm1pub_titlename || title.jm1pub_name || '(Untitled)',
    titleId,
    author: title.jm1pub_authorname || title.jm1pub_authordisplayname || '',
    portfolioState: c.state,
    confidence: c.confidence,
    stage: formatted(title, 'jm1pub_stage') || '(blank)',
    catalogStatus: formatted(title, 'jm1pub_publiccatalogstatus') || '(blank)',
    publicationStatus: title.jm1pub_publicationstatus || '',
    formats: c.formats.join(', '),
    isbn13s: c.isbns.join(', '),
    distribution: c.distribution.join(', '),
    evidence: c.evidence.join('; '),
  }
})

const summary = rows.reduce((acc, row) => {
  acc[row.portfolioState] = (acc[row.portfolioState] || 0) + 1
  return acc
}, {})

const named = ['girl, did you know', 'a portrait of paradise', 'warriors and angels'].map((needle) =>
  rows.filter((row) => row.title.toLowerCase().includes(needle)),
)

const outDir = resolve('docs/operations/generated')
mkdirSync(outDir, { recursive: true })
const jsonPath = resolve(outDir, '2026-07-16-CAP-009-Catalog-Portfolio-Preview.json')
const mdPath = resolve(outDir, '2026-07-16-CAP-009-Catalog-Portfolio-Preview.md')

writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2))
writeFileSync(
  mdPath,
  `# CAP-009 Catalog Portfolio Classification Preview

Generated: ${new Date().toISOString()}

No Core or SharePoint writes were performed by this preview.

## Summary

${Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Named Proof Cases

${named
  .flat()
  .map((row) => `- ${row.title} (${row.titleId}) — ${row.portfolioState}; evidence: ${row.evidence || 'none'}`)
  .join('\n') || '- No named proof cases matched.'}

## Reconciliation Required

${rows
  .filter((row) => row.portfolioState === 'Reconciliation Required')
  .map((row) => `- ${row.title} (${row.titleId}) — stage ${row.stage}; catalog ${row.catalogStatus}`)
  .join('\n') || '- None.'}
`,
)

console.log(JSON.stringify({ ok: true, jsonPath, mdPath, summary }, null, 2))
