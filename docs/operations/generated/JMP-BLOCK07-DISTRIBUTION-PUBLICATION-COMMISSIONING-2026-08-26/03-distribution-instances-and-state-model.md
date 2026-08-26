# Distribution Instances And State Model

Last Verified: 2026-08-26

## Channel Distribution Instance Identity

Canonical identity:

`releaseManifestId + releaseVersion + formatId + channelProfileId + territory`

The runtime materializes one canonical `distributionInstanceId` for that identity. Retrying the same distribution lane preserves the same identity and appends attempt history.

## State Separation

The runtime preserves three separate state layers:

- JMP operational state
- external channel state
- verification state

Submission, channel acceptance, and live verification are not conflated.

## Normalized External States

`NOT_SUBMITTED`, `SUBMISSION_PENDING`, `SUBMITTED`, `RECEIVED`, `PROCESSING`, `VALIDATING`, `ACCEPTED`, `LIVE_VERIFICATION_PENDING`, `LIVE_VERIFIED`, `REJECTED`, `ACTION_REQUIRED`, `CHANNEL_ERROR`, `SUSPENDED`, `TAKEDOWN_PENDING`, `TAKEN_DOWN`, `NOT_APPLICABLE`

