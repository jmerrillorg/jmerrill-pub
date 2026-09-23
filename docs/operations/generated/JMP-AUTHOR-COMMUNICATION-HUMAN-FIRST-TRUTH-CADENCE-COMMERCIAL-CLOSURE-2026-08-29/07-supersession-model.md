# Supersession Model

Last Verified: 2026-08-29T12:04:54Z

Supported purpose types include:

- `INTAKE_ACKNOWLEDGMENT`
- `MISSING_MANUSCRIPT_REQUEST`
- `INTAKE_RECOVERY_CONFIRMATION`
- `EDITORIAL_REVIEW_STARTED`
- `EDITORIAL_REVIEW_RECOMMENDATION`
- `MISSING_ATTESTATION_REQUEST`
- `PACKAGE_RECOMMENDATION`
- `AUTHOR_ACCESS_HELP`
- `AUTHOR_DECISION_ACKNOWLEDGMENT`
- `PRODUCTION_REVIEW`
- `GENERAL_SUPPORT`

Supersession examples now encoded:

- Intake recovery with recovered manuscript supersedes a pending missing-manuscript request.
- Editorial recommendation supersedes a pending editorial-review-started message.
- Editorial recommendation consolidates the recovered-intake context.
- Editorial recommendation with recovered manuscript suppresses any pending missing-manuscript request.

Evidence Source: `resolveSupersession` and its regression tests.
