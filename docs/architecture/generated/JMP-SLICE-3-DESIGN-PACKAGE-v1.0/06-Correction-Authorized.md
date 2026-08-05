# CORRECTION_AUTHORIZED

Status: DESIGN ONLY
Implementation authority: NO

## Definition

`CORRECTION_AUTHORIZED` is the governed approval that permits a previously approved, distribution-ready, submitted, or live PF/edition to return to production or correction work without violating Format & Title Lock, release authority, distribution evidence, or author-facing commitments.

It is not a casual edit flag. It is an exception authority that must define scope, affected PFs, versioning, release/distribution impact, rollback expectations, and author-facing treatment.

## Approval

Required approval must include:

- approver;
- title;
- affected PFs;
- affected artifact versions;
- correction reason;
- severity;
- whether author approval is required;
- whether distributor resubmission is required;
- whether release anchor or confirmed-live date is affected;
- rollback plan if correction fails.

## Versioning

Correction must create or reference:

- prior Editorial Master version;
- corrected Editorial Master version if source changes;
- prior PF output version;
- corrected PF output version;
- distribution package version if resubmission is required;
- author-facing package version if author review is required.

No corrected file may silently overwrite the approved artifact lineage.

## Affected PFs

Correction scope may be:

- title-level source correction affecting all derived PFs;
- single PF correction;
- channel/distributor correction;
- metadata-only correction;
- cover/interior/audio/accessibility correction;
- release-plan correction.

If a title-level correction affects multiple PFs, each PF must receive its own state impact and evidence.

## Distribution

Correction must classify distribution impact:

| Impact | Meaning |
|---|---|
| No distribution impact | Correction is internal or before submission |
| Submission replacement required | Submitted package must be replaced before live |
| Live update required | Live channel needs updated files/metadata |
| Takedown/retirement required | Correction cannot safely update live state |
| Channel-specific exception | Only some channels are affected |

## Execution Log

Required events:

- `CORRECTION_AUTHORIZED`;
- `CORRECTION_VERSION_CREATED`;
- `QA_STARTED`;
- `QA_PASSED` or `QA_FAILED`;
- `AUTHOR_REVIEW_PACKAGE_PREPARED` if author review is required;
- `DISTRIBUTION_SUBMITTED` if resubmission occurs;
- `CORRECTION_CLOSED`;
- rollback event when required.

## Rollback

Rollback requires:

- rollback authority;
- prior known-good version;
- affected PFs/channels;
- author-facing impact;
- evidence that rollback is safe;
- final execution-log closure.

Rollback is forbidden when:

- prior version is not identifiable;
- live channel cannot accept rollback;
- rollback would create an ISBN/edition identity conflict;
- rollback would hide an author-approved correction reversal.

## Forbidden Uses

`CORRECTION_AUTHORIZED` may not be used to:

- bypass FTL;
- swap package slots;
- add unauthorized companion editions;
- revive retired or cancelled PF instances without new authority;
- reactivate legacy superseded SKUs;
- make PF-07 sellable;
- bypass PF-08 SOW gating;
- automate client-title production while automation is frozen.

