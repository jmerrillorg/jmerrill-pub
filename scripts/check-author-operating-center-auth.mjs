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
    message: 'stable Microsoft provider id defined',
  },
  {
    ok:
      sharedSource.includes("AUTHOR_EMAIL_OTP_PROVIDER_ID = 'jm1-author-email-otp'") &&
      authSource.includes('CredentialsProvider') &&
      authSource.includes('authorizeAuthorEmailOtpCredentials'),
    message: 'routine email OTP provider defined',
  },
  {
    ok:
      gateSource.includes('Send Code') &&
      gateSource.includes('AUTHOR_EMAIL_OTP_PROVIDER_ID') &&
      gateSource.includes('Activation or recovery'),
    message: 'portal routine login uses OTP and separates lifecycle recovery',
  },
]

const failed = checks.filter((check) => !check.ok)

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`)
}

if (failed.length > 0) {
  process.exit(1)
}
