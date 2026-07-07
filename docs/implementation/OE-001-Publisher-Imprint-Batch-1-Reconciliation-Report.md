# OE-001 - Publisher Imprint Batch 1 Reconciliation Report

**Initiative:** JM Publishing Operational Excellence  
**Workstream:** 1 - Publisher Imprint Certification  
**Source:** Jackie Publisher Manual Assignment - Batch 1  
**Evidence Sources:** MONTHLY REPORTING 2026 workbook, Total Asset Listing, PAM staging evidence  
**Status:** 17 resolved / 3 require Jackie review  
**Date:** 2026-07-07  

## Executive Summary

The 20 Batch 1 exceptions were reviewed against publisher-source evidence rather than `books.json`. Seventeen exceptions were confirmed and applied to PROGRAM-002/PAM certified imprint status. Three exceptions remain unresolved because the available evidence did not safely establish the full relationship needed for writeback.

Historical published imprint fields remain preserved as evidence. This pass updated only the certified PROGRAM-002/PAM imprint status and local governed artifacts. No contracts, Stripe, royalties, Business Central, distribution, production, or author communications were touched.

## Reconciliation Results

| Result | Count |
| --- | ---: |
| Exceptions reviewed | 20 |
| Resolved and applied | 17 |
| Still requiring Jackie review | 3 |
| New execution-log payloads prepared | 34 |
| Dataverse write status | Not attempted in this local session; no reachable Dataverse write environment variables were present |

## Resolved Exceptions

| Source Title | Source Author | Canonical Title | Canonical Author | Status | Certified Imprint |
| --- | --- | --- | --- | --- | --- |
| 7 Step Jumpstart to Becoming Your Best Self | Ericka Johnson-Settles | 7 Step Jumpstart to Becoming Your Best Self | Ericka Johnson Settles | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| A Trubie's Guide Pt. 2 | Alesia Corpening | A Truebies Guide, Part 2 | Alesia Corpening | TITLE_VARIANT_CONFIRMED | JM Works |
| Aligned! | Dennis Brown | Aligned! | Dennis Brown | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| Come Out of Hiding | Chistina Chislom | Come Out of Hiding | Christina Chislom | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| Connected | Dennis Brown | Connected! | Dennis Brown | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| God’s Word For This World | Thomas Johnson, Sr. | God's Word For This World | Thomas Johnson, Sr. | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| Grandmothers Educating Minds, 2nd Edition | Toni Kleckley | Grandmothers Educating Minds, 2nd Edition | Toni Kleckley | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| Hop, Hop, Hop | Tawanna Mars | Hop, Hop, Hop | Tawonna Mars | AUTHOR_VARIANT_CONFIRMED | JM Little |
| Love is an Action Word | Kurt Broadnax | Love Is An Action Word | Kurt Broadnax | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| Melodies from Heaven | Bailey Cunningham | Melodies from Heaven | Bailey Cunningham | AUTHOR_VARIANT_CONFIRMED | JM Verse |
| Mirror of Refining Insight | Marvin Grayson | Mirror of Refining Insight | Marvin Grayson | AUTHOR_VARIANT_CONFIRMED | JM Verse |
| My ABC's | Christy Grogg | My ABCs | Christy Grogg | TITLE_VARIANT_CONFIRMED | JM Little |
| Seasons of Life | Kurt Broadnax | Seasons of Life | Kurt Broadnax | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| The Celestial Advantage | Obadiah Harris | The Celestial Advantage | Obadiah E. Harris | AUTHOR_VARIANT_CONFIRMED | J Merrill Publishing |
| The Doctrine of the Last Things | Obadiah Harris | The Doctrine of Last Things | Obadiah E. Harris | TITLE_VARIANT_CONFIRMED | J Merrill Publishing |
| The Little Girl with the Plow | Chistina Chislom | The Little Girl with the Plow! | Christina Chislom | AUTHOR_VARIANT_CONFIRMED | JM Little |
| The Master’s Piece | Sylvia Benson | The Master's Piece | Sylvia Benson | TITLE_VARIANT_CONFIRMED | J Merrill Publishing |

## Unresolved Exceptions

| Source Title | Source Author | Publisher Imprint | Status | Reason |
| --- | --- | --- | --- | --- |
| A Trubie's Guide Pt. 1 | Alesia Corpening | JM Works | NEEDS_JACKIE_REVIEW | Workbook ISBN sheet confirms `A Truebies Guide, Part 1` and AUTHOR sheet confirms Alesia Corpening aliases, but this pass did not find a direct title-author row tying Part 1 to Alesia Corpening. |
| For What It's Worth | Kelli Milligan Stammen | JM Works | NEEDS_JACKIE_REVIEW | Workbook ISBN sheet confirms the title and AUTHOR sheet confirms Kelli Milligan Stammen aliases, but this pass did not find a direct title-author row tying the title to Kelli Milligan Stammen. |
| The Great Hair Restart: The Journal | Karen Hill | JM Works | NEEDS_JACKIE_REVIEW | MONTHLY REPORTING POD confirms `The Great Hair Restart: The Journal` by Karen Hill, but no existing PROGRAM-002 title record/id was found for the Journal edition. This likely requires asset/title relationship reconciliation before certification. |

## Health Impact

| Metric | After Batch 1 | After Reconciliation |
| --- | ---: | ---: |
| Imprint Certified | 81/122 (66.39%) | 90/122 (73.77%) |
| Publisher Imprint Review Queue | 40 | 31 |
| JM Signature Review Queue | 1 | 1 |
| Overall Enterprise Health | 62.33% | 64.38% |

## Execution Log

The following event types were prepared for every resolved exception:

- `IMPRINT_PUBLISHER_APPROVED`
- `IMPRINT_LOCKED`

Dataverse writeback was not attempted from this local session because no reachable Dataverse write environment variables were present. The prepared payloads are retained in:

- `data/oe001-publisher-imprint-batch-1-execution-log-payloads.json`

## Next Publisher Action

Jackie should decide the three unresolved exceptions. After that, Cody can apply the remaining certifications and update Enterprise Health again.
