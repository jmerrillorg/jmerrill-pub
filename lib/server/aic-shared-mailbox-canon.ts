// Engine: Identity & Access Engine
// Reusable? Y
// Stage-specific exception? N

export const AIC_SHARED_MAILBOX_CANON = {
  version: '1.0.0',
  tenant: 'JM1',
  brand: 'Agape International Cathedral',
  primaryDomain: 'agapeic.org',
  legacyDomain: 'agapeic.com',
  legacyDomainScope: 'EXCLUDED',
  separateTenantMigration: 'NOT_PLANNED',
  mailboxStrategy: 'ROLE_BASED_SHARED_MAILBOXES',
  directSharedMailboxSignIn: 'PROHIBITED',
  communicationRenderer: 'JM1 Enterprise Communication Renderer',
  brandOverlay: 'agapeInternationalCathedral',
  failureCodes: [
    'AIC_UNAPPROVED_SENDER',
    'AIC_LEGACY_DOMAIN_SELECTED',
    'AIC_SHARED_MAILBOX_DIRECT_SIGNIN',
    'AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED',
    'AIC_ECR_OVERLAY_NOT_LOADED',
  ],
} as const

export const AIC_SHARED_MAILBOX_SETTINGS = {
  mailboxType: 'SHARED',
  directSignIn: 'DISABLED',
  dedicatedLicense: 'NO_UNLESS_REQUIRED_BY_MICROSOFT_OR_APPROVED_FEATURES',
  sendOnBehalf: 'DISABLED_UNLESS_EXPLICITLY_REQUIRED',
  externalForwarding: 'DISABLED',
  automaticForwarding: 'DISABLED',
  sentItemCopyForSendAs: 'ENABLED',
  audit: 'ENABLED',
  mailboxNaming: 'ROLE_BASED',
  mfa: 'APPLIED_TO_DELEGATES_NOT_SHARED_MAILBOX_IDENTITY',
  broadAccess: 'PROHIBITED',
} as const

export const AIC_PRIMARY_SHARED_MAILBOXES = [
  'admin@agapeic.org',
  'bishop@agapeic.org',
  'events@agapeic.org',
  'finance@agapeic.org',
  'giving@agapeic.org',
  'hospitality@agapeic.org',
  'info@agapeic.org',
  'kids@agapeic.org',
  'media@agapeic.org',
  'men@agapeic.org',
  'office@agapeic.org',
  'outreach@agapeic.org',
  'pastorsaide@agapeic.org',
  'prayer@agapeic.org',
  'usherboard@agapeic.org',
  'women@agapeic.org',
  'worship@agapeic.org',
  'youth@agapeic.org',
] as const

export const AIC_PILOT_SHARED_MAILBOXES = [
  'info@agapeic.org',
  'finance@agapeic.org',
  'prayer@agapeic.org',
] as const

export const AIC_SHARED_MAILBOX_ALIASES = [
  { alias: 'donate@agapeic.org', target: 'giving@agapeic.org', required: true },
  { alias: 'seed@agapeic.org', target: 'women@agapeic.org', required: true },
  { alias: 'contactus@agapeic.org', target: 'info@agapeic.org', required: false },
  { alias: 'webmaster@agapeic.org', target: 'media@agapeic.org', required: false },
  { alias: 'mediatechnical@agapeic.org', target: 'media@agapeic.org', required: false },
] as const

export function isApprovedAicSender(address: string) {
  const normalized = address.trim().toLowerCase()
  return AIC_PRIMARY_SHARED_MAILBOXES.includes(normalized as typeof AIC_PRIMARY_SHARED_MAILBOXES[number])
}

export function validateAicMailboxPlan(input: {
  sender?: string
  directSignIn?: boolean
  delegateAuthorized?: boolean
  ecrOverlay?: string
}) {
  const sender = input.sender?.trim().toLowerCase() || ''
  if (sender.endsWith('@agapeic.com')) return { ok: false as const, blocker: 'AIC_LEGACY_DOMAIN_SELECTED' }
  if (sender && !isApprovedAicSender(sender)) return { ok: false as const, blocker: 'AIC_UNAPPROVED_SENDER' }
  if (input.directSignIn) return { ok: false as const, blocker: 'AIC_SHARED_MAILBOX_DIRECT_SIGNIN' }
  if (input.delegateAuthorized === false) return { ok: false as const, blocker: 'AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED' }
  if (input.ecrOverlay && input.ecrOverlay !== AIC_SHARED_MAILBOX_CANON.brandOverlay) {
    return { ok: false as const, blocker: 'AIC_ECR_OVERLAY_NOT_LOADED' }
  }
  return { ok: true as const }
}
