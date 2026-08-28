# Drift Detection

Last Verified: 2026-08-27T22:56:00-04:00

Automated drift protections:

- `npm run catalog-source-guard` rejects runtime imports of `data/books.json`;
- `npm run public-author-privacy-guard` protects public identity and suppressed-author behavior;
- `npm run public-catalog-projection-guard` validates public page readiness, duplicate slug handling, retailer boundary, API sanitization, and lifecycle live-gate behavior.
- public projection readiness separates blocking public-page defects from metadata warnings such as missing ISBN.

Generic drift bucket target:

`GENERIC_PUBLIC_CATALOG_DRIFT = 0`
