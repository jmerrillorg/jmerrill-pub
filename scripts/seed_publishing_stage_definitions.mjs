#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import stageDefinitions from '../lib/publishing/lifecycle/stage-definitions.json' with { type: 'json' }

const ENTITY_SET = 'jmpv2_stagedefinitions'
const SOURCE = 'JMP-16-STAGE-STAGE-DEFINITION-V1'

function assert(condition, code) {
  if (!condition) throw new Error(code)
}

export function stageDefinitionId(stageCode) {
  const bytes = createHash('sha256').update(`${SOURCE}:${stageCode}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function expectedStageDefinitions() {
  assert(stageDefinitions.length === 16, 'PUBLISHING_STAGE_CANON_COUNT_MISMATCH')
  const codes = new Set()
  return stageDefinitions.map((stage, index) => {
    const ordinal = index + 1
    assert(stage.id.startsWith(String(ordinal).padStart(2, '0') + '_') && !codes.has(stage.id),
      'PUBLISHING_STAGE_CANON_ORDER_INVALID')
    codes.add(stage.id)
    return {
      jmpv2_stagedefinitionid: stageDefinitionId(stage.id),
      jmpv2_stagecode: stage.id,
      jmpv2_stagelabel: stage.label,
      jmpv2_stageordinal: ordinal,
      jmpv2_validnextstagecode: stageDefinitions[index + 1]?.id || null,
      jmpv2_isactive: true,
    }
  })
}

export function planStageDefinitionSeed(existing, expected = expectedStageDefinitions()) {
  assert(Array.isArray(existing), 'PUBLISHING_STAGE_DEFINITION_READBACK_INVALID')
  const byCode = new Map()
  for (const row of existing) {
    assert(row && typeof row.jmpv2_stagecode === 'string' && !byCode.has(row.jmpv2_stagecode),
      'PUBLISHING_STAGE_DEFINITION_DUPLICATE')
    byCode.set(row.jmpv2_stagecode, row)
  }
  assert([...byCode.keys()].every((code) => expected.some((row) => row.jmpv2_stagecode === code)),
    'PUBLISHING_STAGE_DEFINITION_UNKNOWN_CODE')
  const missing = []
  for (const row of expected) {
    const found = byCode.get(row.jmpv2_stagecode)
    if (!found) {
      missing.push(row)
      continue
    }
    for (const [field, value] of Object.entries(row)) {
      assert(found[field] === value, `PUBLISHING_STAGE_DEFINITION_DRIFT_${field.toUpperCase()}`)
    }
  }
  return { expectedCount: expected.length, existingCount: existing.length, missing }
}

function apiBase(resourceUrl) {
  const url = new URL(resourceUrl)
  assert(url.protocol === 'https:' && url.hostname.endsWith('.crm.dynamics.com') &&
    !url.username && !url.password && !url.search && !url.hash && url.pathname === '/',
  'PUBLISHING_STAGE_DATAVERSE_URL_INVALID')
  return `${url.origin}/api/data/v9.2`
}

function accessToken(resourceUrl) {
  const token = execFileSync('az', [
    'account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  assert(token.length > 0, 'PUBLISHING_STAGE_DATAVERSE_IDENTITY_UNAVAILABLE')
  return token
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  assert(response.ok, `PUBLISHING_STAGE_DATAVERSE_HTTP_${response.status}`)
  return response.status === 204 ? null : response.json()
}

async function readDefinitions(base, token) {
  const params = new URLSearchParams({
    $select: 'jmpv2_stagedefinitionid,jmpv2_stagecode,jmpv2_stagelabel,jmpv2_stageordinal,jmpv2_validnextstagecode,jmpv2_isactive',
    $top: '100',
  })
  const result = await request(`${base}/${ENTITY_SET}?${params}`, token)
  assert(Array.isArray(result?.value) && !result['@odata.nextLink'],
    'PUBLISHING_STAGE_DEFINITION_READBACK_INCOMPLETE')
  return result.value
}

export async function seedStageDefinitions({ resourceUrl, apply = false, token, base, read = readDefinitions,
  write = request } = {}) {
  const api = base || apiBase(resourceUrl)
  const bearer = token || accessToken(resourceUrl)
  const before = planStageDefinitionSeed(await read(api, bearer))
  if (apply) {
    for (const row of before.missing) {
      await write(`${api}/${ENTITY_SET}(${row.jmpv2_stagedefinitionid})`, bearer, {
        method: 'PATCH', headers: { 'If-None-Match': '*' }, body: JSON.stringify(row),
      })
    }
  }
  const after = apply ? planStageDefinitionSeed(await read(api, bearer)) : before
  if (apply) assert(after.missing.length === 0, 'PUBLISHING_STAGE_DEFINITION_SEED_READBACK_FAILED')
  return { mode: apply ? 'APPLIED' : 'DRY_RUN', expectedCount: after.expectedCount,
    existingBefore: before.existingCount, created: apply ? before.missing.length : 0,
    missingAfter: after.missing.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes('--apply')
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL
  assert(resourceUrl, 'PUBLISHING_STAGE_DATAVERSE_URL_REQUIRED')
  seedStageDefinitions({ resourceUrl, apply }).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
