# OE-001 - Publisher Master Imprint Register Update

**Initiative:** JM Publishing Operational Excellence  
**Workstream:** 1 - Publisher Imprint Certification  
**Source:** Jackie Publisher Master Imprint Register Update  
**Status:** Applied to local governed PROGRAM-002/PAM artifacts  
**Date:** 2026-07-07  

## Executive Summary

Jackie provided an updated author/title/imprint register as Publisher truth. This supersedes prior source-derived conflicts, AI recommendations, `books.json`, and earlier low-confidence packets.

Nonblank imprint assignments were applied where an existing PROGRAM-002/PAM title anchor was available. Blank imprint rows were not locked; they were moved to `IMPRINT_PENDING_MANUSCRIPT_REVIEW`. Rows with author `.` were not guessed; they were moved to `AUTHOR_RECONCILIATION_REQUIRED`. Rows without an existing PROGRAM-002 title anchor were captured in the Master Register for later title/asset reconciliation.

Historical published imprint fields remain preserved as evidence. This pass updates certified imprint status only.

## Applied Imprint Decisions

| Author | Title | Certified Imprint | Matched PROGRAM/PAM Title | Status |
| --- | --- | --- | --- | --- |
| Carolyn Booker-Pierce | Because the Lord Is My Shepherd | J Merrill Publishing | Because the Lord Is My Shepherd | PUBLISHER_CERTIFIED |
| Sean Smith, Sr. | Destined to Break the Curse | J Merrill Publishing | Destined to Break the Curse | PUBLISHER_CERTIFIED |
| Jaylonna Stevette | Have You Considered My Servant? | J Merrill Publishing | Have You Considered My Servant? | PUBLISHER_CERTIFIED |
| KD Heard | Inner Peace Through Life's Storms | J Merrill Publishing | Inner Peace Through Life's Storms | PUBLISHER_CERTIFIED |
| Deborah Eiland | Jalen Becomes a Big Brother | JM Little | Jalen Becomes a Big Brother | PUBLISHER_CERTIFIED |
| Jaylonna Stevette | Naughty Tales | JM Works | Naughty Tales | PUBLISHER_CERTIFIED |
| Junaita Travis | Rhyming It up with Church Stuff | JM Verse | Rhyming It up with Church Stuff | PUBLISHER_CERTIFIED |
| Dennis Brown | The Flame | J Merrill Publishing | The Flame | PUBLISHER_CERTIFIED |
| Lyle Goddard | The Release of the Spirit | J Merrill Publishing | The Release of the Spirit | PUBLISHER_CERTIFIED |
| Winter Dockery | War Mother | J Merrill Publishing | War Mother | PUBLISHER_CERTIFIED |
| Rodney Waller | Why Faith Works for Some and Not for Others | J Merrill Publishing | Why Faith Works For Some And Not For Others | PUBLISHER_CERTIFIED |
| Kiena Hughley | Your Peace Is a Priority | J Merrill Publishing | Your Peace Is a Priority | PUBLISHER_CERTIFIED |
| Lisa Taylor | Damaged | JM Works | Damaged | PUBLISHER_CERTIFIED |
| Kimberly Reeder | Girl, Did You Know...? | J Merrill Publishing | Girl, Did You Know...? | PUBLISHER_CERTIFIED |
| j. Derrick Johnson | 101 Wisdom Lessons for Life and Living | J Merrill Publishing | 100 Wisdom Lessons for Life and Living | PUBLISHER_CERTIFIED |
| Will Harris | Music Ministry Unplugged | J Merrill Publishing | Music Ministry Unplugged | PUBLISHER_CERTIFIED |
| Iyorwuese Hagher | The Conquest of Azenga | JM Signature | The Conquest of Azenga | PUBLISHER_CERTIFIED |
| Iyorwuese Hagher | A Portrait of Paradise | JM Signature | A Portrait of Paradise | PUBLISHER_CERTIFIED |
| Cheryl Cook | The Fight for the Promiseland | J Merrill Publishing | The Fight for the Promiseland | PUBLISHER_CERTIFIED |
| Daphanny Baker | The Messenger 2 | J Merrill Publishing | The Messenger 2 | PUBLISHER_CERTIFIED |
| Daphanny Baker | Peaches Can Do It | JM Little | Peaches Can Do It! | PUBLISHER_CERTIFIED |

## Pending Manuscript / Publisher Imprint Queue

Blank-imprint rows were not locked.

| Author | Title | Matched PROGRAM/PAM Title | Status |
| --- | --- | --- | --- |
| Carolyn Booker-Pierce | Abortion! | Abortion! | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Agape International Cathedral | Delicious Ideas! | Delicious Ideas! | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Karen Hill | From Stylist to CEO | From Stylist to CEO | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Carolyn Booker-Pierce | Girl, You're Not Crazy. You're Dealing with a Narcissist | Girl, You're Not Crazy. You're Dealing with a Narcissist | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Carolyn Booker-Pierce | Loving the Addict | Loving the Addict | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Carolyn Booker-Pierce | More Than a Village | More Than A Village | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Will Harris | Taylor Made | Taylor Made | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Shelley McIntosh | Warriors and Angels | Warriors and Angels | IMPRINT_PENDING_MANUSCRIPT_REVIEW |
| Carolyn Booker-Pierce | You're Still Not Crazy | You're Still Not Crazy | IMPRINT_PENDING_MANUSCRIPT_REVIEW |

## Author Reconciliation Queue

Rows with author `.` were not guessed.

| Author | Title | Requested Imprint | Matched PROGRAM/PAM Title | Status |
| --- | --- | --- | --- | --- |
| . | The Paper Champ | Pending | The Paper Champ | AUTHOR_RECONCILIATION_REQUIRED |
| . | The Sun, the Shadow, and the Silence | Pending | The Sun, the Shadow, and the Silence | AUTHOR_RECONCILIATION_REQUIRED |
| . | When Zuri Came to Earth | JM Little | When Zuri Came to Earth | AUTHOR_RECONCILIATION_REQUIRED |

## Title / Asset Anchor Reconciliation Queue

These rows have Publisher imprint assignments but no existing PROGRAM-002 title anchor in the current catalog set.

| Author | Title | Certified Imprint | Status |
| --- | --- | --- | --- |
| Permelia Smith | The Tithe Is the Lord’s | J Merrill Publishing | NO_PROGRAM_TITLE_ANCHOR |
| Sean Crowley | The Shift | JM Signature | NO_PROGRAM_TITLE_ANCHOR |
| Sean Crowley | Strategies for Success | JM Works | NO_PROGRAM_TITLE_ANCHOR |
| Sean Crowley | Exemplars of Excellence | JM Works | NO_PROGRAM_TITLE_ANCHOR |

## Health Impact

| Metric | Before Master Register | After Master Register |
| --- | ---: | ---: |
| Imprint Certified | 92/122 (75.41%) | 102/122 (83.61%) |
| Publisher Imprint Review Queue | 29 | 20 |
| JM Signature Review Queue | 1 | 0 |
| Overall Enterprise Health | 64.84% | 67.12% |

## Execution Log

Prepared event payloads:

- `IMPRINT_PUBLISHER_APPROVED`
- `IMPRINT_LOCKED`
- `AUTHOR_TITLE_PAIRING_PUBLISHER_CONFIRMED` where prior source conflict existed

Dataverse writeback was not attempted from this local session because no reachable Dataverse write environment variables were present. Payloads are retained in:

- `data/oe001-publisher-imprint-batch-1-execution-log-payloads.json`

## Boundaries Preserved

- No contracts touched.
- No Stripe touched.
- No royalties touched.
- No Business Central touched.
- No production/distribution touched.
- No author communications sent.
