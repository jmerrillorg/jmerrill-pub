# Indomitable Payment and Agreement Readback

Last Verified: 2026-08-24T20:31:48Z

## Opportunity

| Field | Value |
| --- | --- |
| Opportunity | `455daa4a-629f-f111-b8dc-6045bdd69678` |
| Name | Indomitable - Professional Publishing Package - Quanisha Dockery |
| Author | Quanisha Dockery |
| Contact | `5bb796dc-cd95-f111-8076-7c1e525b15c2` |
| Author email | `quanishadockery7777@gmail.com` |
| Package | `JMP-PKG-PRO` |
| Payment option | `TWENTY_FOUR_PAYMENTS` |
| Selected payment amount | `$209.06` |
| Selected payment total | `$5,017.50` |
| First payment status | Paid Confirmed |
| First payment confirmed on | `2026-08-24T13:55:39Z` |
| Agreement preparation status | `AGREEMENT_SIGNED_ACTIVE` |

## Agreement Sent Manually Count

| Measure | Count |
| --- | ---: |
| AGREEMENT_SENT_MANUALLY_TOTAL_EVENTS | 1 |
| CANONICAL_EVENT_COUNT | 1 |
| ACTUAL_DUPLICATE_EVENT_COUNT | 0 |

Canonical event:

| Field | Value |
| --- | --- |
| Execution log | `0ef9f3b5-bb9f-f111-b8dc-6045bdd69435` |
| Name | `AGREEMENT-SENT-MANUALLY-455daa4a-629f-f111-b8dc-6045bdd69678` |
| Completed on | `2026-08-24T11:44:34Z` |

## Agreement Fully Executed Event

| Field | Value |
| --- | --- |
| Execution log | `452ffd4d-b99f-f111-b8dc-00224820105b` |
| Name | `AGREEMENT-FULLY-EXECUTED-455daa4a-629f-f111-b8dc-6045bdd69678` |
| Completed on | `2026-08-24T12:03:33Z` |

## Payment Event

| Field | Value |
| --- | --- |
| Execution log | `b6fbef7b-c39f-f111-b8dc-000d3a14673b` |
| Name | `INITIAL-PAYMENT-CONFIRMED-455daa4a-629f-f111-b8dc-6045bdd69678-pi_3U7xLSJCiOVFpgYu1ABnQR6G` |
| Completed on | `2026-08-24T13:55:39Z` |
| PaymentIntent | `pi_3U7xLSJCiOVFpgYu1ABnQR6G` |
| Invoice | `in_1U7xLRJCiOVFpgYu1SKo9kgC` |
| Invoice number | `QXKWX2LC-0001` |

## Defect State Before Repair

The production replay recorded `JOINED_THE_FAMILY_BLOCKED` because no structured signed contract row was found. That classification was incomplete because the governed `AGREEMENT_FULLY_EXECUTED` execution event existed for the same opportunity.

