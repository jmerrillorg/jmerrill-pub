# Delivery Certification Contract

Last Verified: 2026-08-15T20:44:30.499Z

## Rule

`MESSAGE_ACCEPTED_BY_RELAY_PLUS_GOVERNED_PACKAGE_EVIDENCE`

Operational delivery certification requires the production route to verify branded HTML, plain text, required attachments, attachment checksums, archive evidence, Dataverse send evidence, direct reply path, and one active gate. Author Workspace visibility is a secondary/non-blocking view for this ordinary Editorial Review delivery path.

## Route Behavior

| Scenario | Result |
| --- | --- |
| Existing operational certification | Return idempotent. |
| Existing technical release without operational certification | Certify operational delivery without resend. |
| New successful relay send | Certify operational delivery immediately after technical release evidence. |
| Missing governed package evidence | Fail closed. |

## Evidence Sources

- PR #511 head before merge: `ca99092ecf77a5cfdff6e6e1c5d32380638a204c`.
- PR #511 merge / deployed release: `a150dd7e291ee48794a4c3b03a0f4f126399fc41`.
- Focused regression tests: `124 / 124 PASS`.
