// Engine: Author-Facing Terminology Guard
// Reusable? Y
// Stage-specific exception? N

export const AUTHOR_FACING_ACTOR_TERMINOLOGY_RULE =
  'When J Merrill Publishing is the author-facing actor, use "the Publishing Team"; do not use standalone "Publishing" as a personified actor.'

export type AuthorFacingTerminologyFinding = {
  code: 'STANDALONE_PUBLISHING_ACTOR'
  phrase: string
  index: number
}

const publishingActorPatterns = [
  /\bPublishing\s+(?:will|has|continues|continued|received|receives|reviewed|reviews|review|reconcile|reconciles|records|recorded|sends|sent|prepares|prepared|confirms|confirmed|completes|completed|handles|handled|helps|helped)\b/g,
  /\bPublishing\s+is\s+(?:reviewing|preparing|continuing|handling|working|checking|confirming|sending|recording|reconciling|completing|helping|receiving)\b/g,
  /\b(?:with|contact|from|before|after|while)\s+Publishing\b/g,
] as const

export function findStandalonePublishingActorTerminology(text: string): AuthorFacingTerminologyFinding[] {
  const findings: AuthorFacingTerminologyFinding[] = []
  const source = text || ''

  for (const pattern of publishingActorPatterns) {
    for (const match of source.matchAll(pattern)) {
      const phrase = match[0]
      const index = match.index || 0
      if (isAllowedCorporateNameUse(source, index)) continue
      findings.push({ code: 'STANDALONE_PUBLISHING_ACTOR', phrase, index })
    }
  }

  return dedupeFindings(findings)
}

export function validateAuthorFacingPublishingActorTerminology(text: string):
  | { ok: true; findings: [] }
  | { ok: false; findings: AuthorFacingTerminologyFinding[] } {
  const findings = findStandalonePublishingActorTerminology(text)
  return findings.length ? { ok: false, findings } : { ok: true, findings: [] }
}

function isAllowedCorporateNameUse(source: string, index: number) {
  const prefix = source.slice(Math.max(0, index - 32), index).toLowerCase()
  return prefix.endsWith('j merrill ')
}

function dedupeFindings(findings: AuthorFacingTerminologyFinding[]) {
  const seen = new Set<string>()
  return findings.filter((finding) => {
    const key = `${finding.index}:${finding.phrase}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
