# J Merrill Publishing (JMP) Editorial Suite — Portable GPT Package

Converted from the Claude `jm1-publishing-editorial` skill into standalone,
platform-agnostic AI assistant configs. Each folder = one deployable GPT.

## What's Included

| Folder | GPT | Knowledge Files? |
|---|---|---|
| 01-Editorial-Review | JMP Editorial Review GPT | Yes — knowledge.md |
| 02-Developmental-Editing | JMP Development Editor GPT | Yes — knowledge.md |
| 03-Line-Editor | JMP Line Editor GPT | No |
| 04-Copy-Editor | JMP Copy Editor GPT | No |
| 05-Proofreader | JMP Proofreader GPT | No |
| 06-Distribution-Review | JMP Distribution Review GPT | No |
| 07-Cover-Intelligence | JMP Cover Intelligence GPT | Yes — 3 files |
| 08-Brand-Infrastructure | JMP Brand Infrastructure GPT | No |
| 09-Jackie-Personal-Blog | JM1 Blog Editorial GPT — jackiesmithjr.com | No |
| 10-JM1-Content-Blog | JM1 Content & Blog Editorial GPT — JM1 + 5 branches | Yes — 4 files |

Each `instructions.md` works two ways:
1. **As OpenAI Custom GPT instructions** — paste the content into the
   "Instructions" field when building a GPT at chatgpt.com/gpts/editor.
2. **As a generic system prompt** — paste as the system/persona prompt in
   Gemini Gems, Copilot Studio, a custom API call, or any other LLM tool.

## Deploying to ChatGPT (Custom GPT)

1. Go to chatgpt.com → Explore GPTs → Create.
2. Name it (e.g. "JMP Editorial Review").
3. Paste the `instructions.md` content into the Instructions field.
4. If the folder has knowledge files, upload them under Knowledge.
5. Set Capabilities off unless needed (no web browsing/code interpreter
   required for these).
6. Publish as private/unlisted unless you intend broader distribution —
   these contain internal JM1 governance language not meant for public
   release.

## Deploying to Gemini Gems / Copilot Studio / other tools

Paste `instructions.md` as the system instructions. If the tool supports
file grounding/knowledge attachments, attach the knowledge files the same
way.

## Important Notes Before You Deploy

- **01-Editorial-Review** uses your full production instruction set
  (explicit Editorial Pathways list, Imprint Alignment Check as its own
  gated output step, Reviewer Notes by Category, full boundary list, and
  the Decision/Checklist/Resubmission requirements in the final
  recommendation section). ~5,380 characters, under the 8,000-character
  cap. knowledge.md is unchanged (CANON reference doc). Ready to use.
- **02-Developmental-Editing** uses your full production instruction set
  (retention requirements, drift-prevention rules, government/institutional
  manuscript safeguard, 3-layer review system, author intent protocols,
  etc.). The JM1 Pipeline Bridge context lives in `knowledge.md` since the
  full merged text ran over the cap on its own. Instructions.md is ~7,570
  characters by itself, under the cap. Ready to use.
- **03-Line-Editor** uses your full production instruction set (14-guide
  style roster, JM1 house overlays for Faith/Urban/Children's content,
  word-count preservation thresholds, drift-prevention rules, formal/
  technical safeguard, voice preservation by genre, escalation taxonomy,
  8-part output structure, exact closing line). ~4,210 characters, under
  the cap. Ready to use.
- **04-Copy-Editor** uses your full production instruction set (14-guide
  roster with JM1 overlays scoped as voice-only, explicit mechanics-only
  scope list vs. do-not-touch list, retention thresholds by manuscript
  type, drift prevention, style hierarchy, dedicated Citations/References
  and Non-Prose Elements sections, Accessibility & Tech flag list,
  escalation taxonomy, 5-part output structure, exact closing line).
  ~4,330 characters, under the cap. Ready to use.
- **05-Proofreader** uses your full production instruction set —
  99-100% retention requirement, explicit Allowed/Disallowed correction
  lists, post-layout checks (verso/recto, blank-page logic, stranded
  headings), TOC/cross-reference/index verification, tables/figures
  verify-only handling, hyperlink/DOI checking for digital editions, a
  Factual/Legal/PII escalation duty (flag and route to Publisher, never
  alter text), a Change-Origin Rule, a Finality Rule, and version control
  advisory. ~4,790 characters, under the cap. Ready to use.
- **06-Distribution-Review** uses your full production instruction set —
  a deep, financially-enforced QA gate covering metadata/description
  governance, subject code requirements (BISAC/BIC/Thema), rights/ISBN/
  legal compliance, print and digital file compliance, accessibility,
  audiobook readiness, a platform-aware profit formula with an enforced
  $2.00 net margin threshold and hard price-floor/parity rules, JM
  Blockchain Vault handling, submission sequencing, release timing, and a
  Final Status that cannot read "Ready" if any print format fails
  profitability. ~6,480 characters, under the cap. Ready to use.
- **07-Cover-Intelligence** uses your full production instruction set — a
  full cover-development engine covering brief intake, competitive
  analysis, 3–5 fully-specified concepts, image-generation prompts with
  mandatory negative prompts, layout specs, distribution-aware production
  notes, marketability-driven design adaptation, audiobook/series logic,
  and an iteration protocol. It depends on three knowledge documents —
  `jmp_cover_genre_guide.md`, `jmp_cover_layout_guide.md`, and
  `jmp_cover_production_specs.md` — all included in this folder. These
  three were **recreated from scratch** around the current Cover
  Intelligence GPT (you confirmed you didn't have the original artifacts
  to recover verbatim) — review them for accuracy against your actual
  genre/layout/production conventions before treating them as canon.
  Instructions.md is ~3,830 characters; the three knowledge files attach
  separately. Upload all three under Knowledge when building this GPT.
- **08-Brand-Infrastructure** uses your full production instruction set — a
  scored author-infrastructure analysis engine (Manuscript/Positioning,
  Authority, Audience, Revenue Architecture, Visibility/Channel, and
  Distribution/Ingram iD, five of the six scored 0-20 with reasoning
  required), rolling up to an Overall Infrastructure Score with tiered
  readiness interpretation, Risk Flags, Monetization Upside, a 90-Day
  Roadmap, and a 4-tier Managed Growth Recommendation. ~3,080 characters,
  well under the cap. Ready to use, with one thing to check before
  treating it as canon: **Section 8 sums six layers scored 0-20 each
  (max 120) but labels the total "0-100."** Preserved verbatim per your
  instructions — you may want to either rescale the total to 0-120, drop
  one layer from the sum, or adjust the per-layer max before this goes
  live.
- **09-Jackie-Personal-Blog** is your production instruction set for
  jackiesmithjr.com specifically — a distinct GPT from the divisional
  blog reviewer, purpose-built for Jackie's personal platform. Covers
  author identity/voice, MDX + YAML frontmatter spec, file naming/slug
  convention, 5 operating modes (Draft Assist default, Editorial Pass,
  SEO Pass, CTA & Repurposing, Visual Companion), and an automatic
  4-part deliverable (Final Draft, MDX frontmatter, Facebook TLDR
  version, Visual Companion) produced every session without being asked.
  Core philosophy: "protect thinking in motion — if forced to choose
  between polish and truth, choose truth." Advisory safeguards are
  flag-only, never auto-corrected. ~7,630 characters, under the cap.
  Ready to use.
- **10-JM1-Content-Blog** was completely rebuilt as the canonical **JM1
  Content & Blog Editorial GPT** — a full enterprise content governance
  system covering J Merrill One (L2) and its five branches (L3):
  Publishing, Financial, Foundation, Productions, AIC. This replaces the
  earlier generic divisional-blog draft.

  Architecture: JackieSmithJr.com (09) is confirmed as a **separate L1
  personal platform, not a branch** — the two GPTs stay distinct by
  design, per your Hybrid Model decision. This GPT covers L2/L3 only, and
  explicitly never fabricates Founder Voice or attributes beliefs/
  experiences/quotes to Jackie personally — it flags a "Founder Content
  Opportunity" and hands off to 09 instead.

  Instructions.md (~7,980 characters, under the 8,000 cap) covers: the
  Brand Hierarchy/Router, a 5-voice router (Founder/Enterprise/Branch/
  Educational/Pastoral), 6 branch profiles, 7 operating modes (Draft
  Assist, Editorial Pass, SEO Pass, CTA & Repurposing, Branch Adaptation,
  Enterprise Alignment Review, Visual Companion), an advisory/compliance
  router, content/link governance with a full metadata classification
  system, visual canon rules, and an 8-part Automatic Completed-Article
  Package produced after every article.

  Four knowledge files carry the full depth referenced from
  instructions.md (all attach to this GPT):
  - `jm1_branch_editorial_matrix.md` — full editorial character, content
    pillars, voice, protections, and risk flags per entity
  - `jm1_enterprise_content_architecture.md` — content types, metadata
    schema, category governance per branch, file naming, the automatic
    article package, visual companion architecture, social repurposing,
    internal-linking hierarchy, Founder Content Handoff rule
  - `jm1_blogging_architecture_decision_framework.md` — the three
    architecture models (Centralized/Federated/Hybrid), the Hybrid Model
    ownership recommendation (adopted as canonical), the content
    ownership decision rule, URL standard, implementation phasing
  - `jm1_visual_identity_governance.md` — full hex color specs for all 6
    entities plus Jackie's personal palette, with the hard rule that
    Radiant Gold `#FFD700` is L1-exclusive

  All four documents together define the canonical architecture — Hybrid
  Model, one-owner-per-article, provisional TBD URLs until website
  structure is confirmed. This is your governance framework rebuilt
  faithfully; nothing was invented or altered beyond reformatting for the
  character cap (moving fully-duplicated detail — branch flag lists, full
  color hex codes — from instructions.md into the knowledge files where
  the same content already lived in full).
- None of these GPTs replace Jackie's approval authority. Per JM1 governance,
  model output is recommendation; Jackie approval creates canon. Any output
  these produce in another AI tool should still route back through your
  normal review process before being treated as final.
- These configs do not include your Dataverse/jm1_executionlog integration —
  external GPTs can't write to your production systems. Use them for
  drafting/review/recommendation work, then log meaningful events into
  Dataverse yourself (or via Copilot/Power Automate) as usual.
