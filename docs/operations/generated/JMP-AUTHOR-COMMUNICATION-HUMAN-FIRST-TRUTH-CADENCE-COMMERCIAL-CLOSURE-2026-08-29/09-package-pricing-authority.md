# Package Pricing Authority

Last Verified: 2026-08-29T12:04:54Z

Runtime source:

- `azure-functions/diagnostic-ai-runner/src/author/milestone6BusinessSourceLayer.js`
- Export: `PACKAGE_CATALOG`

Current values used by the recommendation guard:

| SKU | Package | Price |
|---|---|---:|
| `JMP-PKG-STARTER` | Starter Publishing Package | $1,999 |
| `JMP-PKG-PRO` | Professional Publishing Package | $4,500 |
| `JMP-PKG-PREMIER` | Premier Publishing Package | $7,500 |
| `JMP-PKG-CHILD` | Children's Package, author provides art | $2,495 |

Template correction:

- Recommendation templates no longer rely on unmanaged fallback price strings for Starter/Professional defaults.
- `editorialRecommendationEmailTemplate.js` resolves prices through the catalog-backed helper.
- `publisherRecommendationReview.js` resolves recommendation package details through the same helper.

Evidence Source: source diff and package recommendation tests.
