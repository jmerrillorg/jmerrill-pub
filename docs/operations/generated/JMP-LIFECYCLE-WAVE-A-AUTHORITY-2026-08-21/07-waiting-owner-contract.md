# 07 - Waiting Owner Contract

Allowed values:

- Prospect
- Author
- JMP
- JMP/System
- External

System Attention is separate and includes bounded semantic categories such as:

- NONE
- AUTHOR_ACK_FAILED
- WORKSPACE_PROVISIONING_FAILED
- PAYMENT_EVENT_FAILED
- PROVIDER_BACKPRESSURE
- FOUNDRY_PROVIDER_BACKPRESSURE
- ARTIFACT_MISSING
- TRANSITION_CONFLICT
- RUNTIME_HOLD
- DELIVERY_CERTIFICATION_REQUIRED

The validator proves System Attention does not rewrite Waiting On.
