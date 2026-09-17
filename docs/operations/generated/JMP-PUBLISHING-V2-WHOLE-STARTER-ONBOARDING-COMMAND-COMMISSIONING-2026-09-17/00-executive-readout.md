# Whole Starter Onboarding Command Commissioning

Date: 2026-09-17

## Decision

The JM1-Test commissioning gate failed closed. No solution import, custom API registration, plugin registration, Dataverse mutation, Whole onboarding execution, author communication, production deployment, or Phase 7 action occurred.

## Dev authority

- Live JM1-Dev exposes `jmpv2_ExecuteOnboardingCommand` as an unbound Custom API.
- Runtime assembly: `jmpv2phase6onboarding`, version `1.0.0.0`, sandbox isolation.
- Plugin type: `Jmp.Publishing.V2.Phase6.Phase6OnboardingAuthorityPlugin`.
- Owner: `JM1 Admin` (`jm1-admin@jmerrill.one`) in JM1-Dev.
- Contract: 26 optional inputs and 12 outputs. Operations are `ACTIVATE`, `SET_ITEM`, `SET_WORKSPACE`, `SET_ACCESS`, `SET_PAYOUT`, `EVALUATE`, and `ELIGIBILITY`.
- Authorization requires actor `phase6-authorized-actor` and authority context `V2_ONBOARDING_AUTHORITY`.
- Stage precondition requires the referenced lifecycle to exist at `06_ONBOARDING`.
- Idempotency is enforced by onboarding-per-engagement lookup, operation idempotency keys, replay responses, record-version checks, duplicate-workspace denial, and one completion event per onboarding key.
- Workspace binding accepts only `/01_Pipeline_A-Z` paths and records existing/provisioned state against the engagement.

The preserved local source and binary are not present on canonical `origin/main`. Their SHA-256 values are:

- Source: `06c3a4501028d4999c29d223fb4d049460bc178a073b3bc0ff92f0109d567f52`
- DLL: `e444757d0cf074fc47eb0d9d397fe194cdf57e26de43dc56c630e001adb7354b`

## Exact JM1-Test gap

Live readback from `https://jm1test.crm.dynamics.com` returned organization ID `bb7a9d9e-8e73-f111-b27b-000d3a31ff17`.

Absent in JM1-Test:

- `jmpv2_ExecuteOnboardingCommand` Custom API
- `jmpv2phase6onboarding` plugin assembly
- Phase 6 authority and completion-guard plugin types
- three Phase 6 synchronous guard steps
- `jmpv2_authoraccess` table
- command request/response registration

The `JMP_PublishingV2` managed solution is present at version `1.0.4.0`, and six of the seven Phase 6 authority tables are present.

## Blocking incompatibility

The existing `1.0.0.0` plugin hard-codes JM1-Dev organization ID `579864ae-44cc-f011-95c7-000d3a37fe06`. In any other organization it returns `JM1_DEV_REQUIRED`. The registration script has the same guard and also writes directly into JM1-Dev's unmanaged active solution.

Deploying the binary unchanged to JM1-Test would create a discoverable command that is intentionally non-invocable. Changing that guard would modify the command, which this workstream explicitly forbids. The missing `jmpv2_authoraccess` schema dependency independently prevents a complete deployment.

## Whole readback

JM1-Test contains one `Whole` engagement for Jackuline Fly with Starter Publishing Package and price `1999`. Its engagement row still reports `05_AGREEMENT_PAYMENT`, while its referenced lifecycle reports `06_ONBOARDING` at lifecycle version 2. This is configuration/data drift, not a valid parity proof.

No Whole onboarding, workspace-provisioning, or onboarding-completion record exists in JM1-Test for the engagement. The existing Stage 06 SharePoint workspace was not altered.

## Minimum future deployment plan

This plan is recorded only; it is not authorized by this packet.

1. Canonicalize the Phase 6 source and build inputs in `jmerrill-pub`.
2. Replace the Dev-only organization guard with a governed environment allowlist or configuration binding, preserving fail-closed behavior.
3. Package only the missing Phase 6 schema, relationships/keys, plugin assembly/types, Custom API contract, and three guard steps in a versioned managed patch for `JMP_PublishingV2`.
4. Import into JM1-Test, validate discovery, unauthorized denial, idempotent synthetic replay, workspace binding, duplicate denial, and zero communications.
5. Reconcile Whole's engagement/lifecycle stage parity and re-run title-specific preconditions before any real activation.

Rollback: remove the scoped managed patch or import the immediately prior managed solution version, then verify that the API, plugin types, guard steps, and newly introduced schema components are absent without changing existing title data.

## Final classification

`PRE_DEPLOYMENT_GATE = FAIL`

Exact blockers:

1. Source authority is not canonicalized on `origin/main`.
2. Existing binary is hard-bound to JM1-Dev and rejects JM1-Test.
3. JM1-Test lacks the `jmpv2_authoraccess` dependency and the full command registration surface.
4. Whole's JM1-Test engagement/lifecycle stage fields are not in parity.
5. No package-specific entitlement check exists in the current command implementation, so Starter parity cannot be certified by this command alone.
