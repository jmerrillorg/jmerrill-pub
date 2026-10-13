import { createHmac, timingSafeEqual } from 'node:crypto'
import { dataverseFirst, getDataverseServerConfig, stringValue } from './dataverse-server'
type Claims = { purpose: 'PUBLISHING_ONBOARDING_V1'; titleId: string; contactId: string; agreementSha256: string; exp: number }
function secret() {
  const key = process.env.INTAKE_CONTINUATION_TOKEN_SECRET || process.env.AUTHOR_PORTAL_SESSION_SECRET
  if (!key) throw new Error('ONBOARDING_LINK_CONFIGURATION_REQUIRED')
  return key
}
export function signOnboardingClaims(claims: Claims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${createHmac('sha256', secret()).update(`PUBLISHING_ONBOARDING_V1:${payload}`).digest('base64url')}`
}
export function verifyOnboardingToken(token: string): Claims {
  if (token.length > 2048) throw new Error('ONBOARDING_LINK_INVALID')
  const [payload, signature, extra] = token.split('.')
  const expected = createHmac('sha256', secret()).update(`PUBLISHING_ONBOARDING_V1:${payload}`).digest('base64url')
  if (extra || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('ONBOARDING_LINK_INVALID')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims
  const guid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
  if (claims.purpose !== 'PUBLISHING_ONBOARDING_V1' || !guid.test(claims.titleId) || !guid.test(claims.contactId) ||
      !/^[a-f0-9]{64}$/.test(claims.agreementSha256) || !Number.isSafeInteger(claims.exp) || claims.exp <= Date.now() / 1000 ||
      claims.exp > Date.now() / 1000 + 14 * 86400 + 60) throw new Error('ONBOARDING_LINK_INVALID')
  return claims
}
export function validateOnboardingRecordBinding(titleId: string, body: any, contact: any, title: any) {
  const prepared = body.replacement, execution = body.execution
  // The owner validates the exact intake/offer chain. A missing legacy lookup
  // is not a different author, but any populated conflicting lookup is a hold.
  if (contact?.contactid !== body.authorContactId || title?.jm1pub_titleid !== titleId ||
      (title._jm1_primaryauthor_value != null && title._jm1_primaryauthor_value !== body.authorContactId) ||
      prepared?.titleId !== titleId || execution?.titleId !== titleId ||
      !/^[a-f0-9]{64}$/.test(prepared?.offerSha256 || '') || execution.offerSha256 !== prepared.offerSha256 ||
      !prepared.authorElectionReference?.startsWith(`publisher-funded/stage04/${titleId}/${prepared.offerSha256}/responses/`) ||
      execution.authorElectionReference !== prepared.authorElectionReference ||
      prepared.completeness?.complete !== true ||
      !prepared.completeness.authorSourceReference?.startsWith(`contacts(${body.authorContactId})/W/`)) {
    throw new Error('ONBOARDING_IDENTITY_CONFLICT')
  }
}
export async function onboardingAuthority(titleId: string) {
  if (!/^[a-f0-9-]{36}$/.test(titleId)) throw new Error('ONBOARDING_TITLE_INVALID')
  const base = process.env.JM1_DIAGNOSTIC_RUNNER_URL, key = process.env.JM1_DIAGNOSTIC_RUNNER_KEY
  if (!base || !key) throw new Error('ONBOARDING_RUNTIME_UNAVAILABLE')
  const url = new URL('/api/publishing/commissioning/source-registration', base)
  if (url.protocol !== 'https:') throw new Error('ONBOARDING_RUNTIME_UNAVAILABLE')
  const response = await fetch(url, { method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/json', 'x-jm1-diagnostic-runner-key': key },
    body: JSON.stringify({ titleId, mode: 'SUBMISSION_05_REPLACEMENT_READBACK' }) })
  if (!response.ok) throw new Error('ONBOARDING_RUNTIME_UNAVAILABLE')
  const body = await response.json()
  if (body.execution?.titleId !== titleId || body.execution?.status !== 'REPLACEMENT_EXECUTION_VERIFIED' ||
      body.execution?.stage05Complete !== true || body.execution?.agreementSha256 !== body.replacement?.agreementSha256 ||
      body.execution?.authorDueCents !== 0 || body.execution?.authorPaymentDisposition !== 'NOT_APPLICABLE_PUBLISHER_FUNDED') {
    throw new Error('ONBOARDING_AGREEMENT_EXECUTION_PENDING')
  }
  const config = getDataverseServerConfig()
  if (!config || !/^[a-f0-9-]{36}$/.test(body.authorContactId)) throw new Error('ONBOARDING_CONTACT_UNAVAILABLE')
  const contact = await dataverseFirst(config, 'contacts', { $filter: `contactid eq ${body.authorContactId}`,
    $select: 'contactid,fullname,emailaddress1,telephone1,address1_line1,address1_line2,address1_city,address1_stateorprovince,address1_postalcode' })
  const title = await dataverseFirst(config, 'jm1pub_titles', { $filter: `jm1pub_titleid eq ${titleId}`, $select: 'jm1pub_titleid,_jm1_primaryauthor_value' })
  validateOnboardingRecordBinding(titleId, body, contact, title)
  return { titleId, contactId: body.authorContactId as string, agreementSha256: body.replacement.agreementSha256 as string,
    title: body.title as string, authorName: stringValue(contact.fullname), email: stringValue(contact.emailaddress1), phone: stringValue(contact.telephone1),
    mailingAddress: ['address1_line1', 'address1_line2', 'address1_city', 'address1_stateorprovince', 'address1_postalcode'].map(k => stringValue(contact[k])).filter(Boolean).join(', ') }
}
export async function resolveOnboardingLink(token: string) {
  const claims = verifyOnboardingToken(token), authority = await onboardingAuthority(claims.titleId)
  if (claims.contactId !== authority.contactId || claims.agreementSha256 !== authority.agreementSha256) throw new Error('ONBOARDING_LINK_SUPERSEDED')
  return authority
}
