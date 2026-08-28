# Validation

Last Verified: 2026-08-27T23:15:00-04:00

| Command | Result |
| --- | --- |
| `npm ci` | PASS; Node 26 engine warning because repository declares Node 24 |
| `npm run type-check` | PASS |
| `npm run public-catalog-projection-guard` | PASS, 17 / 17 |
| `npm run catalog-source-guard` | PASS |
| `npm run public-author-privacy-guard` | PASS, 21 / 21 |
| `npm run jmp-lifecycle-authority-guard` | PASS, 22 / 22 |
| `npm run build` | PASS with pre-existing custom-font warning, edge-runtime static-generation notice, and local Dataverse missing-config warnings |
| `JM1_RELEASE_SHA=$(git rev-parse HEAD) npm run package:appservice -- .codex-tmp/jmerrill-pub-public-catalog-projection.zip` | PASS |

Package checksum:

`291fdbc61ef24870b8528160e243770b1a77090ddfe47510b197595f85867856`

Post-deploy readback after readiness correction:

- `/api/health`: PASS, release `a45af85aefa16d9dafb264292eb5eb77724e7ffc`, Dataverse ready.
- `/api/public-catalog`: PASS, 113 titles / 65 authors.
- Public projection readiness: 103 titles ready for public verification, 10 true holds, 113 metadata warnings.
- Blocking issue distribution: 6 duplicate title-slug rows, 3 missing author-attribution rows, 1 missing author-page row.
- Representative title page `/books/delicious-ideas`: HTTP 200.
- Representative author page `/authors/agape-international-cathedral`: HTTP 200.
- Representative title page JSON-LD: PASS.
- Sitemap production readback before runtime-dynamic correction: 0 projected title/author URLs, requiring final sitemap patch.
