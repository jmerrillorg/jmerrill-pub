// Engine: Identity & Access Engine
// Reusable? Y
// Stage-specific exception? N
import {
  dataverseCreate,
  dataverseFirst,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
} from './dataverse-server'

export type AuthorExternalIdBindingDecision =
  | {
      action: 'bind'
      contactId: string
      externalUserIdentifier: string
      reason: 'initial_activation' | 'recovery'
    }
  | {
      action: 'reuse'
      contactId: string
      externalUserIdentifier: string
      reason: 'existing_match'
    }
  | {
      action: 'reject'
      contactId: string
      reason: 'missing_contact' | 'missing_external_id' | 'identity_conflict'
    }

export function decideAuthorExternalIdBinding({
  contactId,
  currentExternalUserIdentifier,
  incomingExternalUserIdentifier,
  recoveryAuthorized = false,
}: {
  contactId?: string
  currentExternalUserIdentifier?: string | null
  incomingExternalUserIdentifier?: string | null
  recoveryAuthorized?: boolean
}): AuthorExternalIdBindingDecision {
  const normalizedContactId = contactId?.trim()
  const current = normalizeObjectId(currentExternalUserIdentifier)
  const incoming = normalizeObjectId(incomingExternalUserIdentifier)

  if (!normalizedContactId) {
    return { action: 'reject', contactId: '', reason: 'missing_contact' }
  }
  if (!incoming) {
    return { action: 'reject', contactId: normalizedContactId, reason: 'missing_external_id' }
  }
  if (!current) {
    return {
      action: 'bind',
      contactId: normalizedContactId,
      externalUserIdentifier: incoming,
      reason: 'initial_activation',
    }
  }
  if (current === incoming) {
    return {
      action: 'reuse',
      contactId: normalizedContactId,
      externalUserIdentifier: incoming,
      reason: 'existing_match',
    }
  }
  if (recoveryAuthorized) {
    return {
      action: 'bind',
      contactId: normalizedContactId,
      externalUserIdentifier: incoming,
      reason: 'recovery',
    }
  }

  return { action: 'reject', contactId: normalizedContactId, reason: 'identity_conflict' }
}

export async function bindAuthorContactExternalId({
  contactId,
  externalUserIdentifier,
  recoveryAuthorized = false,
  executionSource = 'Author Operating Center',
}: {
  contactId: string
  externalUserIdentifier: string
  recoveryAuthorized?: boolean
  executionSource?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const contact = await dataverseFirst(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1,externaluseridentifier',
    $filter: `contactid eq ${contactId}`,
  })
  const decision = decideAuthorExternalIdBinding({
    contactId,
    currentExternalUserIdentifier: stringValue(contact?.externaluseridentifier),
    incomingExternalUserIdentifier: externalUserIdentifier,
    recoveryAuthorized,
  })

  if (decision.action === 'reject') return decision
  if (decision.action === 'bind') {
    await dataversePatch(config, 'contacts', contactId, {
      externaluseridentifier: decision.externalUserIdentifier,
    })
  }

  const now = new Date().toISOString()
  await dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: `AUTHOR_EXTERNAL_ID_${decision.action.toUpperCase()} - ${contactId}`,
    jm1_actiontype: 'AUTHOR_EXTERNAL_ID_BINDING',
    jm1_actiondescription:
      decision.action === 'bind'
        ? `Author Operating Center ${decision.reason} bound a Microsoft External ID object ID to the canonical Contact.`
        : 'Author Operating Center reused the existing Microsoft External ID binding for the canonical Contact.',
    jm1_executionstatus: 835500001,
    jm1_agentname: executionSource,
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: 'contact',
    jm1_sourcerecordid: contactId,
  })

  return decision
}

function normalizeObjectId(value?: string | null) {
  return value?.trim().toLowerCase() || ''
}
