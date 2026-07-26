# PROGRAM-002 / PROGRAM-004 Commissioning Certification

Date: 2026-07-26
Prepared on branch: `codex/program-002-op000-track-a-reconciliation`
Current HEAD: `90d71e31ec7541c03a31752aa9f57d61f277cc62`
origin/main: `7bbcb9fa111cb364628d0cb64ea6baf83f84f215`
origin/codex/program-002-op000-track-a-pilot: `4e33a55f2e38e02c029cabf3d40617563e6fde79`

## Executive Certification

Overall recommendation: **CONDITIONAL GO**

Authoritative PR: **PR #336 -> main**
PR disposition: **REMAIN DRAFT**
Other PR disposition: **RETAIN TEMPORARILY, THEN CLOSE AS SUPERSEDED AFTER PR #336 IS HEALTHY**
Merge recommendation: **DO NOT MERGE YET**
Production recommendation: **NOT AUTHORIZED**

Route decision: **AUTHORITATIVE_ROUTE_PR_336**

Rationale: `main` is the authoritative forward integration branch for the reconstructed PROGRAM-002 source, PROGRAM-004 documentation package, Author Portal session-secret hardening, and workflow preflight enforcement. PR #335 is clean against the historical pilot branch, but merging it would require a second promotion step to `main` and would preserve branch-history ambiguity. PR #336 carries the intended forward-promotion route directly to `main`; however, GitHub currently reports `mergeStateStatus: DIRTY` and no CI checks, so it must remain draft until the merge-state and CI/preview gates are resolved.

## Branch Governance Certification

| Item | PR #335 | PR #336 |
|---|---|---|
| Base branch | `codex/program-002-op000-track-a-pilot` | `main` |
| Head branch | `codex/program-002-op000-track-a-reconciliation` | `codex/program-002-op000-track-a-reconciliation` |
| Draft status | Draft | Draft |
| Effective unique diff | 8 unique commits over pilot; 77 files changed | 8 unique commits plus one patch-equivalent base commit; 93 files changed |
| Patch-equivalent commits | None in PR route | `4e33a55` is patch-equivalent to `main` |
| CI applicability | No checks reported; pilot branch may not exercise production deployment path | No checks reported; workflow triggers are aligned to `main` PRs |
| Deployment implications | Would still require follow-on PR/merge to `main` before production path | Directly exercises the `main` Static Web Apps PR/deploy path once checks run |
| Merge conflicts or risks | GitHub reports `CLEAN`; risk is governance duplication and second promotion | GitHub reports `DIRTY`; conflict/merge-state must be resolved before ready state |
| Required follow-on merge | Yes, pilot -> main would still be required | No additional integration branch required |
| Recommendation | Retain temporarily; close as superseded after PR #336 is proven healthy | Authoritative route, remain draft until gates close |

Live evidence:

- PR #335: `OPEN`, draft, base `codex/program-002-op000-track-a-pilot`, merge state `CLEAN`, checks empty.
- PR #336: `OPEN`, draft, base `main`, merge state `DIRTY`, checks empty.
- `git cherry -v origin/main HEAD` marks `4e33a55` with `-` and marks the intended eight commits with `+`.
- `.codex-tmp/` remains untracked and absent from the effective PR diff.

PR #336 unique commit list:

1. `d3b40daa9de7b9114ebe600a0a41fcdabc04e5f7` - Reconstruct publishing intake onboarding safeguards
2. `8eb2087eb36d9553b2e1547d41ceaef3eac53199` - Reconstruct author operating center
3. `01079cc26a4998f914b45c89037b92314a7464b1` - Reconstruct diagnostic runner governed routing
4. `dcc0d2870607cda5b2c1fdbbefbacc778b218158` - Reconstruct publisher operating center
5. `2e372e9ecfb2781f494d6ede96b8432fd71582c6` - Add maintained reconstruction guard scripts
6. `a1dae0bd7b6b5a6948cddad9fe4bafdb186be088` - docs: reconcile commissioning microsoft productization package
7. `7767e6eedfb43268f909058492b46da0b82deb25` - fix: harden author portal session secret
8. `90d71e31ec7541c03a31752aa9f57d61f277cc62` - ci: require author portal session secret

`4e33a55f2e38e02c029cabf3d40617563e6fde79` is classified as **PATCH_EQUIVALENT_BASE_COMMIT - NO UNIQUE PR DELTA**.

## Repository and PR Certification

PR #336 effective diff against `origin/main` is the intended reconciliation package:

- Publishing intake/onboarding safeguards.
- Author Operating Center reconstruction.
- Diagnostic runner governed routing.
- Publisher Operating Center reconstruction.
- Reconstruction guard scripts.
- PROGRAM-004 documentation package.
- Author Portal session-secret hardening.
- Static Web Apps session-secret preflight.

No `.codex-tmp/`, dirty-worktree generated evidence, pnpm migration, public asset deletion, or excluded operational artifacts appear in the effective diff. The PROGRAM-004 evidence index CSV in `docs/implementation` is repository-retained documentation, not copied generated evidence.

## Security Certification

Security certification: **SECURITY_CONDITIONAL**

Code state:

- No static session-secret fallback remains for Author Portal session signing.
- `AUTHOR_PORTAL_SESSION_SECRET` is required by `lib/server/author-portal-access.ts`.
- Missing, blank, former fallback, placeholder, short, or low-diversity values fail closed through `AuthorPortalSessionConfigurationError`.
- Forged cookies signed with the former fallback are rejected.
- Valid sessions are rejected after secret rotation.
- The workflow preflight references only `${{ secrets.AUTHOR_PORTAL_SESSION_SECRET }}`.
- The secret value is not logged or exposed.
- Rollback is valid secret restoration/rotation, prior secure release redeploy, or temporary portal disablement; never restore static fallback.

Validation evidence:

- `scripts/program002_author_portal_access.test.mjs` covers valid production secret, missing production secret, former fallback, weak placeholders, explicit test secret, former-fallback forgery rejection, secret rotation, and fail-closed route trust boundary.
- Prior local validation passed: `npm run type-check`, `npm run lint` with one pre-existing font warning, `npm run build`, `npm run workflow-engine-guard`, Author Portal security tests 10/10, diagnostic runner tests 1658/1658, and `git diff --check`.
- Current GitHub CI has not yet reported checks for PR #336.

Remaining production proof required:

1. GitHub Actions secret `AUTHOR_PORTAL_SESSION_SECRET` exists and passes preflight.
2. PR preview Static Web Apps deployment completes.
3. Preview/runtime proves valid session issuance and former-fallback rejection without exposing the secret.
4. Production deployment remains blocked until the same path is proven for the target environment.

## PROGRAM-004 SharePoint and Evidence Certification

PROGRAM-004 SharePoint authority: **CLOSED**

Canonical authority:

`Implementation HQ / Documents / Enterprise Governance / PROGRAM-004 / v1.0`

Operational continuity mirror:

`/Volumes/UsersExternal/JM1/_EVIDENCE/PROGRAM-004/v1.0/`

Traceability authority:

`Dataverse jm1_executionlog`

Integrity distinction:

- UsersExternal mirror: locally SHA-256 verified.
- SharePoint: verified by item ID, canonical path, byte size, and available metadata readback.
- SharePoint content was not successfully re-downloaded for independent SHA-256 verification during the current pass.

`PROGRAM-004_CANONICAL_REFERENCE_SYNC_PENDING` remains **OPEN - TRACEABILITY ONLY**. It does not block repository authority, SharePoint authority, or PR review. It should be closed later by one Dataverse `jm1_executionlog` traceability event using the canonical site/library/folder path, manifest item ID, repository-designation item ID, delta-report item ID, local manifest checksum, UsersExternal mirror path, and verification timestamp.

## Dataverse and Power Automate Certification

| Area | Certification | Basis |
|---|---|---|
| Canonical manuscript-status field | CONDITIONALLY CERTIFIED | Website split and numeric Choice payload mapping are documented; controlled end-to-end proof is blocked until governed Power Automate/Dataverse target alignment. |
| Legacy-field treatment | CERTIFIED | Legacy `idea_outline` is rejected for review rather than silently remapped; legacy flow aliases are documented. |
| Active flow mapping | CONDITIONALLY CERTIFIED | Four flow definitions were preserved; active author-onboarding flow still needs governed update to consume numeric payload values safely. |
| Controlled onboarding proof | NOT CERTIFIED | No safe end-to-end controlled submission should run while the current field meanings conflict. |
| Display harmonization | CONDITIONALLY CERTIFIED | Canonical keys and labels exist; downstream display alignment remains open. |
| Latest `Add_a_new_row` runtime state | CONDITIONALLY CERTIFIED | Prior evidence shows `jm1pub_submissions` first-write and raw payload truncation constraints; latest controlled proof remains held. |
| Execution-log traceability | CONDITIONALLY CERTIFIED | `jm1_executionlog` is canonical and PROGRAM-004 execution-log evidence exists; PROGRAM-004 canonical reference sync remains pending. |
| Author Contact quality/reconciliation | CONDITIONALLY CERTIFIED | Rosetta is uniquely matched; Cynthia and Carolyn remain unresolved for Stripe pilot identity. |

Do not claim end-to-end onboarding readiness until a successful controlled proof exists after flow/field alignment.

## Author Operating Center Certification

Code ready: **YES, CONDITIONAL ON PR MERGE CONFLICT/CI RESOLUTION**
Pilot ready: **PARTIAL**
Production ready: **NO**

Certified code properties:

- Session secret fails closed.
- Context and artifact access are gated through session/access resolution.
- Profile writeback and onboarding/financial/royalty setup routes share the same trust boundary.
- Feature gating and Stripe status surfaces are reconstructed.

Pilot/production conditions:

- Production `AUTHOR_PORTAL_SESSION_SECRET` must be proven in GitHub/Azure path.
- PR #336 merge state must be resolved.
- CI and preview must pass.
- Session revocation/recovery proof remains a hardening item unless Jackie accepts current rotation/logout behavior for pilot.
- Broad author activation is not authorized.

## Publisher Operating Center Certification

Certification: **CONDITIONALLY CERTIFIED FOR CONTROLLED USE**

The reconstructed Publisher Operating Center provides operator-facing surfaces and guarded action logging paths. It depends on current Dataverse configuration for execution-log writes and title/workspace truth. No evidence proves broad operator production use, obsolete behavior retirement, or final permission matrix closure. Controlled use may proceed only after PR #336 CI/preview gates and Dataverse configuration verification.

## Azure and AI Certification

| Area | Certification | Basis |
|---|---|---|
| Static Web Apps build/deployment path | CONDITIONALLY CERTIFIED | Workflow path exists and includes secret preflight; PR #336 has no checks/preview yet. |
| Azure Functions diagnostic runner | CERTIFIED FOR TESTED ROUTES | Diagnostic runner validation previously passed 1658/1658; governed routing reconstructed. |
| Runner-key contract | CONDITIONALLY CERTIFIED | Guarded route and provider abstractions exist; deployment/runtime proof remains separate. |
| Managed-identity proof | CONDITIONALLY CERTIFIED | Foundry/Dataverse app identity proof exists for PROGRAM-003A; SharePoint manuscript Graph path still needs operational proof where used. |
| Foundry evaluation/logging | CONDITIONALLY CERTIFIED | Controlled synthetic proof succeeded; real-manuscript shadow hit request-size architecture limit and remains in shadow remediation. |
| Agent 365 | UNCONFIRMED | Architecture/blueprint evidence exists, but entitlement and live operational proof are not certified. |

## Stripe Connect Certification

| Area | Certification |
|---|---|
| Legal entity | J Merrill Publishing, Inc. confirmed in evidence. |
| Pilot authorization | Controlled pilot preparation authorized for Rosetta Perry, Cynthia Sloan, Carolyn Booker-Pierce. |
| Rosetta Perry | Contact uniquely matched: `40c8a8e5-872a-f111-88b4-7c1e525b15c2`; preparation partially ready after status fields and pilot route. |
| Cynthia Sloan | Not uniquely matched; Jackie/contact reconciliation required. |
| Carolyn Booker-Pierce | Not uniquely matched; Jackie/contact reconciliation required. |
| Author-centric relationship model | Certified as required rule: Contact ID and approved email must anchor pilot account/link. |
| Non-sensitive Dataverse fields | Required fields identified; not present in current Contact metadata readback. |
| Invitation status | Not sent; draft communication prepared for Jackie review only. |
| Account/link creation status | Blocked before account creation. |
| Payout status | Not authorized. |

Stripe readiness:

- **PILOT PREPARATION READY:** partial, Rosetta-only after schema/route prerequisites.
- **PILOT INVITATION READY:** no.
- **PAYOUT READY:** no.

## Business Central Certification

Certification: **NOT CERTIFIED FOR PRODUCTION**

Business Central remains a future financial/accounting system of record, but production posting is explicitly held. Current evidence does not prove complete sandbox setup, posting setup, accounting periods, opening-balance decisions, dimensions, entitlement, migration readiness, or production posting authorization. No production posting is authorized.

## Microsoft Capability Utilization Certification

| Platform | Classification |
|---|---|
| Dynamics 365 Sales | PARTIALLY USED |
| Customer Service | UNDERUSED |
| Customer Insights/Journeys | DEFERRED |
| Power Apps | UNDERUSED |
| Dataverse | PROVEN |
| Power Automate | PARTIALLY USED |
| Business Central | DEFERRED |
| Foundry / Azure AI | PILOT |
| Agent 365 | UNCONFIRMED |
| Entra | PARTIALLY USED |
| SharePoint | PROVEN |
| Purview | UNCONFIRMED |
| Defender | UNCONFIRMED |
| Azure Monitor | PARTIALLY USED |
| GitHub / deployment pipelines | PROVEN |

Highest-value next three capability proofs:

1. GitHub Actions / Static Web Apps preview proof for `AUTHOR_PORTAL_SESSION_SECRET`.
2. Power Automate + Dataverse controlled onboarding proof using canonical manuscript-status values.
3. Agent 365 no-write entitlement and lifecycle proof, if Jackie approves.

## Productization Certification

Current productization posture: **INTERNAL_ONLY with REUSABLE_PATTERN and ACCELERATOR_CANDIDATE components**

Reusable patterns exist: intake envelope, business-truth/runtime-truth doctrine, execution logging, evidence retention, exception-driven operations, Publisher Operating Center, diagnostic runner, and SharePoint evidence model.

Commercial product readiness is **NOT CERTIFIED**. Tenant-aware configuration, managed solutions, branding replacement, licensing/IP separation, consent, tenant isolation, deployment portability, security proofs, and repeatable deployment are not materially proven at product level.

## Consolidated Exception Register

The detailed register is in `PROGRAM-002-PROGRAM-004-Certification-Exception-Register-2026-07-26.csv`.

Material blockers:

- PR #336 merge state is `DIRTY`.
- PR #336 CI/preview checks have not reported.
- Production `AUTHOR_PORTAL_SESSION_SECRET` preflight has not passed in CI.
- Controlled onboarding proof is blocked by Power Automate/Dataverse field alignment.
- Stripe pilot invitations and payout remain blocked.
- Business Central production posture is not certified.
- Agent 365 remains unconfirmed.

## Evidence Index

The detailed evidence index is in `PROGRAM-002-PROGRAM-004-Certification-Evidence-Index-2026-07-26.csv`.

## Jackie Action Register

The Jackie action register is in `PROGRAM-002-PROGRAM-004-Certification-Jackie-Action-Register-2026-07-26.csv`.

## Unauthorized-Change Confirmation

No code, configuration, schema, branch, PR, SharePoint, Dataverse, Azure, Stripe, Business Central, production, payout, author activation, evidence deletion, `.codex-tmp/` cleanup, rebase, force-push, merge, deployment, or PR retargeting action was performed during this certification pass. Only the requested certification documents were created in the repository worktree for review.
