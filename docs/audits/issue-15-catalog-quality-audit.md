# Issue 15 Catalog Quality Audit

Scope: catalog data sources, book rendering, cover image references, purchase links, author names, descriptions, slugs, ISBN fields, and fallback behavior.

## Executive Summary

The catalog has a strong normalized rendering layer, but the underlying source data is incomplete. `data/books.json` contains 123 unique book records with valid ISBN-shaped values, but no publisher-entered descriptions, no publisher cover paths, and, before this PR, only one direct publisher purchase URL. The live book pages therefore depend on enrichment overrides and generated fallback copy.

Safe fixes in this PR are intentionally narrow:

- remove one broken remote cover URL so the title falls back cleanly instead of rendering a blocked image
- remove one dead publisher purchase URL so users are shown the existing contact fallback instead of a 404 purchase path
- correct one obvious author-name casing typo
- make generated book-description fallback copy transparent instead of presenting generated marketing copy as title-specific description metadata

Jackie has since resolved the open publisher-decision items:

- Keep `125+` catalog language unchanged because it includes published titles plus active production pipeline titles.
- Preserve `Focus, Trust, and Follow` as separate paperback and ebook records because they have distinct ISBNs and formats.
- Route missing covers to a future Catalog Asset Recovery Initiative.
- Route verified direct purchase links to a future Catalog Commerce Modernization project.
- Route descriptions and metadata enrichment to a future CoreSource Metadata Integration project.

## Data Sources Inspected

- `data/books.json`
- `data/book-retailer-enrichment-overrides.ts`
- `data/book-purchase-link-overrides.ts`
- `data/title-author-overrides.ts`
- `data/author-name-to-master-name.ts`
- `data/book-contributor-overrides.ts`
- `data/book-series-overrides.ts`
- `data/authors.ts`
- `data/BOOKS_DATA_GUIDE.md`
- `data/internal-catalog-notes.md`
- `lib/content.ts`
- `components/content/BookCard.tsx`
- `app/books/BooksClient.tsx`
- `app/books/[id]/page.tsx`
- `app/authors/[slug]/page.tsx`
- `public/`

## Data Coverage

| Area | Result | Category |
| --- | ---: | --- |
| Book records | 123 | Informational |
| Duplicate IDs | 0 | Informational |
| ISBN format issues | 0 | Informational |
| Publisher `description` values in `books.json` | 0 | Needs source data |
| Resolved descriptions after enrichment | 37 | Informational |
| Generated fallback descriptions | 86 | Safe auto-fix for fallback wording; source data needed for real descriptions |
| Publisher `coverUrl` values in `books.json` | 0 | Needs source data |
| Resolved covers after enrichment | 51 before fixes; 50 after removing one blocked URL | Informational |
| Missing resolved covers | 72 before fixes; 73 after removing one blocked URL | Needs source data |
| Broken local cover paths | 0 | Informational |
| Broken remote cover URLs | 1 before fixes; 0 known after fixes | Safe auto-fix |
| Titles with any purchase link | 43 before fixes; 42 after removing one dead publisher link | Informational |
| Titles with no purchase link | 80 before fixes; 81 after removing one dead publisher link | Needs source data |
| Amazon links | 42 ISBN search fallbacks | Needs source data for verified product links |
| Publisher/direct purchase links | 1 broken before fixes; 0 after fixes | Safe auto-fix |
| Missing author names after overrides | 0 | Informational |
| Suspicious author formatting | 1 | Safe auto-fix |
| Suspicious duplicate title groups | 1 before publisher decision; preserved as distinct editions after review | No action required |
| Unmatched override keys | 0 | Informational |

## Findings

### Safe Auto-Fix

1. Broken remote cover: `a-principal-s-tale`
   - Current URL: `https://covers3.booksamillion.com/covers/bam/1/95/071/966/1950719669_b.jpg`
   - Live check result: `403`
   - Safe fix: remove this remote `retailerCoverUrl` until a verified cover source is available. The title will use the existing logo fallback.

2. Broken publisher purchase link: `never-give-up-on-love`
   - Current URL: `https://shop.ingramspark.com/b/084?params=TRQMS7x9VjYLLDTZPAXrQQGT1P1ClcVx8r`
   - Live check result: `404`
   - Safe fix: remove the dead `purchaseUrl`. The book detail page already falls back to `Ask about this title`.

3. Author-name casing typo: `words-of-a-troubled-soul`
   - Current resolved author: `David WIlliams`
   - Safe fix: correct to `David Williams` in both alias and title-author override data.

4. Generated fallback description copy is too assertive
   - Current fallback copy includes claims such as "positioned for readers seeking..." and "preparing for future Dataverse-driven catalog enrichment".
   - Risk: fallback copy can read like authoritative book metadata even though it is generated.
   - Safe fix: keep title, genre, imprint, ISBN, and format facts, but clearly state that publisher description copy is pending.

### Publisher Decisions Applied

1. `Focus, Trust, and Follow` title records
   - `focus-trust-and-follow-paperback`: paperback ISBN `978-1-950719-49-5`
   - `focus-trust-and-follow`: ebook ISBN `978-1-950719-50-1`
   - Decision: preserve both as legitimate separate format records. The paperback record was normalized from the incorrect `Focus, Trust, & Follow` title to `Focus, Trust, and Follow`.

2. Catalog count language
   - The UI says `125+ titles`, while the canonical JSON currently has 123 public records.
   - Decision: no action required. The label includes published titles plus active production pipeline titles.

3. Author fallback profile copy
   - Generated author bios still include broad brand-positioning claims when no source bio exists.
   - Decision: leave unchanged in this catalog-quality PR. Do not modify Why-first or broader page copy yet.

4. Old/internal platform language
   - Generated fallback text references Dataverse and future enrichment.
   - This PR removes that wording from book description fallback copy only. Any similar author/profile/platform copy should be reviewed separately.

### Needs Source Data

1. Missing covers
   - 72 titles have no resolved cover after publisher data and retailer enrichment.
   - No `/public/covers` files currently exist.
   - Decision: create a future Catalog Asset Recovery Initiative.
   - See Appendix A for the full title list.

2. Missing purchase links
   - 80 titles have no purchase links at all.
   - 42 titles use Amazon ISBN search fallback links, not verified product pages.
   - Only one publisher direct link existed, and it was broken.
   - Decision: create a future Catalog Commerce Modernization project.
   - See Appendix B for the full no-link list.

3. Missing real descriptions
   - 86 titles have no publisher or retailer description.
   - This PR improves fallback honesty but does not invent descriptions.
   - Decision: create a future CoreSource Metadata Integration project.
   - See Appendix C for the full list.

4. Verified retailer metadata
   - `book-retailer-enrichment-status.md` says Amazon links are all `search_fallback`; none are verified PDP links.
   - Verified Amazon, Barnes & Noble, Apple Books, Bookshop, or publisher purchase links should come from source research or retail dashboards.
   - Decision: do not pull descriptions or covers from Amazon, Barnes & Noble, or other retailer pages in this PR.

## Link and Image Checks

Live URL checks were performed before safe fixes on all resolved remote covers and purchase URLs:

- Amazon ISBN search fallbacks: 42 checked, 42 returned OK.
- Remote cover URLs: 51 checked, 50 returned OK, 1 returned 403.
- Publisher purchase URLs: 1 checked, 1 returned 404.

## Fallback Rendering Behavior

- Catalog cards render real covers when `book.coverUrl` resolves, otherwise they render `/logo.jpg`.
- Book detail pages render title and author inside the cover frame when no cover exists.
- Catalog cards hide purchase buttons when no purchase links exist.
- Book detail pages show `Ask about this title` when no purchase links exist.
- Missing ISBN renders as `Catalog record pending`, but all current ISBN values are present and valid-shaped.

## Appendix A: Missing Resolved Covers

`100-wisdom-lessons-for-life-and-living`, `27-days-to-overcoming-depression`, `a-little-bit-of-everything`, `a-portrait-of-paradise`, `a-truebies-guide-part-1`, `a-truebies-guide-part-2`, `abortion`, `aligned`, `are-you-sure-that-you-are-ready`, `because-the-lord-is-my-shepherd`, `bee-careful`, `biblical-prescriptions-for-life-s-troubles`, `come-out-of-hiding`, `connected`, `damaged`, `delicious-ideas`, `destined-to-break-the-curse`, `destined-to-break-the-curse-devotional`, `establishing-glory`, `establishing-glory-2`, `establishing-glory-3`, `focus-trust-and-follow-paperback`, `for-what-it-s-worth`, `from-stylist-to-ceo`, `girl-you-re-not-crazy-you-re-dealing-with-a-narcissist`, `god-s-business-plan`, `god-s-word-for-this-world`, `grandmothers-educating-minds-2nd-edition`, `have-you-considered-my-servant`, `help-god-i-am-confused`, `i-am-my-worst-enemy`, `inner-peace-through-life-s-storms`, `inspirations-from-god`, `jewels-by-lady-j`, `just-what-i-needed`, `life-after-detour`, `love-is-an-action-word`, `love-lucy`, `loving-the-addict`, `melodies-from-heaven`, `more-than-a-village`, `my-abc-s`, `naughty-tales`, `never-give-up-on-love`, `number-23-and-me`, `one-soul`, `pieces-of-me-all-over-the-place`, `seasons-of-life`, `she`, `speech-therapy-works`, `support-beyond-the-cycle`, `taylor-made`, `the-celestial-advantage`, `the-doctrine-of-last-things`, `the-essence-of-life-love-letters-to-christ`, `the-flame`, `the-girl-with-the-ebony-locs-and-the-three-bears`, `the-hood`, `the-i-am-in-me-part-2`, `the-little-girl-with-the-plow`, `the-messenger-2`, `the-never-before-told-story-of-the-gelatin-monster`, `the-paper-champ`, `the-princess-and-the-black-eyed-pea`, `the-release-of-the-spirit`, `uncomfortable-conversations-with-god`, `understanding-the-misunderstood`, `war-mother`, `when-zuri-came-to-earth`, `why-faith-works-for-some-and-not-for-others`, `girl-did-you-know`, `the-conquest-of-azenga`.

## Appendix B: Missing All Purchase Links

`100-wisdom-lessons-for-life-and-living`, `a-blended-family`, `a-little-bit-of-everything`, `a-portrait-of-paradise`, `a-truebies-guide-part-1`, `a-truebies-guide-part-2`, `abortion`, `aligned`, `are-you-sure-that-you-are-ready`, `because-the-lord-is-my-shepherd`, `bee-careful`, `bodacious`, `come-out-of-hiding`, `connected`, `conquer-your-fears-and-win`, `damaged`, `department-of-the-air-force-mission-driven-leadership`, `destined-to-break-the-curse`, `destined-to-break-the-curse-devotional`, `focus-trust-and-follow-paperback`, `focus-trust-and-follow`, `for-what-it-s-worth`, `from-stylist-to-ceo`, `girl-you-re-not-crazy-you-re-dealing-with-a-narcissist`, `god-s-business-plan`, `god-s-word-for-this-world`, `grandmothers-educating-minds`, `grandmothers-educating-minds-2nd-edition`, `have-you-considered-my-servant`, `hop-hop-hop`, `i-am-my-worst-enemy`, `inner-peace-through-life-s-storms`, `inspirations-from-god`, `jewels-by-lady-j`, `just-what-i-needed`, `life-after-detour`, `love-is-an-action-word`, `love-lucy`, `love-of-my-life`, `loving-the-addict`, `melodies-from-heaven`, `memoir-of-a-black-christian-nationalist`, `mirror-of-refining-insight`, `more-than-a-village`, `my-abc-s`, `naughty-tales`, `number-23-and-me`, `one-soul`, `ordinary-people-searching-for-greatness`, `pieces-of-me-all-over-the-place`, `pretty-wings`, `rhyming-it-up-with-church-stuff`, `seasons-of-life`, `she`, `speech-therapy-works`, `support-beyond-the-cycle`, `taylor-made`, `the-celestial-advantage`, `the-doctrine-of-last-things`, `the-essence-of-life-love-letters-to-christ`, `the-flame`, `the-girl-with-the-ebony-locs-and-the-three-bears`, `the-hood`, `the-i-am-in-me-part-2`, `the-little-girl-with-the-plow`, `the-messenger-2`, `the-never-before-told-story-of-the-gelatin-monster`, `the-paper-champ`, `the-princess-and-the-black-eyed-pea`, `the-release-of-the-spirit`, `uncomfortable-conversations-with-god`, `understanding-the-misunderstood`, `war-mother`, `warriors-and-angels`, `when-zuri-came-to-earth`, `why-faith-works-for-some-and-not-for-others`, `your-brain-has-too-much-what-mommy`, `you-re-still-not-crazy`, `girl-did-you-know`, `the-conquest-of-azenga`.

## Appendix C: Generated Fallback Descriptions

86 titles rely on generated fallback description copy. The missing-description list overlaps heavily with Appendix B and should be resolved by adding publisher-approved descriptions or verified retailer descriptions, not by inventing metadata in code.
