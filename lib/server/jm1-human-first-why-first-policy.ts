// Engine: JM1 Human-First / Why-First Policy
// Reusable? Y
// Stage-specific exception? N

export const JM1_HUMAN_FIRST_WHY_FIRST_POLICY = {
  policyId: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
  version: '1.0',
  scope: 'ENTERPRISE',
  status: 'CANON',
  owner: 'J MERRILL ONE',
  executablePolicy: true,
  brandOverlaysRequired: true,
  preSendEnforcement: true,
  driftMonitor: true,
} as const

export type HumanFirstDecision = 'ALLOW' | 'ALLOW_WITH_WARNING' | 'DENY' | 'HUMAN_REVIEW_REQUIRED'

export type HumanFirstPolicyInput = {
  division: string
  brand: 'publishing' | 'financial' | 'foundation' | 'productions' | 'corporate' | string
  recipientName?: string | null
  recipientRelationship?: string | null
  communicationType?: string | null
  eventOrTrigger?: string | null
  whyContext?: string | null
  actionRequired?: string | null
  jm1NextStep?: string | null
  content: string
  channel?: 'EMAIL' | 'PORTAL' | 'PDF' | 'SMS' | string
  sender?: string | null
  replyTo?: string | null
  cc?: string[] | null
  riskClass?: 'ROUTINE' | 'AUTHOR_REVIEW' | 'FINANCIAL' | 'CONTRACTUAL' | 'LEGAL' | 'MARKETING' | string
}

export type HumanFirstPolicyResult = {
  policyId: typeof JM1_HUMAN_FIRST_WHY_FIRST_POLICY.policyId
  policyVersion: typeof JM1_HUMAN_FIRST_WHY_FIRST_POLICY.version
  decision: HumanFirstDecision
  violations: string[]
  warnings: string[]
  evidence: string[]
}

const INTERNAL_LANGUAGE_PATTERNS: Array<[string, RegExp]> = [
  ['INTERNAL_TERM_ARTIFACT_ID', /\bartifact\s*id\b|\bartifactId\b/i],
  ['INTERNAL_TERM_CANONICAL', /\bcanonical\b/i],
  ['INTERNAL_TERM_RUNTIME', /\bruntime\b/i],
  ['INTERNAL_TERM_CORRELATION', /\bcorrelation(?:\s*id)?\b/i],
  ['INTERNAL_TERM_MANIFEST', /\bmanifest\b/i],
  ['INTERNAL_TERM_WORKSTREAM', /\bworkstream\b/i],
  ['INTERNAL_TERM_EXECUTION_STATE', /\bexecution\s+state\b/i],
  ['INTERNAL_TERM_PACKAGE_GRADE', /\bpackage-grade\b/i],
  ['INTERNAL_TERM_GOVERNED_SOURCE', /\bgoverned\s+source\b/i],
  ['INTERNAL_TERM_SYSTEM_ATTENTION', /\bsystem\s+attention\b/i],
  ['INTERNAL_TERM_LIFECYCLE_EVENT', /\blifecycle\s+event\b/i],
  ['INTERNAL_TERM_TECHNICAL_VALIDATION', /\btechnical\s+validation\b/i],
  ['INTERNAL_TERM_QUEUE', /\bqueue(?:d)?\b/i],
  ['INTERNAL_TERM_CHECKSUM', /\bchecksum\b/i],
  ['INTERNAL_TERM_WORKER', /\bworker\b/i],
  ['INTERNAL_TERM_DATAVERSE_ROW', /\bDataverse\s+row\b/i],
  ['INTERNAL_TERM_STATE_MACHINE', /\bstate\s+machine\s+token\b/i],
  ['GUID_EXPOSED', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['CHECKSUM_HASH_EXPOSED', /\b[a-f0-9]{64}\b/i],
]

const PUBLISHING_DOMAIN_TERMS = [
  'manuscript',
  'developmental edit',
  'developmental editing',
  'line edit',
  'line editing',
  'copyedit',
  'copyediting',
  'proof',
  'cover',
  'interior',
  'publication',
  'distribution',
  'royalty statement',
]

export function assertHumanFirstWhyFirst(input: HumanFirstPolicyInput): HumanFirstPolicyResult {
  const content = input.content.trim()
  const violations: string[] = []
  const warnings: string[] = []
  const evidence: string[] = []

  if (!content) violations.push('CONTENT_MISSING')
  if (!input.division?.trim()) violations.push('DIVISION_MISSING')
  if (!input.brand?.trim()) violations.push('BRAND_MISSING')
  if (!input.recipientName?.trim()) violations.push('RECIPIENT_IDENTITY_MISSING')
  if (!input.recipientRelationship?.trim()) violations.push('RECIPIENT_RELATIONSHIP_MISSING')
  if (!input.eventOrTrigger?.trim()) violations.push('EVENT_OR_TRIGGER_MISSING')
  if (!input.whyContext?.trim()) violations.push('WHY_CONTEXT_MISSING')
  if (!input.actionRequired?.trim()) warnings.push('ACTION_REQUIRED_NOT_EXPLICIT')
  if (!input.jm1NextStep?.trim()) warnings.push('JM1_NEXT_STEP_NOT_EXPLICIT')

  const proseContent = stripUrls(content)
  for (const [code, pattern] of INTERNAL_LANGUAGE_PATTERNS) {
    if (pattern.test(proseContent)) violations.push(code)
  }

  if (input.brand === 'publishing') {
    if (input.channel === 'EMAIL') {
      if (input.sender && input.sender.toLowerCase() !== 'publishing@email.jmerrill.one') {
        violations.push('WRONG_BRAND_SENDER_IDENTITY')
      }
      if (input.replyTo && input.replyTo.toLowerCase() !== 'publishing@jmerrill.one') {
        violations.push('WRONG_REPLY_TO_IDENTITY')
      }
      const cc = input.cc?.map((value) => value.toLowerCase()) || []
      if (cc.length && !cc.includes('publishing@jmerrill.one')) violations.push('PUBLISHING_CC_MISSING')
    }
    for (const term of PUBLISHING_DOMAIN_TERMS) {
      if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(content)) {
        evidence.push(`DOMAIN_LANGUAGE_ALLOWED:${term}`)
      }
    }
  }

  const highRisk = input.riskClass && ['FINANCIAL', 'CONTRACTUAL', 'LEGAL'].includes(input.riskClass.toUpperCase())
  if (highRisk && !/\b(manual review|Jackie approved|approved by Jackie|human reviewed)\b/i.test(content)) {
    return result('HUMAN_REVIEW_REQUIRED', violations, ['HIGH_RISK_OUTPUT_REQUIRES_RECORDED_HUMAN_REVIEW', ...warnings], evidence)
  }

  const headingCount = (content.match(/\b(Why you are receiving this|What(?:'|&#39;)s attached|What we need from you|How to respond|What happens next)\b/gi) || []).length
  if (headingCount >= 5) warnings.push('TEMPLATE_SCAFFOLDING_PRESENT_REVIEW_FOR_BLOAT')

  if (violations.length) return result('DENY', violations, warnings, evidence)
  if (warnings.length) return result('ALLOW_WITH_WARNING', [], warnings, evidence)
  return result('ALLOW', [], [], evidence)
}

function result(decision: HumanFirstDecision, violations: string[], warnings: string[], evidence: string[]): HumanFirstPolicyResult {
  return {
    policyId: JM1_HUMAN_FIRST_WHY_FIRST_POLICY.policyId,
    policyVersion: JM1_HUMAN_FIRST_WHY_FIRST_POLICY.version,
    decision,
    violations,
    warnings,
    evidence,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripUrls(value: string) {
  return value.replace(/https?:\/\/\S+/gi, '[governed-link]')
}
