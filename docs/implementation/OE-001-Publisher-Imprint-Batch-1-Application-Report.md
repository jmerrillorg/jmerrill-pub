# OE-001 - Publisher Imprint Batch 1 Application Report

**Initiative:** JM Publishing Operational Excellence  
**Workstream:** 1 - Publisher Imprint Certification  
**Source:** Jackie Publisher Manual Assignment - Batch 1  
**Status:** Applied for exact normalized matches; reconciliation required for unmatched rows  
**Date:** 2026-07-07  

## Executive Summary

Jackie's Publisher Manual Assignment Batch 1 was applied as the governing source for PROGRAM-002 certified imprint status where the title and author matched the catalog using conservative normalization.

Normalization allowed only punctuation, case, diacritics, and repeated-spacing differences. Rows with spelling changes, abbreviation changes, missing catalog candidates, or title-author conflicts were held for reconciliation instead of guessed.

## Results

| Result | Count |
| --- | ---: |
| Batch rows received | 45 |
| Titles matched and locked | 25 |
| Titles requiring reconciliation | 20 |
| Execution-log event payloads prepared | 50 |
| Dataverse write status | Not attempted in this local session; no reachable Dataverse write environment variables were present |

## Successfully Matched and Locked

For each matched title, the PROGRAM-002/PAM certified imprint was set from Jackie Batch 1. Historical published imprint evidence is preserved.

| Title | Author | Current Published Imprint | Prior Recommendation | Publisher-Certified Imprint |
| --- | --- | --- | --- | --- |
| 365 Days Of Transparency | Daphanny Baker | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| A Principal's Tale | Shelley McIntosh | JM Works | JM Works | JM Works |
| BEE Careful | Deborah Eiland | JM Little | JM Little | JM Little |
| Focus, Trust, and Follow | Shana Byrd | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| Hodge Podge of Life | Mildred Beard | JM Works | JM Works | J Merrill Publishing |
| Inspirations from God | Edith Clay | J Merrill Publishing | J Merrill Publishing | JM Verse |
| Lady Daphanny's Altar | Daphanny Baker | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| Let Me Tell You About It | Lisa Clark | JM Works | JM Works | J Merrill Publishing |
| Life after Detour | Deanna Jones | JM Works | JM Works | JM Works |
| Love Lucy | Diane Johnson | JM Works | JM Works | J Merrill Publishing |
| Memoir of a Black Christian Nationalist | Shelley McIntosh | JM Works | JM Works | J Merrill Publishing |
| One Soul | Veronica Brown | JM Works | J Merrill Publishing | J Merrill Publishing |
| Pieces of Me All Over the Place | Ashanti Flemister | JM Works | JM Works | JM Works |
| Pretty Wings | Natasha Gilchrist | JM Works | JM Verse | J Merrill Publishing |
| SHE | Darlene Carson | JM Verse | J Merrill Publishing | J Merrill Publishing |
| Support Beyond the Cycle | Brandyn McElroy | JM Works | JM Works | J Merrill Publishing |
| The Girl with the Ebony Locs and the Three Bears | Deborah Eiland | JM Little | JM Little | JM Little |
| The Great Hair Restart | Karen Hill | JM Works | JM Works | JM Works |
| The Hood | Randall Beverly | JM Works | JM Works | JM Verse |
| The Messenger | Daphanny Baker | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| The Princess and the Black-Eyed Pea | Deborah Eiland | JM Little | JM Little | JM Little |
| Uncomfortable Conversations with God | Leslie Banks | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| Understanding the Misunderstood | Tia Benincase | J Merrill Publishing | J Merrill Publishing | JM Works |
| When a Thug Meets Jesus | Mack Hughley | J Merrill Publishing | J Merrill Publishing | J Merrill Publishing |
| Your Brain Has Too Much What, Mommy?? | Essence Unique | JM Little | JM Little | JM Little |

## Reconciliation Required

These rows were not applied because the match exceeded the approved fuzzy-normalization boundary or no catalog candidate was found.

| Source Title | Source Author | Publisher Imprint | Candidate / Issue |
| --- | --- | --- | --- |
| 7 Step Jumpstart to Becoming Your Best Self | Ericka Johnson-Settles | J Merrill Publishing | Candidate title found with author `Johnson Settles`; author mismatch requires confirmation. |
| A Trubie's Guide Pt. 1 | Alesia Corpening | JM Works | No exact normalized title+author match; possible title spelling/abbreviation variant requires confirmation. |
| A Trubie's Guide Pt. 2 | Alesia Corpening | JM Works | No exact normalized title+author match; possible title spelling/abbreviation variant requires confirmation. |
| Aligned! | Dennis Brown | J Merrill Publishing | Candidate title found with author `Alesia True Corpening`; author mismatch requires confirmation. |
| Come Out of Hiding | Chistina Chislom | J Merrill Publishing | Candidate title found with author `Christina Chislom`; spelling mismatch requires confirmation. |
| Connected | Dennis Brown | J Merrill Publishing | Candidate title found with author `Alesia True Corpening`; author mismatch requires confirmation. |
| For What It's Worth | Kelli Milligan Stammen | JM Works | Candidate title found with author `Ericka Thornton`; author mismatch requires confirmation. |
| God’s Word For This World | Thomas Johnson, Sr. | J Merrill Publishing | No exact normalized title+author match; possible author/title variant requires confirmation. |
| Grandmothers Educating Minds, 2nd Edition | Toni Kleckley | J Merrill Publishing | Candidate title found with author `M. Darlene Carson`; author mismatch requires confirmation. |
| Hop, Hop, Hop | Tawanna Mars | JM Little | Candidate title found with author `TJ Mars`; author identity variant requires confirmation. |
| Love is an Action Word | Kurt Broadnax | J Merrill Publishing | Candidate title found with author `Dennis Brown`; author mismatch requires confirmation. |
| Melodies from Heaven | Bailey Cunningham | JM Verse | Candidate title found with author `Baily Cunningham`; spelling mismatch requires confirmation. |
| Mirror of Refining Insight | Marvin Grayson | JM Verse | Candidate title found with author `M A Grayson`; author identity variant requires confirmation. |
| My ABC's | Christy Grogg | JM Little | Candidate title found with author `Jaylonna Stevette`; author mismatch requires confirmation. |
| Seasons of Life | Kurt Broadnax | J Merrill Publishing | Candidate title found with author `Diane Johnson`; author mismatch requires confirmation. |
| The Celestial Advantage | Obadiah Harris | J Merrill Publishing | Candidate title found with author `Obadiah E. Harris`; author name variant requires confirmation. |
| The Doctrine of the Last Things | Obadiah Harris | J Merrill Publishing | No exact normalized title+author match; possible title variant requires confirmation. |
| The Great Hair Restart: The Journal | Karen Hill | JM Works | No exact normalized title+author match; possible related title/edition requires confirmation. |
| The Little Girl with the Plow | Chistina Chislom | JM Little | Candidate title found with author `Deborah Eiland`; author mismatch requires confirmation. |
| The Master’s Piece | Sylvia Benson | J Merrill Publishing | No exact normalized title+author match; punctuation normalization was insufficient to find a catalog candidate. |

## Health Impact

| Metric | Before | After |
| --- | ---: | ---: |
| Imprint Certified | 78/122 (63.93%) | 81/122 (66.39%) |
| Publisher Imprint Review Queue | 43 | 40 |
| JM Signature Review Queue | 1 | 1 |
| Overall Enterprise Health | 41.47% | 62.33% |

## Execution Log

The following event types were prepared for every matched title:

- `IMPRINT_PUBLISHER_APPROVED`
- `IMPRINT_LOCKED`

Dataverse writeback was not attempted from this local session because no reachable Dataverse write environment variables were present. The payloads are preserved in:

- `data/oe001-publisher-imprint-batch-1-execution-log-payloads.json`

## Next Publisher Action

Jackie should confirm the 20 reconciliation items before they are locked. After confirmation, Cody can apply those remaining assignments and write the same execution-log event pair for each approved match.
