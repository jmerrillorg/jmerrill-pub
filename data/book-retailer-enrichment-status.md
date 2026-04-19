# Retailer Enrichment Status

Last updated: `2026-04-19`

- Total titles: `121`
- Enriched titles: `57`
- Titles with `releaseDate`: `38`
- Titles with `subtitle`: `19`
- Titles with `retailerCoverUrl`: `51`
- Titles still on logo fallback: `70`
- Titles in manual review: `7`
- Titles with covers displayed: `51`
- Titles ready for homepage feature: `51`

## Amazon Link Types

- `search_fallback`: `43`
- `verified_pdp`: `0`

## Notes

- Publisher-entered fields remain authoritative; retailer metadata only fills gaps or validates missing detail.
- Cover recovery now prioritizes already enriched titles using live-resolving Bookshop/Ingram CDN image URLs and previously verified retailer image hosts.
- The current batch concentrated on the first 24-36 books in the release-sorted catalog so the strongest cover density improves the highest-visibility browsing surfaces first.
- Final pre-launch recovery added a broader wave of verified Bookshop/Ingram covers across the release-sorted front catalog and active-author backlist while intentionally skipping broken or visibly weak candidates.
- `titlesWithCoversDisplayed` currently tracks titles whose resolved `coverUrl` will render a real cover instead of the logo fallback.
- `titlesReadyForHomepageFeature` currently tracks titles that now have a live cover plus the supporting metadata already needed to render cleanly in homepage-worthy featured modules.
