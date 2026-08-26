# Bypass Test Results

Result: PASS

Bypass fixtures: 36 / 36 PASS

| # | Bypass attempt | Result |
|---:|---|---|
| 1 | Production starts without FINAL_EDITORIAL_CERTIFIED | FAIL_CLOSED |
| 2 | Production starts without PRODUCTION_READY | FAIL_CLOSED |
| 3 | Production mutates FINAL_EDITORIAL_MANUSCRIPT | FAIL_CLOSED |
| 4 | Production Master created without lineage | FAIL_CLOSED |
| 5 | Filename used as asset authority | FAIL_CLOSED |
| 6 | Scope silently expanded | FAIL_CLOSED |
| 7 | Scope silently reduced | FAIL_CLOSED |
| 8 | Author approval without exact artifact binding | FAIL_CLOSED |
| 9 | CHANGES_REQUESTED treated as approval | FAIL_CLOSED |
| 10 | Silence treated as approval | FAIL_CLOSED |
| 11 | Raw interior/layout output sent before internal QA | FAIL_CLOSED |
| 12 | Author approval treated as technical validation | FAIL_CLOSED |
| 13 | Cover marketability pass treated as technical pass | FAIL_CLOSED |
| 14 | Final cover geometry uses stale/preliminary page count | FAIL_CLOSED |
| 15 | Production Master changes but derived formats remain silently certified | FAIL_CLOSED |
| 16 | Stale cover survives page-count change | FAIL_CLOSED |
| 17 | Same ISBN reused across formats requiring distinct identifiers | FAIL_CLOSED |
| 18 | Commissioning/non-release title incorrectly requires ISBN | ALLOWED_NON_RELEASE_EXCEPTION |
| 19 | Commissioning/non-release title incorrectly requires barcode | ALLOWED_NON_RELEASE_EXCEPTION |
| 20 | Commissioning/non-release title incorrectly requires distribution metadata | ALLOWED_NON_RELEASE_EXCEPTION |
| 21 | EPUB certified without validation | FAIL_CLOSED |
| 22 | Accessibility conformance claimed without evidence | FAIL_CLOSED |
| 23 | Rights status detached from asset | FAIL_CLOSED |
| 24 | Failed automation mislabeled Waiting On Author | FAIL_CLOSED |
| 25 | Vendor delivery treated as JMP acceptance without QA | FAIL_CLOSED |
| 26 | Substantive chapter rewrite handled silently inside Production | FAIL_CLOSED |
| 27 | Author content change fails to trigger impact analysis | FAIL_CLOSED |
| 28 | Final certification with incomplete required workstream | FAIL_CLOSED |
| 29 | Final certification with missing author approval | FAIL_CLOSED |
| 30 | Final certification with failed technical validation | FAIL_CLOSED |
| 31 | Final certification with stale dependent artifact | FAIL_CLOSED |
| 32 | Final certification with cover/interior geometry mismatch | FAIL_CLOSED |
| 33 | Final certification with unresolved production correction | FAIL_CLOSED |
| 34 | PUBLICATION_ASSETS_READY with missing final artifact | FAIL_CLOSED |
| 35 | Block 06 receives ambiguous final files | FAIL_CLOSED |
| 36 | Block 05 performs distribution submission | FAIL_CLOSED |
