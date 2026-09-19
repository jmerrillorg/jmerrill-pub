# Next Packet Recommendation

Do not start `JMP-PHASE6-PROD-001`.

Execute a bounded Phase 6 control-closure continuation that:

1. makes the existing governed strong-name key available through `JMP_PHASE6_SIGNING_KEY_PATH` without exposing key material;
2. resolves whether a governed request-signing authority already exists; if none exists, obtains explicit authority for the smallest request-signing contract rather than repurposing the assembly key;
3. establishes the actual nonproduction runtime host and managed identity that will invoke Phase 6;
4. transports the target security role and corrected assembly through the managed solution path into JM1-Test;
5. runs the 42-case correlation suite plus signed tamper cases as that isolated identity;
6. proves effective privilege denial and zero production effects.

Only after those gates pass should the next packet be `JMP-PHASE6-PROD-001`.
