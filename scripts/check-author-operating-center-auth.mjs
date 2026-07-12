import { readFileSync } from 'node:fs'

const authSource = readFileSync(new URL('../lib/server/author-durable-auth.ts', import.meta.url), 'utf8')
const gateSource = readFileSync(new URL('../app/author/_components/AuthorGate.tsx', import.meta.url), 'utf8')
const sharedSource = readFileSync(new URL('../lib/author-durable-auth-shared.ts', import.meta.url), 'utf8')

const checks = [
  {
    ok: !authSource.includes("next-auth/providers/azure-ad-b2c"),
    message: 'legacy azure-ad-b2c provider import removed',
  },
  {
    ok: authSource.includes("scope: 'openid profile email offline_access'"),
    message: 'CIAM scope configured',
  },
  {
    ok: authSource.includes("checks: ['pkce', 'state', 'nonce']"),
    message: 'OIDC security checks configured',
  },
  {
    ok: sharedSource.includes("AUTHOR_OPERATING_CENTER_PROVIDER_ID = 'jm1-author-operating-center'"),
    message: 'stable provider id defined',
  },
  {
    ok: gateSource.includes('/api/auth/signin/${AUTHOR_OPERATING_CENTER_PROVIDER_ID}?callbackUrl=%2Fauthor%2Fportal'),
    message: 'portal sign-in CTA targets provider directly',
  },
]

const failed = checks.filter((check) => !check.ok)

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`)
}

if (failed.length > 0) {
  process.exit(1)
}
