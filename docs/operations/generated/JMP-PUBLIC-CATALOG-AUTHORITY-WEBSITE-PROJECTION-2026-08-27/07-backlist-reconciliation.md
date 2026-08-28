# Backlist Reconciliation

Last Verified: 2026-08-27T22:56:00-04:00

The site-level remediation does not hand-edit the backlist. It establishes the automatic projection and evidence contract needed to reconcile all public backlist rows from Dataverse.

Deterministic backlist gaps now surface as:

- missing title slug;
- missing author attribution;
- missing required author page;
- missing format;
- missing ISBN;
- duplicate title slug;
- duplicate author slug.

Legacy ambiguity remains a data-governance issue until the governing title/author relationship is resolved in Dataverse.
