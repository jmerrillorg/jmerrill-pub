export type PublicAuthorAttributionMode = 'PUBLIC' | 'PEN_NAME' | 'ANONYMOUS' | 'HIDDEN'

export type PublicAuthorIdentityInput = {
  titleId?: string
  titleSlug?: string
  title?: string
  legalAuthorName?: string
  titleRelationshipPenName?: string
  titleSpecificPublicName?: string
  authorPenName?: string
  governedPublicAuthorName?: string
  publicAuthorName?: string
  anonymousPublication?: boolean
  hiddenPublication?: boolean
  contactId?: string
}

export type PublicAuthorIdentity = {
  mode: PublicAuthorAttributionMode
  publicAuthorName: string
  publicAttribution: string
  publicSlug: string
  exposeAuthorProfile: boolean
  exposeBiography: boolean
  exposeHeadshot: boolean
  reason: string
}

type GovernedPolicyRecord = {
  titleSlugs: string[]
  titleNames: string[]
  legalAuthorNames: string[]
  mode: PublicAuthorAttributionMode
  publicAttribution: string
  reason: string
}

const DEFAULT_PUBLIC_IDENTITY: PublicAuthorIdentity = {
  mode: 'PUBLIC',
  publicAuthorName: '',
  publicAttribution: '',
  publicSlug: '',
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
    mode: 'ANONYMOUS',
    publicAttribution: 'Anonymous',
    reason:
      'Governed public privacy remediation: internal author identity is retained, while public attribution is anonymous.',
  },
  {
    titleSlugs: ['the-sun-the-shadow-and-the-silence'],
    titleNames: ['the sun, the shadow, and the silence'],
    legalAuthorNames: ['nicky williams', 'devin gilchrest'],
    mode: 'PEN_NAME',
    publicAttribution: 'R. Dorian Night',
    reason:
      'Governed public attribution correction: title-specific pen name controls public title, metadata, and catalog surfaces.',
  },
  {
    titleSlugs: [
      '101-wisdom-lessons-for-life-and-living',
      '100-wisdom-lessons-for-life-and-living',
    ],
    titleNames: [
      '101 wisdom lessons for life and living',
      '100 wisdom lessons for life and living',
    ],
    legalAuthorNames: ['j. derrick johnson', 'j derrick johnson', 'derrick johnson'],
    mode: 'PUBLIC',
    publicAttribution: 'J. Derrick Johnson',
    reason:
      'Governed public attribution correction: preserve exact capitalization and punctuation for public author identity.',
  },
]

export function resolvePublicAuthorIdentity(input: PublicAuthorIdentityInput): PublicAuthorIdentity {
  const titleSlug = normalize(input.titleSlug)
  const titleName = normalize(input.title)
  const legalAuthorName = normalize(input.legalAuthorName)
  const titleRelationshipPenName = clean(input.titleRelationshipPenName)
  const titleSpecificPublicName = clean(input.titleSpecificPublicName)
  const authorPenName = clean(input.authorPenName)
  const governedPublicAuthorName = clean(input.governedPublicAuthorName)
  const publicAuthorName = clean(input.publicAuthorName)
  const legalName = clean(input.legalAuthorName)
  const normalizedPublicAuthorName = normalize(input.publicAuthorName)

  const policy = GOVERNED_AUTHOR_PUBLICATION_POLICIES.find((record) => {
    const titleMatches =
      (titleSlug && record.titleSlugs.some((slug) => normalize(slug) === titleSlug)) ||
      (titleName && record.titleNames.some((title) => normalize(title) === titleName))
    const authorMatches =
      (legalAuthorName && record.legalAuthorNames.some((name) => normalize(name) === legalAuthorName)) ||
      (normalizedPublicAuthorName &&
        record.legalAuthorNames.some((name) => normalize(name) === normalizedPublicAuthorName))
    return titleMatches || authorMatches
  })

  const explicitPenName = titleRelationshipPenName || titleSpecificPublicName || authorPenName
  if (explicitPenName) {
    return buildIdentity({
      mode: 'PEN_NAME',
      publicName: explicitPenName,
      expose: true,
      reason: 'Governed pen name/public persona overrides internal legal identity.',
    })
  }

  if (policy) {
    if (policy.mode === 'PUBLIC' || policy.mode === 'PEN_NAME') {
      return buildIdentity({
        mode: policy.mode,
        publicName: policy.publicAttribution || governedPublicAuthorName || publicAuthorName || legalName,
        expose: true,
        reason: policy.reason,
      })
    }

    return buildIdentity({
      mode: policy.mode,
      publicName: policy.mode === 'ANONYMOUS' ? policy.publicAttribution || 'Anonymous' : '',
      expose: false,
      reason: policy.reason,
    })
  }

  if (input.hiddenPublication) {
    return buildIdentity({
      mode: 'HIDDEN',
      publicName: '',
      expose: false,
      reason: 'Governed hidden publication suppresses public author listing/profile.',
    })
  }

  if (input.anonymousPublication) {
    return buildIdentity({
      mode: 'ANONYMOUS',
      publicName: 'Anonymous',
      expose: false,
      reason: 'Governed anonymous publication suppresses personal author identity.',
    })
  }

  return buildIdentity({
    mode: 'PUBLIC',
    publicName: governedPublicAuthorName || publicAuthorName || legalName,
    expose: true,
    reason: DEFAULT_PUBLIC_IDENTITY.reason,
  })
}

export function suppressesPersonalAuthorIdentity(identity: Pick<PublicAuthorIdentity, 'mode'>) {
  return identity.mode === 'ANONYMOUS' || identity.mode === 'HIDDEN'
}

export function isSuppressedPublicAuthorSlug(slug?: string) {
  const normalizedSlug = slugify(slug)
  if (!normalizedSlug) return false

  return GOVERNED_AUTHOR_PUBLICATION_POLICIES.some((record) => {
    const suppressesProfile =
      record.mode === 'ANONYMOUS' || record.mode === 'HIDDEN'
    return suppressesProfile && record.legalAuthorNames.some((name) => slugify(name) === normalizedSlug)
  })
}

function buildIdentity(input: {
  mode: PublicAuthorAttributionMode
  publicName: string
  expose: boolean
  reason: string
}): PublicAuthorIdentity {
  const publicName = clean(input.publicName)
  return {
    ...DEFAULT_PUBLIC_IDENTITY,
    mode: input.mode,
    publicAuthorName: publicName,
    publicAttribution: publicName,
    publicSlug: input.expose ? slugify(publicName) : '',
    exposeAuthorProfile: input.expose,
    exposeBiography: input.expose,
    exposeHeadshot: input.expose,
    reason: input.reason,
  }
}

function clean(value?: string) {
  return (value || '').trim()
}

function normalize(value?: string) {
  return clean(value).toLowerCase()
}

function slugify(value?: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
