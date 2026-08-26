# JM1 Human-First / Why-First Publishing Commissioning

Last verified: 2026-08-26

## Classification

Publishing proving implementation: CONTROLLED COMMISSIONING

Enterprise policy source: `JM1-HUMAN-FIRST-WHY-FIRST-v1`

## Scope

This package records the first Publishing implementation of the enterprise human-first / why-first policy.

Implemented controls:

- reusable human-first / why-first policy assertion;
- Publishing author-email validation no longer requires fixed section-heading scaffolds;
- internal runtime/system language fails closed before author-facing send;
- author-review package QA requires audience classification for author-facing artifacts;
- author-review manuscript QA rejects filename-only authority, truncated manuscripts, word-count mismatch, missing structure, and internal metadata leakage;
- Developmental Editing packages no longer send `developmentalMemo` as an author-facing attachment by default;
- ACS relay author-review validation no longer requires the old heading scaffold and still enforces HTML, brand, action, next step, attachments, and internal-language safety.

No author communication was sent by this local commissioning pass.

## Validation

| Guard | Result |
| --- | --- |
| `node --test scripts/author_communication_brand_guard.test.mjs` | 10 / 10 PASS |
| `node --test scripts/author_review_package_engine.test.mjs` | 27 / 27 PASS |
| `node --test azure-functions/acs-email-relay/test/validation.test.js` | 41 / 41 PASS |
| `node --test scripts/author_facing_html_render_enforcement.test.mjs` | 27 / 27 PASS |
| `node --test scripts/author_package_notification_engine.test.mjs` | PASS |
| `npm run type-check` | PASS |

Environment caveat: local validation used Node 26.0.0 while the repository declares Node `>=24 <25`. `npm ci` completed from the governed lockfile with an engine warning.

## General's Will Finding

The recovered mailbox artifact:

`docs/operations/generated/JMP-SHARED-MAILBOX-ATTACHMENT-RECOVERY-2026-08-11/source-artifacts/original/The General’s Will and Last Testament - Edited Manuscript.docx`

is full-length but contains internal automation headers at the beginning, including source artifact, source checksum, correlation, and runtime/queue/worker language. It must remain evidence/internal source material, not an author-facing attachment as-is.

The older author-review package manuscript:

`docs/operations/generated/PROGRAM-008-AUTHOR-REVIEW-PREP-2026-08-04/packages/the-generals-will-and-last-testament/the-generals-will-and-last-testament-Author-Review-Manuscript.docx`

begins with the novel text, has a full-length word-count relationship to the recovered source, and contains the expected ending. It is the current candidate for corrected author-facing release, subject to production relay deployment/readback and one final governed send transaction.

## Negative Proof

| Condition | Count |
| --- | ---: |
| fixed_heading_scaffold_required | 0 |
| plain_english_rejected_for_missing_headings | 0 |
| internal_runtime_language_allowed_in_author_email | 0 |
| filename_only_manuscript_authority_allowed | 0 |
| truncated_developmental_manuscript_allowed | 0 |
| invalid_original_delivery_starts_response_clock | 0 |
| developmental_memo_sent_by_default | 0 |
| Outlook_plain_text_shortcut_used | 0 |
| author_communication_sent_local_pass | 0 |
