import {
  DEAD_LETTER_MAX_QUEUE_RETRIES,
  type PublishingIntakeRecoveryMessage,
  type PublishingIntakeRecoveryOperation,
} from './deadLetter'

export type PublishingIntakeReplayDecision =
  | { status: 'retry'; replayKey: string; operation: PublishingIntakeRecoveryOperation; nextRetryCount: number }
  | { status: 'poison'; reason: 'retry_exhausted' | 'invalid_message' }
  | { status: 'suppress'; reason: 'missing_intake_reference' | 'missing_operation' }

export function decidePublishingIntakeReplay(message: PublishingIntakeRecoveryMessage): PublishingIntakeReplayDecision {
  if (!message.intakeReference) return { status: 'suppress', reason: 'missing_intake_reference' }
  if (!message.failedOperationType) return { status: 'suppress', reason: 'missing_operation' }
  if (message.schema !== 'JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1') {
    return { status: 'poison', reason: 'invalid_message' }
  }

  const maxRetries = Number.isFinite(message.maxRetryCount)
    ? message.maxRetryCount
    : DEAD_LETTER_MAX_QUEUE_RETRIES

  if (message.retryCount >= maxRetries) {
    return { status: 'poison', reason: 'retry_exhausted' }
  }

  return {
    status: 'retry',
    replayKey: buildPublishingIntakeReplayKey(message),
    operation: message.failedOperationType,
    nextRetryCount: message.retryCount + 1,
  }
}

export function buildPublishingIntakeReplayKey(message: PublishingIntakeRecoveryMessage) {
  return [
    'intake-replay',
    message.intakeReference,
    message.failedOperationType,
    message.dataverseRecordId || 'pending-record',
  ].join(':')
}

export function assertRecoveryMessageIsSanitized(message: PublishingIntakeRecoveryMessage) {
  const encoded = JSON.stringify(message)
  const prohibited = [
    'turnstileToken',
    'manuscript body',
    'rawEmailBody',
    'accountLinkUrl',
    'Bearer ',
    'client_secret',
    'publishing@email.jmerrill.one',
  ]

  return prohibited.every((token) => !encoded.includes(token))
}
