# JMP Publishing V2 Phase 6 Portable Command

This directory is the canonical source and build authority for `jmpv2_ExecuteOnboardingCommand`.

The command is enabled per environment by the Dataverse environment variable `jmpv2_Phase6OnboardingCommandEnabled`. Its managed-solution default is `false`; each governed target must set an explicit current value of `true` before invocation. Missing or false configuration returns `PHASE6_ENVIRONMENT_NOT_ENABLED`.

The signing key is governed outside Git. Set `JMP_PHASE6_SIGNING_KEY_PATH` to the approved strong-name key before running `node scripts/build-plugin.mjs`.

The portable solution is `JMP_PublishingV2_Phase6_Portable`, version `1.1.0.0`. It contains the author-access table and relationship/key subcomponents, plugin assembly and two plugin types, Custom API and contract children, three synchronous guard steps, and the environment-variable definition. It contains no Phase 7 component.

## Environment binding

- Variable: `jmpv2_Phase6OnboardingCommandEnabled`
- Managed default: `false`
- Governed target value: explicitly set to `true` before command invocation
- Fail-closed result when missing or false: `PHASE6_ENVIRONMENT_NOT_ENABLED`
- Authorization remains bound to the `phase6-authorized-actor` caller and `V2_ONBOARDING_AUTHORITY` authority contract.

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

JM1-Test deployment is intentionally held while Whole's lifecycle stage (`06_ONBOARDING`) and engagement projection (`05_AGREEMENT_PAYMENT`) disagree. The direct repair attempt was rejected by the existing transition-authority guard, so the managed package has not been imported to JM1-Test.
