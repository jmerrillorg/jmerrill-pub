# JMP Publishing V2 Transition Parity Authority

This directory is the canonical source and packaging authority for the
`jmpv2_RequestTransitionV2` Dataverse Custom API implementation.

The implementation preserves the existing transition contract and adds one
bounded invariant: a successful governed transition must project the target
stage to exactly one active publishing engagement bound to the lifecycle in
the same Dataverse transaction. An idempotent replay also reconciles a stale
engagement projection without creating another transition or stage instance.

Assembly identity remains `plugin, Version=1.0.0.3` so Dataverse can update the
registered assembly in place. File and managed-patch version is `1.0.0.4`.
The strong-name key remains governed outside Git and is supplied with
`JMP_TRANSITION_SIGNING_KEY_PATH`.

The managed patch contains only the existing transition assembly/type and
Custom API contract. The three existing registered steps are verified before
export and remain bound to the unchanged plugin type identity. It contains no
Phase 6 command components and no Phase 7 components.
