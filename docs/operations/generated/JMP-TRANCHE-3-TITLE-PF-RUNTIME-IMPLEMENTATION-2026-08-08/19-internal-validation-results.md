# Internal Validation Results

Last verified: 2026-08-09T00:37:12.774Z

Result: 40 / 40 PASS

| Scenario | Name | Result |
| --- | --- | --- |
| T3-01 | Authorized engagement initializes title runtime | PASS |
| T3-02 | Unauthorized engagement fails closed | PASS |
| T3-03 | Hybrid title with PF-01/PF-02/PF-03 | PASS |
| T3-04 | Starter with Paperback + Ebook | PASS |
| T3-05 | Professional with Paperback + Hardcover + Ebook | PASS |
| T3-06 | Nonstandard elected set: Paperback + Large Print + Ebook | PASS |
| T3-07 | PF-07 election attempt blocked | PASS |
| T3-08 | PF-08 without scope blocked | PASS |
| T3-09 | PF-08 with valid scope accepted | PASS |
| T3-10 | Editorial stage transition with missing artifact blocked | PASS |
| T3-11 | Developmental edit completion | PASS |
| T3-12 | Author-review package prepared without auto-send | PASS |
| T3-13 | FTL with missing imprint blocked | PASS |
| T3-14 | FTL complete | PASS |
| T3-15 | ISBN/identifier assignment after FTL | PASS |
| T3-16 | Product Form instance creation idempotency | PASS |
| T3-17 | Cover production incomplete | PASS |
| T3-18 | Interior production incomplete | PASS |
| T3-19 | Distribution readiness missing metadata | PASS |
| T3-20 | Distribution readiness complete | PASS |
| T3-21 | Release date attempted before distribution readiness blocked | PASS |
| T3-22 | Submission recorded | PASS |
| T3-23 | Duplicate submission protected | PASS |
| T3-24 | Rejected distribution submission | PASS |
| T3-25 | Retry after rejection | PASS |
| T3-26 | Submitted but not live | PASS |
| T3-27 | Confirmed-live transition | PASS |
| T3-28 | Correction attempt without authorization blocked | PASS |
| T3-29 | Correction authorized | PASS |
| T3-30 | Corrected edition/reissue | PASS |
| T3-31 | Companion Edition added later | PASS |
| T3-32 | Attempted removal/exchange of locked contracted PF blocked | PASS |
| T3-33 | Complimentary-copy entitlement follows elected PFs | PASS |
| T3-34 | SharePoint internal artifact remains internal | PASS |
| T3-35 | Author-facing projection excludes internal metadata | PASS |
| T3-36 | Runtime title appears correctly in Jackie surface | PASS |
| T3-37 | Blocked title appears in exception queue | PASS |
| T3-38 | Confirmed-live title exits active launch exception queue | PASS |
| T3-39 | Title/PF automation does not send author communication | PASS |
| T3-40 | Client-title automation remains frozen | PASS |

Live authors used: 0

Live titles used: 0

PR #431 titles used: 0
