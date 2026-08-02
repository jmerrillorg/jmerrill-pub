import { createPublicKey, createVerify, type JsonWebKey } from 'node:crypto'

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
const DEFAULT_AUDIENCE = 'jm1-pub-executive-recovery-dispatch'
const DEFAULT_REPOSITORY = 'jmerrillorg/jmerrill-pub'
const DEFAULT_PRODUCTION_SUBJECT = 'repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production'

type JwtHeader = {
  alg?: string
  kid?: string
}

export type GitHubActionsOidcClaims = {
  iss?: string
  aud?: string | string[]
  sub?: string
  repository?: string
  exp?: number
  nbf?: number
  iat?: number
  workflow_ref?: string
  job_workflow_ref?: string
}

export type GitHubActionsOidcValidationOptions = {
  audience?: string
  repository?: string
  subject?: string
  nowSeconds?: number
}

export type VerifiedGitHubActionsOidc = {
  subject: string
  repository: string
  workflowRef: string
}

export async function verifyGitHubActionsOidcToken(
  token: string,
  options: GitHubActionsOidcValidationOptions = {},
): Promise<VerifiedGitHubActionsOidc> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('OIDC_TOKEN_INVALID')

  const header = parseJwtPart<JwtHeader>(parts[0])
  const claims = parseJwtPart<GitHubActionsOidcClaims>(parts[1])
  if (header.alg !== 'RS256' || !header.kid) throw new Error('OIDC_HEADER_INVALID')

  const jwks = await fetch(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`, { cache: 'no-store' })
  if (!jwks.ok) throw new Error(`OIDC_JWKS_FETCH_FAILED:${jwks.status}`)
  const body = (await jwks.json()) as { keys?: JsonWebKey[] }
  const key = body.keys?.find((candidate) => candidate.kid === header.kid)
  if (!key) throw new Error('OIDC_JWK_NOT_FOUND')

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${parts[0]}.${parts[1]}`)
  verifier.end()
  const valid = verifier.verify(createPublicKey({ key, format: 'jwk' }), base64UrlDecode(parts[2]))
  if (!valid) throw new Error('OIDC_SIGNATURE_INVALID')

  return validateGitHubActionsOidcClaims(claims, options)
}

export function validateGitHubActionsOidcClaims(
  claims: GitHubActionsOidcClaims,
  options: GitHubActionsOidcValidationOptions = {},
): VerifiedGitHubActionsOidc {
  const expectedAudience = options.audience || process.env.JM1_EXECUTIVE_RECOVERY_OIDC_AUDIENCE || DEFAULT_AUDIENCE
  const expectedRepository = options.repository || DEFAULT_REPOSITORY
  const expectedSubject = options.subject || DEFAULT_PRODUCTION_SUBJECT
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)

  if (claims.iss !== GITHUB_OIDC_ISSUER) throw new Error('OIDC_ISSUER_INVALID')
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud].filter(Boolean)
  if (!audiences.includes(expectedAudience)) throw new Error('OIDC_AUDIENCE_INVALID')
  if (claims.repository !== expectedRepository) throw new Error('OIDC_REPOSITORY_INVALID')
  if (claims.sub !== expectedSubject) throw new Error('OIDC_SUBJECT_INVALID')
  if (!claims.exp || claims.exp <= now) throw new Error('OIDC_TOKEN_EXPIRED')
  if (claims.nbf && claims.nbf > now + 60) throw new Error('OIDC_TOKEN_NOT_YET_VALID')
  if (claims.iat && claims.iat > now + 60) throw new Error('OIDC_TOKEN_ISSUED_IN_FUTURE')

  return {
    subject: claims.sub,
    repository: claims.repository,
    workflowRef: claims.workflow_ref || claims.job_workflow_ref || 'not-recorded',
  }
}

function parseJwtPart<T>(value: string): T {
  try {
    return JSON.parse(base64UrlDecode(value).toString('utf8')) as T
  } catch {
    throw new Error('OIDC_TOKEN_INVALID')
  }
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64')
}
