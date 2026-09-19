# Rollback Contract

## Immediate fail-closed action

At the first failed import, identity, role, canary, telemetry, or mutation check:

1. Set `jmpv2_Phase6OnboardingCommandEnabled = false`.
2. Confirm every invocation returns `PHASE6_ENVIRONMENT_NOT_ENABLED` before business processing.
3. Remove the Phase 6 role assignment from the commissioned application user when the defect involves identity or privilege binding.
4. Clear or replace the allowed-caller value only under the same rollback authority; never point it to a shared administrator.
5. Preserve import logs, operation IDs, environment-variable readbacks, application-user/role evidence, and canary responses.

## Solution rollback

Do not uninstall the managed solution as an emergency response because uninstall can remove schema/data. Operational rollback is the disabled command boundary above.

If binary or metadata rollback is required, prepare a separately versioned managed rollback artifact from the last production-authoritative source and import it through normal solution governance. Do not force a lower-version import, unmanaged patch, or ad hoc plug-in registration.

## Rollback success criteria

- command disabled and fail-closed;
- no Phase 6 caller retains System Administrator;
- no real title, author, engagement, lifecycle, workspace, communication, or financial mutation;
- production business continuity unaffected;
- incident and evidence IDs recorded;
- new promotion authority required before retry.
