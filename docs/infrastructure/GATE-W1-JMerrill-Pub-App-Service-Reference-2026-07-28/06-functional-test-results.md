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
- Automated browser inspection of the staging `/join` page still recorded Cloudflare Turnstile client warning `110200`.

Not completed:

- Positive synthetic /join submission. The production Turnstile widget still did not issue a token on the staging hostname, and no bypass was introduced.

## Author Operating Center

Validated:

- Production unauthenticated author context fails closed with 401.
- Staging health, home, /join, /books, /authors, robots, and sitemap routes initially responded 200 after the 91152240cc23c2967d32af0e1393d353f1cae6ee standalone deployment and Key Vault setting restore.
- Native staging `/api/author/gate` synthetic session issuance passed after explicit staging restart: the route returned 200, issued a cookie, and `/api/author/context` returned 200 from the issued cookie.
- No-cookie context returned 401.
- Former-fallback forged session returned 401.
- Logout returned 200 and post-logout context returned 401.
- Temporary staging synthetic access settings were removed and restored to Key Vault references.
- Logout route clears the author portal cookie.

Not completed:

- Fresh own-artifact download proof after the prior fixture retirement. The previous governed fixture proved own-artifact 200 and cross-author 404, but those synthetic Dataverse and SharePoint rows were retired after the earlier evidence window.
- Stable staging health. Restart-adjacent `/api/health` probes timed out before later warm recovery.

## Accessibility, Performance, Metadata

Basic production smoke covered primary pages, robots, sitemap, and health endpoints. Staging warm-cache route checks initially passed, but several first-hit staging routes took 6-12 seconds after restart and final staging health probes timed out. A formal accessibility and performance audit remains recommended before using this implementation as the enterprise reference pattern.
