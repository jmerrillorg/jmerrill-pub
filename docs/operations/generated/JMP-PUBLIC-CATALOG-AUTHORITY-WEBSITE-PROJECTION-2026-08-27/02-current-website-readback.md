# Current Website Readback

Last Verified: 2026-08-27T23:20:00-04:00

| Check | Result |
| --- | --- |
| `https://jmerrill.pub/books` | HTTP 200 |
| `https://jmerrill.pub/api/public-catalog` before deployment | 404 page returned, because route is not live before this PR deploys |
| `https://jmerrill.pub/sitemap.xml` before deployment | Static pages and imprint pages present; dynamic title/author rows were not returned in the sampled first 4 KB |
| `https://jmerrill.pub/api/health` after deployment | PASS; release `29a5dcd5f242dc257251a0ee367f7f88a2d82a92`; Dataverse ready |
| `https://jmerrill.pub/api/public-catalog` after deployment | PASS; 113 titles / 65 authors |
| `https://jmerrill.pub/books/delicious-ideas` after deployment | PASS; HTTP 200 and Book JSON-LD present |
| `https://jmerrill.pub/authors/agape-international-cathedral` after deployment | PASS; HTTP 200 |
| `https://jmerrill.pub/sitemap.xml` after deployment | PASS; 178 projected title/author URLs |

This readback confirms the current public site is reachable and identifies the pre-change live gap addressed by the new route and projection guard.
