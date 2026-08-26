# Source Canon Reconciliation

Last Verified: 2026-08-26

## Input Authority

Block 07 begins only after Block 06 produces:

- `PRE_DISTRIBUTION_CERTIFIED`
- `DISTRIBUTION_AUTHORIZED`
- frozen release manifest
- release-readiness certificate
- Block 07 handoff package

Block 06 release SHA at entry: `74dc9a051393b7550954361a62e0d98011519aee`

## Reconciliation Classification

| Requirement Family | Status |
| --- | --- |
| Frozen-manifest entry gate | CURRENT |
| Channel distribution instance identity | CURRENT |
| Endpoint requirement classification | CURRENT |
| Separate JMP and external state | CURRENT |
| Idempotent submission and attempt history | CURRENT |
| Channel adapter contract | REFINED |
| Print/eBook/audio lanes | REFINED |
| External ID and URL registry | CURRENT |
| Live listing verification | CURRENT |
| Orderability distinction | CURRENT |
| Format/territory/title state derivation | CURRENT |
| Targeted remediation, correction, incident, takedown | CURRENT |
| Block 08 handoff | CURRENT |
| Block 09 handoff | CURRENT |
| Launch execution | NOT_APPLICABLE_TO_BLOCK07 |
| Royalty and long-term title management | NOT_APPLICABLE_TO_BLOCK07 |

## Controls Not Recreated

Block 07 does not decide ISBN, price, territory, route, publication date, preorder state, author confirmation, or Publisher authorization. Those remain Block 06 frozen-manifest authority.

