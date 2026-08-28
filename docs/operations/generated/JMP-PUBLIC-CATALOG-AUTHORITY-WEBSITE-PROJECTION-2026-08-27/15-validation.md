# Validation

Last Verified: 2026-08-27T22:56:00-04:00

| Command | Result |
| --- | --- |
| `npm ci` | PASS; Node 26 engine warning because repository declares Node 24 |
| `npm run type-check` | PASS |
| `npm run public-catalog-projection-guard` | PASS, 16 / 16 |
| `npm run catalog-source-guard` | PASS |
| `npm run public-author-privacy-guard` | PASS, 21 / 21 |
| `npm run jmp-lifecycle-authority-guard` | PASS, 22 / 22 |
| `npm run build` | PASS with pre-existing custom-font warning, edge-runtime static-generation notice, and local Dataverse missing-config warnings |
| `JM1_RELEASE_SHA=$(git rev-parse HEAD) npm run package:appservice -- .codex-tmp/jmerrill-pub-public-catalog-projection.zip` | PASS |

Package checksum:

`291fdbc61ef24870b8528160e243770b1a77090ddfe47510b197595f85867856`

Post-deploy readback before readiness correction:

- `/api/health`: PASS, release `2dd56a81a4fa5d5c425ee72fb461f4e3c7afc48f`, Dataverse ready.
- `/api/public-catalog`: PASS, 113 titles / 65 authors.
- Initial strict readiness marked 113 holds because missing ISBN was treated as blocking; follow-up correction separates missing ISBN as metadata warning.
