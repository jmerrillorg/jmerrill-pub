# Validation

Last Verified: 2026-08-27T22:56:00-04:00

| Command | Result |
| --- | --- |
| `npm ci` | PASS; Node 26 engine warning because repository declares Node 24 |
| `npm run type-check` | PASS |
| `npm run public-catalog-projection-guard` | PASS, 15 / 15 |
| `npm run catalog-source-guard` | PASS |
| `npm run public-author-privacy-guard` | PASS, 21 / 21 |
| `npm run jmp-lifecycle-authority-guard` | PASS, 22 / 22 |
| `npm run build` | PASS with pre-existing custom-font warning, edge-runtime static-generation notice, and local Dataverse missing-config warnings |
| `JM1_RELEASE_SHA=$(git rev-parse HEAD) npm run package:appservice -- .codex-tmp/jmerrill-pub-public-catalog-projection.zip` | PASS |

Package checksum:

`291fdbc61ef24870b8528160e243770b1a77090ddfe47510b197595f85867856`
