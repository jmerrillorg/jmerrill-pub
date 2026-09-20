# JMP-PHASE6-PROD-001 Production Promotion and Rollback

Status: `ROLLED_BACK / BLOCKED_PRODUCTION_SCHEMA_DEPENDENCY`

PR #773 merged as `0080546972efd7c2b9adebfcda09f005ea5c027a`. PR #776 added the bounded production-only certification runtime and merged as `aee2a0daced7bf3c5d0987cfa9d3ea7bb715a0bd`. The Phase 6-only immutable deployment artifact was built from `000542f5ef3ea6aba0f02ac5f3d185815c57fc11`, passed 455 suites and 2,347 tests, and deployed without the unrelated PR #774 payload.

Managed solution `JMP_PublishingV2_Phase6_Portable` version `1.2.0.0` imported successfully under operation `b099a169-bdb4-f111-aaac-7c1e525b15c2`; publication completed under `2f04c891-beb4-f111-aaac-7c1e525b15c2`. The seven Phase 6-owned tables, Custom API, active alternate keys, environment-variable definitions, plug-in, and managed role are present.

Independent post-import readback found a production-only dependency failure. Production does not contain `jmpv2_publishingengagement` or `jmpv2_lifecycleinstance`, although the certified plug-in requires both for authoritative engagement, title, author, and lifecycle correlation. Their read privileges therefore do not exist in production, and the imported role has 43 effective privileges instead of the 45-privilege JM1-Test post-import set. No unmanaged patch was applied.

Readback also caught an imported current value of `true` for `jmpv2_Phase6OnboardingCommandEnabled`. The allowed-caller value was still empty, so requests remained fail-closed. The command was immediately restored to `false` and returned `PHASE6_ENVIRONMENT_NOT_ENABLED` on a no-effect proof invocation.

The prepared rollback contract was completed. The dedicated role assignment was removed, allowed-caller binding cleared, production certification switches disabled, dedicated user-assigned identity detached, triggers synchronized, and the Phase 6 route removed from the running Function. The managed solution remains installed and disabled, as required by the rollback contract. Production health is green.

No Whole, real author, real title, onboarding-submission, lifecycle, communication, Stripe, provider, or financial mutation occurred.

Next authority required: establish the canonical production `jmpv2_publishingengagement` and `jmpv2_lifecycleinstance` schema authority through a separately governed managed solution, then repeat role/caller commissioning and production certification. Phase 6 is not commissioned.
