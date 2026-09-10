# Broken /join Regression

Last Verified: 2026-08-29T08:47:49.371Z

- Governed recovery action: RECOVER_EXISTING_INTAKE_MANUSCRIPT
- Input: existing intake/lead + author + manuscript artifact + founder authority
- Output: manuscript binding, certification, intake state, editorial-review eligibility, evidence
- Idempotency key: RECOVER-JFLY-c57472de-9d8bed1557d81c253115661c
- Duplicate intake protection: reference, lead linkage, idempotency key
- Duplicate manuscript protection: SHA256 artifact lookup
- Duplicate review protection: diagnostic/intake lookup

Evidence Source: recovery runner and focused regression tests.
