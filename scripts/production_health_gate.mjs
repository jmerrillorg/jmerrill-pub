#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

const DEFAULT_ROUTES = [
  { route: '/', expectedStatus: 200, surface: 'public_page' },
  { route: '/books', expectedStatus: 200, surface: 'public_page' },
  { route: '/authors', expectedStatus: 200, surface: 'public_page' },
  { route: '/author', expectedStatus: 200, surface: 'public_page' },
  { route: '/author/portal', expectedStatus: 200, surface: 'public_page' },
  { route: '/author/financial-setup', expectedStatus: 200, surface: 'public_page' },
  { route: '/api/author/context', expectedStatus: 401, surface: 'protected_server_function' },
]

const FAILURE_CLASSIFICATIONS = {
  APPLICATION_STARTUP_FAILURE: 'Application Startup Failure',
  STATIC_ASSET_FAILURE: 'Static Asset Failure',
  SERVER_FUNCTION_FAILURE: 'Server Function Failure',
  PLATFORM_AVAILABILITY: 'Platform Availability',
  UNKNOWN: 'Unknown',
}

function numberOption(name, fallback) {
  const raw = option(name)
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`)
  }
  return parsed
}

function option(name) {
  const prefix = `--${name}=`
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : ''
}

export function normalizeBaseUrl(value) {
  const clean = String(value || '').trim().replace(/\/+$/, '')
  if (!clean || !/^https:\/\//i.test(clean)) {
    throw new Error('A https base URL is required.')
  }
  return clean
}

export function expectedForRoute(route) {
  return DEFAULT_ROUTES.find((entry) => entry.route === route)?.expectedStatus || 200
}

export function classifyFailures(results) {
  const failures = results.filter((result) => !result.ok)
  if (failures.length === 0) return null

  const timeoutCount = failures.filter((result) => result.failureType === 'timeout' || result.failureType === 'network_error').length
  const serverFunctionFailures = failures.filter((result) => result.surface === 'protected_server_function')
  const publicPageFailures = failures.filter((result) => result.surface === 'public_page')
  const statusCodes = new Set(failures.map((result) => result.status).filter(Boolean))

  if (serverFunctionFailures.length > 0 && publicPageFailures.length === 0) {
    return FAILURE_CLASSIFICATIONS.SERVER_FUNCTION_FAILURE
  }

  if (publicPageFailures.some((result) => result.route.includes('.') || result.status === 404) && serverFunctionFailures.length === 0) {
    return FAILURE_CLASSIFICATIONS.STATIC_ASSET_FAILURE
  }

  if (timeoutCount >= Math.max(2, Math.ceil(failures.length / 2))) {
    return FAILURE_CLASSIFICATIONS.PLATFORM_AVAILABILITY
  }

  if (statusCodes.has(500) && failures.length >= 2) {
    return FAILURE_CLASSIFICATIONS.APPLICATION_STARTUP_FAILURE
  }

  if (statusCodes.has(503) && publicPageFailures.length > 0) {
    return FAILURE_CLASSIFICATIONS.PLATFORM_AVAILABILITY
  }

  return FAILURE_CLASSIFICATIONS.UNKNOWN
}

export function summarize(results) {
  const failures = results.filter((result) => !result.ok)
  const maxLatencyMs = results.reduce((max, result) => Math.max(max, result.latencyMs || 0), 0)
  return {
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    totalProbes: results.length,
    failedProbes: failures.length,
    maxLatencyMs: Math.round(maxLatencyMs),
    classification: classifyFailures(results),
  }
}

async function probe({ baseUrl, route, expectedStatus, probeNumber, timeoutMs, surface }) {
  const url = `${baseUrl}${route}`
  const startedAt = new Date().toISOString()
  const start = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
    })
    const latencyMs = Math.round(performance.now() - start)
    const status = response.status
    const redirect = status >= 300 && status < 400
    return {
      timestamp: startedAt,
      probeNumber,
      route,
      surface,
      expectedStatus,
      status,
      latencyMs,
      ok: status === expectedStatus && !redirect,
      failureType: status === expectedStatus && !redirect ? null : redirect ? 'unexpected_redirect' : 'unexpected_status',
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      timestamp: startedAt,
      probeNumber,
      route,
      surface,
      expectedStatus,
      status: null,
      latencyMs,
      ok: false,
      failureType: error?.name === 'AbortError' ? 'timeout' : 'network_error',
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function writeEvidence(path, payload) {
  const target = resolve(path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(payload, null, 2))
}

async function main() {
  const baseUrl = normalizeBaseUrl(option('base-url') || process.env.JM1_PRODUCTION_HEALTH_BASE_URL)
  const durationSeconds = numberOption('duration-seconds', Number(process.env.JM1_PRODUCTION_HEALTH_DURATION_SECONDS || 600))
  const intervalSeconds = numberOption('interval-seconds', Number(process.env.JM1_PRODUCTION_HEALTH_INTERVAL_SECONDS || 30))
  const timeoutMs = numberOption('timeout-ms', Number(process.env.JM1_PRODUCTION_HEALTH_TIMEOUT_MS || 20000))
  const evidencePath = option('evidence-path') || process.env.JM1_PRODUCTION_HEALTH_EVIDENCE_PATH || 'deployment-evidence/production-health-gate.json'
  const operator = process.env.GITHUB_ACTOR || process.env.USER || 'unknown'
  const correlationId = process.env.GITHUB_RUN_ID
    ? `github-run-${process.env.GITHUB_RUN_ID}-attempt-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
    : `local-${Date.now()}`

  const results = []
  const startedAt = new Date().toISOString()
  const deadline = Date.now() + durationSeconds * 1000
  let probeNumber = 0

  do {
    probeNumber += 1
    for (const entry of DEFAULT_ROUTES) {
      const result = await probe({ ...entry, baseUrl, probeNumber, timeoutMs })
      results.push(result)
      console.log(
        [
          result.timestamp,
          `probe=${result.probeNumber}`,
          `route=${result.route}`,
          `status=${result.status ?? result.failureType}`,
          `expected=${result.expectedStatus}`,
          `latencyMs=${result.latencyMs}`,
          `ok=${result.ok}`,
        ].join(' '),
      )
    }

    if (Date.now() < deadline) {
      await new Promise((resolveSleep) => setTimeout(resolveSleep, intervalSeconds * 1000))
    }
  } while (Date.now() < deadline)

  const completedAt = new Date().toISOString()
  const summary = summarize(results)
  const evidence = {
    standard: 'JM1-INFRA-005',
    correlationId,
    operator,
    deploymentSha: process.env.GITHUB_SHA || '',
    workflow: process.env.GITHUB_WORKFLOW || '',
    runId: process.env.GITHUB_RUN_ID || '',
    startedAt,
    completedAt,
    durationSeconds,
    intervalSeconds,
    timeoutMs,
    baseUrl,
    routes: DEFAULT_ROUTES,
    summary,
    rollbackStatus: summary.result === 'PASS' ? 'not_required' : 'required_by_runbook',
    results,
  }

  await writeEvidence(evidencePath, evidence)
  console.log(`Production health evidence written to ${evidencePath}`)
  console.log(`Production health gate result: ${summary.result}`)
  if (summary.classification) console.log(`Failure classification: ${summary.classification}`)

  if (summary.result !== 'PASS') process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || error)
    process.exit(1)
  })
}
