# Issue #14 — Navigation Simplification Audit

Phase: 1 — Audit Only  
Repository: jmerrillorg/jmerrill-pub  
Doctrine: J Merrill Publishing Author-First / Family-First strategy  
Source Context: Issue #13 Phase 1 Doctrine Audit and Issue #13A Metadata and Microcopy Cleanup  
Scope: Public navigation review before implementation changes  
Status: Draft PR audit deliverable  

Refs #14

## 1. Executive Summary

The current navigation is directionally aligned with the Why-First doctrine. The header is simple, author-facing, and gives `/join` strong visibility through the persistent "Join the Family" CTA. The homepage also does a strong job of sorting authors by intent through "I want to publish my book," "I want to explore the books," and "I'm already a JMP author."

The main navigation problem is not the header alone. It is the difference between a clean header and an overloaded footer. The header is concise but omits several key author decision routes, while the footer exposes many routes, labels, prices, technical pages, and adjacent properties at once. This makes the site feel simpler at the top than it actually is at the bottom.

The biggest future opportunity is to define a clearer author journey model:

1. Decide whether JMP understands the author and the work.
2. Learn how publishing works.
3. Compare publishing paths.
4. Review proof through books and authors.
5. Join the Family.
6. Return later for post-publication support.

No navigation code was changed in this phase. This report only documents current friction and recommends a future simplification model.

## 2. Current Navigation Inventory

### 2.1 Header Navigation

Current primary header links:

- Publish With Us → `/publishing`
- Our Books → `/books`
- Authors → `/authors`
- Services → `/services`
- About → `/about`

Current header utility / CTA:

- Schedule a Consultation → Microsoft Bookings URL
- Join the Family → `/join`

Current token-defined but not rendered as primary header link:

- JM Prestige → `/publishing-partner`

Current top system bar:

- Division 01 · Publishing
- J Merrill One → `https://www.jmerrill.one`

Header scores:

| Navigation Area | Clarity Score | Author Journey Score | Conversion Support Score |
|---|---:|---:|---:|
| Header primary navigation | 8.0 | 7.5 | 8.5 |
| Header CTA area | 8.5 | 8.0 | 9.0 |
| Top system bar | 5.5 | 4.5 | 4.0 |

Observations:

- Header is concise and readable.
- `/join` is prominent enough in the persistent header.
- `/books` and `/authors` are visible as proof pathways.
- `/author-journey`, `/packages`, `/memberships`, `/distribution`, and `/publishing-partner` are not exposed in the header.
- The "Division 01 · Publishing" top bar is technically consistent with JM1, but it is not author-first and may introduce internal-system framing before the visitor reaches the main navigation.

### 2.2 Footer Navigation

Current footer columns:

- Services
- Company
- Memberships
- Enterprise

Footer services links:

- Publishing Packages → `/packages`
- Editorial Services → `/services`
- Audiobook Production → `/services#audio`
- Marketing & Launch → `/services#marketing`
- Faith Market → `/services#faith`
- View Full Catalog → `/services`

Footer company links:

- About JMP → `/about`
- Authors → `/authors`
- Author Journey → `/author-journey`
- Our Books → `/books`
- Readers → `/readers`
- Publishing → `/publishing`
- Pricing → `/packages`
- JM Prestige → `/publishing-partner`
- Distribution → `/distribution`
- Platform Roadmap → `/platform`
- Contact → `/contact`
- Advertising (iD) → `/advertising`
- Join the Family → `/join`
- Schedule a Call → Microsoft Bookings URL

Footer memberships links:

- Community — $79/mo → `/memberships`
- Support — $149/mo → `/memberships`
- Marketing — $199/mo → `/memberships`
- AI Author — $249/mo → `/memberships`

Footer enterprise links:

- J Merrill One
- JM Financial
- JM Foundation
- JM Productions

Footer scores:

| Navigation Area | Clarity Score | Author Journey Score | Conversion Support Score |
|---|---:|---:|---:|
| Footer link inventory | 5.0 | 5.5 | 6.0 |
| Footer author decision support | 5.5 | 6.0 | 6.0 |
| Footer technical / enterprise exposure | 4.5 | 4.0 | 3.5 |

Observations:

- Footer is comprehensive but visually and conceptually noisy.
- "Pricing" duplicates "Publishing Packages."
- "View Full Catalog" points to `/services`, which reads as a label mismatch because catalog usually means books.
- Membership tier links expose prices directly in navigation, making the footer feel transactional.
- "Platform Roadmap," "Advertising (iD)," and enterprise family links may be valid but are overexposed for first-time authors.
- Footer does contain important pages missing from the header, including `/author-journey`, `/packages`, `/publishing-partner`, `/distribution`, `/memberships`, and `/contact`.

### 2.3 Homepage Pathway Links

Current homepage section order:

- Hero
- Choose Your Path
- Why Authors Choose JMP
- How Publishing Works
- Book Analyzer / Pathfinder
- Packages
- Featured Books
- Closing CTA

Prominent homepage pathways:

- Tell Us About Your Book → `/join`
- Find Your Publishing Path → `#pathfinder`
- I want to publish my book → `/join`
- I want to explore the books → `/books`
- I'm already a JMP author → `/authors`
- Explore Package → `/packages`
- Explore the Full Catalog → `/books`

Homepage scores:

| Navigation Area | Clarity Score | Author Journey Score | Conversion Support Score |
|---|---:|---:|---:|
| Homepage hero CTAs | 8.5 | 8.5 | 9.0 |
| Choose Your Path section | 9.0 | 9.0 | 8.5 |
| Homepage proof pathways | 8.5 | 8.0 | 8.0 |
| Homepage package/pathfinder pathways | 7.5 | 8.0 | 8.0 |

Observations:

- Homepage is the strongest navigation experience for first-time authors.
- "I want to publish my book" is correctly dominant and points to `/join`.
- "I want to explore the books" correctly points to proof.
- "I'm already a JMP author" points to `/authors`, but this may not fully satisfy post-publication support intent. `/memberships` or an author support hub may be a better future destination if available.
- The homepage exposes `/packages` through package cards, but `/packages` is not in the header.

### 2.4 CTA Consistency Across Public Pages

Common CTAs:

- Tell Us About Your Book → `/join`
- Join the Family → `/join`
- Publish With Us → `/publishing`
- Explore Packages / View Publishing Packages → `/packages`
- Schedule a Consultation → Microsoft Bookings URL
- Explore the Books / Explore the Full Catalog → `/books`
- Meet the Authors → `/authors`

CTA scores:

| Navigation Area | Clarity Score | Author Journey Score | Conversion Support Score |
|---|---:|---:|---:|
| Primary conversion CTAs | 8.5 | 8.0 | 9.0 |
| Secondary education CTAs | 7.0 | 7.5 | 7.0 |
| Consultation CTAs | 7.5 | 7.0 | 8.0 |

Observations:

- `/join` is consistently used as the primary conversion route.
- CTA vocabulary alternates between "Tell Us About Your Book" and "Join the Family." Both are doctrine-aligned, but they should be intentionally assigned: "Tell Us About Your Book" for first-step forms and "Join the Family" for brand-level invitation.
- "Schedule a Consultation" is useful but should remain secondary to `/join` for the new-author conversion path.
- "Publish With Us" and "Tell Us About Your Book" both point to different stages and should not compete visually.

## 3. Primary Author Pathways

### 3.1 New Author Exploring JMP

Current likely path:

- Homepage → `/publishing` → `/author-journey` or `/packages` → `/join`

Friction:

- `/author-journey` is not in the header.
- `/packages` is not in the header.
- `/services` appears in the header before `/author-journey`, which can lead exploration toward What before process/Why.

Recommendation:

- Future navigation should expose "How It Works" or "Author Journey" more clearly.

### 3.2 Author Ready to Submit

Current likely path:

- Header CTA or homepage CTA → `/join`

Friction:

- Minimal. `/join` is prominent and consistent.

Recommendation:

- Keep `/join` as persistent primary CTA.

### 3.3 Author Comparing Packages

Current likely path:

- Homepage package section → `/packages`
- Footer "Publishing Packages" or "Pricing" → `/packages`
- `/publishing` page package section → `/packages` or `/join`

Friction:

- `/packages` is not in the header.
- Footer has both "Publishing Packages" and "Pricing," creating duplicate labels for the same route.

Recommendation:

- Future header should include either "Packages" or place it under a clear "Publish With Us" pathway.
- Footer should remove the duplicate "Pricing" label or merge it under "Publishing Packages."

### 3.4 Author Reviewing Publishing Process

Current likely path:

- Homepage "How Publishing Works" section
- Footer "Author Journey" → `/author-journey`
- `/publishing` secondary CTA → `/packages` rather than consistently `/author-journey`

Friction:

- `/author-journey` is important but hidden from the header.
- "Publish With Us," "Services," and "Author Journey" overlap unless roles are clear.

Recommendation:

- Future navigation should make `/author-journey` visible as "How It Works."

### 3.5 Author Checking Existing Books/Authors

Current likely path:

- Header "Our Books" → `/books`
- Header "Authors" → `/authors`
- Homepage proof paths → `/books`

Friction:

- Minimal. Proof routes are visible and author-first.

Recommendation:

- Keep `/books` and `/authors` as proof pathways, but consider grouping or sequencing them as "Proof" or "Books & Authors" in future simplification if header width becomes a constraint.

### 3.6 Author Looking for Post-Publication Support

Current likely path:

- Homepage "I'm already a JMP author" → `/authors`
- Footer membership tier links → `/memberships`

Friction:

- The homepage existing-author path points to `/authors`, which is proof-oriented, not support-oriented.
- `/memberships` is not in the header.
- Footer membership links expose tier prices before explaining care.

Recommendation:

- Future navigation should clarify whether existing authors should go to `/memberships`, `/authors`, or a future author-support hub.

## 4. Friction Points

1. The header is clean but omits `/author-journey`, `/packages`, and `/memberships`, which are important author decision routes.
2. The footer is overloaded and mixes author pathways, company pages, technical pages, prices, advertising, readers, and enterprise links.
3. `/services` is in the header while `/author-journey` and `/packages` are not, which may lead some authors toward service inventory before process and fit.
4. `/publishing`, `/services`, `/packages`, `/author-journey`, and `/publishing-partner` overlap in author intent without a visible hierarchy.
5. The top system bar exposes "Division 01" before author-first language.
6. The footer includes "Platform Roadmap," which is a technical quarantine page and may be overexposed for first-time authors.
7. Footer membership links expose monthly prices in navigation, which can make post-publication support feel subscription-first.
8. "View Full Catalog" in the Services footer column points to `/services`, creating a label/route mismatch.
9. "Pricing" and "Publishing Packages" duplicate the same destination.
10. "I'm already a JMP author" on the homepage points to `/authors`, but that route is a proof directory, not a support route.

## 5. Duplicative or Confusing Routes

### 5.1 `/publishing` vs `/author-journey`

Current distinction:

- `/publishing` explains the publishing relationship.
- `/author-journey` explains the step-by-step process.

Risk:

- If both are not labeled clearly, authors may not know which page answers "how does this work?"

Future recommendation:

- Label `/author-journey` as "How It Works."
- Keep `/publishing` as "Publish With Us."

### 5.2 `/packages` vs `/services`

Current distinction:

- `/packages` helps authors choose a publishing path.
- `/services` explains available support areas.

Risk:

- Authors comparing support may bounce between both if the header or footer does not clarify "paths" vs "capabilities."

Future recommendation:

- Keep `/packages` as "Packages" or "Publishing Paths."
- Keep `/services` lower-priority or footer-level unless data shows high demand.

### 5.3 `/publishing-partner` vs Signature package

Current distinction:

- `/publishing-partner` explains JM Prestige / selective publishing partner path.
- Signature appears as a package tier.

Risk:

- Authors may perceive Prestige, Signature, and Publishing Partner as overlapping premium offers.

Future recommendation:

- Keep `/publishing-partner` out of primary header until its role is clearly defined as a selective pathway.
- Link it contextually from Signature and packages pages.

### 5.4 `/authors` vs `/memberships`

Current distinction:

- `/authors` is proof and directory.
- `/memberships` is post-publication support.

Risk:

- Homepage "I'm already a JMP author" currently points to `/authors`, which may not meet support intent.

Future recommendation:

- Route existing-author support to `/memberships` or a future author-support page.

### 5.5 `/books` vs `/readers`

Current distinction:

- `/books` is catalog proof and discovery.
- `/readers` appears in footer but is not part of the main author-first journey.

Risk:

- `/readers` may distract from author acquisition if overexposed.

Future recommendation:

- Keep `/readers` footer-only or contextual from book detail pages.

## 6. Pages That Should Be More Prominent

1. `/author-journey`
   - Reason: It answers "How does publishing with JMP work?"
   - Suggested future label: "How It Works"

2. `/packages`
   - Reason: Authors comparing publishing fit need direct access.
   - Suggested future label: "Packages" or "Publishing Paths"

3. `/contact`
   - Reason: Some authors need conversation before form submission.
   - Suggested future placement: Footer and secondary CTA, not necessarily primary header.

4. `/memberships`
   - Reason: Important for existing authors and long-term support.
   - Suggested future placement: Footer "Author Support" group or homepage existing-author path.

5. `/publishing-partner`
   - Reason: Important selective pathway.
   - Suggested future placement: Contextual from `/packages`, `/publishing`, and Signature CTAs rather than primary header.

## 7. Pages That Should Be Less Prominent

1. `/platform`
   - Reason: Correct technical quarantine page, but not a first-time author navigation priority.
   - Future placement: Footer only under "Platform" or "For Partners."

2. `/advertising`
   - Reason: Adjacent offer, not core author-first publishing decision path.
   - Future placement: Contextual or footer-only.

3. `/readers`
   - Reason: Reader funnel is valid but not part of author-acquisition primary navigation.
   - Future placement: Book detail pages and footer only.

4. Enterprise external links
   - Reason: They support JM1 ecosystem awareness, but can distract authors.
   - Future placement: Footer bottom or "JM1 Network" collapsible/grouped area.

5. Membership tier-price links
   - Reason: Prices in navigation make support feel transactional.
   - Future placement: Single "Author Memberships" link instead of separate priced tier links.

## 8. Recommended Future Navigation Model

### 8.1 Recommended Header Model

Recommended future header links:

1. Publish With Us → `/publishing`
2. How It Works → `/author-journey`
3. Packages → `/packages`
4. Books & Authors → `/books` with `/authors` as a paired proof route or adjacent submenu
5. About → `/about`

Persistent CTAs:

- Schedule a Consultation → Microsoft Bookings URL
- Join the Family → `/join`

Rationale:

- This model answers the author's core questions in sequence:
  - Am I in the right place? → Publish With Us / About
  - Does this publisher understand my story? → Publish With Us / About
  - What path fits me? → Packages
  - How does it work? → How It Works
  - Where can I see proof? → Books & Authors
  - How do I join? → Join the Family

### 8.2 Recommended Footer Model

Recommended future footer groups:

1. Start Here
   - Publish With Us
   - How It Works
   - Join the Family
   - Schedule a Consultation

2. Choose Your Path
   - Packages
   - Services
   - JM Prestige
   - Distribution

3. Proof
   - Books
   - Authors
   - Imprints

4. Author Support
   - Memberships
   - Contact
   - Readers, if still needed

5. Company / Platform
   - About
   - Platform
   - Privacy
   - Terms
   - JM1 Network links

Rationale:

- Replaces service/company/membership/enterprise framing with author decision framing.
- Removes duplicate "Pricing" vs "Packages" labels.
- Reduces technical and enterprise exposure.
- Keeps all routes discoverable without making every route feel equally important.

### 8.3 Recommended Homepage Pathway Model

Preserve the current three-path section with one adjustment:

- I want to publish my book → `/join`
- I want to explore the books → `/books`
- I'm already a JMP author → future support destination or `/memberships`

Rationale:

- Current homepage pathfinding is strong.
- The existing-author path should point to support, not proof, if the user intent is post-publication help.

## 9. Quick Wins

These should be considered for Phase 2 implementation after review:

1. Add `/author-journey` to the primary header as "How It Works."
2. Add `/packages` to the primary header or group it under "Publish With Us."
3. Rename footer "Pricing" to avoid duplicating "Publishing Packages," or remove the duplicate link.
4. Change footer "View Full Catalog" under Services to a clearer label, or point catalog language to `/books`.
5. Replace footer membership tier-price links with one "Author Memberships" link.
6. Move "Platform Roadmap" under a lower-priority "Platform / Partners" group.
7. Review whether the top "Division 01 · Publishing" bar should remain public-facing on author-first pages.
8. Change homepage existing-author path destination from `/authors` to `/memberships` or a future author-support route.
9. Standardize primary CTA vocabulary:
   - Use "Tell Us About Your Book" for form-entry CTAs.
   - Use "Join the Family" for brand-level conversion CTAs.
10. Keep `/books` and `/authors` visible as proof pathways.

## 10. Implementation Risks

1. Removing or hiding footer links too aggressively could reduce route discoverability for non-primary pages.
2. Adding too many header links could recreate clutter and reduce clarity on desktop and mobile.
3. Grouping `/books` and `/authors` together could obscure one proof pathway if the UI does not make both accessible.
4. Hiding `/services` from the header may affect users who search directly for production capabilities.
5. Moving `/platform` lower may be correct for authors but could reduce visibility for partners or stakeholders.
6. Changing the top system bar could have JM1 governance implications and should be reviewed separately.
7. Any mobile navigation changes need specific testing because the current mobile drawer mirrors header links.
8. CTA text changes could affect analytics attribution if current labels are used in tracking.
9. Footer restructuring should preserve SEO crawl paths even if visual hierarchy changes.
10. Existing external links should be retained somewhere if they support enterprise governance.

## 11. Phase 2 Recommendations

Recommended Phase 2 workstream:

**Issue #14A — Navigation Simplification Implementation**

Recommended implementation sequence:

1. Update header labels/route exposure after approving the target header model.
2. Simplify footer groups and remove duplicate/confusing labels.
3. Move membership tier-price links behind a single membership route.
4. Reclassify technical/enterprise links into a lower-priority footer group.
5. Adjust homepage existing-author path if an approved support destination is chosen.
6. Validate `/join`, `/books`, `/authors`, `/packages`, `/publishing`, and `/author-journey` discovery after changes.
7. Run desktop and mobile visual checks before merge.

Suggested acceptance criteria for Phase 2:

- `/join` remains the persistent primary CTA.
- `/books` and `/authors` remain easy to discover as proof.
- `/author-journey` becomes easier to discover.
- `/packages` becomes easier to discover without making pricing the emotional lead.
- Footer no longer exposes duplicate package/pricing labels.
- Footer no longer makes memberships feel price-first.
- Technical and enterprise pages remain accessible but not author-path dominant.

## 12. Validation Results

Validation for this audit branch:

- `/opt/homebrew/bin/npm ci`: Passed. Existing dependency audit output reports 5 vulnerabilities.
- `/opt/homebrew/bin/npm run type-check`: Passed.
- `/opt/homebrew/bin/npm run lint`: Passed with existing `app/layout.tsx` custom font warning.
- `/opt/homebrew/bin/npm run build`: Blocked by the known local macOS SWC binary code-signing issue for `@next/swc-darwin-arm64` before app compilation.
- `git diff --check`: Passed.

## 13. Scope Confirmation

This Phase 1 audit changes documentation only.

Not changed:

- Navigation code
- Header
- Footer
- Routes
- Page copy
- Forms
- API routes
- Pricing
- Packages
- Catalog data
- Author records
- Power Automate integration
- Dataverse integration
