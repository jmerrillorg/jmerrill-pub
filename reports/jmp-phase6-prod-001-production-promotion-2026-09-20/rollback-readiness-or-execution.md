# Rollback Execution

Rollback was required because production lacks `jmpv2_publishingengagement` and `jmpv2_lifecycleinstance`, preventing the imported role from receiving the two authoritative correlation reads.

Completed actions:

- restored `jmpv2_Phase6OnboardingCommandEnabled` to `false`;
- proved the Custom API returns `PHASE6_ENVIRONMENT_NOT_ENABLED` before processing;
- removed `JMP Phase 6 Onboarding Runtime` from the dedicated application user;
- cleared `jmpv2_Phase6AllowedCallerSystemUserId`;
- disabled the production certification route and execution switches;
- detached the dedicated Phase 6 identity from the Function;
- restarted the Function and synchronized triggers;
- verified no Phase 6 production or UAT route remains registered;
- verified Function health remains ready.

The managed solution was not uninstalled because uninstall can remove schema or data and is prohibited as an emergency response by the prepared rollback contract.

Rollback result: `PASS`.
