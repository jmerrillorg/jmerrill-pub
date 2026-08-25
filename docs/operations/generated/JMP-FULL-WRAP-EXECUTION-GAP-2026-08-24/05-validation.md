# Validation

Last Verified: 2026-08-24

## Commands

`node --test test/fullWrapExecutor.test.js`

Result:
5 / 5 PASS

`npm --prefix azure-functions/diagnostic-ai-runner run lint`

Result:
PASS

## Notes

`npm ci` completed from the function-app lockfile. The local shell uses Node
26.0.0 while the function package declares Node `>=22 <25`; npm reported an
engine warning, not an install failure.

