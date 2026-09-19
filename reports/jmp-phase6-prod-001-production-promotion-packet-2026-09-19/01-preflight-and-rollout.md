# Preflight and Rollout

## Preflight gates

All gates must pass in one action-time readback:

1. Canonical main contains the PR #773 merge and the package matches SHA-256 `d7f31234005a51d40bf611e5a8bf3fd5252b3b9955934d2fa78bf10d4da8eb19`.
2. The target is positively identified as the production Dataverse environment by URL, organization ID, environment class, and tenant.
3. Current production solution presence/version and all Phase 6 environment-variable values are captured before mutation.
4. The actual production component that invokes `jmpv2_ExecuteOnboardingCommand` is positively identified.
5. Its Entra workload identity is enabled, attributable, secretless where supported, and scoped to production.
6. A production Dataverse application user maps exactly to that Entra identity.
7. The application user has only `JMP Phase 6 Onboarding Runtime`; System Administrator and unrelated roles are absent.
8. The role has the certified privilege matrix, including no delete, assign, share, schema administration, security administration, unrelated-brand, payment, royalty, or communication authority.
9. A rollback operator, rollback time window, and evidence destination are named.
10. Independent `PRODUCTION_IMPORT_AUTHORIZED = YES` authority is recorded.

If any gate fails, stop before import.

## Rollout order

1. Capture production baseline and export the existing solution when present.
2. Set or verify `jmpv2_Phase6OnboardingCommandEnabled = false` before import.
3. Import the exact managed `1.2.0.0` package and publish customizations.
4. Verify assembly identity, Custom API execute privilege, tables, relationships, keys, role, and both environment-variable definitions.
5. Bind `jmpv2_Phase6AllowedCallerSystemUserId` to the exact production application-user GUID.
6. Assign the least-privilege role and verify the effective privilege set.
7. Confirm the shared infrastructure identity is not the Phase 6 caller and no System Administrator dependency exists.
8. Enable the command only after steps 1-7 pass.
9. From the actual production runtime identity, invoke one no-mutation canary with random nonexistent durable IDs. Expected result: authenticated caller passes the caller boundary and the command fails closed on authoritative record resolution.
10. From a noncommissioned authenticated caller, invoke the same no-mutation shape. Expected result: `UNAUTHORIZED_CALLER`.
11. Read back audit/telemetry, verify zero created or changed business records, and close the deployment window.

No functional production canary may create an author profile, onboarding record, workspace, access record, payout state, completion event, transition, message, or financial effect.
