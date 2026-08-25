# Runtime Implementation

Last Verified: 2026-08-24

## Files Added

- `azure-functions/diagnostic-ai-runner/src/production/fullWrapExecutor.js`
- `azure-functions/diagnostic-ai-runner/src/functions/runFullWrapExecutor.js`
- `azure-functions/diagnostic-ai-runner/test/fullWrapExecutor.test.js`

## Route

`POST /api/run-full-wrap-executor`

The route is guarded by `JM1_DIAGNOSTIC_RUNNER_KEY` and by
`JM1_FULL_WRAP_EXECUTOR_ENABLED=true`.

## Required Inputs

- task ID
- title ID
- title
- author
- trim size
- final page count
- paper stock/profile
- ISBN
- barcode
- imprint
- distribution path/template authority
- back-cover copy
- front cover asset
- interior proof asset

## Safety

The executor preserves source assets, calculates Full Wrap dimensions from trim,
page count, paper profile, and bleed, hashes the working specification, and logs
blocked or successful execution. It does not send author communications, submit
distribution files, advance release, change pricing, or touch Business Central.

