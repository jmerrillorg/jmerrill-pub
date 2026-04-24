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
    { label: 'Our Books',     href: '/books' },
    { label: 'Authors',       href: '/authors' },
    { label: 'Services',      href: '/services' },
    { label: 'Publishing',    href: '/publishing' },
    { label: 'About',         href: '/about' },
  ],
  partner: {
    label: 'Publishing Partner',
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
export const packages = [
  {
    sku:        'JMP-PKG-STARTER',
    tier:       'Starter',
    price:      1999,
    wordLimit:  '50,000',
    featured:   false,
    features: [
      'Editorial review + copy editing + proofreading',
      'Professional cover design',
      'Interior layout & typesetting',
      'ISBN assignment',
      'IngramSpark + CoreSource distribution',
      'Author Profile Page — included',
      '30-minute publishing consultation',
      '5 complimentary paperback copies',
    ],
  },
  {
    sku:        'JMP-PKG-PRO',
    tier:       'Professional',
    price:      4500,
    wordLimit:  '75,000',
    featured:   true,
    features: [
      'Full line editing + copy editing + proofreading',
      'Enhanced cover design — front, back, spine',
      'Advanced interior layout & typography',
      'ISBN + Copyright + Library of Congress',
      'Advanced metadata optimization',
      'Launch planning session + marketing guidance',
      '60-minute strategy consultation',
      '10 complimentary paperback copies',
    ],
  },
  {
    sku:        'JMP-PKG-SIGNATURE',
    tier:       'Signature',
    price:      7500,
    wordLimit:  '100,000',
    featured:   false,
    features: [
      'Developmental guidance + full editorial suite',
      'Premium cover design + hardcover edition',
      'Advanced layout + distribution strategy',
      'Full marketing launch strategy',
      'Two 60-minute strategy consultations',
      'Dedicated publishing consultant',
      'Ongoing publishing support',
      '15 complimentary paperback copies',
    ],
  },
] as const

// ── SERVICE CATEGORIES ────────────────────────────────────────
export const serviceCategories = [
  { num: '01', icon: '✏️', title: 'Editorial Services',           body: 'Developmental, line, copy editing, proofreading, manuscript evaluation, AI sensitivity reading, and co-author coordination.' },
  { num: '02', icon: '🎨', title: 'Design & Production',          body: 'Cover design, interior layout, eBook conversion, hardcover formatting, large print, devotional formatting, and illustrated books.' },
  { num: '03', icon: '🎙️', title: 'Audiobook Production',         body: 'AI narration from $699 or professional studio narration. Distributed via CoreSource, Findaway Voices, and ACX.' },
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
  { name: 'Lightning Source',   role: 'Premium print distribution' },
  { name: 'CoreSource',         role: 'All digital asset distribution' },
  { name: 'IngramSpark',        role: 'New author default — free ingestion' },
  { name: 'Ingram iQ',          role: 'Sales analytics & market data' },
  { name: 'OverDrive / Libby',  role: 'Library digital access' },
  { name: 'ACX / Findaway',     role: 'Audiobook distribution' },
  { name: 'Apple Books',        role: 'Global digital retail' },
  { name: 'Baker & Taylor',     role: 'Wholesale & library print' },
] as const

// ── FOOTER LINKS ──────────────────────────────────────────────
export const footerLinks = {
  services: [
    { label: 'Publishing Packages', href: '/packages' },
    { label: 'Editorial Services',  href: '/services' },
    { label: 'Audiobook Production',href: '/services#audio' },
    { label: 'Marketing & Launch',  href: '/services#marketing' },
    { label: 'Faith Market',        href: '/services#faith' },
    { label: 'View Full Catalog',   href: '/services' },
  ],
  company: [
    { label: 'About JMP',              href: '/about' },
    { label: 'Authors',                href: '/authors' },
    { label: 'Author Journey',         href: '/author-journey' },
    { label: 'Our Books',              href: '/books' },
    { label: 'Readers',                href: '/readers' },
    { label: 'Publishing',             href: '/publishing' },
    { label: 'Pricing',                href: '/packages' },
    { label: 'Publishing Partner',     href: '/publishing-partner' },
    { label: 'Distribution',           href: '/distribution' },
    { label: 'Platform Roadmap',       href: '/platform' },
    { label: 'Contact',                href: '/contact' },
    { label: 'Advertising (iD)',       href: '/advertising' },
    { label: 'Join the Family',        href: '/join' },
    { label: 'Schedule a Call',        href: 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled' },
  ],
  memberships: [
    { label: 'Community — $79/mo',  href: '/memberships' },
    { label: 'Support — $149/mo',   href: '/memberships' },
    { label: 'Marketing — $199/mo', href: '/memberships' },
    { label: 'AI Author — $249/mo', href: '/memberships' },
  ],
  enterprise: [
    { label: 'J Merrill One ↗',     href: 'https://www.jmerrill.one' },
    { label: 'JM Financial ↗',      href: 'https://www.jmerrill.financial' },
    { label: 'JM Foundation ↗',     href: 'https://www.jmerrill.foundation' },
    { label: 'JM Productions ↗',    href: 'https://productions.jmerrill.one' },
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
