// Engine: JM1 Enterprise Communication Renderer
// Reusable? Y
// Stage-specific exception? N

import { createHash } from 'node:crypto'
import {
  JM1_BRAND_OVERLAYS,
  JM1_ENTERPRISE_DESIGN_TOKENS,
  type Jm1BrandOverlayKey,
} from './jm1-enterprise-design-tokens'

export const JM1_ENTERPRISE_COMMUNICATION_STANDARD = {
  name: 'JM1 Enterprise Communication Standard v1.0',
  rendererName: 'JM1 Enterprise Communication Renderer',
  rendererVersion: '1.0.0',
  supportedOutputProfiles: ['EMAIL_HTML', 'EMAIL_TEXT'],
  futureOutputProfiles: ['LETTER', 'PORTAL_NOTICE', 'SMS_SUMMARY', 'REPORT'],
  colors: JM1_ENTERPRISE_DESIGN_TOKENS.colors,
  typography: JM1_ENTERPRISE_DESIGN_TOKENS.typography,
  components: [
    'Brand Header',
    'Hero',
    'Greeting',
    'Purpose',
    'Summary',
    'Attachments',
    'Action Required',
    'Timeline',
    'Support',
    'Signature',
    'Footer',
  ],
} as const

export type Jm1CommunicationBrandKey = Jm1BrandOverlayKey

export const JM1_COMMUNICATION_BRANDS = JM1_BRAND_OVERLAYS

export type Jm1EnterpriseCommunicationInput = {
  brand: Jm1CommunicationBrandKey
  executionAuthority: {
    authoritySource: 'JM1 Governed Bootstrap'
    renderAllowed: boolean
    communicationAllowed: boolean
    responseClockAuthorized?: boolean
  }
  outputProfiles?: ('EMAIL_HTML' | 'EMAIL_TEXT')[]
  templateName: string
  templateVersion: string
  subject: string
  recipientName: string
  title: string
  subtitle?: string
  preheader: string
  reason: string
  summaryItems?: string[]
  attachments?: string[]
  reviewPrompt?: string
  actionLabel: string
  actionUrl: string
  actionInstruction: string
  responseWindow?: string
  timelineItems?: string[]
  supportNote?: string
  operationalNote?: string
}

export type Jm1RenderedEnterpriseCommunication = {
  subject: string
  html: string
  text: string
  metadata: {
    standard: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.name
    renderer: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererName
    rendererVersion: typeof JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererVersion
    templateName: string
    templateVersion: string
    brand: Jm1CommunicationBrandKey
    qualityGate: 'PASS'
    htmlSha256: string
    textSha256: string
  }
}

export function renderJm1EnterpriseCommunication(input: Jm1EnterpriseCommunicationInput): Jm1RenderedEnterpriseCommunication {
  const normalized = normalizeInput(input)
  const authorityValidation = validateExecutionAuthority(normalized)
  if (!authorityValidation.ok) throw new Error(authorityValidation.blocker)
  const brandValidation = validateBrandSignatureConfiguration(normalized.brand)
  if (!brandValidation.ok) throw new Error(brandValidation.blocker)
  const html = renderHtml(normalized)
  const text = renderText(normalized)
  const validation = validateJm1EnterpriseCommunication({ html, text, brand: normalized.brand })
  if (!validation.ok) throw new Error(validation.blocker)
  return {
    subject: normalized.subject,
    html,
    text,
    metadata: {
      standard: JM1_ENTERPRISE_COMMUNICATION_STANDARD.name,
      renderer: JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererName,
      rendererVersion: JM1_ENTERPRISE_COMMUNICATION_STANDARD.rendererVersion,
      templateName: normalized.templateName,
      templateVersion: normalized.templateVersion,
      brand: normalized.brand,
      qualityGate: 'PASS',
      htmlSha256: sha256(html),
      textSha256: sha256(text),
    },
  }
}

export function signatureForBrand(brandKey: Jm1CommunicationBrandKey) {
  const brand = JM1_COMMUNICATION_BRANDS[brandKey]
  if (!brand) throw new Error('BRAND_SIGNATURE_CONFIGURATION_MISSING')
  return [
    brand.teamName,
    brand.legalEntityName,
    brand.divisionRelationship,
    `${brand.phone} · ${brand.email} · ${brand.website}`,
    brand.tagline,
  ].join('\n')
}

export function messageTitleFromSubject(subject: string, subtitle?: string) {
  const title = subtitle?.trim()
  if (!title) return subject.trim()
  return subject.replace(new RegExp(`\\s+[—-]\\s+${escapeRegExp(title)}\\s*$`, 'i'), '').trim()
}

export function validateJm1EnterpriseCommunication(input: {
  html?: string | null
  text?: string | null
  brand?: Jm1CommunicationBrandKey
}): { ok: true } | { ok: false; blocker: string } {
  const html = input.html?.trim() || ''
  const text = input.text?.trim() || ''
  const brand = input.brand ? JM1_COMMUNICATION_BRANDS[input.brand] : undefined
  const blockers: string[] = []

  if (!html) blockers.push('HTML_BODY_MISSING')
  if (!text) blockers.push('PLAIN_TEXT_BODY_MISSING')
  if (!/<!doctype html>/i.test(html)) blockers.push('HTML_DOCTYPE_MISSING')
  if (!/<table\b/i.test(html)) blockers.push('EMAIL_TABLE_LAYOUT_MISSING')
  if (/<script\b|<link\b|<iframe\b|<form\b/i.test(html)) blockers.push('UNSUPPORTED_EMAIL_MARKUP')
  if (brand) {
    if (!html.includes(brand.brandName)) blockers.push('BRAND_HEADER_MISSING')
    if (!text.includes(signatureForBrand(input.brand as Jm1CommunicationBrandKey))) blockers.push('GOVERNED_SIGNATURE_MISSING')
    if (new RegExp(`<h1[^>]*>\\s*${escapeRegExp(brand.brandName)}\\s*</h1>`, 'i').test(html)) {
      blockers.push('BRAND_NAME_RENDERED_AS_MESSAGE_H1')
    }
  }
  if (/\b(manifest|ledger|workflow record|evidence file|internal instruction)\b/i.test(text)) {
    blockers.push('AUTHOR_EMAIL_INTERNAL_ARTIFACT_EXPOSED')
  }
  if (/\bresponse window\b/i.test(text) && !/\bResponse window:\s+\S+/i.test(text)) blockers.push('RESPONSE_WINDOW_INVALID')
  if (/\bresponse clock\b/i.test(text)) blockers.push('RESPONSE_CLOCK_LANGUAGE_UNAUTHORIZED')
  if (/\bmust use the portal|required to use the portal|portal is required\b/i.test(text)) blockers.push('MANDATORY_PORTAL_LANGUAGE')
  if (/<h1[^>]*>\s*(Warmly|J Merrill Publishing)\s*<\/h1>/i.test(html)) blockers.push('INVENTED_CLOSING_OR_BRAND_H1')
  if (/\nWarmly,\s*\nJ Merrill Publishing\b/i.test(text)) blockers.push('INVENTED_CLOSING_PRESENT')
  for (const label of ['Why you are receiving this', 'What has been completed', "What's attached", 'How to respond', 'What happens next', 'Support']) {
    if (!html.includes(label) && !html.includes(escapeHtml(label))) blockers.push(`${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_MISSING`)
    if (!text.includes(label)) blockers.push(`PLAIN_TEXT_${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_MISSING`)
  }
  if (html.includes('What we need from you') !== text.includes('What we need from you')) {
    blockers.push('HTML_TEXT_REVIEW_PROMPT_PARITY_MISSING')
  }
  if (!/<a\b[^>]+href="https:\/\/[^"]+"/i.test(html)) blockers.push('PRIMARY_ACTION_LINK_MISSING')

  return blockers.length ? { ok: false, blocker: `JM1_ECR_BLOCKED - ${blockers.join(',')}` } : { ok: true }
}

function normalizeInput(input: Jm1EnterpriseCommunicationInput): Jm1EnterpriseCommunicationInput {
  return {
    ...input,
    brand: input.brand,
    outputProfiles: input.outputProfiles || ['EMAIL_HTML', 'EMAIL_TEXT'],
    templateName: required(input.templateName, 'templateName'),
    templateVersion: required(input.templateVersion, 'templateVersion'),
    subject: required(input.subject, 'subject'),
    recipientName: required(input.recipientName, 'recipientName'),
    title: required(input.title, 'title'),
    subtitle: input.subtitle?.trim(),
    preheader: required(input.preheader, 'preheader'),
    reason: required(input.reason, 'reason'),
    actionLabel: required(input.actionLabel, 'actionLabel'),
    actionUrl: validateUrl(required(input.actionUrl, 'actionUrl')),
    actionInstruction: required(input.actionInstruction, 'actionInstruction'),
    responseWindow: input.responseWindow?.trim(),
    supportNote: input.supportNote?.trim() || 'Reply to this email and the team will help.',
    operationalNote: input.operationalNote?.trim() || 'This message follows the JM1 Enterprise Communication Standard v1.0.',
  }
}

function renderText(input: Jm1EnterpriseCommunicationInput) {
  const responseWindow = input.responseWindow && input.executionAuthority.responseClockAuthorized
    ? [`Response window: ${input.responseWindow}`, '']
    : []
  return [
    input.title,
    input.subtitle || '',
    '',
    `Good day, ${input.recipientName},`,
    '',
    'Why you are receiving this',
    input.reason,
    '',
    'What has been completed',
    ...(input.summaryItems || []).map((item) => `- ${item}`),
    '',
    "What's attached",
    ...(input.attachments || ['No files are attached.']).map((item) => `- ${item}`),
    '',
    input.reviewPrompt ? 'What we need from you' : '',
    input.reviewPrompt || '',
    '',
    'How to respond',
    input.actionInstruction,
    ...responseWindow,
    input.actionUrl,
    '',
    'Optional Author Operating Center access',
    `Optional Author Operating Center access: ${input.actionUrl}`,
    '',
    'What happens next',
    ...(input.timelineItems || []).map((item) => `- ${item}`),
    '',
    'Support',
    input.supportNote || '',
    '',
    input.operationalNote || '',
    '',
    signatureForBrand(input.brand),
  ].filter((line) => line !== '').join('\n')
}

function renderHtml(input: Jm1EnterpriseCommunicationInput) {
  const standard = JM1_ENTERPRISE_COMMUNICATION_STANDARD
  const colors = standard.colors
  const type = standard.typography
  const brand = JM1_COMMUNICATION_BRANDS[input.brand]
  const summary = (input.summaryItems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const attachments = (input.attachments || ['No files are attached.']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const timeline = (input.timelineItems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const review = input.reviewPrompt
    ? section('What we need from you', input.reviewPrompt, colors.textSecondary, type.body, colors.textPrimary, type.headingM)
    : ''
  const responseWindow = input.responseWindow && input.executionAuthority.responseClockAuthorized
    ? `<p style="margin:12px 0 0;color:${colors.textSecondary};font-size:14px;line-height:1.6;"><strong>Response window:</strong> ${escapeHtml(input.responseWindow)}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${colors.neutralBackground};color:${colors.textPrimary};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${colors.neutralBackground};">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;background:${colors.surfaceWhite};border:1px solid ${colors.border};">
            <tr>
              <td style="padding:18px 28px;background:${colors.enterpriseNavy};color:${colors.surfaceWhite};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr><td style="font-size:11px;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;color:${colors.enterpriseGold};font-weight:700;">${brand.brandName}</td></tr>
                  <tr><td style="padding-top:4px;font-size:${type.metadata};line-height:1.4;color:#E5E7EB;">${brand.divisionRelationship}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 6px;font-size:${type.headingXL};line-height:1.3;color:${colors.textPrimary};">${escapeHtml(input.title)}</h1>
                ${input.subtitle ? `<p style="margin:0 0 18px;font-size:${type.headingL};line-height:1.4;color:${colors.textSecondary};">${escapeHtml(input.subtitle)}</p>` : ''}
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Good day, ${escapeHtml(input.recipientName)},</p>
                ${section('Why you are receiving this', input.reason, colors.textSecondary, type.body, colors.textPrimary, type.headingM)}
                ${listSection('What has been completed', summary, colors.textSecondary, type.body, colors.textPrimary, type.headingM)}
                ${listSection("What's attached", attachments, colors.textSecondary, type.body, colors.textPrimary, type.headingM)}
                ${review}
                <div style="margin:24px 0;padding:18px;border-left:4px solid ${colors.primaryCta};background:#EFF6FF;">
                  <h2 style="margin:0 0 8px;font-size:${type.headingM};color:${colors.textPrimary};">How to respond</h2>
                  <p style="margin:0 0 14px;font-size:${type.body};line-height:1.7;color:${colors.textSecondary};">${escapeHtml(input.actionInstruction)}</p>
                  ${responseWindow}
                </div>
                <p style="margin:0 0 22px;"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:${colors.primaryCta};color:${colors.surfaceWhite};padding:11px 16px;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(input.actionLabel)}</a></p>
                <h2 style="margin:24px 0 10px;font-size:${type.headingM};color:${colors.textPrimary};">Optional Author Operating Center access</h2>
                <p style="margin:0 0 18px;font-size:${type.body};line-height:1.7;color:${colors.textSecondary};">Your Author Operating Center is secondary to email and available when you want another copy or project history.</p>
                ${listSection('What happens next', timeline, colors.textSecondary, type.body, colors.textPrimary, type.headingM)}
                ${section('Support', input.supportNote || '', colors.textSecondary, type.body, colors.textPrimary, type.headingM)}
                <p style="margin:22px 0 0;font-size:${type.caption};line-height:1.6;color:${colors.textSecondary};">${escapeHtml(input.operationalNote || '')}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#F3F4F6;border-top:1px solid ${colors.border};">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${colors.textPrimary};">${brand.teamName}</p>
                <p style="margin:0;font-size:${type.caption};line-height:1.6;color:${colors.textSecondary};">${brand.legalEntityName}<br>${brand.divisionRelationship}<br>${brand.phone} · ${brand.email} · ${brand.website}<br>${brand.tagline}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function validateExecutionAuthority(input: Jm1EnterpriseCommunicationInput): { ok: true } | { ok: false; blocker: string } {
  if (!input.executionAuthority || input.executionAuthority.authoritySource !== 'JM1 Governed Bootstrap') {
    return { ok: false, blocker: 'ECR_EXECUTION_AUTHORITY_MISSING' }
  }
  if (!input.executionAuthority.renderAllowed) return { ok: false, blocker: 'ECR_RENDER_AUTHORITY_DENIED' }
  if (input.responseWindow && !input.executionAuthority.responseClockAuthorized) {
    return { ok: false, blocker: 'RESPONSE_WINDOW_AUTHORITY_MISSING' }
  }
  return { ok: true }
}

function validateBrandSignatureConfiguration(brandKey: Jm1CommunicationBrandKey): { ok: true } | { ok: false; blocker: string } {
  const brand = JM1_COMMUNICATION_BRANDS[brandKey]
  if (!brand || !brand.teamName || !brand.legalEntityName || !brand.divisionRelationship || !brand.phone || !brand.email || !brand.website || !brand.tagline) {
    return { ok: false, blocker: 'BRAND_SIGNATURE_CONFIGURATION_MISSING' }
  }
  return { ok: true }
}

function section(label: string, body: string, textColor: string, bodySize: string, headingColor: string, headingSize: string) {
  return [
    `<h2 style="margin:24px 0 10px;font-size:${headingSize};color:${headingColor};">${escapeHtml(label)}</h2>`,
    `<p style="margin:0 0 18px;font-size:${bodySize};line-height:1.7;color:${textColor};">${escapeHtml(body)}</p>`,
  ].join('')
}

function listSection(label: string, items: string, textColor: string, bodySize: string, headingColor: string, headingSize: string) {
  return `<h2 style="margin:24px 0 10px;font-size:${headingSize};color:${headingColor};">${escapeHtml(label)}</h2><ul style="margin:0 0 18px 22px;padding:0;font-size:${bodySize};line-height:1.7;color:${textColor};">${items}</ul>`
}

function required(value: string | undefined, name: string) {
  const normalized = value?.trim() || ''
  if (!normalized) throw new Error(`JM1_ECR_BLOCKED - ${name.toUpperCase()}_MISSING`)
  return normalized
}

function validateUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('JM1_ECR_BLOCKED - PRIMARY_ACTION_URL_NOT_HTTPS')
  return url.toString()
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
