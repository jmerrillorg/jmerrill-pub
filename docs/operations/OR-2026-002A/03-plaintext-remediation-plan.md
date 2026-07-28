# OR-2026-002A Plaintext Remediation Plan

## Remediation Objective

Remove plaintext Precoa calendar-feed endpoint placement from active and historical-authority configuration paths while preserving audit evidence and production continuity.

## Authorized Future Remediation Sequence

1. Confirm canonical consumer flow with Jackie.
2. Confirm `PRECOA-CALENDAR-FEED-URL` in `jm1-core-vault` is the governed source and that the intended runtime identity can read it.
3. Implement or select the approved secure server boundary.
4. Update the canonical flow to call the secure boundary rather than the Precoa feed directly.
5. Enable secure inputs/outputs on sensitive Power Automate actions.
6. Remove plaintext endpoint defaults or URI values from active flow definitions and inactive candidate definitions before activation.
7. Run UAT with synthetic or low-risk scheduling payloads.
8. Preserve redacted before/after metadata evidence.
9. Cut over only after Jackie approval.

## Historical Export Treatment

Historical exports are governed evidence. Do not rewrite, delete, or extract them into uncontrolled locations. If an export later proves to contain the endpoint, classify it as historical evidence with controlled access and record only redacted metadata in reports.

## Rotation Decision

Rotation/revocation is not authorized by OR-2026-002A. It should be considered only if Jackie determines the transient authorized-session exposure or existing plaintext flow definitions create unacceptable residual risk.

## Rollback

If the secure boundary fails after authorized cutover:

- disable the new scheduled run;
- preserve the last successful normalized scheduling state;
- restore prior flow behavior only under Jackie approval and only after a risk decision about plaintext endpoint handling;
- do not publish or display the feed URL as a rollback shortcut.
