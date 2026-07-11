# PROGRAM-003A Editorial Model Routing and 14-Style-Guide Governance

**Classification:** Operational routing foundation
**Status:** Reconciled to governing canon
**Authority:** Jackie
**Date:** 2026-07-10

## Executive Read

This slice establishes the smallest governed routing foundation needed to support editorial AI work without letting the model provider become the editorial standard.

What is now in place in source:

- one centralized editorial model-routing registry
- one deterministic style-guide selector
- one prompt-assembly pattern
- one compliance-validation scaffold
- one canonical 14-guide inventory drawn from governed `knowledge.md`

What remains blocked operationally:

- the only model actually deployed in the governed Azure OpenAI account today is `gpt-4o-mini`
- the preferred Foundry catalog candidates for editorial work are available in East US, but **not deployed** in JM1's governed account
- the blob-backed governed `knowledge.md` reader failed from this shell, so live blob validation did not replace the local canonical-source read for this pass

That means the routing foundation is ready, but a real Foundry-based Claude Sonnet developmental pilot still requires model deployment before execution can proceed truthfully.

## 1. Current Foundry Model Availability Matrix

**Verified from JM1 Azure subscription (`rg-jm1-ai`, account `oai-jm1-diagnostic`, East US) on 2026-07-10 using `/opt/homebrew/bin/az`.**

### Current deployed model

| Editorial Layer | Preferred Family | Exact Available Model | Provider | Region | Context | Cost | Status |
|---|---|---|---|---|---|---|---|
| Current governed baseline | Azure OpenAI baseline | `gpt-4o-mini` (`2024-07-18`) | OpenAI via Azure OpenAI | `eastus` | `128000` | CLI did not expose price | **Deployed** as `jm1-pub-diagnostic-primary` |

### Preferred editorial candidates available in catalog but not deployed

| Editorial Layer | Preferred Family | Exact Available Model | Provider | Region | Context | Cost | Status |
|---|---|---|---|---|---|---|---|
| Editorial Diagnostic | Claude Sonnet | `claude-sonnet-5` v2 | Anthropic via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |
| Developmental Editing | Claude Sonnet | `claude-sonnet-5` v2 | Anthropic via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |
| Line Editing | Claude Sonnet | `claude-sonnet-5` v2 | Anthropic via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |
| Copy Editing | GPT-5 | `gpt-5.4` (`2026-03-05`) | OpenAI via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |
| Proofreading | GPT-5 | `gpt-5.4` (`2026-03-05`) | OpenAI via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |
| Independent quality review | Second family / independent validator | `gpt-5-mini` (`2025-08-07`) | OpenAI via Azure AI Foundry | `eastus` | CLI did not expose | CLI did not expose | Catalog available, not deployed |

## 2. Exact Claude Sonnet Model Available to JM1

The East US governed catalog currently exposes:

1. `claude-haiku-4-5` v2
2. `claude-sonnet-5` v2
3. `claude-opus-4-8` v2

**Result:** a real **Sonnet 5** designation does exist in the governed Azure AI Foundry catalog for JM1. It is not a guessed product label.

## 3. Exact GPT-5 Models Available to JM1

The East US governed catalog currently exposes, at minimum:

1. `gpt-5`
2. `gpt-5-mini`
3. `gpt-5-nano`
4. `gpt-5-pro`
5. `gpt-5.1`
6. `gpt-5.2`
7. `gpt-5.3-chat`
8. `gpt-5.4`
9. `gpt-5.4-mini`
10. `gpt-5.4-nano`
11. `gpt-5.4-pro`
12. `gpt-5.5`
13. `gpt-5.6-luna`
14. `gpt-5.6-sol`
15. `gpt-5.6-terra`

Requested verification results:

- `gpt-5.3` exists in catalog only as `gpt-5.3-chat`
- `gpt-5.4` exists in catalog as a base model and several variants

## 4. Numbered Inventory of the 14 Canonical Style Guides

**Governed source:** [knowledge.md](/Volumes/UsersExternal/_INBOX/md/knowledge.md) plus explicit Jackie roster ruling dated 2026-07-11.

1. `JMP-SG-CMOS` — Chicago Manual of Style
2. `JMP-SG-APA` — APA Style
3. `JMP-SG-MLA` — MLA Handbook
4. `JMP-SG-AP` — Associated Press Stylebook
5. `JMP-SG-HARVARD` — Harvard Referencing
6. `JMP-SG-TURABIAN` — Turabian
7. `JMP-SG-AMA` — AMA Manual of Style
8. `JMP-SG-ACS` — ACS Style Guide
9. `JMP-SG-BLUEBOOK` — The Bluebook
10. `JMP-SG-IEEE` — IEEE Editorial Style Manual
11. `JMP-SG-CSE` — CSE Manual
12. `JMP-SG-GPO` — U.S. Government Publishing Office Style Manual
13. `JMP-SG-MHRA` — MHRA Style Guide
14. `JMP-SG-OXFORD` — Oxford Style

The Project Style Sheet remains an internal lifecycle artifact, not one of the 14 external guides.

### Important note on editions

The canon source names the 14 guides but does **not** enumerate external edition numbers. This slice therefore records:

- canonical guide identity
- active canon source version
- `externalEditionStatus = UNSPECIFIED_IN_CANON` where the exact external edition was not stated

That is enough to route truthfully, but not enough to claim edition-specific cite enforcement without a future governed edition registry.

## 5. Style-Guide Applicability Matrix

| Manuscript class | Primary guide | Secondary guide |
|---|---|---|
| Trade fiction / trade nonfiction | CMoS | None |
| Children's | CMoS | Project Style Sheet lifecycle applies internally |
| Poetry | CMoS | Poet's established form is advisory, not part of the 14-guide canon |
| Social sciences / education / psychology | APA | CMoS |
| Humanities / literature | MLA | CMoS |
| Medical / health | AMA | CMoS |
| Journalism / media | AP | CMoS |
| Technical / scientific | IEEE / ACS / CSE | CMoS |
| Legal / institutional | Bluebook | Government style as applicable |
| Public sector / government | GPO | CMoS |
| Academic humanities / thesis | Turabian | CMoS |
| International academic / UK-facing | Harvard / MHRA / Oxford | CMoS |

## 6. Precedence and Conflict Rules

Implemented precedence:

1. Enterprise requirements
2. JMP house style / default canon
3. Imprint guide
4. Manuscript-type or genre guide
5. Audience guide
6. Editorial-stage guide
7. Title-specific approved exception
8. Author-specific approved preference

Fail-closed conditions implemented:

- no editorial stage provided
- unresolved legal + technical guide collision
- unapproved title-specific exception
- no approved deployment available for the route

## 7. Deterministic Guide Selection Result

Implemented in:

- [editorialGuideSelector.js](/tmp/jmerrill-pub-program003a-runtime/azure-functions/diagnostic-ai-runner/src/editorial/editorialGuideSelector.js)

The selector now returns:

- selected primary guide
- selected companion guides
- versions / canon source version
- precedence explanation
- conflicts
- unresolved exception
- human-review requirement

## 8. Central Model-Routing Registry / Configuration

Implemented in:

- [editorialModelRoutingRegistry.js](/tmp/jmerrill-pub-program003a-runtime/azure-functions/diagnostic-ai-runner/src/editorial/editorialModelRoutingRegistry.js)

Current governed route posture:

- Diagnostic / Developmental / Line: prefer `claude-sonnet-5` when deployed
- Copy / Proof: prefer `gpt-5.4` when deployed
- Independent compliance: prefer an independently routed validator
- fallback baseline: `jm1-pub-diagnostic-primary` -> `gpt-4o-mini`

The registry is explicit that today the preferred routes are **catalog-available but not deployed**, so fallback use is visible and quality-impact tagged.

## 9. Prompt Assembly Implementation

Implemented in:

- [editorialPromptAssembly.js](/tmp/jmerrill-pub-program003a-runtime/azure-functions/diagnostic-ai-runner/src/editorial/editorialPromptAssembly.js)

The prompt assembly pattern now records:

- transaction
- prompt ID and version
- model provider and deployment
- selected guide IDs and companion guide IDs
- prompt hash
- publishing asset context
- human-review requirement

It injects only:

- the selected primary guide
- any selected secondary guide
- qualifying companion doctrine
- stage boundaries
- author-voice protection
- structured output schema

It does **not** inject all 14 guides into one request.

## 10. The Intentional Leader Selected Guide Set

For **The Intentional Leader — Volume I**:

- publishing asset: `c9dc862e-da7a-f111-ab0f-000d3a14673b`
- current stage: Developmental Editing — In Progress
- imprint / content lane: faith-rooted devotional leadership

Deterministic selection result:

- primary guide: `JMP-SG-CMOS`
- companion guide: `JMP-CG-DEVELOPMENTAL-V1`
- companion guide: `JMP-CG-FAITH-OVERLAY-V1`

## 11. The Intentional Leader Model Comparison

### Preferred route

- model family: Claude Sonnet
- exact candidate: `claude-sonnet-5` v2
- status: available in catalog, **not deployed**

### Current governed fallback baseline

- deployment alias: `jm1-pub-diagnostic-primary`
- exact model: `gpt-4o-mini`
- status: deployed and already proven in the governed runtime

### Quality expectation

If JM1 uses the fallback baseline for developmental work:

- structural insight likely weaker
- thematic pacing judgment likely weaker
- voice-preservation risk higher
- reviewer effort higher

## 12. Developmental Quality Findings

This slice did **not** run a new live developmental model pass because the preferred Foundry Claude route is not yet deployed. The operational movement here is:

- Volume I now has a deterministic style-guide selection result
- Volume I now has a governed prompt-assembly path
- Volume I now has an explicit preferred-vs-fallback model posture

That moves the title closer to **Author Review Package Ready** without fabricating a model execution that did not truthfully occur.

## 13. Style-Guide Compliance Result

Implemented in:

- [editorialComplianceValidator.js](/tmp/jmerrill-pub-program003a-runtime/azure-functions/diagnostic-ai-runner/src/editorial/editorialComplianceValidator.js)

Current validator checks:

- selected guide present
- no unresolved guide conflict
- prompt hash present
- guide manifest present
- independent-validator warning when the producing and validating model are the same
- voice-protection acknowledgement requirement for developmental work

## 14. Cost, Latency, and Reviewer-Effort Comparison

Because Azure CLI did not expose live price cards for these models, this slice records comparative posture rather than invented dollar figures.

| Route | Cost posture | Latency posture | Reviewer effort |
|---|---|---|---|
| `claude-sonnet-5` preferred developmental / line | expected medium-to-high | expected medium | lower if it performs as expected |
| `gpt-5.4` preferred copy / proof | expected medium-to-high | expected medium | lower than fallback for consistency work |
| `gpt-4o-mini` fallback baseline | lowest currently deployed | medium | highest reviewer cleanup burden for editorial nuance |

## 15. Recommended Models by Transaction

| Transaction | Preferred exact model | Current certified baseline | Current approved fallback |
|---|---|---|---|
| Editorial Diagnostic | `claude-sonnet-5` | `gpt-4o-mini` | `gpt-4o-mini` |
| Developmental Editing | `claude-sonnet-5` | none yet | `gpt-4o-mini` |
| Line Editing | `claude-sonnet-5` | none yet | `gpt-4o-mini` |
| Copy Editing | `gpt-5.4` | none yet | `gpt-4o-mini` |
| Proofreading | `gpt-5.4` | none yet | `gpt-4o-mini` |
| Independent quality review | `gpt-5-mini` or other second-family validator once certified | none yet | `gpt-4o-mini` with warning |

## 16. Approved Fallback Model Recommendations

Until preferred deployments exist and are certified:

- fallback deployment alias: `jm1-pub-diagnostic-primary`
- fallback exact model: `gpt-4o-mini`
- fallback use must remain explicit, logged, and quality-impact tagged

## 17. Progress Made on Actual Volume I Deliverables

Real movement completed in this slice:

1. Volume I now has a deterministic, governed guide set.
2. Volume I now has a reusable prompt-assembly pattern that protects author voice.
3. Volume I now has a visible preferred-vs-fallback model policy.
4. Volume I now has a compliance-validator scaffold that can sit behind future developmental output.

## 18. True Blockers Requiring Jackie

1. **Preferred model deployment blocker**
   `claude-sonnet-5` and `gpt-5.4` are catalog-available, but not deployed in the governed JM1 account.

2. **Edition-level guide version blocker**
   The 14-guide canon roster is identifiable, but exact external edition numbers are not enumerated in `knowledge.md v1.1`. Routing is ready; edition-specific citation enforcement still needs a governed edition registry if Jackie wants that precision.

3. **Live blob-read credential blocker from this shell**
   The governed blob reader failed from this shell, so this pass validated the local canonical source path instead of re-verifying the live blob contents directly.
