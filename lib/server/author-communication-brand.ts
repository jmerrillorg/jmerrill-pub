// Engine: Communications Engine
// Reusable? Y
// Stage-specific exception? N

import { createHash } from 'node:crypto'
import {
  JM1_COMMUNICATION_BRANDS,
  JM1_ENTERPRISE_COMMUNICATION_STANDARD,
  messageTitleFromSubject,
  renderJm1EnterpriseCommunication,
  signatureForBrand,
  validateJm1EnterpriseCommunication,
} from './jm1-enterprise-communication-renderer'
import {
  AUTHOR_FACING_ACTOR_TERMINOLOGY_RULE,
  validateAuthorFacingPublishingActorTerminology,
} from './author-facing-terminology'

export const AUTHOR_COMMUNICATION_BRAND = {
  templateFamily: 'JM1_AUTHOR_COMMUNICATION',
  enterpriseStandard: JM1_ENTERPRISE_COMMUNICATION_STANDARD.name,
  brandName: JM1_COMMUNICATION_BRANDS.publishing.brandName,
  divisionLine: JM1_COMMUNICATION_BRANDS.publishing.divisionRelationship,
  promiseLine: JM1_COMMUNICATION_BRANDS.publishing.tagline,
  primaryColor: '#1D4ED8',
  secondaryColor: '#111827',
  accentColor: '#C8A45D',
  backgroundColor: '#F8FAFC',
  panelColor: '#FFFFFF',
  textColor: '#111827',
  mutedTextColor: '#4B5563',
  borderColor: '#D8DEE9',
  contactLine: '614.965.6057 · publishing@jmerrill.one · jmerrill.pub',
  signature: signatureForBrand('publishing'),
} as const

export const AUTHOR_FACING_RENDER_MODES = {
  canonicalHtml: 'CANONICAL_HTML',
  plainTextAuthorized: 'PLAIN_TEXT_AUTHORIZED',
} as const

export type AuthorFacingRenderMode = typeof AUTHOR_FACING_RENDER_MODES[keyof typeof AUTHOR_FACING_RENDER_MODES]

export const AUTHOR_FACING_COMMUNICATION_RENDER_MATRIX = [
  { communicationType: 'status update', templateName: 'AUTHOR_STATUS_UPDATE_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'ACTIVE_GOVERNED' },
  { communicationType: 'cover review', templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'ACTIVE_GOVERNED' },
  { communicationType: 'interior/proof review', templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'ACTIVE_GOVERNED' },
  { communicationType: 'editorial review', templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'ACTIVE_GOVERNED' },
  { communicationType: 'decision request', templateName: 'AUTHOR_DECISION_REQUEST_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'correction/revision', templateName: 'AUTHOR_CORRECTION_REQUEST_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'onboarding', templateName: 'AUTHOR_ONBOARDING_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'production update', templateName: 'AUTHOR_PRODUCTION_UPDATE_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'distribution/release', templateName: 'AUTHOR_DISTRIBUTION_RELEASE_UPDATE_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'launch', templateName: 'AUTHOR_LAUNCH_COMMUNICATION_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'post-publication', templateName: 'AUTHOR_POST_PUBLICATION_UPDATE_V1', renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml, state: 'PLANNED_GOVERNED' },
  { communicationType: 'plain text exception', templateName: 'AUTHOR_PLAIN_TEXT_ADMIN_NOTICE_V1', renderMode: AUTHOR_FACING_RENDER_MODES.plainTextAuthorized, state: 'EXPLICIT_EXCEPTION_ONLY' },
] as const

export type AuthorCommunicationRenderInput = {
  templateName: string
  templateVersion: string
  subject: string
  authorName: string
  titleName: string
  preheader: string
  why: string
  completed: string[]
  meaning: string
  authorAction: string
  primaryActionLabel: string
  primaryActionUrl: string
  packageInventory?: string[]
  responseChoices?: string[]
  deadline?: string
  nextSteps: string[]
  supportNote?: string
  operationalNote?: string
}

export type RenderedAuthorCommunication = {
  subject: string
  html: string
  text: string
  metadata: {
    templateName: string
    templateVersion: string
    brandSystem: typeof AUTHOR_COMMUNICATION_BRAND.templateFamily
    enterpriseStandard: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.name
    renderer: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererName
    rendererVersion: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererVersion
    renderMode: typeof AUTHOR_FACING_RENDER_MODES.canonicalHtml
    renderTemplateGuard: 'PASS'
    qualityGate: 'PASS'
    htmlSha256: string
    textSha256: string
  }
}

export function renderAuthorCommunicationEmail(input: AuthorCommunicationRenderInput): RenderedAuthorCommunication {
  const normalized = normalizeInput(input)
  const contentTitle = messageTitleFor(normalized)
  const rendered = renderJm1EnterpriseCommunication({
    brand: 'publishing',
    executionAuthority: {
      authoritySource: 'JM1 Governed Bootstrap',
      renderAllowed: true,
      communicationAllowed: false,
      responseClockAuthorized: Boolean(normalized.deadline),
    },
    templateName: normalized.templateName,
    templateVersion: normalized.templateVersion,
    subject: normalized.subject,
    recipientName: normalized.authorName,
    title: contentTitle,
    subtitle: normalized.titleName,
    preheader: normalized.preheader,
    reason: normalized.why,
    summaryItems: normalized.completed,
    attachments: normalized.packageInventory,
    reviewPrompt: normalized.meaning,
    actionLabel: normalized.primaryActionLabel,
    actionUrl: normalized.primaryActionUrl,
    actionInstruction: normalized.authorAction,
    responseWindow: normalized.deadline,
    timelineItems: normalized.nextSteps,
    supportNote: normalized.supportNote,
    operationalNote: normalized.operationalNote,
  })
  const text = rendered.text
  const html = rendered.html
  const validation = validateAuthorCommunicationEmail({
    html,
    text,
    templateName: normalized.templateName,
    templateVersion: normalized.templateVersion,
  })
  if (!validation.ok) throw new Error(validation.blocker)
  return {
    subject: normalized.subject,
    html,
    text,
    metadata: {
      templateName: normalized.templateName,
      templateVersion: normalized.templateVersion,
      brandSystem: AUTHOR_COMMUNICATION_BRAND.templateFamily,
      enterpriseStandard: JM1_ENTERPRISE_COMMUNICATION_STANDARD.name,
      renderer: rendered.metadata.renderer,
      rendererVersion: rendered.metadata.rendererVersion,
      renderMode: AUTHOR_FACING_RENDER_MODES.canonicalHtml,
      renderTemplateGuard: 'PASS',
      qualityGate: 'PASS',
      htmlSha256: sha256(html),
      textSha256: sha256(text),
    },
  }
}

export function validateAuthorCommunicationEmail(input: {
  html?: string | null
  text?: string | null
  templateName?: string | null
  templateVersion?: string | null
}): { ok: true } | { ok: false; blocker: string } {
  const html = input.html?.trim() || ''
  const text = input.text?.trim() || ''
  const blockers: string[] = []

  if (!input.templateName?.trim()) blockers.push('TEMPLATE_NAME_MISSING')
  if (!input.templateVersion?.trim()) blockers.push('TEMPLATE_VERSION_MISSING')
  if (!html) blockers.push('HTML_BODY_MISSING')
  if (!text) blockers.push('PLAIN_TEXT_BODY_MISSING')
  if (!/<!doctype html>/i.test(html)) blockers.push('HTML_DOCTYPE_MISSING')
  if (!/<table\b/i.test(html)) blockers.push('EMAIL_TABLE_LAYOUT_MISSING')
  if (/<script\b|<link\b|<iframe\b|<form\b/i.test(html)) blockers.push('UNSUPPORTED_EMAIL_MARKUP')
  if (!html.includes(AUTHOR_COMMUNICATION_BRAND.brandName)) blockers.push('BRAND_HEADER_MISSING')
  if (!html.includes(AUTHOR_COMMUNICATION_BRAND.divisionLine)) blockers.push('DIVISION_LINE_MISSING')
  if (!html.includes(AUTHOR_COMMUNICATION_BRAND.promiseLine)) blockers.push('PROMISE_LINE_MISSING')
  const enterpriseValidation = validateJm1EnterpriseCommunication({ html, text, brand: 'publishing' })
  if (!enterpriseValidation.ok) blockers.push(enterpriseValidation.blocker)
  if (new RegExp(`<h1[^>]*>\\s*${escapeRegExp(AUTHOR_COMMUNICATION_BRAND.brandName)}\\s*</h1>`, 'i').test(html)) {
    blockers.push('BRAND_NAME_RENDERED_AS_MESSAGE_H1')
  }
  if (/<h1[^>]*>\s*(Warmly|J Merrill Publishing)\s*<\/h1>/i.test(html)) blockers.push('INVENTED_CLOSING_OR_BRAND_H1')
  if (/\nWarmly,\s*\nJ Merrill Publishing\b/i.test(text)) blockers.push('INVENTED_CLOSING_PRESENT')
  if (!html.includes('Why you are receiving this')) blockers.push('WHY_FIRST_BLOCK_MISSING')
  if (!html.includes("What's attached") && !html.includes('What&#39;s attached')) blockers.push('ATTACHMENT_BLOCK_MISSING')
  if (!/What we need from you/.test(html)) blockers.push('AUTHOR_REVIEW_BLOCK_MISSING')
  if (!html.includes('How to respond')) blockers.push('AUTHOR_ACTION_BLOCK_MISSING')
  if (!html.includes('What happens next')) blockers.push('NEXT_STEPS_BLOCK_MISSING')
  if (!/<a\b[^>]+href="https:\/\/[^"]+"/i.test(html)) blockers.push('PRIMARY_ACTION_LINK_MISSING')
  if (/<span[^>]*>\s*(Review Package and Reply|Approve|Review)/i.test(html) && !/<a\b[^>]*>\s*(Review Package and Reply|Approve|Review)/i.test(html)) {
    blockers.push('PRIMARY_ACTION_NOT_CLICKABLE')
  }
  if (!text.includes('Why you are receiving this')) blockers.push('PLAIN_TEXT_WHY_FIRST_BLOCK_MISSING')
  if (!text.includes("What's attached")) blockers.push('PLAIN_TEXT_ATTACHMENT_BLOCK_MISSING')
  if (!text.includes('What we need from you')) blockers.push('PLAIN_TEXT_AUTHOR_REVIEW_BLOCK_MISSING')
  if (!text.includes('How to respond')) blockers.push('PLAIN_TEXT_AUTHOR_ACTION_BLOCK_MISSING')
  if (!/Optional Author Operating Center access:\s*https:\/\//i.test(text)) blockers.push('PLAIN_TEXT_OPTIONAL_PORTAL_URL_MISSING')
  if (!text.includes(AUTHOR_COMMUNICATION_BRAND.signature)) blockers.push('PLAIN_TEXT_SIGNATURE_MISSING')
  const terminology = validateAuthorFacingPublishingActorTerminology(`${html}\n${text}`)
  if (!terminology.ok) {
    blockers.push(`STANDALONE_PUBLISHING_ACTOR_TERMINOLOGY - ${AUTHOR_FACING_ACTOR_TERMINOLOGY_RULE}`)
  }

  return blockers.length
    ? { ok: false, blocker: `AUTHOR_COMMUNICATION_BLOCKED - ${blockers.join(',')}` }
    : { ok: true }
}

export function validateAuthorCommunicationRenderContract(input: {
  html?: string | null
  text?: string | null
  templateName?: string | null
  templateVersion?: string | null
  channel?: 'EMAIL' | string | null
  authorFacing?: boolean | null
  renderMode?: AuthorFacingRenderMode | null
  templateMetadata?: Record<string, unknown> | null
}): {
  ok: boolean
  brandLanguageGuard: 'PASS' | 'FAIL'
  leakageGuard: 'PASS' | 'FAIL'
  renderTemplateGuard: 'PASS' | 'FAIL'
  blockers: string[]
  renderMode: AuthorFacingRenderMode
  communicationType: string
} {
  const templateName = input.templateName?.trim() || ''
  const templateVersion = input.templateVersion?.trim() || ''
  const html = input.html?.trim() || ''
  const text = input.text?.trim() || ''
  const policy = AUTHOR_FACING_COMMUNICATION_RENDER_MATRIX.find((row) => row.templateName === templateName)
  const renderMode = input.renderMode || policy?.renderMode || AUTHOR_FACING_RENDER_MODES.canonicalHtml
  const blockers: string[] = []
  const brandBlockers: string[] = []
  const leakageBlockers: string[] = []
  const renderBlockers: string[] = []
  const authorFacingEmail = input.authorFacing !== false && (input.channel || 'EMAIL') === 'EMAIL'

  if (authorFacingEmail && !policy) renderBlockers.push('UNKNOWN_AUTHOR_FACING_EMAIL_TYPE')
  if (!templateName) renderBlockers.push('TEMPLATE_NAME_MISSING')
  if (!templateVersion) renderBlockers.push('TEMPLATE_VERSION_MISSING')

  const combined = `${html}\n${text}`
  if (!combined.includes(AUTHOR_COMMUNICATION_BRAND.brandName)) brandBlockers.push('BRAND_NAME_MISSING')
  if (html && !html.includes(AUTHOR_COMMUNICATION_BRAND.divisionLine)) brandBlockers.push('DIVISION_LINE_MISSING')
  if (html && !html.includes(AUTHOR_COMMUNICATION_BRAND.promiseLine)) brandBlockers.push('PROMISE_LINE_MISSING')
  const terminology = validateAuthorFacingPublishingActorTerminology(combined)
  if (!terminology.ok) brandBlockers.push('AUTHOR_FACING_TERMINOLOGY_BLOCKED')

  if (/\b(Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file)\b/i.test(combined)) {
    leakageBlockers.push('INTERNAL_ARTIFACT_LANGUAGE_EXPOSED')
  }

  if (renderMode === AUTHOR_FACING_RENDER_MODES.plainTextAuthorized) {
    if (policy?.renderMode !== AUTHOR_FACING_RENDER_MODES.plainTextAuthorized) renderBlockers.push('PLAIN_TEXT_NOT_AUTHORIZED')
    if (!text) renderBlockers.push('PLAIN_TEXT_BODY_MISSING')
  } else {
    const validation = validateAuthorCommunicationEmail({ html, text, templateName, templateVersion })
    if (!validation.ok) renderBlockers.push(validation.blocker)
    const metadata = input.templateMetadata || {}
    if (metadata.renderMode !== AUTHOR_FACING_RENDER_MODES.canonicalHtml) renderBlockers.push('CANONICAL_RENDER_MODE_METADATA_MISSING')
    if (metadata.renderTemplateGuard !== 'PASS') renderBlockers.push('CANONICAL_RENDER_TEMPLATE_GUARD_METADATA_MISSING')
    if (metadata.renderer !== JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererName) renderBlockers.push('CANONICAL_RENDERER_METADATA_MISSING')
    if (!/<a\b[^>]+href="https:\/\/[^"]+"[^>]+style="[^"]*(display:inline-block|background:)/i.test(html)) {
      renderBlockers.push('CTA_BUTTON_TREATMENT_MISSING')
    }
  }

  blockers.push(...brandBlockers, ...leakageBlockers, ...renderBlockers)
  return {
    ok: blockers.length === 0,
    brandLanguageGuard: brandBlockers.length ? 'FAIL' : 'PASS',
    leakageGuard: leakageBlockers.length ? 'FAIL' : 'PASS',
    renderTemplateGuard: renderBlockers.length ? 'FAIL' : 'PASS',
    blockers,
    renderMode,
    communicationType: policy?.communicationType || 'unknown',
  }
}

export function renderCoverReviewAuthorCommunication(input: {
  authorName: string
  titleName: string
  primaryActionUrl: string
  artifactLabel?: string
}): RenderedAuthorCommunication {
  return renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    subject: `Cover Design Review - ${input.titleName}`,
    authorName: input.authorName,
    titleName: input.titleName,
    preheader: `Your cover design review package for ${input.titleName} is ready.`,
    why: `The Publishing Team has prepared a cover design review package for ${input.titleName}.`,
    completed: [
      'The proposed cover concept is ready for your review.',
      'The cover review instructions are included with the package.',
      'Your Author Operating Center has been updated for reference.',
    ],
    meaning: 'Please review the cover concept and reply with your approval, requested corrections, or questions. This review covers the proposed cover direction only.',
    authorAction: 'Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions. You may include one consolidated correction list in your reply.',
    primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: input.primaryActionUrl,
    packageInventory: [
      input.artifactLabel || 'Proposed cover concept image',
      'Cover review instructions',
    ],
    nextSteps: [
      'The Publishing Team records your response.',
      'Approved corrections or approval will move cover production to the next governed step.',
      'If you have questions, reply directly to this message.',
    ],
    supportNote: 'If anything is unclear, reply to this email and the Publishing Team will help.',
    operationalNote: 'This message does not approve publication, change your publishing agreement, or start a review period by itself.',
  })
}

function normalizeInput(input: AuthorCommunicationRenderInput): AuthorCommunicationRenderInput {
  return {
    ...input,
    templateName: required(input.templateName, 'templateName'),
    templateVersion: required(input.templateVersion, 'templateVersion'),
    subject: validateSubject(required(input.subject, 'subject')),
    authorName: required(input.authorName, 'authorName'),
    titleName: required(input.titleName, 'titleName'),
    preheader: required(input.preheader, 'preheader'),
    why: required(input.why, 'why'),
    completed: input.completed.map((item) => required(item, 'completed item')),
    meaning: required(input.meaning, 'meaning'),
    authorAction: required(input.authorAction, 'authorAction'),
    primaryActionLabel: required(input.primaryActionLabel, 'primaryActionLabel'),
    primaryActionUrl: validatePrimaryActionUrl(required(input.primaryActionUrl, 'primaryActionUrl')),
    packageInventory: input.packageInventory?.map((item) => required(item, 'package inventory item')) || [
      'Current manuscript or proof',
      'Review instructions',
      "Editor's notes when applicable",
    ],
    responseChoices: input.responseChoices?.map((item) => required(item, 'response choice')) || [
      'Approve as presented',
      'Approve with corrections',
      'Questions or clarification requested',
    ],
    nextSteps: input.nextSteps.map((item) => required(item, 'next step')),
    supportNote: input.supportNote?.trim() || 'If anything is unclear, reply to this email and the publishing team will help.',
    operationalNote: input.operationalNote?.trim() || 'This message does not change your publishing agreement or approve publication by itself.',
  }
}

function required(value: string, name: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`AUTHOR_COMMUNICATION_BLOCKED - ${name.toUpperCase().replaceAll(' ', '_')}_MISSING`)
  return normalized
}

function validatePrimaryActionUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('AUTHOR_COMMUNICATION_BLOCKED - PRIMARY_ACTION_URL_INVALID')
  }
  if (url.protocol !== 'https:') throw new Error('AUTHOR_COMMUNICATION_BLOCKED - PRIMARY_ACTION_URL_NOT_HTTPS')
  if (!/jmerrill\.pub$/i.test(url.hostname)) throw new Error('AUTHOR_COMMUNICATION_BLOCKED - PRIMARY_ACTION_URL_NOT_AUTHOR_PORTAL')
  if (url.hash === '#' || value.includes('javascript:')) throw new Error('AUTHOR_COMMUNICATION_BLOCKED - PRIMARY_ACTION_URL_UNSAFE')
  return url.toString()
}

function validateSubject(value: string) {
  if (/\b(Review|Package|Corrected)\s+\1\b/i.test(value)) {
    throw new Error('AUTHOR_COMMUNICATION_BLOCKED - SUBJECT_DUPLICATED_WORD')
  }
  return value
}

function messageTitleFor(input: AuthorCommunicationRenderInput) {
  return messageTitleFromSubject(input.subject, input.titleName)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}
