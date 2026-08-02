# PROGRAM-006 Production Dry-Run Certification

Date: 2026-08-02

## Production Release

Production `/api/health` reported:

- Status: ready
- Release: 6dfced3f3f2f045b23d953bc741f6f45dbb894d1
- Checked at: 2026-08-02T08:38:26.029Z
- Payment gate: disabled

This release includes:

- PR #381 delivery guards
- PR #382 PROGRAM-006 dispatch service
- PR #388 operational delivery certification guard

## Local Contract Validation

Commands:

- `npm run program006-dispatch-guard`
- `node --test scripts/program006_publishing_dispatch_service.test.mjs scripts/five_title_executive_recovery_dispatch.test.mjs`

Result:

- PROGRAM-006 dispatch guard: PASS, 9/9
- Combined dispatch and executive-recovery tests: PASS, 16/16

Validated controls:

- `PublishingDispatchService.dispatchAuthorPackage()` is the canonical dispatch operation.
- Protected recovery worker delegates to PROGRAM-006.
- Publishing orchestrator delegates to PROGRAM-006.
- GitHub Actions OIDC is required for the protected endpoint.
- Dry-run cannot mutate production.
- Confirmation is required for production execution.
- Required attachments must materialize from governed artifacts.
- Attachment checksums must match.
- ACS relay accepts author-review attachments.
- Technical release is separated from operational delivery certification.
- Seven-day response clock does not start at ACS acceptance.

## Production Dry-Run

Workflow:

- Name: Five Title Executive Recovery Dispatch
- Run: 30740263487
- Mode: dry-run
- Title list: blank, using canonical five-title allowlist
- Result: completed at workflow layer; service result blocked because some titles are not release-ready

An earlier dry-run, run 30740233965, failed with `TITLE_ALLOWLIST_MISMATCH` because shorthand title selectors were provided. No production mutation occurred.

## Title Results

### Before You Were Born

- Intake: JMP-INT-202607-LQPHEK
- Title ID: 91c5e1ef-2980-f111-ab0f-7c1e525b15c2
- Stage ID: 88189235-8f80-f111-ab0f-6045bdd69435
- Recipient: scrowley50@gmail.com
- Active gates: 1
- Current artifacts: 15
- Author-visible artifacts: 6
- Result: BLOCKED
- Blocker: REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:packageManifest

Operational disposition:

Before You Were Born is not resent. Existing completion evidence remains preserved, but PROGRAM-006 dry-run requires the package manifest artifact to be author-visible before any future service-level dispatch or replacement.

### The General's Will and Last Testament

- Intake: JMP-INT-202607-DL2T20
- Title ID: 2d21ab5b-4d80-f111-ab0f-7c1e525b15c2
- Stage ID: c2799c31-8f80-f111-ab0f-00224820105b
- Recipient: hagher.hagher@ymail.com
- Active gates: 0
- Current artifacts: 13
- Author-visible artifacts: 1
- Result: BLOCKED

Blockers:

- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:editorialMemo
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:reviewInstructions
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorResponseMechanism
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:packageManifest
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorCoverMessage

Operational disposition:

Title, stage, recipient, and gate authority now resolve. The title cannot be released until the five missing Developmental package components are registered as author-visible governed artifacts.

### Establishing Glory: The Library

- Intake: JMP-INT-202606-UFYG6O
- Title ID: f1908dc9-5775-f111-ab0f-6045bdd69435
- Stage ID: 3362a1cb-1984-f111-ab0f-000d3a14673b
- Recipient: chosen2k7@gmail.com
- Active gates: 0
- Current artifacts: 8
- Author-visible artifacts: 1
- Result: BLOCKED

Blockers:

- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:editorialMemo
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:reviewInstructions
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorResponseMechanism
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:packageManifest
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorCoverMessage

Operational disposition:

Canonical title presentation is preserved as Establishing Glory: The Library. Compilation-Reconciliation remains internal only. Release remains blocked until author-visible package components are registered.

### The Long Watch

- Intake: JMP-INT-202607-6R2MPZ
- Title ID: a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2
- Stage ID: 12d961fc-0f85-f111-ab0f-00224820105b
- Recipient: chosen2k7@gmail.com
- Active gates: 0
- Current artifacts: 7
- Author-visible artifacts: 4
- Result: BLOCKED

Blockers:

- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorResponseMechanism
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:authorCoverMessage

Operational disposition:

Recipient and title authority resolve through the allowlist. Release remains blocked until the response mechanism and cover message are author-visible governed artifacts.

### The Intentional Leader

- Intake: JMP-INT-202607-0W5PTQ
- Title ID: e797232b-da7a-f111-ab0f-00224820105b
- Stage ID: c9dee533-4184-f111-ab0f-7c1e525b15c2
- Recipient: chosen2k7@gmail.com
- Active gates: 1
- Current artifacts: 9
- Author-visible artifacts: 5
- Gate: 5141f7db-0a8e-f111-8077-00224820105b
- Result: ELIGIBLE

Operational disposition:

The Intentional Leader is the only five-title candidate currently eligible for PROGRAM-006 dispatch. Confirmation was not invoked during this evidence update because PROGRAM-006 currently records technical release and operational-certification-pending state; the final certification operation must verify branded HTML, attachments, archive, portal package visibility, response controls, and the single active gate before moving to Awaiting Author Response.

## Certification Boundary

PROGRAM-006 is active in production and correctly blocks unsafe releases. It has not yet completed the full production certification state because:

- four titles lack required author-visible package components;
- the deployed service separates technical release from operational certification but does not expose a completed operational-certification execution path in this dry-run evidence;
- no live title was dispatched during this run.

## Pipeline Maturity Readback

- Canonical dispatch service: PASS
- Protected OIDC endpoint: PASS
- Dataverse transaction coordination: PARTIAL, technical-release coordination implemented
- ACS dispatch: READY, not invoked in this dry-run
- Branded email enforcement: PASS
- Attachment enforcement: PASS
- Operational delivery certification: PARTIAL, enforced as a required gate before response clock
- Workspace synchronization: NOT CERTIFIED in this run
- Package generation: HYBRID
- End-to-end unattended automation: PARTIAL

## Next Executable Actions

1. Register missing author-visible package artifacts for The General's Will and Last Testament, Establishing Glory: The Library, The Long Watch, and Before You Were Born.
2. Add or execute the governed operational-certification path that can move a technically released package to OPERATIONALLY_CERTIFIED only after branded HTML, attachments, archive, portal package visibility, response controls, and gate evidence pass.
3. Rerun PROGRAM-006 dry-run.
4. Confirm dispatch only for titles that are eligible.

Secret values retained:
0
