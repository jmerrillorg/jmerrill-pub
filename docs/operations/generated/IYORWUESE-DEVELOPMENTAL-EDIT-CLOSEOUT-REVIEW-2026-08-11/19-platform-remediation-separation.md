# Platform Remediation Separation

Last verified: 2026-08-11T17:37:29.998Z

Platform remediation completed in this PR:

- reusable author final approval gate added;
- author-decision propagation no longer closes awaiting state on conditional responses;
- protected title closeout service generalized away from hard-coded title allowlist;
- workflow dispatch parameterized for governed title/stage/gate/artifact facts;
- regression tests added/updated.

No production title progression was performed by the remediation.
