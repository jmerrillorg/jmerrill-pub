# Identity, Artifact Lineage, and Waiting-On Authority

Last verified: 2026-08-26

## Identity

| Probe | Result |
|---|---|
| Atta / Indomitable mismatch | `DENY` |
| Quanisha / Indomitable | `ALLOW` |
| Title-named payee leakage | `DENY` |

## Artifact Lineage

Artifact authority is based on artifact identity, checksum, version, and `derivedFrom` lineage. Filename-only authority is denied.

Lineage chain:

1. Original author submission
2. Editorial working conversion
3. Editorial artifacts
4. Final editorial manuscript
5. Production master
6. Format artifacts
7. Release manifest
8. Distributed assets
9. Published title baseline

## Waiting-On Authority

| Owner | Valid basis |
|---|---|
| Author | Real delivered author request with pending response |
| JMP | Publisher approval, manual royalty/payment response, rights/legal ambiguity |
| JMP/System | Specific recoverable runtime defect only |
| External | Channel/distributor/vendor dependency |

Unexplained idle: 0

System delay mislabeled as author wait: 0
