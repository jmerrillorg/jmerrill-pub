# JMP-PHASE6-PROD-001 Production Promotion Contract

Status: `PREPARED / READY FOR SEPARATE EXECUTION AUTHORITY`

This packet promotes the certified Phase 6 runtime from JM1-Test to production without changing its trust model, schema, business contract, or human-first boundary. Preparation of this packet does not authorize a production import.

## Certified inputs

| Input | Authority |
| --- | --- |
| Repository | `jmerrillorg/jmerrill-pub` |
| Application PR | `#773` |
| Certified PR head | `00bafc25c8219ff43ca49a468ef0d76b08597283` |
| Solution | `JMP_PublishingV2_Phase6_Portable` |
| Version | `1.2.0.0` |
| Managed package SHA-256 | `d7f31234005a51d40bf611e5a8bf3fd5252b3b9955934d2fa78bf10d4da8eb19` |
| Plug-in public key token | `fffbe8b3d67a6cc0` |
| Request authority | Entra caller token plus server-side correlation |
| JM1-Test proof | 42 of 42 live checks passed |

The execution packet must replace the certified PR head with the resulting canonical merge SHA after merge and prove byte parity with the managed artifact before production import.

## Non-negotiable boundaries

- Resolve the actual production caller before creating or assigning a Dataverse application user.
- Reuse an existing production workload identity only when its runtime, purpose, and environment match Phase 6.
- Do not reuse the JM1-Test application user or UAT managed identity.
- Do not use System Administrator for Phase 6.
- Do not deploy or expose the UAT synthetic certification route in production.
- Do not use Whole or any real author/title as a canary.
- Do not infer identity from name, email, title text, amount, latest record, or time proximity.
- Do not automatically advance Stage 06 to Stage 07.
- Do not send communications or create financial effects.

## Authority required to execute

`PRODUCTION_IMPORT_AUTHORIZED = YES` must be independently issued for `JMP-PHASE6-PROD-001` after the preflight record is complete. Until then, production mutations remain zero.
