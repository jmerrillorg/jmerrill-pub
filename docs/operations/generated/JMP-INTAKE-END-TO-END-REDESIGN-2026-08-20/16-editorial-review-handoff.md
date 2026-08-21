# Editorial Review Handoff

Canon:

Editorial Review starts only when a valid intake and usable certified manuscript source exist.

Implemented:

- The API attempts Editorial Review orchestration only when manuscript evidence exists.
- Pages files create normalization/system state instead of pretending review can start from DOCX.

Required next:

- Certify exact source artifact/checksum before handoff.
- Bind derived DOCX to original Pages checksum if conversion occurs.
- Suggested imprint may be produced downstream but does not block Editorial Review.

