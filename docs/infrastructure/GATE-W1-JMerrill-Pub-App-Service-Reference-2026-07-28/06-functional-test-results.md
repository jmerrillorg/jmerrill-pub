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

Not completed:

- Positive synthetic /join submission. The production Turnstile widget did not issue a token in automated browser validation, and no bypass was introduced.

## Author Operating Center

Validated:

- Production unauthenticated author context fails closed with 401.
- Staging health, home, /join, /books, /authors, robots, and sitemap routes initially responded 200 after the 91152240cc23c2967d32af0e1393d353f1cae6ee standalone deployment and Key Vault setting restore.
- Temporary staging synthetic access settings were removed and restored to Key Vault references.
- Logout route clears the author portal cookie.

Not completed:

- Native staging /api/author/gate synthetic session issuance. Temporary certification-only synthetic access settings were rejected with 401. No cookie was issued.
- Stable staging health. Final `/api/health` probes timed out after 20 seconds and 60 seconds.

## Accessibility, Performance, Metadata

Basic production smoke covered primary pages, robots, sitemap, and health endpoints. Staging warm-cache route checks initially passed, but several first-hit staging routes took 6-12 seconds after restart and final staging health probes timed out. A formal accessibility and performance audit remains recommended before using this implementation as the enterprise reference pattern.
