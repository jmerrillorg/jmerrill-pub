# Issue #13 — Why-First Doctrine Audit

Phase: 1 — Audit Only  
Repository: jmerrillorg/jmerrill-pub  
Doctrine: J Merrill Publishing Author-First / Family-First strategy  
Scope: Public website review before implementation changes  
Status: Draft PR audit deliverable  

Refs #13

## 1. Executive Summary

This audit evaluates the public J Merrill Publishing website against the approved Why-First doctrine before any copy, design, navigation, pricing, policy, or publishing-flow changes are made.

The current site is already materially aligned with the author-first and family-first direction across the homepage, `/about`, `/publishing`, and `/author-journey`. These pages lead with trust, retained rights, guidance, care, and long-term publishing relationship rather than technology or internal operating structure.

The main doctrine gaps are not broad failures. They are concentration points where decision-support pages can still feel more transactional or operational than relational:

- `/packages` still carries price/package framing strongly, especially in metadata and comparison areas.
- `/services` still risks feeling like a capability catalog rather than a trust-building explanation of author support.
- `/distribution` still has channel/infrastructure density that can overpower the author meaning of marketplace access.
- `/memberships` still carries subscription/comparison/AI-plan signals that can distract from post-publication care.
- `/contact` is clear but operational; it does not yet fully carry the family-first invitation.

Overall, the site has moved strongly toward the approved doctrine. The next phase should focus on targeted copy and microcopy refinements, not another structural rewrite.

Overall Site Alignment Score: **8.3 / 10**

## 2. Audit Method

Each required page was reviewed against these doctrine questions:

- Does the page lead with Why or What?
- Does the page speak primarily to the author, the relationship, and the mission?
- Does the page reinforce Join the Family, or does it feel transactional?
- Does the page communicate stewardship of the author's life work?
- Does the page build trust?
- Does the page create emotional connection?
- Does the page clearly explain why an author should choose JMP?

Finding categories:

- **Critical Doctrine Gap** — The page leads with the wrong strategic premise or materially works against the approved doctrine.
- **Moderate Improvement Opportunity** — The page is directionally aligned but still over-indexes on services, features, packages, technology, or transaction.
- **Minor Improvement Opportunity** — The page is aligned and only needs small copy, metadata, proof, or emotional-connection refinements.
- **No Action Required** — The page is strongly aligned for the current phase.

## 3. Page-by-Page Review

### 3.1 Homepage

Doctrine Alignment Score: **9.0 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- Leads with the author's Why through "Your words. Your legacy. Your rights."
- Strongly communicates retained rights, care, guidance, and trust.
- The "Where are you in the journey?" section supports intent-based author navigation.
- The trust section connects publishing choice to care, ownership, guidance, and family.
- Uses stable public proof points such as 125+ titles, five imprints, Ingram distribution, and registered publisher status.

Weaknesses:

- The pathfinder and package sections can still pull the page toward tool/service decisioning if not carefully maintained.
- Some older system-oriented components remain in the codebase even if they are not rendered on the homepage, creating regression risk in future edits.

Recommended Improvements:

- Keep technical/system sections quarantined away from the homepage render path.
- Add future proof through author quotes or short story-based testimonials when available.
- Keep package and pathfinder language framed as guidance rather than product selection.

### 3.2 /join

Doctrine Alignment Score: **8.2 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- The route is clearly framed as "Join the Family."
- The form captures meaningful author/book context rather than only contact information.
- It supports relationship-building by asking about goals, audience, publishing stage, and message.
- The form is practical and operationally useful without exposing technical infrastructure.

Weaknesses:

- The length and detail of the form can make the experience feel like an application workflow more than a warm first conversation.
- Stewardship, retained-rights reassurance, and "we will walk with you" language could be repeated nearer the form body.

Recommended Improvements:

- Add short reassurance copy before or inside the form: rights stay with the author, the first step is a conversation, and the author is not expected to know every publishing answer yet.
- Keep all existing validation and integration behavior intact in future implementation.

### 3.3 /publishing

Doctrine Alignment Score: **9.0 / 10**  
Finding Category: **No Action Required**

Strengths:

- Clearly answers what publishing with JMP feels like.
- Leads with honoring the work and the author behind it.
- Strong retained-rights language: "Your name belongs on the front. Your rights stay with you."
- Explains the relationship from manuscript to marketplace in human terms.
- Makes the contrast with traditional paths without sounding reckless or anti-industry.

Weaknesses:

- Package references remain necessary, but they should continue to stay subordinate to relationship and fit.

Recommended Improvements:

- No immediate doctrine correction required.
- Future refinements can add more real author proof and quotes.

### 3.4 /packages

Doctrine Alignment Score: **7.4 / 10**  
Finding Category: **Moderate Improvement Opportunity**

Strengths:

- The page now leads with fit and guidance rather than only price.
- Starter, Professional, and Signature are framed as paths for different author needs.
- Signature is positioned as selective and elevated, not merely the highest price.
- Existing package detail is useful for serious buyers and should remain available.

Weaknesses:

- Page metadata still leads with flexible payment plans and price-forward language.
- The comparison matrix and payment sections can make the page feel transactional.
- The page could communicate more clearly that packages are vehicles for stewardship, not just product tiers.

Recommended Improvements:

- Rewrite metadata to lead with "right publishing path" rather than payment plans.
- Add a short "investment in the work" or "choosing care level" note before pricing details.
- Keep prices unchanged, but surround them with stronger guidance and trust language.

### 3.5 /services

Doctrine Alignment Score: **7.7 / 10**  
Finding Category: **Moderate Improvement Opportunity**

Strengths:

- The page has been reframed around support for every stage of the book.
- Service areas are translated into author outcomes.
- Before publishing, during production, and after launch sections make the offering easier to understand.
- Ghostwriting is presented as manuscript-development support rather than a disconnected upsell.

Weaknesses:

- The page still carries the natural risk of feeling like a service catalog.
- Dense service categories can shift attention from trust and relationship to capability inventory.
- Metadata and service labels can be tightened further around author outcomes.

Recommended Improvements:

- Add more connective copy explaining why each service protects or strengthens the author's work.
- Avoid reviving "95+ services" or breadth-first framing.
- Add a short "you do not need to know which services you need yet" reassurance near the top.

### 3.6 /author-journey

Doctrine Alignment Score: **9.1 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- Strong author-facing explanation of how publishing works.
- Leads with clarity, care, and confidence rather than route or system architecture.
- Five stages are human-readable and easy to follow.
- Explains what authors can expect from JMP and what JMP needs from the author.
- Frequently reinforces retained rights and long-term relationship.

Weaknesses:

- The page could use slightly more explicit "Join the Family" language to connect the journey to the brand invitation.

Recommended Improvements:

- Add one future microcopy pass to connect the final CTA more explicitly to joining the publishing family.

### 3.7 /about

Doctrine Alignment Score: **9.3 / 10**  
Finding Category: **No Action Required**

Strengths:

- The page is one of the strongest expressions of the doctrine.
- It answers why JMP exists and why authors can trust the house.
- It leads with authors whose work matters, stewardship, rights, voice, and legacy.
- The imprint explanation feels like homes for different voices rather than a technical matrix.
- The standard of care section supports transparency and trust.

Weaknesses:

- No material doctrine gap identified.

Recommended Improvements:

- Preserve this page as a model for future page rewrites.
- Add real author proof later if approved and available.

### 3.8 /distribution

Doctrine Alignment Score: **7.6 / 10**  
Finding Category: **Moderate Improvement Opportunity**

Strengths:

- Uses the approved language: global distribution through Ingram's retail and library network.
- Correctly explains that distribution is access, not a sales guarantee.
- Gives authors realistic expectations about metadata, presentation, discoverability, and marketing.
- Avoids fragile endpoint-count language as the lead proof point.

Weaknesses:

- Channel sections and partner detail can still feel infrastructure-heavy.
- The page can drift toward explaining distribution mechanics more than why distribution matters to the author's work.
- Specialty-channel language should remain careful to avoid implying guaranteed placement or sales.

Recommended Improvements:

- Add more author-facing "what this means for your book" copy before channel detail.
- Keep Ingram as the central proof point and avoid channel-count boasting.
- Consider a short FAQ focused on author expectations and responsibilities.

### 3.9 /publishing-partner

Doctrine Alignment Score: **8.4 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- Frames JM Prestige as a selective publishing relationship rather than a generic premium package.
- Leads with serious work, elevated care, strategic positioning, and long-term relationship.
- Explains fit and discernment before investment.
- Strongly reinforces author name, rights, voice, and legacy.

Weaknesses:

- Pricing and application structure can still feel like a gate if a reader arrives cold.
- More proof of what "elevated care" looks like would deepen trust.

Recommended Improvements:

- Add future examples or anonymized fit scenarios if approved.
- Keep pricing and payment structure intact, but ensure investment language always follows relationship and fit.

### 3.10 /authors

Doctrine Alignment Score: **8.8 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- Reframes authors as people, not data records.
- Positions the author directory as proof that authors remain visible.
- Strongly supports family-first publishing and author visibility.
- Links author proof to books and legacy.

Weaknesses:

- Generated or brief author summaries can feel generic where richer author stories are unavailable.
- The page would create stronger emotional connection with quotes, author photos, or short testimony snippets where approved.

Recommended Improvements:

- Add a future author-proof enrichment pass after asset and permissions review.
- Preserve the directory utility while increasing human story depth.

### 3.11 /books

Doctrine Alignment Score: **8.3 / 10**  
Finding Category: **Minor Improvement Opportunity**

Strengths:

- Presents the catalog as books from the JMP family.
- Frames titles as proof of real authors, voices, stories, ministries, lessons, and legacy works.
- Keeps catalog utility while avoiding domain-authority/platform language.
- Supports prospective authors by showing visible proof of existing work.

Weaknesses:

- The catalog grid naturally feels like product discovery and can become less emotionally connected than the surrounding copy.
- Some book records may need stronger metadata, imagery, or author story enrichment through future catalog initiatives.

Recommended Improvements:

- Add more author/book story context where data and permissions allow.
- Continue separate catalog quality and asset recovery work outside this doctrine audit.

### 3.12 /memberships

Doctrine Alignment Score: **7.8 / 10**  
Finding Category: **Moderate Improvement Opportunity**

Strengths:

- Reframes membership as support after publication instead of a generic subscription.
- Communicates ongoing author relationship, visibility, consistency, and future-title planning.
- Explains when membership makes sense without promising unrealistic outcomes.
- Preserves practical tier comparison.

Weaknesses:

- Tier cards, pricing, and comparison tables can still feel subscription-first.
- AI-plan language can distract from family-first care if it appears as the emotional lead.
- The page needs careful balance so technology and tools remain support mechanisms, not the promise.

Recommended Improvements:

- Strengthen "continuity of care" language around tier comparisons.
- Keep AI language secondary and practical.
- Add examples of post-publication author support moments.

### 3.13 /contact

Doctrine Alignment Score: **7.0 / 10**  
Finding Category: **Moderate Improvement Opportunity**

Strengths:

- Provides clear routing for general communication and publishing inquiries.
- Includes a strong Join the Family path.
- Helps prevent confusion between public inquiry and private author operations.

Weaknesses:

- The page leads more with "reach the flagship team the right way" than with author trust or relationship.
- It feels operational and routing-centered.
- It does not yet create much emotional connection or stewardship language.

Recommended Improvements:

- Reframe the hero around conversation, trust, and helping authors take the right next step.
- Keep routing clarity, but add warmer copy for authors carrying a story or manuscript.
- Preserve existing contact methods and routes.

## 4. Top 10 Doctrine Gaps

1. `/packages` metadata and pricing sections still over-index on payment and product tiers.
2. `/services` can still feel like a service catalog instead of an author-care explanation.
3. `/distribution` contains channel and infrastructure density that can overpower author meaning.
4. `/memberships` still carries subscription, comparison, and AI-plan signals that need stronger care framing.
5. `/contact` is clear but operational; it does not yet fully express Join the Family.
6. Catalog and author proof pages need richer human proof where assets, permissions, and metadata allow.
7. `/join` is functionally strong but could use more reassurance inside the long form experience.
8. Some metadata/SEO copy still leads with packages, pricing, or services before Why.
9. Older system-oriented components remain in the codebase and could be accidentally reintroduced.
10. Several pages would benefit from real author quotes, short stories, or trust proof beyond generic copy.

No current page was identified as a Critical Doctrine Gap.

## 5. Quick Wins

- Update metadata for `/packages`, `/services`, `/memberships`, and `/contact` so titles/descriptions lead with author trust and care.
- Add short reassurance copy to `/join` explaining that the first step is a conversation and authors do not need every answer before reaching out.
- Add "what this means for your book" copy above dense package, services, distribution, and membership comparison sections.
- Add consistent Join the Family language to final CTAs where it is missing or understated.
- Keep AI, infrastructure, and internal system language quarantined to `/platform`.
- Add one or two approved author quotes or short proof snippets to `/authors`, `/books`, and homepage sections when available.

## 6. Recommended Future Work

1. **Phase 2 — Metadata and Microcopy Cleanup**
   Update page metadata, section intros, helper text, and CTA labels where pages still lead with What before Why.

2. **Phase 3 — Trust Proof Enrichment**
   Add approved author quotes, author photos, richer bios, and story snippets to deepen emotional connection.

3. **Phase 4 — Decision Page Refinement**
   Refine `/packages`, `/services`, `/distribution`, and `/memberships` so tables and comparison sections are wrapped in stronger stewardship language.

4. **Phase 5 — System-Language Quarantine Review**
   Confirm system-heavy components are either removed from public render paths or intentionally assigned to `/platform`.

5. **Separate Catalog Initiatives**
   Continue catalog quality, asset recovery, commerce modernization, CoreSource metadata integration, and Dataverse publishing catalog work as separate initiatives.

## 7. Overall Site Alignment Score

Overall Site Alignment Score: **8.3 / 10**

The public website is broadly aligned with the approved Author-First / Family-First doctrine. The strongest pages are `/about`, `/author-journey`, `/publishing`, and the homepage. The primary future work is targeted refinement on transactional or operational pages so services, packages, technology, and channel mechanics remain clearly subordinate to the core promise: helping authors decide whether J Merrill Publishing is the right publishing family for their story.

## 8. Validation Results

Validation for this audit branch:

- `npm ci`: Passed using `/opt/homebrew/bin/npm ci`; `npm` is not on this shell PATH. Existing dependency audit output reports 5 vulnerabilities.
- `npm run type-check`: Passed using `/opt/homebrew/bin/npm run type-check`.
- `npm run lint`: Passed using `/opt/homebrew/bin/npm run lint`; existing warning remains in `app/layout.tsx` for custom font loading.
- `npm run build`: Blocked by the known local macOS SWC binary code-signing issue for `@next/swc-darwin-arm64`; no build error from this documentation-only change was reached.
- `git diff --check`: Passed.

## 9. Scope Confirmation

This Phase 1 audit changes documentation only.

Not changed:

- Website page copy
- Page components
- Navigation
- Packages or pricing
- Publishing policies
- `/join`
- Form submission logic
- Power Automate or Dataverse integration
- API routes
