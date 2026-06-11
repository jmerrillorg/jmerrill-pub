import type { NormalizedPublishingIntake } from './schema'
import {
  publishingIntakeActivationBlockers,
  publishingIntakeDataverseMapping,
} from './dataverseMapping'

export const CONFIRMED_DATAVERSE_MAPPING_REQUIRED = publishingIntakeDataverseMapping

export type DataverseWriteResult =
  | { status: 'success' }
  | { status: 'skipped'; reason: 'non_production_mapping_pending' }
  | { status: 'failed'; reason: string; retryable: boolean }

export async function writePublishingIntakeToDataverse(
  _payload: NormalizedPublishingIntake,
): Promise<DataverseWriteResult> {
  const hasCredentials = Boolean(
    process.env.DATAVERSE_TENANT_ID &&
      process.env.DATAVERSE_CLIENT_ID &&
      process.env.DATAVERSE_CLIENT_SECRET &&
      process.env.DATAVERSE_RESOURCE_URL &&
      process.env.DATAVERSE_ENVIRONMENT_URL,
  )

  if (
    !hasCredentials ||
    CONFIRMED_DATAVERSE_MAPPING_REQUIRED.activationStatus ===
      'blocked_pending_column_creation_and_choice_value_verification'
  ) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: `dataverse_activation_blocked: ${publishingIntakeActivationBlockers.join('; ')}`,
      retryable: false,
    }
  }

  return {
    status: 'failed',
    reason: 'dataverse_adapter_not_implemented_until_mapping_confirmed',
    retryable: false,
  }
}

export async function writePublishingIntakeWithRetry(payload: NormalizedPublishingIntake) {
  let lastResult: DataverseWriteResult = { status: 'failed', reason: 'not_attempted', retryable: true }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    lastResult = await writePublishingIntakeToDataverse(payload)
    if (lastResult.status === 'success' || lastResult.status === 'skipped' || !lastResult.retryable) {
      return lastResult
    }

    await wait(250 * (attempt + 1))
  }

  return lastResult
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
