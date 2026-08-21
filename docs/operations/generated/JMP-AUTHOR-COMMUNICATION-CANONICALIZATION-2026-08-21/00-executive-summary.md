# JMP Author Communication Canonicalization - Executive Summary

Last Verified: 2026-08-21T08:30:00Z

## Classification

AUTHOR_COMMUNICATION_CANON_CONTROLLED_COMMISSIONING

## Scope

This package records the P0 recovery and canonicalization of J Merrill Publishing outbound communication behavior for the governed ACS relay path.

## Result

The canonical relay now uses `publishing@email.jmerrill.one` for Publishing-owned ACS messages and `publishing@jmerrill.one` for reply capture. The `/join` author acknowledgment now renders branded HTML plus plain-text fallback, uses a human-first subject, keeps intake references in the body, and blocks prospect-stage Author Workspace links.

## Controlled Proof

Controlled internal test send `JMP-INT-202608-CANON02` was accepted by the ACS relay and delivered to the governed Publishing mailbox as the visibility copy.

| Field | Verified value |
|---|---|
| Subject | We Received Your Publishing Inquiry for New Book Test |
| Sender | J Merrill Publishing <publishing@email.jmerrill.one> |
| To | jm1-admin@jmerrill.one |
| CC | publishing@jmerrill.one |
| Body reference | JMP-INT-202608-CANON02 |
| Body format | HTML |
| Brand header | J MERRILL PUBLISHING / A Division of J Merrill One |
| CTA | Add Your Manuscript |

## Boundaries Preserved

- No duplicate acknowledgment was sent for `JMP-INT-202608-OZT8IO`.
- No real author-facing test was sent.
- No Gmail search was performed.
- No Dataverse, Business Central, Stripe, SharePoint, DNS, or mailbox mutation was performed beyond the authorized ACS relay deployment and controlled internal email sends.
- Azure Linux Consumption reintroduced `WEBSITE_RUN_FROM_PACKAGE` during zip deployment; the prior short-lived package URL was replaced by the current deployment package URL expiring in 2036 and the constraint is documented in this evidence package.
