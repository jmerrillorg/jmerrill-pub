# Async Worker Contract

Last Verified: 2026-08-20

## Job Fields Implemented

- `executionJobId`
- `titleId`
- `stageId`
- `stageCode`
- `sourceArtifactId`
- `sourceChecksum`
- `manualCanonVersion`
- `promptVersion`
- `provider`
- `deployment`
- `model`
- `chunkPlanVersion`
- `totalChunks`
- `completedChunks`
- `jobStatus`
- `retryCount`
- `nextRetryAt`
- `aggregationStatus`
- `qaStatus`
- `artifactCertificationStatus`
- `authorReviewGateStatus`
- `nextStageAuthorized`

## Chunk Fields Implemented

- `chunkIndex`
- `inputHash`
- `promptHash`
- `inputRange`
- `provider`
- `model`
- `deployment`
- `promptVersion`
- `requestStartedAt`
- `responseReceivedAt`
- `outputHash`
- `status`
- `retryCount`
- `lastError`
- `completedOn`
- `estimatedOutputTokens`

## Store Boundary

The worker is store-agnostic and includes a memory store for tests. Production use requires the same contract to be backed by an authorized durable store before any real-title retry.

