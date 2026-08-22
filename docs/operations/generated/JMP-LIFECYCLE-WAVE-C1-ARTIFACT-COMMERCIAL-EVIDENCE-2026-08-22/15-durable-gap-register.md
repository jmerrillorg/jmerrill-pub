# Durable Gap Register

| Gap | Classification | Remediation |
|---|---|---|
| Artifact checksum 0/314 | RESOLVABLE where bytes are readable; otherwise structural history gap | Add prospective checksum persistence; propose production additive checksum writes only when byte-readable, source-backed, idempotent, and separately authorized. |
| Lifecycle-critical artifact lineage class absent from production vocabulary | RESOLVABLE/prospective | Add future artifact class/source-lineage fields or adapter mapping without rewriting historical rows. |
| Workspace entitlement/active authority | STRUCTURAL | Connect durable entitlement/provisioning registry; do not infer from URL or author relationship. |
| Format certification | STRUCTURAL Block 06/07 | Add explicit certification event/ledger; do not infer from live/publication/URL. |
| Royalty payout readiness | STRUCTURAL Block 09 | Wave D or later only; no Wave C.1 implementation. |
