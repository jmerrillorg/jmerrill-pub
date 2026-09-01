# Divergence Trace

Last Verified: 2026-09-01T23:40:56.677Z

## Deterministic Sample

| Field | Value |
| --- | --- |
| Source record | W1-301 |
| Title | Indomitable |
| Author | Quanisha Dockery |
| Certified projection | COMMERCIAL_ACTIVATION / PACKAGE_ACCEPTANCE / NOT_WAITING |
| Visible authenticated production UI before Wave 6 | 05 - Join the Family & Author Onboarding / Author Onboarding Tasks / JMP/System |
| Visible attention before Wave 6 | ARTIFACT_AUTHORITY_UNRESOLVED |
| Proof contract result before Wave 6 | FAIL_AUTHENTICATED_UI_PROJECTION_DIVERGENCE |

## First Divergence Point

The first divergence point is the Publisher Operating Center title-card read model, before API serialization and UI rendering. The server grouped multiple title rows and chose the title-card primary row with `prioritizeTodayItems(items)[0]`, which ranks urgency/owner/age. That allowed a noisy workload/production/artifact-attention row to become the source used for `projectCanonicalPublisherLifecycle`, even when the certified current-authority row projected `COMMERCIAL_ACTIVATION / PACKAGE_ACCEPTANCE / NOT_WAITING`.

The UI was already rendering `card.canonicalLifecycle`; the wrong lifecycle was being built for the card.
