# Five-Title Package Commissioning Addendum

Generated: 2026-07-31

Branch: `codex/five-title-package-commissioning`

Baseline authority:

- PR #367 merged to `main`.
- Production merge SHA: `582b4aa0be928d905bb89b1b3d357a094e1f75a5`.
- Promotion run: `30613712909`.
- Production baseline preserved: `/` returned 200, `/api/health` returned 200, unauthenticated author context returned 401, and `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED` remained disabled.
- Production OIDC subject `repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production` remained the working production deployment subject.

## Release Observability Correction

Finding:

Production health reported a stale release identity because `/api/health` read the slot-sticky `JM1_RELEASE_SHA` app setting before immutable packaged release metadata.

Correction prepared:

- `/api/health` now prefers the packaged `JM1_RELEASE_SHA` file written into the App Service artifact.
- The production promotion workflow now requires `h.release === github.sha` during Production Observation.
- If production serves a stale package after swap, the workflow will fail and execute the existing swap-back path instead of accepting `status: ready` alone.

Deployment status:

This source correction is prepared for review only. It is not production-active until merged and promoted through the governed production workflow.

## Five-Title Package Readiness Readback

Readback method:

Dataverse Web API metadata readback for canonical title records, related publishing assets, editorial artifacts, editorial summaries, and approval gates. No package, gate, SharePoint, or email mutation was performed.

| Title | Required package | Publishing asset readback | Current approved artifacts | Author-facing current approved artifacts | Published author-safe summaries | Approval gates | Commissioning classification |
|---|---|---:|---:|---:|---:|---:|---|
| The Intentional Leader | Interior Layout author-review package | 1 | 3 | 2 | 5 | 6 | `BLOCKED_PACKAGE_INCOMPLETE` |
| The Long Watch | Developmental Editing author-review package | 1 | 0 | 0 | 0 | 0 | `BLOCKED_PACKAGE_INCOMPLETE` |
| Before You Were Born | Developmental Editing author-review package | 1 | 0 | 0 | 0 | 0 | `BLOCKED_PACKAGE_INCOMPLETE` |
| The General's Will and Last Testament | Developmental Editing author-review package | 1 | 0 | 0 | 0 | 0 | `BLOCKED_PACKAGE_INCOMPLETE` |
| Establishing Glory: The Library | Developmental Editing author-review package | 1 | 0 | 0 | 0 | 0 | `BLOCKED_PACKAGE_INCOMPLETE` |

Required role signals:

- The Intentional Leader: no current approved Interior Layout proof, review instructions, or manifest were proven. A cover-message-like artifact signal exists from older package evidence, but it does not complete the Interior Layout package.
- The four Developmental Editing titles: no current approved author-facing edited manuscript, developmental editor summary, review instructions, package manifest, or author cover message were proven through Dataverse package records.

## Controlled Stop

No author-release gates were created because package completeness was not proven.

No author-facing email was sent because the release gate, package manifest, response mechanism, and required artifact set were incomplete.

No workspace move was performed because package release state was not established.

`Establishing Glory: The Library` remains the canonical title. `Compilation-Reconciliation` is an internal process label only and must not replace the title.

## Jackie Decision Boundaries

The following items remain outside safe autonomous execution:

1. Approved author-review response period for Interior Layout and Developmental Editing packages.
2. Whether The Intentional Leader combines cover and interior proof review, or releases them separately.
3. Whether Cody may generate missing Developmental Editing author summaries and cover messages from existing governed internal work, or whether editorial owners must commission or approve new package artifacts first.
4. The post-layout correction scope for The Intentional Leader before an Interior Layout proof is released.

## Non-Actions Confirmed

- Dataverse package/gate writes: 0.
- SharePoint moves/deletes/renames: 0.
- Author communications: 0.
- Stripe, payout, Business Central, GATE-W3, or unrelated operations: 0.
- Secret values retained: 0.
