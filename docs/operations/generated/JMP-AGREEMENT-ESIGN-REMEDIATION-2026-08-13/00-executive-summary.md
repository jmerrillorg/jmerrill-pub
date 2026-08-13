# JMP Agreement Execution / E-Sign Remediation

Date: 2026-08-13
Title: 'TIL DEATH DO US PART
Intake: JMP-INT-202608-3W6Q6L
Diagnostic: 48cd0d86-f595-f111-8076-6045bdd69435
Opportunity: 11cdec24-b596-f111-8076-7c1e525b15c2

## Classification

Agreement execution remediation is complete to the next governed boundary.

Current boundary:

AWAITING_AUTHOR_FORMAT_SELECTION

## Findings

- One prior author-facing email sent DOCX agreement-package attachments and incorrectly advanced the Opportunity to `AGREEMENT_SENT_FOR_SIGNATURE`.
- No valid e-sign transaction/envelope exists for this Opportunity.
- The generated Package Addendum v4.1 has `Selected Editions / Formats` blank.
- Package Addendum v4.1 requires edition selection before execution because later changes to edition selection require written amendment signed by both parties.
- SignNow is the configured live provider, but the deployed function list does not contain an outbound SignNow send route. The SignNow webhook receiver exists.

## Actions Taken

- Hardened reusable DOCX validation so agreement documents must have the core Open XML package parts required by Word/e-sign providers.
- Updated agreement field computation and Package Addendum filling so elected Product Forms populate `Selected Editions / Formats`.
- Superseded the legacy DOCX-attachment agreement email path as a signature-execution path. It now fails closed by default unless explicitly invoked for superseded evidence/testing.
- Reclassified the live Opportunity out of `AGREEMENT_SENT_FOR_SIGNATURE`.
- Wrote Dataverse execution-log evidence for the remediation.

## Not Performed

- No SignNow transaction/envelope was created.
- No author communication was sent.
- No signature was requested.
- No payment link was created.
- No Business Central action occurred.
- No production, distribution, royalty, marketing, or client-title automation action occurred.

## Next Governed Action

Collect the author's elected Starter package Product Forms for 'TIL DEATH DO US PART. After the elected formats are recorded, regenerate the governed agreement package with `Selected Editions / Formats` filled, confirm payment/waiver consistency, and only then create exactly one SignNow e-sign transaction if the outbound SignNow send route is authorized and available.
