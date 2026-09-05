# JMP Production Asset Authority Contract v1

**Status:** Operational  
**Effective:** 2026-09-05

1. J Merrill Publishing owns production asset authority for its canonical works and products.
2. SharePoint owns file bytes and file lifecycle. Dataverse owns canonical identity and durable references.
3. A production asset is identified by SharePoint `DriveId + ItemId`; a path is descriptive and may change.
4. Marketing consumes only canonical work/product identity and governed production-asset references. It may not reconstruct identity from display title, filename, folder name, or timestamp.
5. `GOVERNED_PRIMARY` requires deterministic evidence. Similar filenames, newer timestamps, and visually plausible alternates do not establish primacy.
6. Historical, source, alternate, distribution-proof, promotional, ambiguous, partial, and missing states remain distinct.
7. Reserved ISBNs do not create works or production-asset relationships.
8. Cross-author matches are prohibited. Ambiguity routes to review without changing catalog or rights authority.
9. Reconciliation is non-destructive. Duplicate candidates are recorded; they are not deleted automatically.
10. New-title automation must register SharePoint item identity after file creation and before downstream Marketing activation.
