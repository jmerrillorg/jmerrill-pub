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

## Production operating status

Phase 6 is commissioned in JM1-Core and operates under normal Publishing governance. Production uses the managed dependency solution `JMP_PublishingV2` version `1.0.4.0` and the managed Phase 6 solution `JMP_PublishingV2_Phase6_Portable` version `1.2.0.1`.

The production command runs as the dedicated `id-jm1-publishing-phase6-prod` workload identity through the enabled Dataverse application user and the `JMP Phase 6 Onboarding Runtime` role. That role contains the 45 required privileges and no System Administrator, System Customizer, delete, assign, or share authority.

Phase 6 completion establishes eligibility for Stage 07. It never authorizes or performs an automatic Stage 07 transition. Publishing operations retain the human approval boundary.

JM1-Test remains the recertification environment. Preserve its managed solution, workload identity, application user, negative-test infrastructure, and the immutable `1.2.0.1` managed package. Production monitoring uses the existing Application Insights runtime telemetry, governed post-change configuration readback, and the BAU drift-response procedure recorded in `reports/jmp-phase6-close-001-bau-transition-2026-09-20/`. Phase 7 remains held until separately authorized.
