# Five-Title Package Decision Resolution

Generated: 2026-07-31

Branch: `codex/five-title-package-commissioning`

Supersedes: the policy-stop portion of `04-five-title-package-commissioning-addendum.md`.

## Governance Decisions Applied

Jackie resolved the five-title commissioning policy questions and authorized implementation of the package-release rules without inventing editorial substance.

Applied decisions:

- Standard author-review response period is 7 calendar days after successful delivery.
- Day 5 reminder, Day 7 overdue classification, and Day 8 internal follow-up/escalation are the canonical operating cadence unless a contract controls otherwise.
- Silence never auto-approves a package.
- Failed delivery does not start the author response clock.
- Cover Design and Interior Layout approvals are separate gates and remain separately manifested, approved, and audited even when sent in one coordinated communication.
- The Intentional Leader Interior Layout package may proceed without waiting for Cover Design when the interior proof package is complete.
- Developmental Editing packages require a current governed manuscript, author-facing Developmental Editing summary, review instructions, author response mechanism, package manifest, and branded package communication.
- `Establishing Glory: The Library` is the canonical title. `Compilation-Reconciliation` remains an internal process label only.

## Source Guard Implementation

Prepared source changes enforce the resolved decisions in the reusable package and notification engines:

- `AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS = 7`
- response clock creation requires successful delivery and returns no auto-approval authority
- Developmental Editing package QA requires:
  - edited manuscript
  - Developmental summary or memo
  - review instructions
  - author response mechanism
  - package manifest
  - author cover message
- Interior Layout package QA requires:
  - interior proof
  - review instructions
  - author response mechanism
  - package manifest
  - author cover message
- notification validation requires the newly governed response, manifest, and cover-message attachments for Developmental Editing and Interior Layout packages
- canonical Publishing email identity remains enforced:
  - From: `publishing@email.jmerrill.one`
  - Reply-To: `publishing@jmerrill.one`
  - Archive/Bcc: `publishing@jmerrill.one`

Focused validation:

- author package notification policy guard: PASS
- author-review package engine tests: PASS
- shared author communication brand guard: PASS
- App Service health/release contract guard: PASS
- focused suite total: 27/27 PASS

## Live Package Execution Status

No five-title package was released during this pass.

Reason:

The live Dataverse readback needed to establish current package completeness timed out before returning the first publishing-asset query. Because readiness and prior delivery must be proven from authoritative records before package release, sending or gate mutation was not safe.

The prior successful readback remains preserved in `04-five-title-package-commissioning-addendum.md` and showed incomplete package records for all five titles at that time. The new policy decisions do not by themselves prove that current governed artifacts, manifests, author-facing summaries, response mechanisms, or prior delivery evidence now exist.

## Current Title Disposition

| Title | Package lane | Current disposition | Safe next action |
|---|---|---|---|
| The Intentional Leader | Interior Layout | Source policy ready; live package release not executed | Re-run authoritative Dataverse/SharePoint readiness readback, then release only if proof, instructions, response mechanism, manifest, and cover message are complete |
| The Long Watch | Developmental Editing | Source policy ready; live package release not executed | Verify current governed manuscript and internal editorial material, then generate author-facing package only if source evidence is sufficient |
| Before You Were Born | Developmental Editing | Source policy ready; live package release not executed | Verify current governed manuscript and internal editorial material, then generate author-facing package only if source evidence is sufficient |
| The General's Will and Last Testament | Developmental Editing | Source policy ready; live package release not executed | Verify current governed manuscript and internal editorial material, then generate author-facing package only if source evidence is sufficient |
| Establishing Glory: The Library | Developmental Editing | Source policy ready; live package release not executed | Verify current governed manuscript and internal editorial material, then generate author-facing package only if source evidence is sufficient |

## Non-Actions Confirmed

- Author package sends: 0.
- Dataverse package or gate writes: 0.
- SharePoint package writes, moves, deletes, or renames: 0.
- Workspace state changes: 0.
- Duplicate gates or communications created: 0.
- Author-facing delivery clocks started: 0.
- Stripe, payout, Business Central, DNS, or GATE-W3 changes: 0.
- Secret values retained: 0.

