export type PublicAuthorVisibility = 'PUBLIC' | 'PSEUDONYM' | 'ANONYMOUS' | 'HIDDEN'

export type AuthorPublicationPrivacyInput = {
  titleId?: string
  titleSlug?: string
  title?: string
  legalAuthorName?: string
  publicAuthorName?: string
  contactId?: string
}

export type AuthorPublicationPrivacyPolicy = {
  visibility: PublicAuthorVisibility
  publicAttribution: string
  exposeAuthorProfile: boolean
  exposeBiography: boolean
  exposeHeadshot: boolean
  reason: string
}

type GovernedPolicyRecord = {
  titleSlugs: string[]
  titleNames: string[]
  legalAuthorNames: string[]
  visibility: PublicAuthorVisibility
  publicAttribution: string
  reason: string
}

const DEFAULT_PUBLIC_POLICY: AuthorPublicationPrivacyPolicy = {
  visibility: 'PUBLIC',
  publicAttribution: '',
  exposeAuthorProfile: true,
  exposeBiography: true,
  exposeHeadshot: true,
  reason: 'Default public author attribution.',
}

const GOVERNED_AUTHOR_PUBLICATION_POLICIES: GovernedPolicyRecord[] = [
  {
    titleSlugs: ['the-paper-champ'],
    titleNames: ['the paper champ'],
    legalAuthorNames: ['felix catheline'],
    visibility: 'ANONYMOUS',
    publicAttribution: 'Anonymous',
    reason:
      'Governed public privacy remediation: internal author identity is retained, while public attribution is anonymous.',
  },
]

export function resolveAuthorPublicationPrivacy(
  input: AuthorPublicationPrivacyInput,
): AuthorPublicationPrivacyPolicy {
  const titleSlug = normalize(input.titleSlug)
  const titleName = normalize(input.title)
  const legalAuthorName = normalize(input.legalAuthorName)
  const publicAuthorName = normalize(input.publicAuthorName)

  const policy = GOVERNED_AUTHOR_PUBLICATION_POLICIES.find((record) => {
    const titleMatches =
      (titleSlug && record.titleSlugs.some((slug) => normalize(slug) === titleSlug)) ||
      (titleName && record.titleNames.some((title) => normalize(title) === titleName))
    const authorMatches =
      (legalAuthorName && record.legalAuthorNames.some((name) => normalize(name) === legalAuthorName)) ||
      (publicAuthorName && record.legalAuthorNames.some((name) => normalize(name) === publicAuthorName))
    return titleMatches || authorMatches
  })

  if (!policy) return DEFAULT_PUBLIC_POLICY

  if (policy.visibility === 'PUBLIC') {
    return {
      ...DEFAULT_PUBLIC_POLICY,
      publicAttribution: policy.publicAttribution,
      reason: policy.reason,
    }
  }

  if (policy.visibility === 'PSEUDONYM') {
    return {
      visibility: 'PSEUDONYM',
      publicAttribution: policy.publicAttribution,
      exposeAuthorProfile: true,
      exposeBiography: true,
      exposeHeadshot: true,
      reason: policy.reason,
    }
  }

  return {
    visibility: policy.visibility,
    publicAttribution: policy.publicAttribution,
    exposeAuthorProfile: false,
    exposeBiography: false,
    exposeHeadshot: false,
    reason: policy.reason,
  }
}

export function suppressesPersonalAuthorIdentity(policy: AuthorPublicationPrivacyPolicy) {
  return policy.visibility === 'ANONYMOUS' || policy.visibility === 'HIDDEN'
}

function normalize(value?: string) {
  return (value || '').trim().toLowerCase()
}
