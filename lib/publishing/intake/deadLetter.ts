import type { NormalizedPublishingIntake } from './schema'

export type DeadLetterResult =
  | { status: 'enqueued' }
  | { status: 'not_configured' }
  | { status: 'failed'; reason: string }

export async function enqueuePublishingIntakeDeadLetter(
  _payload: NormalizedPublishingIntake,
  reason: string,
): Promise<DeadLetterResult> {
  const hasQueueConfig = Boolean(
    process.env.AZURE_STORAGE_CONNECTION_STRING &&
      process.env.INTAKE_DEADLETTER_QUEUE_NAME,
  )

  if (!hasQueueConfig) {
    return { status: 'not_configured' }
  }

  console.error('Publishing intake dead-letter adapter requires Azure queue implementation.', {
    reason,
    queueConfigured: true,
  })

  return {
    status: 'failed',
    reason: 'dead_letter_adapter_not_implemented_without_azure_storage_sdk',
  }
}
