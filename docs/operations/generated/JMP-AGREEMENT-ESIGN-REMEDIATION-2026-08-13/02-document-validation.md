# Document Validation

Last verified: 2026-08-13

## Generated Blob Artifacts

Blob prefix:

`generated-agreements/48cd0d86-f595-f111-8076-6045bdd69435/`

| Document | Bytes | SHA-256 | Hardened DOCX validation |
| --- | ---: | --- | --- |
| JMP_Publishing_Agreement_FILLED_48cd0d86-f595-f111-8076-6045bdd69435.docx | 156978 | 32b6ed05aca85d5d8ed02af2253874500a74b052c2ba4cf74d5c7292b27a5d51 | PASS |
| JMP_Publishing_Package_Addendum_FILLED_48cd0d86-f595-f111-8076-6045bdd69435.docx | 245690 | 606bc2f49a4dd91bd8367c95f63b2b2ee90d826c832a3b5c061f025c41acff9c | PASS |

## Content Finding

The generated Package Addendum currently contains:

`Selected Editions / Formats: __________________________________________________________`

This is not ready for execution because Package Addendum v4.1 makes edition selection amendment-sensitive. The reusable generator now fills this field from confirmed elected Product Forms.

## Canon Finding

Package Addendum v4.1 canonical source:

`/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/00_CANON/Publishing/Agreements/JMP_Complete_Agreement_Stack_v1/JMP_Publishing_Package_Addendum_v4.1.docx`

Relevant canon text observed:

- `Selected Editions / Formats:`
- changes to edition selection require written amendment signed by both parties.

## Negative Proof

- No regenerated agreement package was sent.
- No corrupted DOCX was sent after remediation.
- No e-sign request with source DOCX attachments was sent.
- No duplicate e-sign transaction was created.
