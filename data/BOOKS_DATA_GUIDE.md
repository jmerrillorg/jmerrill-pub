# Books Data Entry Guide
## How to populate cover images, ISBNs, retailer purchase links, and retailer enrichment metadata

---

## Fields to populate per title

| Field | Source | Format |
|-------|--------|--------|
| `isbn` | IngramSpark title dashboard | `"978-1-950719-XX-X"` |
| `description` | Your back cover copy or CoreSource metadata | Plain text, 1–3 paragraphs |
| `coverUrl` | Upload to `/public/covers/[id].jpg` | `"/covers/establishing-glory.jpg"` |
| `purchaseUrl` | IngramSpark → eCommerce → Create a Link → URL | `"https://shop.ingramspark.com/b/084?params=..."` |
| `isEmbedTag` | IngramSpark → eCommerce → Copy an HTML Embed Tag | Raw HTML string |

---

## How to get the IngramSpark purchase URL (per title)

1. Log into IngramSpark → **eCommerce** → **Create a Link**
2. Select the title
3. Set price (retail) — no limitations needed for general public link
4. Choose format: **Standard URL**
5. Copy the `https://shop.ingramspark.com/b/084?params=...` URL
6. Paste into `purchaseUrl` in `books.json`

Same process for Lightning Source (LSI) — they also have an eCommerce dashboard.

---

## Retailer link structure

The frontend now supports a canonical retailer link model:

- `purchaseLinks.publisher`
- `purchaseLinks.amazon`
- `purchaseLinks.barnesAndNoble`
- `purchaseLinks.appleBooks`

Current behavior:

- `books.json.purchaseUrl` feeds the direct/publisher button
- future retailer links should be added through `book-purchase-link-overrides.ts`
- retailer buttons only render when a link exists

This keeps the title UI stable while Amazon and other retailer links are enriched later by ISBN.

---

## Retailer enrichment structure

Retailer-driven metadata should be added through `book-retailer-enrichment-overrides.ts`.

Supported enrichment fields:

- `retailerMatchStatus`
- `amazonLinkType`
- `asin`
- `subtitle`
- `series`
- `seriesOrder`
- `retailerTitle`
- `releaseDate`
- `retailerDescription`
- `retailerAuthorBio`
- `retailerCoverUrl`
- `retailerLastVerifiedAt`

Use publisher-managed content as the canonical source whenever it exists.
Retailer data should primarily fill gaps, validate metadata, or provide fallbacks.

Series metadata should be added through `book-series-overrides.ts` so titles can participate in future grouped series UI without forcing series copy into retailer enrichment records.

Recommended status values:

- `retailerMatchStatus: "verified"` when ISBN and title/author validate cleanly
- `retailerMatchStatus: "fallback_only"` when only a partial/non-authoritative enrichment is available
- `retailerMatchStatus: "manual_review"` when the match is ambiguous and should not be auto-applied
- `amazonLinkType: "search_fallback"` when Amazon PDP verification is blocked and the ISBN search URL is used
- `amazonLinkType: "verified_pdp"` when a direct Amazon product page has been confirmed

---

## How to add cover images

### Option A — Local (fastest for now)
1. Export cover JPGs from IngramSpark or your design files
2. Name them `[book-id].jpg` matching the `id` field in books.json
3. Place in `/public/covers/`
4. Set `"coverUrl": "/covers/establishing-glory.jpg"`

### Option B — CDN (production-grade)
1. Upload covers to Azure Blob Storage or Cloudinary
2. Set `"coverUrl": "https://your-cdn.com/jmp-covers/establishing-glory.jpg"`
3. Add the CDN hostname to `next.config.mjs` → `images.remotePatterns`

### Option C — Auto-import from IngramSpark
IngramSpark provides cover image URLs via their title API.
Future: build a script to pull covers automatically via Ingram iQ.

---

## Batch data entry

For bulk updates, edit `books.json` directly.
The file is sorted descending by year then alphabetically.

Format example:
```json
{
  "id": "establishing-glory",
  "title": "Establishing Glory",
  "author": "Jackie Smith Jr.",
  "genre": "Faith",
  "imprint": "JM Works",
  "year": 2019,
  "format": ["PB", "HC", "EB"],
  "isbn": "978-1-950719-00-0",
  "description": "Establishing Glory is a...",
  "coverUrl": "/covers/establishing-glory.jpg",
  "purchaseUrl": "https://shop.ingramspark.com/b/084?params=...",
  "isEmbedTag": "<a href='...'><img src='...' /><br/><button>Buy Now</button></a>"
}
```

---

## Dataverse migration (Phase 2)

When the jm1_title table is live in Dataverse:
- `isbn` → maps to `jm1_isbn`
- `description` → maps to `jm1_description`  
- `coverUrl` → maps to `jm1_coverimage_url`
- `purchaseUrl` → maps to `jm1_purchaselink_ingram`
- `purchaseLinks.amazon` → maps to a future Amazon retailer URL field
- `purchaseLinks.barnesAndNoble` → maps to a future Barnes & Noble retailer URL field
- `purchaseLinks.appleBooks` → maps to a future Apple Books retailer URL field
- `subtitle` → maps to a future subtitle field
- `series` → maps to a future series/title-group field
- `seriesOrder` → maps to a future series sequence field
- `releaseDate` → maps to a future publication/release date field
- `asin` → maps to a future retailer identifier field
- `retailerDescription` → maps to a future external metadata description field
- `retailerAuthorBio` → maps to a future external contributor bio field
- `retailerCoverUrl` → maps to a future retailer cover fallback field
- `isEmbedTag` → maps to `jm1_embedtag_ingram`

The `/books` page will switch from `books.json` to a Dataverse API call.
No frontend changes required — same data shape.
