import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type HealthStatus = 'ready' | 'degraded' | 'not_ready'

type DependencyHealth = {
  status: HealthStatus
  required: string[]
  present: string[]
  missing: string[]
  notes?: string[]
}

const CHECKS = {
  configuration: ['NODE_ENV'],
  dataverse: [
    'DATAVERSE_TENANT_ID',
    'DATAVERSE_CLIENT_ID',
    'DATAVERSE_CLIENT_SECRET',
    'DATAVERSE_RESOURCE_URL',
    'DATAVERSE_WEB_API_BASE_URL',
  ],
  graph: [
    'SHAREPOINT_TENANT_ID',
    'SHAREPOINT_CLIENT_ID',
    'SHAREPOINT_CLIENT_SECRET',
  ],
  acs: [
    'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL',
    'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY',
  ],
  artifact: [
    'JOIN_WORKSPACE_INQUIRY_ROOT',
  ],
  authorPortal: [
    'AUTHOR_PORTAL_SESSION_SECRET',
  ],
  stripeEnrollment: [
    'STRIPE_CONNECT_SECRET_KEY',
    'JM1_STRIPE_CONNECT_ENABLED',
    'JM1_STRIPE_MODE',
  ],
} as const

const FORMER_AUTHOR_PORTAL_FALLBACK = 'jm1-author-portal-session'

export function GET() {
  const dependencies = Object.fromEntries(
    Object.entries(CHECKS).map(([name, keys]) => [name, dependencyHealth(keys)]),
  ) as Record<keyof typeof CHECKS, DependencyHealth>

  const paymentGate = String(process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED || '').toLowerCase() === 'true'
    ? 'enabled'
    : 'disabled'
  const sessionSecret = process.env.AUTHOR_PORTAL_SESSION_SECRET?.trim() || ''
  const release = readPackagedReleaseSha() ||
    process.env.JM1_RELEASE_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_RELEASE_ID ||
    'unknown'

  if (sessionSecret === FORMER_AUTHOR_PORTAL_FALLBACK) {
    dependencies.authorPortal = {
      ...dependencies.authorPortal,
      status: 'not_ready',
      notes: ['former_static_fallback_rejected'],
    }
  }

  const fatalMissing = dependencies.configuration.missing.length > 0 ||
    dependencies.authorPortal.status === 'not_ready'
  const degraded = Object.values(dependencies).some((dependency) => dependency.status !== 'ready')
  const status: HealthStatus = fatalMissing ? 'not_ready' : degraded ? 'degraded' : 'ready'

  return NextResponse.json({
    service: 'jmerrill-pub',
    status,
    release,
    checkedAt: new Date().toISOString(),
    paymentGate,
    dependencies,
  }, {
    status: fatalMissing ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function readPackagedReleaseSha() {
  try {
    return readFileSync(resolve(process.cwd(), 'JM1_RELEASE_SHA'), 'utf8').trim()
  } catch {
    return ''
  }
}

function dependencyHealth(required: readonly string[]): DependencyHealth {
  const present = required.filter((key) => Boolean(process.env[key]?.trim()))
  const missing = required.filter((key) => !process.env[key]?.trim())

  return {
    status: missing.length === 0 ? 'ready' : 'degraded',
    required: [...required],
    present,
    missing,
  }
}
