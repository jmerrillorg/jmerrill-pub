# JMP Author Workspace Authentication / Session Resolution Remediation

Date: 2026-08-13

Asset: 'Til Death Do Us Part

Boundary: AWAITING_AUTHOR_FORMAT_SELECTION

## Defect Classification

BLOCKED - AUTHOR WORKSPACE AUTHENTICATION / SESSION RESOLUTION DEFECT

Observed defect:

- The Author Operating Center did not complete a durable author workspace session for the governed author path.
- The remediation addressed the reusable authentication/session-resolution path globally.
- No author-facing retry request was issued.

## Remediation

Pull request:

- PR: https://github.com/jmerrillorg/jmerrill-pub/pull/496
- Head: 77bfee7d667a024df902ebec2ca2c9b83249b796
- Merge SHA: b9d664cf3aa3cc7eb8edb73813b8e69723401287

Implemented controls:

- Author provider sign-ins remain author-scoped and cannot be shadowed by publisher-role classification.
- Publisher provider sign-ins require publisher authorization before publisher role assignment.
- Durable author sign-in can resolve the Author Portal context and write the governed author portal session cookie.
- Signed-in-but-unresolved author state is reported truthfully as relationship not resolved, not generic invitation required.
- Safe auth/session diagnostics are logged without tokens, cookies, passwords, or secret values.

## Validation

Local validation:

- `npm ci` PASS
- `npm run author-auth-guard` PASS
- `node --test scripts/quanishia_commercial_continuation_remediation_guard.test.mjs` PASS
- `npm run type-check` PASS
- `npm run build` PASS

Runtime deployment:

- Push staging workflow run: https://github.com/jmerrillorg/jmerrill-pub/actions/runs/31697326056
- Staging deployment: PASS
- Explicit production promotion workflow run: https://github.com/jmerrillorg/jmerrill-pub/actions/runs/31697771749
- Production promotion: PASS
- Production observation: PASS
- Production health release: b9d664cf3aa3cc7eb8edb73813b8e69723401287

Live browser proof:

- `https://jmerrill.pub/author/portal?reference=JMP-INT-202608-MNBJ&view=author` loaded without redirect loop.
- Unauthenticated Author Portal state fell back to the governed sign-in / activation-code gate.
- Author provider route resolved to JM1 Author Identity.
- Saved author identity visible at Microsoft CIAM: `chosen2k7@gmail.com`.
- Live proof stopped at Microsoft CIAM password prompt. No password was entered or requested.

## Negative Proof

- Duplicate author/contact creation: 0
- Duplicate workspace relationship creation: 0
- Activation-code generation: 0
- Format-selection mutation: 0
- Format-task duplicate event: 0
- Author communication: 0
- PR #431 progression: 0
- Business Central mutation: 0
- Dataverse schema mutation: 0
- Public website content mutation: 0

## Current State

Runtime remediation:

COMPLETE / DEPLOYED / PRODUCTION HEALTH VERIFIED

Same-author live login proof:

BLOCKED AT EXTERNAL AUTHOR CREDENTIAL PROMPT

Current author-visible boundary:

AWAITING_AUTHOR_FORMAT_SELECTION remains the governed business state.

Do not continue to format selection, e-sign, or downstream commissioning until the author completes the Microsoft CIAM sign-in and the `Choose Your Publishing Formats` task is visible in the Author Operating Center.
