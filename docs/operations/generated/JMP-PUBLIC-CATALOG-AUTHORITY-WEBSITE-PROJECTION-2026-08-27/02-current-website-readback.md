# Current Website Readback

Last Verified: 2026-08-27T22:54:20-04:00

| Check | Result |
| --- | --- |
| `https://jmerrill.pub/books` | HTTP 200 |
| `https://jmerrill.pub/api/public-catalog` before deployment | 404 page returned, because route is not live before this PR deploys |
| `https://jmerrill.pub/sitemap.xml` before deployment | Static pages and imprint pages present; dynamic title/author rows were not returned in the sampled first 4 KB |

This readback confirms the current public site is reachable and identifies the pre-change live gap addressed by the new route and projection guard.
