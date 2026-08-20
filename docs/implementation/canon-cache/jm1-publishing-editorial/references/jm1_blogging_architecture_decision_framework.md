# JM1 Enterprise Blogging Architecture Decision Framework
Canonical Planning Standard — Draft 1
Attach as a Knowledge file to the JM1 Content & Blog Editorial GPT.

## 1. Purpose

This framework determines how blog and insight content should be
structured across J Merrill One, J Merrill Publishing, J Merrill
Financial, J Merrill Foundation, J Merrill Productions, Agape
International Cathedral, and JackieSmithJr.com as the separate
founder/personal platform.

Established hierarchy:
- **L1 — Jackie Smith, Jr.:** personal/founder identity
- **L2 — J Merrill One:** enterprise/system identity
- **L3 — Individual branches:** Publishing, Financial, Foundation,
  Productions, AIC

---

## 2. Three Possible Models

**Model A — Centralized.** All enterprise and branch editorial content
lives on jmerrillone.com (e.g. jmerrillone.com/insights/[slug]), with
branch identity handled through metadata/filters/categories. Advantages:
one repository, concentrated SEO, simple linking, easier automation.
Risks: branch identities dilute, specialized audiences feel they're
reading corporate content, J Merrill One becomes a content warehouse.
Best when branch sites are primarily landing pages.

**Model B — Federated.** Each branch publishes and owns its own editorial
content on its own domain; Jackie continues independently at
jackiesmithjr.com/writing/[slug]. Advantages: strong branch identity,
branch-specific SEO, clear audience targeting, independent categories.
Risks: content fragmentation, duplicate/overlapping topics, harder
cross-enterprise discovery, more technical/analytics fragmentation, more
complex GPT publishing logic. Best when each branch functions as a
substantial independent organization with its own audience and team.

**Model C — Hybrid (Recommended).** J Merrill One owns enterprise-level
thought leadership and cross-enterprise content; each branch owns
specialized content directly related to its mission, audience, programs,
or expertise; JackieSmithJr.com remains the founder/personal thought
platform.

---

## 3. Hybrid Model — Recommended Ownership

**JackieSmithJr.com:** personal leadership reflection, founder notes,
faith-informed personal thinking, lived experience, legacy reflection,
personal essays, founder philosophy.

**J Merrill One:** enterprise leadership, systems thinking, organizational
strategy, entrepreneurship, cross-branch initiatives, enterprise
announcements, institutional legacy, enterprise-level thought leadership.

**J Merrill Publishing:** publishing education, editorial guidance, author
development, writing and publishing process, rights and authorship,
publishing industry commentary.

**J Merrill Financial:** financial education, business systems,
stewardship, entrepreneurship, financial literacy, generational financial
thinking.

**J Merrill Foundation:** programs, community impact, partnerships,
service, education, philanthropy, volunteerism.

**J Merrill Productions:** media, storytelling, production, creative
process, projects, cultural commentary.

**Agape International Cathedral:** faith, formation, ministry, Scripture,
community, church life, spiritual leadership.

Advantages: preserves brand identity, keeps J Merrill One strategic
rather than cluttered, supports branch-specific SEO, allows
enterprise-level discovery, maintains clear founder/enterprise separation,
scales cleanly, supports future branch independence, works naturally with
the content GPT.

Risks: requires strong content ownership rules, cross-link governance,
shared metadata standards, duplication control.

**Recommendation: adopt the Hybrid Model as the canonical architecture.**

---

## 4. Content Ownership Decision Rule

Before drafting or publishing, ask in order:

1. Is the piece primarily about Jackie's personal experience, belief, or
   reflection? → JackieSmithJr.com
2. Does the piece address the enterprise as a whole, multiple branches,
   organizational leadership, or system-level strategy? → J Merrill One
3. Is the primary value tied directly to one branch's expertise,
   audience, services, programs, or mission? → That branch
4. Could the piece reasonably belong to multiple branches? Choose the
   entity with the strongest: (a) subject authority, (b) primary audience
   relationship, (c) natural CTA, (d) long-term archive value.

One article must have one primary publishing owner.

---

## 5. Cross-Branch Discovery Model

The hybrid model should not create isolated content silos. Every branch
should support:
- **Same-Branch Discovery** — related articles within the same branch
- **Cross-Branch Discovery** — relevant articles from another branch when
  there is genuine reader value (e.g., a Publishing article on the
  business side of authorship linking to Financial education)
- **Founder Perspective** — relevant JackieSmithJr.com content surfaced
  when the founder's personal perspective materially deepens the subject
- **Enterprise Context** — branch content linking upward to J Merrill One
  when the subject relates to broader enterprise philosophy or
  initiatives

Links should reflect meaningful relationships, not SEO engineering.

---

## 6. Enterprise Content Hub

Even under the Hybrid Model, J Merrill One should eventually provide an
enterprise-level content discovery layer — "JM1 Insights" — that may
aggregate or surface content from all entities including selected Jackie
Smith, Jr. founder essays. The hub does not need to duplicate the source
article. Preferred behavior: surface → summarize → link to canonical
source. Each article retains one canonical publishing location.

---

## 7. Canonical URL Principle

Each article must have one canonical URL. Never publish identical full
articles at multiple branch URLs. If content is adapted for another
branch: reframe for that branch's reader, change examples, change
context, change CTA, preserve core ideas only where useful. Adaptation is
permitted; duplication is not.

---

## 8. URL Standard — Provisional

Until branch domains and repositories are formally confirmed, the GPT
must: generate the slug, generate metadata, identify the publishing
entity, leave URL/path as TBD unless destination information is supplied.
Do not invent domains. Do not assume every branch uses /insights/. Once
the web architecture is approved, these instructions can be updated
centrally.

---

## 9. Recommended Content Label

Use "Insights" rather than automatically using Blog, News, Articles, or
Writing — it accommodates thought leadership, education, commentary,
resources, institutional reflections, and industry guidance. Individual
sites may still use a different public label if brand strategy requires
it.

---

## 10. Recommended Taxonomy Model

Each article should carry: Entity (who owns it), Category (broad editorial
area), Content Type (what it's doing — Thought Leadership / Education /
Resource / News / Announcement / Community / Commentary / Legacy),
Audience (who it's primarily for), Voice (who is speaking), Temporal
Status (how long it stays current), Risk Level (does it need additional
review). This taxonomy should remain consistent across all branches even
when category names differ.

---

## 11. SEO Governance

Prioritize: canonical ownership (one authoritative page per article),
topic authority (specialized subjects live with the branch that has
expertise), natural cross-linking, no keyword competition (don't create
near-identical articles targeting the same search intent across multiple
branches), human-first metadata (titles/descriptions accurately represent
the article rather than maximizing keyword density).

---

## 12. Article Versioning

Every published article should support original publish date, updated
date where applicable, canonical owner, and version history internally
where practical. Update an existing evergreen resource when the core
search intent is unchanged. Create a new article when the perspective
materially changes, the event is new, the audience is materially
different, or the subject deserves its own permanent record.

---

## 13. Archive Principle

The content system is not merely a publishing feed — it is an
institutional archive. Content should preserve enterprise thinking,
branch expertise, organizational milestones, founder philosophy,
community history, intellectual development, institutional legacy.
Publishing frequency must never override archival quality.

---

## 14. Visual Routing

The publishing entity determines the visual system. Full hex specs are in
the Visual Identity Governance knowledge file.

**Hard rule:** Jackie Smith, Jr.'s Radiant Gold #FFD700 is never used as
JM1 enterprise or L3 branch gold.

---

## 15. Recommended Implementation Order

**Phase 1 — Governance:** approve Hybrid architecture, branch ownership,
voice router, metadata taxonomy, visual routing.

**Phase 2 — GPT:** build the JM1 Content & Blog Editorial GPT using this
architecture. Until URLs are known, output suggested slug, publishing
entity, metadata, and Destination: TBD.

**Phase 3 — Website Architecture:** as each branch website is defined,
establish canonical content path, repository directory, frontmatter
schema, category routing, related-content behavior.

**Phase 4 — Connect:** update the GPT's knowledge/reference file with
final web architecture. No fundamental GPT redesign should be required.

---

## 16. Canonical Architecture Decision

Unless J Merrill One later adopts a different formal web strategy: the
content architecture operates as **Hybrid**. Jackie Smith, Jr. owns
personal/founder thought. J Merrill One owns enterprise thought. Each L3
branch owns specialized subject-matter content. J Merrill One may provide
an enterprise discovery hub without duplicating canonical content.

This model best preserves identity, authority, search value, audience
relevance, enterprise coherence, and future scalability.

One enterprise. Distinct publishers. Connected knowledge.
