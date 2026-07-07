# OE-001 - Publisher Imprint Certification Decision Packet

**Initiative:** JM Publishing Operational Excellence  
**Workstream:** 1 - Publisher Imprint Certification  
**Status:** Publisher Decision Gate  
**Date:** 2026-07-07  
**Primary Sources:** PAM-001 / EOP-001 title-level imprint queue, Enterprise Imprint Canonization output, PROGRAM-002 adoption state  

## Executive Summary

Workstream 1 is ready for Publisher decisions. The remaining queue contains 43 Publisher-review titles plus 1 JM Signature review title.

This packet does not use `books.json` as governing authority. Legacy catalog values remain evidence only. The decision set below is title-level imprint certification for PROGRAM-002; it should not overwrite historical published imprint fields unless a separate schema explicitly separates historical imprint from certified PROGRAM-002 imprint.

## Decision Model

After Jackie approves a decision, the operational path is:

1. Apply the certified PROGRAM-002 imprint value.
2. Lock the imprint.
3. Write `IMPRINT_PUBLISHER_APPROVED`.
4. Write `IMPRINT_LOCKED`.
5. Update Enterprise Health.

No contracts, royalties, Stripe, Business Central, production, distribution, or author communications are touched by this workstream.

## Grouped Publisher Recommendations

### Group A - Approve and Lock J Merrill Publishing

**Count:** 30 titles  
**Proposed decision:** Certify the recommended imprint as `J Merrill Publishing` for all listed titles.

| Title | Author | Current Published Imprint | Confidence |
| --- | --- | --- | ---: |
| A Little Bit of Everything | Carolyn Booker-Pierce | J Merrill Publishing | 0.20 |
| A Truebies Guide, Part 1 | Carolyn Booker-Pierce | J Merrill Publishing | 0.20 |
| A Truebies Guide, Part 2 | Carolyn Booker-Pierce | J Merrill Publishing | 0.20 |
| Abortion! | Toni Kleckley | J Merrill Publishing | 0.20 |
| Aligned! | Alesia True Corpening | J Merrill Publishing | 0.20 |
| Because the Lord Is My Shepherd | Rodney Waller | J Merrill Publishing | 0.36 |
| Connected! | Alesia True Corpening | J Merrill Publishing | 0.20 |
| Delicious Ideas! | Pamela Smith | J Merrill Publishing | 0.20 |
| Department of the Air Force: Mission Driven Leadership | Jackie Smith, Jr. | J Merrill Publishing | 0.20 |
| Destined to Break the Curse Devotional | Sean Smith, Sr. | J Merrill Publishing | 0.36 |
| Divinely Inspired | Tekisha Wimbush | J Merrill Publishing | 0.20 |
| For What It's Worth | Ericka Thornton | J Merrill Publishing | 0.20 |
| Girl, You're Not Crazy. You're Dealing with a Narcissist | Carolyn Booker-Pierce | J Merrill Publishing | 0.20 |
| Grandmothers Educating Minds, 2nd Edition | M. Darlene Carson | J Merrill Publishing | 0.20 |
| Have You Considered My Servant? | Obadiah E. Harris | J Merrill Publishing | 0.24 |
| Inner Peace Through Life's Storms | Rosetta Perry | J Merrill Publishing | 0.20 |
| Just What I Needed | Gloria Patterson | J Merrill Publishing | 0.20 |
| Love Is An Action Word | Dennis Brown | J Merrill Publishing | 0.20 |
| More Than A Village | Shelley McIntosh | J Merrill Publishing | 0.20 |
| Music Ministry Unplugged | Dr. Will Harris | J Merrill Publishing | 0.24 |
| Seasons of Life | Diane Johnson | J Merrill Publishing | 0.20 |
| The Doctrine of Last Things | Lyle Goddard | J Merrill Publishing | 0.20 |
| The Fight for the Promiseland | Cheryl Cook | J Merrill Publishing | 0.20 |
| The Flame | Veronica Brown | J Merrill Publishing | 0.20 |
| The I Am in Me Part 2 | Edith Clay | J Merrill Publishing | 0.20 |
| The Messenger 2 | Thaddues Smith | J Merrill Publishing | 0.20 |
| The Sun, the Shadow, and the Silence | Nicky Williams | J Merrill Publishing | 0.20 |
| Understanding the Misunderstood | Tia Benincase | J Merrill Publishing | 0.20 |
| When Zuri Came to Earth | Jaylonna Stevette | J Merrill Publishing | 0.20 |
| Why Faith Works For Some And Not For Others | Nathaniel Short | J Merrill Publishing | 0.24 |

### Group B - Approve and Lock JM Little

**Count:** 5 titles  
**Proposed decision:** Certify the recommended imprint as `JM Little` for all listed titles.

| Title | Author | Current Published Imprint | Confidence |
| --- | --- | --- | ---: |
| My ABC's | Jaylonna Stevette | JM Little | 0.24 |
| The Girl with the Ebony Locs and the Three Bears | Deborah Eiland | JM Little | 0.24 |
| The Little Girl with the Plow! | Deborah Eiland | JM Little | 0.36 |
| The Never Before Told Story of the Gelatin Monster | Maurché Reed | JM Little | 0.20 |
| The Princess and the Black-Eyed Pea | Deborah Eiland | JM Little | 0.24 |

### Group C - Approve and Lock JM Works

**Count:** 5 titles  
**Proposed decision:** Certify the recommended imprint as `JM Works` for all listed titles.

| Title | Author | Current Published Imprint | Confidence |
| --- | --- | --- | ---: |
| Damaged | Taye Knox | JM Works | 0.24 |
| From Stylist to CEO | Kelli Milligan Stammen | JM Works | 0.24 |
| Taylor Made | Eryonna Barrino | JM Works | 0.20 |
| The Paper Champ | Kurt Broadnax | JM Works | 0.24 |
| War Mother | Winter Dockery | JM Works | 0.20 |

### Group D - Approve and Lock JM Verse

**Count:** 1 title  
**Proposed decision:** Certify the recommended imprint as `JM Verse`.

| Title | Author | Current Published Imprint | Confidence |
| --- | --- | --- | ---: |
| The Essence of Life, Love Letters to Christ | Janet Stephens | JM Verse | 0.24 |

## Individual Publisher Decisions Required

These titles cannot be group-approved because the current published imprint is missing and the recommendation remains unresolved.

| Title | Author | Current Published Imprint | Recommended Imprint | Required Decision |
| --- | --- | --- | --- | --- |
| Girl, Did You Know...? | Kimberly Reeder | Missing | Unresolved | Jackie must select the certified PROGRAM-002 imprint. |
| The Conquest of Azenga | Iyorwuese Hagher | Missing | Unresolved | Jackie must select the certified PROGRAM-002 imprint. |

## JM Signature Review

JM Signature remains invitation-only and requires explicit Publisher decision.

| Title | Author | Current Published Imprint | Recommended Imprint | Confidence | Required Decision |
| --- | --- | --- | --- | ---: | --- |
| A Portrait of Paradise | Iyorwuese Hagher | JM Signature | JM Signature | 0.50 | Jackie must decide whether to keep the current imprint or certify/promote as JM Signature under current canon. |

## Recommended Approval Motion

Jackie may approve the grouped recommendations by saying:

> Approve Groups A-D as recommended. For Girl, Did You Know...?, certify [imprint]. For The Conquest of Azenga, certify [imprint]. For A Portrait of Paradise, [keep current imprint / certify JM Signature].

After that approval, Cody may apply the approved certified imprint statuses, lock the titles, write execution-log events, and update Enterprise Health.

## Current Stop Condition

This workstream is at a Jackie business-decision gate. No production systems were modified by this packet.
