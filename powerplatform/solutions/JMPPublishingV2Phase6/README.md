# JMP Publishing V2 Phase 6 Portable Command

This directory is the canonical source and build authority for `jmpv2_ExecuteOnboardingCommand`.

The command is enabled per environment by the Dataverse environment variable `jmpv2_Phase6OnboardingCommandEnabled`. Its managed-solution default is `false`; each governed target must set an explicit current value of `true` before invocation. Missing or false configuration returns `PHASE6_ENVIRONMENT_NOT_ENABLED`.

Caller authority is bound to `jmpv2_Phase6AllowedCallerSystemUserId`. The value is the Dataverse application-user ID for the environment's commissioned workload identity. The plug-in requires both `UserId` and `InitiatingUserId` to match that value and returns `UNAUTHORIZED_CALLER` when it is missing, invalid, or different. Caller-supplied `Actor` and `AuthorityContext` fields remain semantic contract guards; they are not authentication credentials.

JM1-Test certification invokes the command through `func-jm1-publishing-inbound-uat`. Its system-assigned managed identity is represented by the least-privilege Dataverse application user. The UAT route is disabled unless `JMP_PHASE6_CERTIFICATION_ENABLED=true`, accepts only `PHASE6_SYNTHETIC_TEST_ONLY` requests with synthetic correlation/idempotency prefixes, and uses the existing diagnostic-runner authorization boundary. It is not a production route and cannot commission Phase 7.

The signing key is governed outside Git. Set `JMP_PHASE6_SIGNING_KEY_PATH` to the approved strong-name key before running `node scripts/build-plugin.mjs`.

The portable solution is `JMP_PublishingV2_Phase6_Portable`, version `1.2.0.1`. It contains the seven Phase 6-owned tables and their relationship/key subcomponents, plugin assembly and two plugin types, Custom API and contract children, three synchronous guard steps, the two environment-variable definitions, and the least-privilege Phase 6 runtime role. It contains no Phase 7 component. Version `1.2.0.1` refreshes the managed security-role layer after the authoritative base Publishing solution made the engagement and lifecycle tables available in downstream environments.

## Environment binding

- Variable: `jmpv2_Phase6OnboardingCommandEnabled`
- Managed default: `false`
- Governed target value: explicitly set to `true` before command invocation
- Fail-closed result when missing or false: `PHASE6_ENVIRONMENT_NOT_ENABLED`
- Caller variable: `jmpv2_Phase6AllowedCallerSystemUserId`
- Caller default: blank / fail closed
- Request authority: Entra workload token validated by Dataverse, exact Dataverse application-user binding, server-side engagement/author/title/lifecycle correlation, and durable idempotency
- Runtime role: `JMP Phase 6 Onboarding Runtime`; no delete, assign, share, schema-administration, or security-administration privilege
- Custom API execution privilege: `prvCreatejmpv2_OnboardingRecord`, granted by the dedicated Phase 6 runtime role
- Contract labels `phase6-authorized-actor` and `V2_ONBOARDING_AUTHORITY` remain defense-in-depth command checks, not authentication credentials.

There is no environment URL, organization ID, title identity, or Dev-only execution branch in the plugin source.

## Author-access schema

- Table: `jmpv2_authoraccess`
- Primary key: `jmpv2_authoraccessid`
- Primary name and authority key column: `jmpv2_accesskey`
- Required business columns: access key, engagement ID, and status
- Supporting evidence/idempotency columns: author profile key, onboarding key, onboarding-record lookup, evidence reference, evidence checksum, idempotency key, test classification, and verification time
- Relationship: `jmpv2_phase6_onboarding_access` from onboarding record to author access
- Alternate key: `jmpv2_authoraccess_authoritykey` on `jmpv2_accesskey`
- Ownership: user-owned
- Auditing: table-level auditing is disabled; governed business/evidence columns retain their exported field-level audit settings
- Runtime dependency: the onboarding command plugin; no flow dependency is required by this patch

## Build and evidence

Run `node scripts/build-plugin.mjs` with the governed signing-key path configured, then register/export through the supplied scripts. The `src` directory is the unpacked canonical solution source. Generated Dev regression, export, Test preflight, and Whole stage-parity evidence is stored under `evidence`.

JM1-Test imported version `1.1.0.0` after Whole's stage parity was repaired. Command certification then failed closed because the target onboarding-record schema lacked `jmpv2_authorprofileid`, `jmpv2_policyversion`, and `jmpv2_recordversion`. The Test environment switch was returned to `false`; Whole onboarding was not executed. Version `1.2.0.0` completes the managed Phase 6 table schema so recertification does not depend on environment-local fields.
