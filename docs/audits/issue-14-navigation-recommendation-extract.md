# Issue #14 Navigation Recommendation Extract

## 1. Executive Summary

The merged Issue #14 audit recommends keeping the current author-first conversion strategy but rebalancing navigation so authors can answer decision-stage questions in order. The header is clean and already keeps `/join` as the persistent primary CTA, but it hides two high-value author decision routes: `/author-journey` and `/packages`.

The footer is the larger cleanup target. It currently exposes many valid routes at equal weight, including services, pricing, technical pages, membership prices, adjacent reader/advertising pages, and JM1 ecosystem links. The recommended future model keeps routes discoverable while grouping them around author intent: start here, choose your path, proof, author support, and company/platform.

Recommended Issue #14A implementation should be a focused navigation information-architecture update only. It should not redesign pages, remove routes, change package/business logic, or rewrite public copy beyond navigation labels.

## 2. Current Header

Current header links are defined in `lib/tokens.ts` and rendered by `components/layout/NavBar.tsx`.

Primary header:

- Publish With Us -> `/publishing`
- Our Books -> `/books`
- Authors -> `/authors`
- Services -> `/services`
- About -> `/about`

Header CTAs:

- Schedule a Consultation -> Microsoft Bookings URL
- Join the Family -> `/join`

Defined but not rendered in the header:

- JM Prestige -> `/publishing-partner`
- Parent system link -> `https://www.jmerrill.one`

Current header gap:

- `/author-journey` is not exposed, even though the audit identifies it as the clearest answer to "How does publishing with JMP work?"
- `/packages` is not exposed, even though homepage and footer pathways already treat package comparison as a key author decision point.
- `/services` appears before process and fit routes, which may lead authors into support inventory before they understand the publishing path.
- `/publishing`, `/services`, `/packages`, `/author-journey`, and `/publishing-partner` overlap unless labels and hierarchy clarify their roles.

## 3. Recommended Header

Recommended future header model from the audit:

- Publish With Us -> `/publishing`
- How It Works -> `/author-journey`
- Packages -> `/packages`
- Books & Authors -> `/books`, with `/authors` paired or adjacent as a proof route
- About -> `/about`

Persistent CTAs:

- Schedule a Consultation -> Microsoft Bookings URL
- Join the Family -> `/join`

Recommendation intent:

- Keep `/join` as the persistent primary conversion route.
- Make `/author-journey` visible as "How It Works."
- Make `/packages` visible as "Packages" or an approved equivalent such as "Publishing Paths."
- Keep `/books` and `/authors` easy to discover as proof pathways.
- Keep `/publishing-partner` out of the primary header until Jackie confirms how JM Prestige should relate to Signature and package pathways.

## 4. Current Footer

Current footer groups are defined in `lib/tokens.ts` and rendered by `components/layout/Footer.tsx`.

Services:

- Publishing Packages -> `/packages`
- Editorial Services -> `/services`
- Audiobook Production -> `/services#audio`
- Marketing & Launch -> `/services#marketing`
- Faith Market -> `/services#faith`
- View Full Catalog -> `/services`

Company:

- About JMP -> `/about`
- Authors -> `/authors`
- Author Journey -> `/author-journey`
- Our Books -> `/books`
- Readers -> `/readers`
- Publishing -> `/publishing`
- Pricing -> `/packages`
- JM Prestige -> `/publishing-partner`
- Distribution -> `/distribution`
- Platform Roadmap -> `/platform`
- Contact -> `/contact`
- Advertising (iD) -> `/advertising`
- Join the Family -> `/join`
- Schedule a Call -> Microsoft Bookings URL

Memberships:

- Community - $79/mo -> `/memberships`
- Support - $149/mo -> `/memberships`
- Marketing - $199/mo -> `/memberships`
- AI Author - $249/mo -> `/memberships`

Enterprise:

- J Merrill One
- JM Financial
- JM Foundation
- JM Productions

Current footer gap:

- Footer groups are comprehensive but noisy.
- "Pricing" duplicates "Publishing Packages" because both point to `/packages`.
- "View Full Catalog" sounds like a books/catalog route but points to `/services`.
- Membership prices make footer navigation feel transaction-first.
- `/platform`, `/advertising`, `/readers`, and enterprise links are valid but overexposed for the primary author-acquisition journey.

## 5. Recommended Footer

Recommended future footer groups from the audit:

Start Here:

- Publish With Us
- How It Works
- Join the Family
- Schedule a Consultation

Choose Your Path:

- Packages
- Services
- JM Prestige
- Distribution

Proof:

- Books
- Authors
- Imprints

Author Support:

- Memberships
- Contact
- Readers, if still needed

Company / Platform:

- About
- Platform
- Privacy
- Terms
- JM1 Network links

Recommendation intent:

- Replace service/company/membership/enterprise framing with author decision framing.
- Keep secondary and technical routes discoverable without making them feel equally important.
- Remove duplicate package/pricing labels.
- Replace separate membership price links with one author-support membership route.
- Move technical and enterprise links into lower-priority footer placement.

## 6. Promote / Demote / Hide Table

| Page / Route | Current Placement | Recommended Treatment | Category |
| --- | --- | --- | --- |
| `/author-journey` | Footer only | Promote to header as "How It Works" | Safe implementation after label approval |
| `/packages` | Homepage/footer only | Promote to header as "Packages" or "Publishing Paths" | Needs Jackie label decision |
| `/books` | Header/footer/homepage | Keep visible as proof | Safe preserve |
| `/authors` | Header/footer/homepage | Keep visible as proof; pair with Books if header width is constrained | Needs Jackie structure decision |
| `/join` | Persistent CTA/footer/homepage | Keep as persistent primary CTA | Safe preserve |
| Microsoft Bookings | Header/footer/homepage | Keep as secondary CTA | Safe preserve |
| `/publishing` | Header/footer/homepage | Keep as primary "Publish With Us" route | Safe preserve |
| `/services` | Header/footer | Demote from primary header unless data shows high direct demand | Needs Jackie decision |
| `/publishing-partner` | Footer only, token-defined partner link | Keep contextual from packages/publishing/Signature; do not primary-promote yet | Needs Jackie decision |
| `/distribution` | Footer only | Keep secondary under "Choose Your Path" | Safe footer-only |
| `/memberships` | Footer membership price links | Keep accessible as one author-support route | Safe footer simplification after price-label approval |
| `/contact` | Footer only | Keep footer/secondary utility route | Safe footer-only |
| `/readers` | Footer only | Keep footer-only or contextual from book pages | Safe demotion/preserve |
| `/platform` | Footer company column | Move lower under Company / Platform | Safe demotion |
| `/advertising` | Footer company column | Keep footer-only/contextual; avoid primary author nav | Safe demotion |
| Enterprise external links | Footer enterprise column | Move lower or group as JM1 Network | Needs Jackie governance decision |

## 7. CTA Recommendations

- Keep `Join the Family` -> `/join` as the persistent primary header CTA.
- Use `Tell Us About Your Book` for form-entry CTAs where the action starts the submission/intake flow.
- Keep `Schedule a Consultation` as a secondary CTA, not the main conversion path.
- Avoid making `Publish With Us` and `Tell Us About Your Book` visually compete; they represent different journey stages.
- Review the homepage "I'm already a JMP author" CTA because it currently points to `/authors`, which is proof-oriented rather than support-oriented.

## 8. Implementation Risks

- Removing footer links too aggressively could reduce discoverability and SEO crawl paths for valid secondary pages.
- Adding too many header links could recreate clutter, especially in the mobile drawer where primary links are mirrored.
- Pairing `/books` and `/authors` as "Books & Authors" could obscure one proof route if both are not still accessible.
- Demoting `/services` may affect users looking directly for production capabilities.
- Moving `/platform` lower may be right for authors but could reduce visibility for partners or internal stakeholders.
- Changing top-system or JM1 network exposure may have governance implications.
- CTA text changes may affect analytics attribution if labels are tracked.
- The JM Prestige / Signature / Publishing Partner relationship needs clarity before primary navigation exposure.

## 9. Recommended #14A Implementation Scope

Recommended scope for Issue #14A:

- Update navigation token data only where possible.
- Add "How It Works" -> `/author-journey` to the primary header.
- Add `/packages` to the primary header with Jackie-approved label.
- Preserve `/join` and Microsoft Bookings CTA behavior.
- Keep `/books` and `/authors` discoverable as proof pathways.
- Simplify footer groups into the recommended author-journey model.
- Remove duplicate footer labeling for `Pricing` vs `Publishing Packages`.
- Fix or remove the footer "View Full Catalog" label mismatch.
- Replace individual membership tier-price footer links with one membership/support link.
- Move technical, advertising, reader, and enterprise links into lower-priority footer positions.
- Do not redesign the header, footer, homepage, or page layouts.
- Do not remove routes or change business logic.

Suggested acceptance checks for #14A:

- `/join` remains the persistent primary CTA.
- `/author-journey` and `/packages` are easier to discover.
- `/books` and `/authors` remain easy to discover as proof.
- Footer no longer exposes duplicate package/pricing labels.
- Footer no longer makes memberships price-first.
- Secondary pages remain accessible.
- Desktop and mobile navigation are checked after implementation.

## 10. Items Requiring Jackie Decision

- Exact header label for `/author-journey`: "How It Works" is recommended by the audit.
- Exact header label for `/packages`: "Packages" or "Publishing Paths."
- Whether `/services` should be removed from primary navigation or kept because of known user demand.
- Whether `/books` and `/authors` should remain separate header links or become a paired "Books & Authors" pathway.
- Whether JM Prestige should remain contextual or receive a secondary navigation position.
- Whether membership prices should be removed from footer navigation labels.
- Whether the homepage existing-author CTA should point to `/memberships` or a future author-support hub.
- Whether the JM1/enterprise links should stay as a full footer column or move into a lower-priority JM1 Network group.
- Whether the public top-system language such as "Division 01 · Publishing" should remain visible on author-first pages.
