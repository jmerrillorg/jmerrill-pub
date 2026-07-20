import { packages as commercialPackages } from './commercial/catalog'

// ─────────────────────────────────────────────────────────────
// lib/tokens.ts
// J Merrill One — Design Token System
// Publishing Division (jmerrill.pub)
// Governed by JM1 Canon v1 + Addendum v1.1
// ─────────────────────────────────────────────────────────────

// ── JM1 MASTER PALETTE (parent-controlled, do not override) ──
export const jm1 = {
  primary:    '#002C54',
  secondary:  '#A3C4DC',
  accent:     '#F4B400',
  text:       '#111111',
  background: '#FFFFFF',
  dark:       '#0A1F33',
  surface:    '#112E4A',
} as const

// ── PUBLISHING DIVISION PALETTE ──────────────────────────────
// Source: JM1 Canon v1 / lib/divisions.ts → publishing
export const pub = {
  // Brand
  primary:    '#1E90FF',   // Dodger Blue
  secondary:  '#6A5ACD',   // Slate Blue
  accent:     '#A3C4DC',   // Sky Blue (JM1 accent)

  // Extended
  darkBg:     '#0F1C2E',
  surface:    '#0F1C2E',

  // Semantic
  white:      '#FFFFFF',
  paper:      '#F7F8FA',
  offWhite:   '#F2F4F7',
  charcoal:   '#111111',
  ink:        '#0D0D10',

  // Grays
  gray100:    '#F2F3F5',
  gray200:    '#E4E6EA',
  gray300:    '#C8CBD2',
  gray400:    '#8A8F9A',
  gray500:    '#4A4E58',

  // Blue scale
  blue50:     '#E8F3FF',
  blue100:    '#C2DEFF',
  blue200:    '#8BBFFF',
  blue500:    '#1E90FF',
  blue600:    '#0A7AE8',
  blue700:    '#005FC0',
  blue900:    '#001E4A',

  // Slate scale
  slate50:    '#EEEDF8',
  slate100:   '#D5D2F0',
  slate500:   '#6A5ACD',
  slate700:   '#4A3DAD',
} as const

// ── TYPOGRAPHY ────────────────────────────────────────────────
// JM1 Canon: serif display + clean sans body + mono for system
export const typography = {
  display:  "'Libre Baskerville', Georgia, serif",
  body:     "'Outfit', system-ui, sans-serif",
  mono:     "'DM Mono', 'Courier New', monospace",
} as const

// ── DIVISION METADATA ─────────────────────────────────────────
export const division = {
  id:         'publishing',
  number:     '01',
  name:       'J Merrill Publishing',
  shortName:  'Publishing',
  tagline:    'Helping authors help themselves.',
  why:        'What you write should not disappear.',
  domain:     'jmerrill.pub',
  parent:     'jmerrill.one',
  color:      pub.primary,
  colorName:  'Dodger Blue',
  theme:      'Vision, Creativity, Innovation',
  founder:    'Jackie Smith, Jr.',
  founderTitle: 'Founder & CEO · J Merrill One',
  established: 'Columbus, OH',
  stats: {
    titles:    '125+',
    services:  '95+',
    categories:'16',
    reach:     'Global',
  },
} as const

// ── NAVIGATION ────────────────────────────────────────────────
export const nav = {
  primary: [
    { label: 'Publish With Us', href: '/publishing' },
    { label: 'How It Works',    href: '/author-journey' },
    { label: 'Publishing Paths', href: '/packages' },
    { label: 'Services',        href: '/services' },
    { label: 'Books',           href: '/books' },
    { label: 'Authors',         href: '/authors' },
    { label: 'Author Hub',      href: '/author' },
    { label: 'About',           href: '/about' },
  ],
  partner: {
    label: 'JM Prestige',
    href:  '/publishing-partner',
  },
  cta: {
    label:  'Join the Family',
    href:   '/join',
  },
  secondary: {
    label: 'Schedule a Consultation',
    href:  'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled',
  },
  parent: {
    label: 'J Merrill One ↗',
    href:  'https://www.jmerrill.one',
  },
} as const

// ── PACKAGES ──────────────────────────────────────────────────
// Source: JMP Package, Edition, Program, Pricing & SKU Matrix v1.1.
export const packages = commercialPackages.map((pkg) => ({
  sku: pkg.sku,
  tier: pkg.tier,
  price: pkg.price.amount,
  wordLimit:
    pkg.sku === 'JMP-PKG-STARTER'
      ? 'Scope reviewed during fit'
      : pkg.sku === 'JMP-PKG-PRO'
        ? 'Expanded scope reviewed during fit'
        : 'Large / complex manuscripts',
  editionSlots: pkg.editionSlots,
  audiobookPolicy: pkg.audiobookPolicy,
  featured: pkg.featured,
  features: [
    `${pkg.editionSlots} edition slots — author's choice from eligible formats`,
    pkg.audiobookPolicy,
    'Editorial, production, distribution, and launch scope resolved by governed package fit',
    'Standard ebooks are born-accessible whenever selected or purchased',
    'Premium editions and add-ons resolve from governed Price Rule records',
  ],
}))

// ── SERVICE CATEGORIES ────────────────────────────────────────
export const serviceCategories = [
  { num: '01', icon: '✏️', title: 'Editorial Services',           body: 'Developmental, line, copy editing, proofreading, manuscript evaluation, AI sensitivity reading, and co-author coordination.' },
  { num: '02', icon: '🎨', title: 'Design & Production',          body: 'Cover design, interior layout, eBook conversion, hardcover formatting, large print, devotional formatting, and illustrated books.' },
  { num: '03', icon: '🎙️', title: 'Audiobook Production',         body: 'AI narration from $500 through 8 finished hours, with human narration quoted per finished hour. Distributed through approved audiobook channels.' },
  { num: '04', icon: '🤖', title: 'AI Publishing Intelligence',   body: 'Manuscript analysis, metadata optimization, AI marketing kits, sensitivity reading, and cover concept ideation.' },
  { num: '05', icon: '📣', title: 'Marketing & Launch',           body: 'Launch strategy, ARC campaigns, Amazon ads, press releases, BookTok video packages, and complete launch programs.' },
  { num: '06', icon: '⛪', title: 'Faith Market Distribution',    body: 'CBA positioning, church bookstore placement, Bible study kit creation, ministry bulk licensing, and conference sales.' },
  { num: '07', icon: '🌐', title: 'Author Platform',              body: 'Websites, branding, speaking kits, DTC store setup, email newsletters, reader communities, and lead funnels.' },
  { num: '08', icon: '📚', title: "Children's Publishing",        body: 'Illustrated book layout, production setup, illustration services, and complete children\'s publishing packages.' },
] as const

// ── MEMBERSHIPS ───────────────────────────────────────────────
export const memberships = [
  {
    sku:   'JMP-SUB-COMMUNITY',
    tier:  'Community',
    price: 79,
    name:  'Author Community',
    features: ['JMP author community access', 'Quarterly group webinars', 'Monthly author newsletter', 'Private resource library'],
    highlight: false,
  },
  {
    sku:   'JMP-SUB-SUPPORT',
    tier:  'Support',
    price: 149,
    name:  'Author Support',
    features: ['Everything in Community', '30-min monthly consultation', 'Manuscript review feedback', 'Royalty reporting dashboard'],
    highlight: false,
  },
  {
    sku:   'JMP-SUB-MARKETING',
    tier:  'Marketing',
    price: 199,
    name:  'Marketing Support',
    features: ['Everything in Support', 'Monthly marketing session', 'Campaign guidance', 'Promotional copy assistance'],
    highlight: true,
  },
  {
    sku:   'JMP-SUB-AI',
    tier:  'AI Plan',
    price: 249,
    name:  'AI Author Plan',
    features: ['Everything in Marketing', 'AI manuscript analysis', 'AI marketing asset generation', 'Early access to new AI features'],
    highlight: false,
  },
] as const

// ── DISTRIBUTION INFRASTRUCTURE ───────────────────────────────
export const distribution = [
  { name: 'Ingram Content',     role: 'Print, digital, and wholesale distribution' },
  { name: 'Ingram iQ',          role: 'Sales analytics & market data' },
  { name: 'Retail & library channels', role: 'Global reader access across major outlets' },
  { name: 'OverDrive / Libby',  role: 'Library digital access' },
  { name: 'ACX / Findaway',     role: 'Audiobook distribution' },
  { name: 'Apple Books',        role: 'Global digital retail' },
  { name: 'Baker & Taylor',     role: 'Wholesale & library print' },
] as const

// ── FOOTER LINKS ──────────────────────────────────────────────
export const footerLinks = {
  startHere: [
    { label: 'Publish With Us',          href: '/publishing' },
    { label: 'How It Works',             href: '/author-journey' },
    { label: 'Author Hub',               href: '/author' },
    { label: 'Join the Family',          href: '/join' },
    { label: 'Schedule a Consultation',  href: 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled' },
  ],
  publishingPaths: [
    { label: 'Publishing Paths', href: '/packages' },
    { label: 'Services',         href: '/services' },
    { label: 'JM Prestige',      href: '/publishing-partner' },
    { label: 'Distribution',     href: '/distribution' },
  ],
  proof: [
    { label: 'Books',    href: '/books' },
    { label: 'Authors',  href: '/authors' },
    { label: 'Imprints', href: '/imprints' },
  ],
  authorSupport: [
    { label: 'Memberships', href: '/memberships' },
    { label: 'Contact',     href: '/contact' },
    { label: 'Readers',     href: '/readers' },
  ],
  company: [
    { label: 'About',    href: '/about' },
    { label: 'Platform', href: '/platform' },
    { label: 'Privacy',  href: '/privacy' },
    { label: 'Terms',    href: '/terms' },
  ],
  jm1Network: [
    { label: 'J Merrill One ↗',         href: 'https://www.jmerrill.one' },
    { label: 'J Merrill Financial ↗',   href: 'https://www.jmerrill.financial' },
    { label: 'J Merrill Foundation ↗',  href: 'https://www.jmerrill.foundation' },
    { label: 'J Merrill Productions ↗', href: 'https://productions.jmerrill.one' },
  ],
} as const

// ── IMPRINT SYSTEM ────────────────────────────────────────────
// Distribution imprint (Ingram/CoreSource): "J Merrill Publishing, Inc." — unchanged
// Display imprint (website/marketing): assigned per title via books.json
// Governed by JM1 Imprint Strategy — locked architecture

export const imprints = [
  {
    id:          'publishing',
    name:        'J Merrill Publishing',
    tagline:     'The flagship publishing imprint.',
    description: 'The core J Merrill Publishing imprint — the flagship home for books that sit directly under the primary publishing brand.',
    genres:      ['All genres', 'Multi-format', 'Flagship titles'],
    color:       '#1E90FF',
    textColor:   'white',
    bg:          '#0F1C2E',
    titleCount:  '125+',
    href:        '/books?imprint=publishing',
  },
  {
    id:          'little',
    name:        'JM Little',
    tagline:     'For younger readers and growing imaginations.',
    description: 'The children\'s and youth-facing imprint within the J Merrill Publishing system.',
    genres:      ["Children's", 'Picture books', 'Youth', 'Family titles'],
    color:       '#F4B400',
    textColor:   'white',
    bg:          '#2A1F05',
    titleCount:  'Select titles',
    href:        '/books?imprint=little',
  },
  {
    id:          'verse',
    name:        'JM Verse',
    tagline:     'Poetry, verse, and lyrical work.',
    description: 'The imprint for poetic, lyrical, and verse-centered publishing within the flagship catalog.',
    genres:      ['Poetry', 'Verse', 'Lyrical work'],
    color:       '#6A5ACD',
    textColor:   'white',
    bg:          '#1A1040',
    titleCount:  'Select titles',
    href:        '/books?imprint=verse',
  },
  {
    id:          'signature',
    name:        'JM Signature',
    tagline:     'Marquee and prestige publishing.',
    description: 'A selective imprint for signature releases and prestige-positioned books in the J Merrill Publishing system.',
    genres:      ['Prestige titles', 'Marquee releases', 'Selective placement'],
    color:       '#A3C4DC',
    textColor:   'white',
    bg:          '#0F2431',
    titleCount:  'Select titles',
    href:        '/books?imprint=signature',
  },
  {
    id:          'works',
    name:        'JM Works',
    tagline:     'General trade and inspirational publishing.',
    description: 'A broad trade-facing imprint for inspirational, nonfiction, memoir, and general market work across the catalog.',
    genres:      ['General trade', 'Inspirational', 'Memoir', 'Nonfiction'],
    color:       '#4AA3A2',
    textColor:   'white',
    bg:          '#0A1E1E',
    titleCount:  'Select titles',
    href:        '/books?imprint=works',
  },
] as const

export type ImprintId = typeof imprints[number]['id']
