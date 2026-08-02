# The Intentional Leader Author Recovery - Selector Guard

Generated: 2026-08-02T17:15:00-04:00

## Result

The Intentional Leader is not safe for confirmed author dispatch until the attachment-role selector fix is deployed.

The protected production dry run showed the title is eligible, with one active gate and no package-readiness blockers. A deeper read-only Dataverse metadata inspection found the current production selector can resolve both required outgoing roles to the same Interior Layout proof artifact because the proof filename contains the word "Review".

## Readiness Confirmed

| Check | Result |
| --- | --- |
| Clean title-scoped worktree | PASS |
| Current main head | `6af581a7325db072fa5952d169055c62b288ab93` |
| Production health | PASS |
| PR #395 contained in production release lineage | PASS |
| Proof checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |
| Proof page count | 393 |
| Proof parser/open test | PASS |
| Representative visual review | PASS |
| Protected dry run | PASS |
| Confirmed author dispatch | HELD |

## Defect

Current production selection behavior:

| Role | Selected artifact | Result |
| --- | --- | --- |
| `interiorProof` | `5d76feda-0a8e-f111-8077-000d3a14673b` | PASS |
| `reviewInstructions` | `5d76feda-0a8e-f111-8077-000d3a14673b` | FAIL - duplicate role artifact |

Corrected selection behavior after this fix:

| Role | Selected artifact | Result |
| --- | --- | --- |
| `interiorProof` | `5d76feda-0a8e-f111-8077-000d3a14673b` | PASS |
| `reviewInstructions` | `0db9be77-3c8e-f111-8077-00224820105b` | PASS |

## Fix

The dispatch service now:

- requires the `reviewInstructions` role to match instruction-specific artifacts;
- prevents internal roles from entering outgoing physical attachment inventory;
- rejects one physical artifact, one SharePoint item identity, or one content checksum being used to satisfy two required physical attachment roles with `AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:AUTHOR_ATTACHMENT_ROLE_COLLISION`.

## Boundary

No author communication was sent by this evidence package.

The next safe action is to review, merge, deploy, and dry-run this selector fix. Only after production contains the fix and proves two distinct outgoing physical attachments should the confirmed The Intentional Leader dispatch be run.
