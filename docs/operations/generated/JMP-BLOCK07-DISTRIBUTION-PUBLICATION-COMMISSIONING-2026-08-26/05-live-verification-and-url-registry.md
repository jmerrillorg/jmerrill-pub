# Live Verification And URL Registry

Last Verified: 2026-08-26

## Verification Standard

`SUBMISSION_SUCCESS != CHANNEL_ACCEPTANCE != LIVE != LIVE_VERIFIED`

Live verification requires evidence and at least one governed verification method:

- `CHANNEL_API_CONFIRMED`
- `CHANNEL_DASHBOARD_CONFIRMED`
- `DOWNSTREAM_RETAILER_CONFIRMED`
- `OPERATOR_VERIFIED`
- `EMAIL_CONFIRMATION_ONLY`
- `MULTI_SOURCE_CONFIRMED`

## Listing Validation

The runtime compares live listing fields against the frozen manifest expectation:

- title
- author display name
- cover asset
- price
- format
- publication date
- imprint
- ISBN
- territory

Wrong price, wrong identifier, and unauthorized territory fail closed.

## URL Registration

Canonical live URLs are registered only after public URL verification and `LIVE_VERIFIED` state.

