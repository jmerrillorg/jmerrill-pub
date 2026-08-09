# Validation Results

Last verified: 2026-08-09T21:23:19Z

## Completed Validation

| Check | Result |
| --- | --- |
| `npm ci` | PASS with existing Node 26 warning against repository Node 24 engine declaration |
| `npm run type-check` | PASS |
| `npm run author-communication-brand-guard` | PASS |
| `npm run real-title-pilot-1-preparation-guard` | PASS |
| `npm run tranche4-author-marketing-experience-guard` | PASS |
| `npm run tranche6-certification-controlled-thaw-guard` | PASS |

## Brand Terminology Regression

Required examples: 12 / 12 PASS

Covered examples:

1. "Publishing will complete the next step." -> FAIL
2. "The Publishing Team will complete the next step." -> PASS
3. "The book is now with Publishing." -> FAIL
4. "The book is now with the Publishing Team." -> PASS
5. "while Publishing continues the production process" -> FAIL
6. "while the Publishing Team continues the production process" -> PASS
7. "J Merrill Publishing, Inc." -> PASS
8. "your publishing agreement" -> PASS
9. "the publishing process" -> PASS
10. "publishing@jmerrill.one" -> PASS
11. "Publishing Track" -> PASS
12. "J Merrill Publishing will assign one from our registered pool." -> PASS

## Pilot 1 Source Phrase Regression

Observed phrase class: 3 / 3 corrected in future render source.

| Prior actor wording | Future source/render wording |
| --- | --- |
| "The book is now with Publishing for the next production step." | "The book is now with the Publishing Team for the next production step." |
| "This message is only to keep you informed while Publishing continues the production process." | "This message is only to keep you informed while the Publishing Team continues the production process." |
| "Publishing will complete the next production handling for the approved proof." | "The Publishing Team will complete the next production handling for the approved proof." |

## Representative Author-Facing Render Sweep

Representative stages covered by existing guards:

- onboarding/status
- editorial
- production
- distribution/release
- post-publication

Standalone actor "Publishing": 0 active defects

Author-facing leakage defects: 0

