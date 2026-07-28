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
| /api/publishing/intake/config | 200, siteKeyPresent=true |
| POST /api/publishing/orchestration/intake-autostart without worker auth | 401 |

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
- Staging health, home, and /join routes respond 200 after restore.
- Temporary staging synthetic access settings were removed and restored to Key Vault references.

Not completed:

- Native staging /api/author/gate synthetic session issuance. Temporary preview-only registry and master-code settings were rejected with 401. No cookie was issued.

## Accessibility, Performance, Metadata

Basic production smoke covered primary pages, robots, sitemap, and health endpoints. A formal accessibility and performance audit remains recommended before using this implementation as the enterprise reference pattern.
