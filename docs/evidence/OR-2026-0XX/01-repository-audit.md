# OR-2026-0XX Repository Audit

Date: 2026-08-06

Objective: locate repository references to complimentary copies, author copies, included copies, package benefits, and package tiers before establishing a governed complimentary author-copy policy.

## Search Terms

- complimentary copies
- complimentary copy
- author copies
- author copy
- included copies
- included copy
- package benefits
- starter package
- professional package
- premier package
- signature package

## Findings

The pre-remediation repository search found no governed source of truth for complimentary author-copy quantities.

Active or operational references existed in:

- `app/packages/page.tsx`: public package matrix listed complimentary paperback quantities only.
- `lib/commercial/catalog.ts`: package projection did not carry complimentary-copy quantities.
- `lib/tokens.ts`: package presentation projection could not expose governed complimentary-copy quantities.
- `azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js`: Professional and Premier copy quantities were embedded in agreement-field computation; Starter lacked a copy configuration.
- `azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js`: Professional and Premier copy quantities were embedded in package addendum content; Starter content was absent.
- `azure-functions/diagnostic-ai-runner/src/agreement/governedAgreementPipelineRunner.js`: one merge-field label referred to a Section 3A.1 default of 10, implying a universal default instead of package-specific policy.

Historical, generated, or catalog-evidence references also appeared for author-copy SKUs, author-copy charges, and publishing asset register columns. Those references identify commercial catalog records or migration evidence, not package-benefit quantities.

## Conflicting Language

- Premier agreement logic used 15 paperback / 4 hardcover / 1 eBook.
- Approved policy requires Premier / Signature to use 15 paperback / 5 hardcover / 1 eBook.
- Starter agreement logic had no complimentary-copy configuration, even though approved policy requires 5 paperback / 0 hardcover / 1 eBook.
- Public package page omitted hardcover and eBook complimentary-copy benefits.
- One agreement merge-field label implied a default of 10 copies instead of a package-specific governed policy.

## Missing References

The repository did not contain a canonical `PUB-STD` document for author-copy policy before this remediation.

No separate Author Welcome Guide, FAQ, Knowledge Base, or Sales document with active complimentary-copy quantities was found in the targeted repository search. Those document classes should reference `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md` when created or revised.

## Obsolete References

No obsolete active policy document was found. The defect was absence of governed documentation plus embedded values in website and agreement code.
