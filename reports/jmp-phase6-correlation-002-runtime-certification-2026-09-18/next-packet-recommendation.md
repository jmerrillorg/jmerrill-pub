# Next Packet Recommendation

Do not start `JMP-PHASE6-PROD-001`.

Execute a bounded Phase 6 control-closure continuation that:

1. makes the existing governed strong-name key available through `JMP_PHASE6_SIGNING_KEY_PATH` without exposing key material;
2. packs and imports the corrected assembly plus `executeprivilegename=prvCreatejmpv2_OnboardingRecord` through the managed solution path into JM1-Test;
3. configures the already-identified `func-jm1-publishing-inbound-uat` runtime for the JM1-Test Dataverse resource without introducing a secret;
4. proves token acquisition and invokes the suite as application user `c8b4a60b-1ab4-f111-aaac-70a8a59b112b`;
5. runs the 42-case correlation suite plus unauthorized-caller and claim-substitution cases under the selected Entra-token trust model;
6. proves effective privilege denial and zero production effects.

Only after those gates pass should the next packet be `JMP-PHASE6-PROD-001`.
