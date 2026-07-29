# Functional Test Results

## Production Route Smoke

Tested against the App Service target with canonical host headers:

| Route | Result |
| --- | --- |
| /api/health | 200 |
| / | 200 |
| /join | 200 |
| /books | 200 |
| /authors | 200 |
| /robots.txt | 200 |
| /sitemap.xml | 200 |
| /api/author/context | 401 |
| /api/publishing/intake/config | 200, turnstileSiteKey present |
| POST /api/publishing/orchestration/intake-autostart without worker auth | 401 |

Current config endpoint contract is `turnstileSiteKey`; the value was present on 2026-07-29. Earlier `siteKeyPresent` language means Turnstile site-key presence, not a literal `siteKey` field.

## Publishing Intake

Validated:

- /join page loads.
- Intake config endpoint returns a Turnstile site key presence signal.
- Invalid Turnstile token fails safely with 400 and code turnstile_verification_failed.
- Invalid-token request did not emit a reference identifier.
- A restricted Cloudflare Turnstile widget named `JM1 Publishing /join` was created in the available Cloudflare account after no existing widget was visible.
- Hostname management on the created widget is limited to `jmerrill.pub`, `www.jmerrill.pub`, and `app-jm1-pub-prod-staging.azurewebsites.net`; Managed mode remained selected and pre-clearance remained off.
- `TURNSTILE-SITE-KEY` and `TURNSTILE-SECRET-KEY` were rotated through `jm1-core-vault` without retaining or logging the secret values.
- Staging `/api/health` returned 200 ready after the staging slot restart.
- Staging `/api/publishing/intake/config` returned 200 with a valid Turnstile site-key presence signal after Key Vault rotation.
- Browser inspection of staging `/join` rendered the Cloudflare Turnstile widget for the App Service staging hostname, replacing the prior `110200` domain-not-authorized result and later `failure_retry` state.
- Chrome received a browser Turnstile token on the staging hostname.
- A controlled invalid-token POST to staging `/api/publishing/intake` failed safely with `turnstile_verification_failed` and `invalid-input-response`, confirming the server-side Turnstile secret path is wired to Cloudflare siteverify.
- A token-bearing synthetic multipart `/join` submission returned 201 received with reference `JMP-INT-202607-YEUSKK`.
- Dataverse showed exactly one intake row for `JMP-INT-202607-YEUSKK`, with manuscript received, manuscript URL present, and workspace URL present.
- Execution logs showed intake router completion, publisher editorial review initialization, pre-package editorial review, and orchestration dispatch for `JMP-INT-202607-YEUSKK`.
- The editorial diagnostic contained a package recommendation value.
- A publishing asset was created for the synthetic title.
- Duplicate retry for idempotency key `501ad52e-8530-40b3-a5d3-dbb512134aef` returned 409 duplicate.

## Author Operating Center

Validated:

- Production unauthenticated author context fails closed with 401.
- Staging health, home, /join, /books, /authors, robots, and sitemap routes initially responded 200 after the 91152240cc23c2967d32af0e1393d353f1cae6ee standalone deployment and Key Vault setting restore.
- Earlier native staging `/api/author/gate` issuance passed after explicit staging restart: the route returned 200, issued a cookie, and `/api/author/context` returned 200 from the issued cookie.
- No-cookie context returned 401.
- Former-fallback forged session returned 401.
- Logout returned 200 and post-logout context returned 401.
- Temporary staging synthetic access settings were removed and restored to Key Vault references.
- Logout route clears the author portal cookie.
- After deployment of `a3a006bcf8839326f4270e789c1697c0d1ad68b7`, `/api/health` returned non-secret author-access diagnostics showing `env_registry`, one active grant, configured pepper, and configured session secret.
- Safe registry inspection found no synthetic fixture marker in the active registry.
- Staging `/api/author/gate` master-code isolation test returned 200, issued the author portal cookie, allowed context retrieval, and logout invalidated the session.
- Staging `/api/author/gate` for synthetic reference `JMP-INT-202607-YEUSKK` returned 200, issued the author portal cookie, and resolved the synthetic author/project context.
- Missing/cross artifact request returned 404.
- No-cookie context returned 401, forged former-fallback session returned 401, logout returned 200, and post-logout context returned 401.

Not completed:

- Fresh own-artifact download proof. The synthetic project has no delivered author-facing editorial artifact backed by Graph content.
- Stable restart-adjacent staging health. Restart-adjacent probes still showed six 20-second timeout windows and a process uptime reset before later recovery.

## Accessibility, Performance, Metadata

Basic production smoke covered primary pages, robots, sitemap, and health endpoints. Staging warm-cache route checks initially passed, but several first-hit staging routes took 6-12 seconds after restart and final staging health probes timed out. A formal accessibility and performance audit remains recommended before using this implementation as the enterprise reference pattern.
