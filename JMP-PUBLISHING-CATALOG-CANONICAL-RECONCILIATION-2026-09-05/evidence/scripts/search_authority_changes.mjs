#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const graphBase = 'https://graph.microsoft.com/v1.0'
const publishingDriveId = 'b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se'
const outputPath = resolve(
  'JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/source/authority-change-search.json',
)
const token = execFileSync(
  'az',
  ['account', 'get-access-token', '--resource', 'https://graph.microsoft.com', '--query', 'accessToken', '-o', 'tsv'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
).trim()

const queries = [
  'termination',
  'terminated',
  'rights reversion',
  'rights reverted',
  'contract expiration',
  'author withdrawal',
  'title retirement',
  'founder hold',
  'legal restriction',
  'distribution termination',
  'superseding agreement',
]

async function search(queryString) {
  const response = await fetch(`${graphBase}/search/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          entityTypes: ['driveItem'],
          query: { queryString },
          from: 0,
          size: 200,
          trimDuplicates: false,
          fields: ['id', 'name', 'webUrl', 'createdDateTime', 'lastModifiedDateTime', 'parentReference', 'file', 'folder'],
        },
      ],
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${queryString}: ${text.slice(0, 1000)}`)
  const body = JSON.parse(text)
  const hits = body.value?.flatMap((value) => value.hitsContainers || []).flatMap((container) => container.hits || []) || []
  return hits
    .filter((hit) => hit.resource?.parentReference?.driveId === publishingDriveId)
    .map((hit) => ({
      rank: hit.rank,
      summary: hit.summary || '',
      id: hit.resource?.id || '',
      name: hit.resource?.name || '',
      webUrl: hit.resource?.webUrl || '',
      createdDateTime: hit.resource?.createdDateTime || '',
      lastModifiedDateTime: hit.resource?.lastModifiedDateTime || '',
      driveId: hit.resource?.parentReference?.driveId || '',
      path: hit.resource?.parentReference?.path || '',
      mimeType: hit.resource?.file?.mimeType || '',
      isFolder: Boolean(hit.resource?.folder),
    }))
}

const results = []
let graphSearchStatus = 'AVAILABLE'
let graphSearchError = ''
for (const query of queries) {
  try {
    results.push({ query, hits: await search(query) })
  } catch (error) {
    graphSearchStatus = 'UNAVAILABLE_CURRENT_TOKEN_SCOPE'
    graphSearchError = String(error.message || error)
    break
  }
}

const affirmativeNamePattern = /(?:termination|terminated|reversion|reverted|withdrawal|withdrawn|retirement|retired|legal restriction|superseding agreement)/i
const namedCandidates = results.flatMap((result) =>
  result.hits.filter((hit) => affirmativeNamePattern.test(hit.name)).map((hit) => ({ query: result.query, ...hit })),
)
const uniqueNamedCandidates = namedCandidates.filter(
  (candidate, index, rows) => rows.findIndex((row) => row.id === candidate.id) === index,
)

const output = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY',
  authority: 'JMP Publishing SharePoint drive',
  publishingDriveId,
  method: 'Microsoft Graph Search; results restricted to the Publisher-owned drive. Filename candidates are separated from generic contract-clause content hits.',
  graphSearchStatus,
  graphSearchError,
  queries: results,
  resultCounts: Object.fromEntries(results.map((result) => [result.query, result.hits.length])),
  affirmativeFilenameCandidates: uniqueNamedCandidates,
  localAuthorityEvidence: [
    {
      source: 'docs/operations/generated/JMP-BLOCK09-POST-DISTRIBUTION-TITLE-MANAGEMENT-COMMISSIONING-2026-08-26/12-real-financial-boundary.md',
      finding: 'Real title retired for commissioning: 0; real rights reverted for commissioning: 0; real distribution takedown for commissioning: 0.',
    },
    {
      source: 'docs/operations/generated/JMP-BLOCK09-POST-DISTRIBUTION-TITLE-MANAGEMENT-COMMISSIONING-2026-08-26/09-health-marketing-contract-archive.md',
      finding: 'Retirement, rights reversion, and distribution takedown are explicitly separate facts; reversion is review-gated and not automatic.',
    },
    {
      source: 'docs/operations/generated/JMP-TRANCHE-5-POST-PUBLICATION-OPERATIONS-IMPLEMENTATION-2026-08-08/16-retirement-runtime.md',
      finding: 'No title is retired automatically.',
    },
    {
      source: 'docs/operations/generated/JMP-TRANCHE-5-POST-PUBLICATION-OPERATIONS-IMPLEMENTATION-2026-08-08/17-reversion-runtime.md',
      finding: 'No rights are reverted automatically.',
    },
  ],
  determination: uniqueNamedCandidates.length
    ? 'CANDIDATES_REQUIRE_DOCUMENT_REVIEW'
    : graphSearchStatus === 'AVAILABLE'
      ? 'NO_AFFIRMATIVE_AUTHORITY_CHANGE_ARTIFACT_NAMED'
      : 'NO_AUTHORITY_CHANGE_FOUND_IN_AVAILABLE_GOVERNED_EVIDENCE_GRAPH_SEARCH_SCOPE_LIMIT_RECORDED',
  caveat: 'Search hits containing generic termination language inside agreement templates are not treated as executed authority-changing events.',
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, resultCounts: output.resultCounts, determination: output.determination, candidateCount: uniqueNamedCandidates.length }, null, 2))
