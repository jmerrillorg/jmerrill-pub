# JM1 Enterprise Content Architecture
Canonical Blog, Branch, Metadata & Publishing Framework — Draft 1
Attach as a Knowledge file to the JM1 Content & Blog Editorial GPT.

## 1. Purpose

This framework governs how J Merrill One and its branches create, classify,
publish, connect, and archive editorial content. It sits beneath the JM1
Content & Blog Editorial GPT.

Every article should have: one clear publishing owner, one primary
audience, one defined voice, one strategic purpose, consistent metadata,
clear internal-linking logic, appropriate visual treatment, appropriate
compliance safeguards, a predictable publishing destination.

The editorial GPT must not invent website structures, URLs, programs,
services, or brand standards that have not been established.

---

## 2. Enterprise Content Model

J Merrill One operates as the umbrella enterprise. Current branches:
J Merrill One, J Merrill Publishing, J Merrill Financial, J Merrill
Foundation, J Merrill Productions, Agape International Cathedral.

JackieSmithJr.com remains a distinct founder/personal publishing platform,
not a J Merrill One branch blog. The platforms may reference one another,
but Founder Voice and Enterprise Voice must remain separate.

---

## 3. Content Ownership Structure

Every article must have one Primary Publishing Entity. Allowed values: JM1,
Publishing, Financial, Foundation, Productions, Agape.

A piece may reference multiple branches, but one entity must own the
article. This prevents duplicate publishing, conflicting CTAs, ambiguous
brand ownership, search cannibalization, cross-brand voice drift.

---

## 4. Website Architecture (Provisional)

Final domains must be confirmed before hard-coding URLs.

Preferred architecture if all branches live within one enterprise domain:
jmerrillone.com/insights/[slug], jmerrillone.com/publishing/insights/[slug],
jmerrillone.com/financial/insights/[slug],
jmerrillone.com/foundation/insights/[slug],
jmerrillone.com/productions/insights/[slug],
jmerrillone.com/agape/insights/[slug].

If branches have separate domains, retain the same conceptual structure on
each: [branch-domain]/insights/[slug].

Do not hard-code any of these paths into the GPT until the website
structure is confirmed.

---

## 5. Content Types

Classify each piece as one primary type:
- **Thought Leadership** — original organizational thinking, perspective,
  strategy, or industry commentary
- **Education** — explains a topic, process, principle, or field
- **Resource** — practical guidance, checklists, frameworks, FAQs,
  reference material
- **News** — timely factual updates
- **Announcement** — organizational launches, appointments, programs,
  partnerships, events, milestones
- **Community** — impact stories, service, people, programs, engagement
- **Legacy** — historical reflection, institutional memory, founder
  history, archival significance
- **Commentary** — reasoned response to a current development or public
  issue

Do not turn every article into thought leadership — the content type
should reflect what the piece actually does.

---

## 6. Voice Metadata

- **Founder** — Jackie Smith, Jr. speaking personally
- **Enterprise** — J Merrill One speaking institutionally
- **Branch** — a named branch speaking institutionally
- **Educational** — neutral, authoritative instructional voice
- **Pastoral** — faith-centered institutional/ministry voice when
  appropriate for Agape

Never fabricate Founder Voice.

---

## 7. Audience Metadata

Every article must identify a primary audience — e.g., authors, aspiring
authors, entrepreneurs, business owners, families, community members,
donors, volunteers, creators, media professionals, congregants, ministry
leaders, institutional professionals, general public. Secondary audiences
may be noted, but the article should be written for one primary reader.

---

## 8. Temporal Classification

- **Evergreen** — expected to remain useful without significant updates
- **Update-Sensitive** — useful long term but contains facts, policies,
  pricing, technology, statistics, laws, or other information requiring
  future review
- **Time-Sensitive** — connected to a current event, announcement, season,
  deadline, launch, or active development
- **Campaign-Specific** — created for a defined initiative or promotional
  period

Update-sensitive and time-sensitive pieces should carry a review date when
practical.

---

## 9. Risk Classification

- **Standard** — normal editorial review is sufficient
- **Review Recommended** — contains claims, representations, third-party
  information, sensitive stories, or current facts requiring additional
  confirmation
- **Compliance Review Required** — contains: financial recommendations or
  regulated claims; legal interpretations; medical or health claims;
  personal or confidential data; minors; copyright-sensitive material;
  third-party IP; formal institutional representations; material
  contractual claims; significant donor/partner claims

The blog GPT flags risk; it does not make legal or compliance
determinations.

---

## 10. Canonical Article Metadata

Recommended frontmatter:

```
title: ""
description: ""
publishDate: "YYYY-MM-DD"
updatedDate: ""
entity: ""
voice: ""
contentType: ""
category: ""
audience: ""
temporalStatus: ""
riskLevel: ""
author: ""
image: ""
imageAlt: ""
```

Optional fields when needed: series, tags[], reviewDate, featured,
canonicalURL, relatedContent[].

Do not include metadata fields the website does not actually support once
implementation is finalized.

---

## 11. Category Governance (Branch-Specific)

**J Merrill One:** Leadership & Enterprise, Systems & Strategy,
Entrepreneurship, Innovation, Legacy, Enterprise News.

**J Merrill Publishing:** Writing & Craft, Publishing Education, Editorial
Process, Author Development, Rights & Publishing Business, Industry
Perspective.

**J Merrill Financial:** Financial Education, Business & Entrepreneurship,
Stewardship, Financial Systems, Generational Strategy.

**J Merrill Foundation:** Community Impact, Education & Opportunity,
Programs, Partnerships, Service & Volunteerism, Foundation News.

**J Merrill Productions:** Storytelling, Production, Creative Process,
Media & Culture, Projects, Behind the Scenes.

**Agape International Cathedral:** Faith & Formation, Scripture &
Teaching, Ministry & Leadership, Community, Family & Legacy, Church Life.

Categories should be kept limited enough to remain useful. Tags may handle
narrower subjects.

---

## 12. File Naming

Standard: [slug].mdx. Slug rules: lowercase, hyphen-separated, no special
characters, derived from canonical article title, avoid dates unless
needed for uniqueness.

Example: "Building Systems That Outlive Us" →
building-systems-that-outlive-us.mdx

The final content directory should follow the actual website repository
structure once confirmed.

---

## 13. Automatic Article Package

Every completed JM1 article should produce:
1. **Final Article** — publish-ready, in the selected branch voice
2. **Publishing Metadata** — completed frontmatter and suggested slug
3. **Editorial Classification** — publishing entity, voice, content type,
   primary audience, temporal status, risk level
4. **Social Adaptation** — one concise social version for the branch's
   primary social channel (default platform should not be assumed
   permanently)
5. **Visual Companion** — image concept, generated hero image, caption,
   literal accessibility-ready alt text
6. **Internal-Link Opportunities** — up to three natural same-branch,
   cross-branch, or founder-content links; never invent URLs
7. **Advisory Flags** — only when something genuinely requires attention;
   do not create a warning section merely to fill the template

---

## 14. Visual Companion Architecture

Images must be created only after the article's branch, audience, tone,
and purpose are clear.

The generated image should: support the central idea, fit editorial
publishing use, avoid literal corporate stock photography, avoid
unnecessary text overlays, avoid logos unless explicitly requested and
approved, avoid introducing people/locations/products/claims not supported
by the article, be suitable for web/social cropping, include alt text.

If a branch visual guide is attached, it becomes authoritative. If none
exists, use restrained editorial imagery rather than inventing brand
rules.

---

## 15. Social Repurposing

Social adaptation must preserve branch voice — do not use the same social
formula for every entity.

- **Enterprise:** strategic and concise
- **Publishing:** educational and author-facing
- **Financial:** clear and informative; no hype
- **Foundation:** human and community-centered
- **Productions:** creative and visually engaging
- **Agape:** pastoral and invitational

Avoid automatic hashtags and emojis unless current branch standards
specify them.

---

## 16. Internal-Linking Hierarchy

Order: 1) relevant content from the same branch, 2) relevant
resource/service/program from the same branch, 3) relevant cross-branch
content, 4) JackieSmithJr.com founder perspective where personally
relevant.

Internal links must add value. Never insert a link solely for SEO.

---

## 17. Founder Content Handoff

When an enterprise article clearly contains a personal leadership insight,
testimony, lived experience, or founder reflection, flag: **Founder
Companion Opportunity** — explain briefly how JackieSmithJr.com could
explore the personal dimension. Do not create the personal article unless
requested.

Likewise, when founder content has clear enterprise relevance, it may be
adapted for a J Merrill branch only when instructed.

---

## 18. Cross-Branch Adaptation

When adapting one idea for multiple entities: do not duplicate the same
article. Each adaptation must change reader, framing, relevance, examples,
CTA, and organizational authority. The core idea may remain, but the
article should feel intentionally written for that branch.

---

## 19. Factual Freshness

Articles containing current laws, regulations, prices, statistics,
product/platform rules, public officials, technology capabilities,
publishing standards, or financial rules must be verified against current
authoritative sources before publication when verification is requested
or necessary. Never rely on stale assumptions for current claims.

---

## 20. Archive & Legacy Governance

Content should form an intentional institutional archive. The GPT may
flag pieces as:
- **Foundational** — defines a durable principle or organizational
  position
- **Reference** — useful as a recurring resource
- **Milestone** — records an important organizational event
- **Current** — primarily useful within a limited timeframe

This classification may inform future archiving, featured content, and
book/resource development.

---

## 21. Duplication Control

Before recommending new content, consider whether the topic already
exists, significantly overlaps another article, belongs as an update
rather than a new post, or should be expanded instead of duplicated. Do
not create artificial content volume — quality and usefulness outrank
publishing frequency.

---

## 22. Final Content Governance

Every J Merrill One article should answer: why does this exist? Who is it
for? Which entity has authority to say it? What should the reader
understand afterward? If those answers are unclear, the article is not
ready.

The purpose of the system is not to generate content. The purpose is to
build a coherent, credible, useful body of work across the J Merrill One
enterprise.
