// Engine: JM1 Enterprise Design Tokens
// Reusable? Y
// Stage-specific exception? N

export const JM1_ENTERPRISE_DESIGN_TOKENS = {
  version: '1.0.0',
  colors: {
    enterpriseNavy: '#111827',
    enterpriseGold: '#C8A45D',
    neutralBackground: '#F8FAFC',
    surfaceWhite: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    border: '#D8DEE9',
    primaryCta: '#1D4ED8',
    focusState: '#2563EB',
    error: '#B91C1C',
    success: '#047857',
  },
  typography: {
    headingXL: '22px',
    headingL: '18px',
    headingM: '16px',
    body: '15px',
    caption: '13px',
    metadata: '12px',
  },
} as const

export type Jm1BrandOverlayKey =
  | 'corporate'
  | 'publishing'
  | 'financial'
  | 'foundation'
  | 'productions'
  | 'agapeInternationalCathedral'

export type Jm1BrandOverlay = {
  brandName: string
  legalEntityName: string
  teamName: string
  divisionRelationship: string
  phone: string
  email: string
  website: string
  tagline: string
  logoPath: string | null
  approvedAccent: string | null
  sender?: string
  replyTo?: string
  archiveMailbox?: string
}

export const JM1_BRAND_OVERLAYS: Record<Jm1BrandOverlayKey, Jm1BrandOverlay> = {
  corporate: {
    brandName: 'J MERRILL ONE',
    legalEntityName: 'J Merrill One',
    teamName: 'The JM1 Team',
    divisionRelationship: 'Enterprise Office',
    phone: '614.965.6057',
    email: 'hello@jmerrill.one',
    website: 'jmerrill.one',
    tagline: 'Human-First Systems for Purpose-Driven Work.',
    logoPath: null,
    approvedAccent: null,
  },
  publishing: {
    brandName: 'J MERRILL PUBLISHING',
    legalEntityName: 'J Merrill Publishing, Inc.',
    teamName: 'The Publishing Team',
    divisionRelationship: 'A Division of J Merrill One',
    phone: '614.965.6057',
    email: 'publishing@jmerrill.one',
    website: 'jmerrill.pub',
    tagline: 'Helping Authors Help Themselves.',
    logoPath: '/Architecture/00_CANON/Publishing/Brand/imprint_pub.png',
    approvedAccent: null,
    sender: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    archiveMailbox: 'publishing@jmerrill.one',
  },
  financial: {
    brandName: 'J MERRILL FINANCIAL',
    legalEntityName: 'J Merrill Financial',
    teamName: 'The Planning Team',
    divisionRelationship: 'A Division of J Merrill One',
    phone: '614.965.6057',
    email: 'financial@jmerrill.one',
    website: 'jmerrill.one',
    tagline: 'Helping Families Plan With Purpose.',
    logoPath: null,
    approvedAccent: null,
  },
  foundation: {
    brandName: 'J MERRILL FOUNDATION',
    legalEntityName: 'J Merrill Foundation, Inc.',
    teamName: 'The Foundation Team',
    divisionRelationship: 'A Division of J Merrill One',
    phone: '614.965.6057',
    email: 'foundation@jmerrill.one',
    website: 'jmerrill.one',
    tagline: 'Helping People Help Themselves.',
    logoPath: null,
    approvedAccent: null,
  },
  productions: {
    brandName: 'J MERRILL PRODUCTIONS',
    legalEntityName: 'J Merrill Productions',
    teamName: 'The Productions Team',
    divisionRelationship: 'A Division of J Merrill One',
    phone: '614.965.6057',
    email: 'productions@jmerrill.one',
    website: 'jmerrill.one',
    tagline: 'Purpose-Driven Creative Work.',
    logoPath: null,
    approvedAccent: null,
  },
  agapeInternationalCathedral: {
    brandName: 'AGAPE INTERNATIONAL CATHEDRAL',
    legalEntityName: 'Agape International Cathedral',
    teamName: 'The Ministry Team',
    divisionRelationship: 'Ministry brand identity governed separately from JM1 commercial imprints',
    phone: '614.965.6057',
    email: 'hello@agape.international',
    website: 'agape.international',
    tagline: 'Serving People With Faith, Purpose, and Care.',
    logoPath: null,
    approvedAccent: null,
  },
}
