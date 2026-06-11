import type { NormalizedPublishingIntake } from './schema'

export const CONFIRMED_DATAVERSE_MAPPING_REQUIRED = {
  table: 'jm1_publishingintake',
  columns: null,
  // TODO: Blocked until Chad provides the jm1_publishingintake mapping appendix per INT-PUB-005 §4.
} as const

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

  if (!hasCredentials || !CONFIRMED_DATAVERSE_MAPPING_REQUIRED.columns) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: 'dataverse_mapping_required',
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
