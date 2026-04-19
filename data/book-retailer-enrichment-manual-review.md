# Retailer Enrichment Manual Review

These titles produced ISBN-level retailer matches, but the retailer author data did not validate cleanly against the current jmerrill.pub catalog, so they were intentionally left unmodified during the automated enrichment pass.

## Author conflicts

- `100-wisdom-lessons-for-life-and-living`
  ISBN: `9781961475571`
  Current site author: `Obadiah Harris`
  Retailer author surfaced: `J. Derrick Johnson`

- `damaged`
  ISBN: `9781961475700`
  Current site author: `Sylvia Benson`
  Retailer author surfaced: `Taye Knox`

## Field-level variances

- `god-s-nudge`
  ISBN: `9781950719884`
  Match status: `verified title/author`
  Withheld field: `releaseDate`
  Reason: retailer sources disagreed on the initial release date, so only descriptive enrichment was saved.

- `kingdom-equipment-101`
  ISBN: `9781954414778`
  Match status: `verified title/author`
  Withheld field: `releaseDate`
  Reason: retailer sources agreed on the book identity and subtitle but not the exact release day, so the date was left unset.

- `let-me-tell-you-about-it`
  ISBN: `9781954414983`
  Match status: `verified title/author`
  Withheld field: `releaseDate`
  Reason: retailer sources aligned on the book but surfaced conflicting August/September 2022 dates, so the exact date was left unset.

- `the-journey`
  ISBN: `9781954414297`
  Match status: `verified title/author`
  Withheld field: `releaseDate`
  Reason: retailer sources confirmed the subtitle and description, but only surfaced month-level or conflicting year signals, so the exact date was left unset.

- `the-master-s-piece`
  ISBN: `9781954414488`
  Match status: `verified title/author`
  Withheld field: `releaseDate`
  Reason: retailer sources aligned on the book identity but surfaced conflicting August/September 2022 dates, so the exact date was left unset.

## Notes

- Amazon product detail pages could not be fetched reliably from this environment because Amazon returned an automated-access error page.
- For titles that did pass validation, `purchaseLinks.amazon` currently uses ISBN-based Amazon search URLs as a stable interim fallback until canonical product-page URLs can be confirmed.
- Verified enrichment records now include machine-readable `retailerMatchStatus` and `amazonLinkType` fields in the overrides.
