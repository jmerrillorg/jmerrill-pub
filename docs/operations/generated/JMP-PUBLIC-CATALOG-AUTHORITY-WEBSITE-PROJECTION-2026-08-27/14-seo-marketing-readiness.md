# SEO and Marketing Readiness

Last Verified: 2026-08-27T22:56:00-04:00

Added:

- canonical URL metadata for title pages;
- canonical URL metadata for author pages;
- Open Graph metadata for title pages;
- Open Graph metadata for author pages;
- title JSON-LD;
- author JSON-LD.

All values are projected from public catalog records and governed public author identity, not copied from retailer pages.

## Destination Preflight

Before promoting a book or author destination, run the existing public projection check:

```sh
node scripts/check-campaign-destinations.mjs /books/the-conquest-of-azenga /authors/iyorwuese-hagher
```

The check reads `campaignReadiness` from `/api/public-catalog` and verifies the destination responds successfully. It fails closed for missing covers, descriptions, edition identifiers or conflicting edition formats; author destinations require a real portrait and biography. `HOLD` is a content-review gate, not authority to hide a published title, change lifecycle state, or launch a campaign. Resolve the listed source gaps and visually inspect desktop/mobile before promotion. Purchase links must be exact-edition verified; use the existing inquiry action where none is established. No timer or campaign sender is introduced.
