// Engine: Communications Engine
// Reusable? Y
// Stage-specific exception? N

import { createHash } from 'node:crypto'

export const AUTHOR_COMMUNICATION_BRAND = {
  templateFamily: 'JM1_AUTHOR_COMMUNICATION',
  brandName: 'J MERRILL PUBLISHING',
  divisionLine: 'A Division of J Merrill One',
  promiseLine: 'Helping Authors Help Themselves.',
  primaryColor: '#1D4ED8',
  secondaryColor: '#111827',
  accentColor: '#C8A45D',
  backgroundColor: '#F8FAFC',
  panelColor: '#FFFFFF',
  textColor: '#111827',
  mutedTextColor: '#4B5563',
  borderColor: '#D8DEE9',
  contactLine: '614.965.6057 | publishing@jmerrill.one | jmerrill.pub',
  signature: [
    'The Publishing Team',
    'J Merrill Publishing, Inc.',
    'A Division of J Merrill One',
    '614.965.6057 | publishing@jmerrill.one | jmerrill.pub',
    'Helping Authors Help Themselves.',
  ].join('\n'),
} as const

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
    qualityGate: 'PASS'
    htmlSha256: string
    textSha256: string
  }
}

export function renderAuthorCommunicationEmail(input: AuthorCommunicationRenderInput): RenderedAuthorCommunication {
  const normalized = normalizeInput(input)
  const text = renderText(normalized)
  const html = renderHtml(normalized)
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
  if (!html.includes('Why you are receiving this')) blockers.push('WHY_FIRST_BLOCK_MISSING')
  if (!html.includes('What we need from you')) blockers.push('AUTHOR_ACTION_BLOCK_MISSING')
  if (!html.includes('What happens next')) blockers.push('NEXT_STEPS_BLOCK_MISSING')
  if (!text.includes('Why you are receiving this')) blockers.push('PLAIN_TEXT_WHY_FIRST_BLOCK_MISSING')
  if (!text.includes(AUTHOR_COMMUNICATION_BRAND.signature)) blockers.push('PLAIN_TEXT_SIGNATURE_MISSING')

  return blockers.length
    ? { ok: false, blocker: `AUTHOR_COMMUNICATION_BLOCKED - ${blockers.join(',')}` }
    : { ok: true }
}

function normalizeInput(input: AuthorCommunicationRenderInput): AuthorCommunicationRenderInput {
  return {
    ...input,
    templateName: required(input.templateName, 'templateName'),
    templateVersion: required(input.templateVersion, 'templateVersion'),
    subject: required(input.subject, 'subject'),
    authorName: required(input.authorName, 'authorName'),
    titleName: required(input.titleName, 'titleName'),
    preheader: required(input.preheader, 'preheader'),
    why: required(input.why, 'why'),
    completed: input.completed.map((item) => required(item, 'completed item')),
    meaning: required(input.meaning, 'meaning'),
    authorAction: required(input.authorAction, 'authorAction'),
    primaryActionLabel: required(input.primaryActionLabel, 'primaryActionLabel'),
    nextSteps: input.nextSteps.map((item) => required(item, 'next step')),
    supportNote: input.supportNote?.trim() || 'If anything is unclear, reply to this email and the publishing team will help.',
    operationalNote: input.operationalNote?.trim() || 'This message confirms workflow status only. It does not change your publishing agreement or approve publication by itself.',
  }
}

function renderText(input: AuthorCommunicationRenderInput) {
  return [
    `Good day, ${input.authorName},`,
    '',
    `We are writing about ${input.titleName}.`,
    '',
    'Why you are receiving this',
    input.why,
    '',
    'What has been completed',
    ...input.completed.map((item) => `- ${item}`),
    '',
    'What this means for your book',
    input.meaning,
    '',
    'What we need from you',
    input.authorAction,
    '',
    `Primary action: ${input.primaryActionLabel}`,
    input.deadline ? `Response window: ${input.deadline}` : '',
    '',
    'What happens next',
    ...input.nextSteps.map((item) => `- ${item}`),
    '',
    'Support',
    input.supportNote,
    '',
    input.operationalNote,
    '',
    AUTHOR_COMMUNICATION_BRAND.signature,
  ].filter((line) => line !== '').join('\n')
}

function renderHtml(input: AuthorCommunicationRenderInput) {
  const brand = AUTHOR_COMMUNICATION_BRAND
  const completed = input.completed.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const nextSteps = input.nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const deadline = input.deadline
    ? `<p style="margin:12px 0 0;color:${brand.mutedTextColor};font-size:14px;line-height:1.6;"><strong>Response window:</strong> ${escapeHtml(input.deadline)}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${brand.backgroundColor};color:${brand.textColor};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${brand.backgroundColor};">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;background:${brand.panelColor};border:1px solid ${brand.borderColor};">
            <tr>
              <td style="padding:28px 28px 20px;background:${brand.secondaryColor};color:#ffffff;">
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:${brand.accentColor};">${brand.brandName}</p>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#E5E7EB;">${brand.divisionLine}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${brand.textColor};">${escapeHtml(input.subject)}</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Good day, ${escapeHtml(input.authorName)},</p>
                ${section('Why you are receiving this', input.why)}
                <h2 style="margin:24px 0 10px;font-size:16px;color:${brand.textColor};">What has been completed</h2>
                <ul style="margin:0 0 18px 22px;padding:0;font-size:15px;line-height:1.7;color:${brand.mutedTextColor};">${completed}</ul>
                ${section('What this means for your book', input.meaning)}
                <div style="margin:24px 0;padding:18px;border-left:4px solid ${brand.primaryColor};background:#EFF6FF;">
                  <h2 style="margin:0 0 8px;font-size:16px;color:${brand.textColor};">What we need from you</h2>
                  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:${brand.mutedTextColor};">${escapeHtml(input.authorAction)}</p>
                  <p style="margin:0;"><span style="display:inline-block;background:${brand.primaryColor};color:#ffffff;padding:11px 16px;font-size:14px;font-weight:700;">${escapeHtml(input.primaryActionLabel)}</span></p>
                  ${deadline}
                </div>
                <h2 style="margin:24px 0 10px;font-size:16px;color:${brand.textColor};">What happens next</h2>
                <ul style="margin:0 0 18px 22px;padding:0;font-size:15px;line-height:1.7;color:${brand.mutedTextColor};">${nextSteps}</ul>
                ${section('Support', input.supportNote || '')}
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${brand.mutedTextColor};">${escapeHtml(input.operationalNote || '')}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#F3F4F6;border-top:1px solid ${brand.borderColor};">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${brand.textColor};">The Publishing Team</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:${brand.mutedTextColor};">J Merrill Publishing, Inc.<br>${brand.divisionLine}<br>${brand.contactLine}<br>${brand.promiseLine}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function section(label: string, body: string) {
  return [
    `<h2 style="margin:24px 0 10px;font-size:16px;color:${AUTHOR_COMMUNICATION_BRAND.textColor};">${escapeHtml(label)}</h2>`,
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:${AUTHOR_COMMUNICATION_BRAND.mutedTextColor};">${escapeHtml(body)}</p>`,
  ].join('')
}

function required(value: string, name: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`AUTHOR_COMMUNICATION_BLOCKED - ${name.toUpperCase().replaceAll(' ', '_')}_MISSING`)
  return normalized
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
