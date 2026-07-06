# J Merrill Publishing Enterprise Operations Dashboard

**Program:** PROGRAM-002  
**Operating Mode:** Enterprise Optimization  
**Dashboard:** EOP-001  
**Status:** Active - Author roster health provisional
**Date:** 2026-07-06  

## Executive Summary

Enterprise Coverage is complete at 100% as an adoption milestone. Author-roster health is provisional because the prior 71-author count was derived from `data/books.json`, which is legacy evidence only. Optimization now begins with source-of-truth correction before imprint review continues.

**Overall Enterprise Health:** 41.47%

## Health Metrics

| Metric | Value | Count | Note |
| --- | --- | --- | --- |
| Coverage | 100.00% | 122/122 | Enterprise Adoption complete; retained as historical baseline, no longer the primary KPI. |
| Imprint Certified | 63.93% | 78/122 | Locked/certified imprints after auto-locks and Wave 3 Publisher decisions. |
| Contracts Linked | 0.00% | 0/122 | Historical contracts are marked Signed / Exists - Location Pending Reconciliation. |
| Stripe Ready | Provisional | 0/provisional | Requires canonical Dataverse Contact roster before denominator is trusted. |
| Royalty Ready | Provisional | 0/provisional | Requires canonical Dataverse Contact/title roster before denominator is trusted. |
| Metadata Complete | 98.36% | 120/122 | Two titles remain unresolved for imprint metadata evidence. |
| Workspace Complete | 100.00% | 72/72 | All adopted authors/titles have PROGRAM-002 workspace coverage. |
| Author Success Active | Provisional | 0/provisional | Requires canonical Dataverse Contact roster before denominator is trusted. |

## Optimization Queues

| Queue | Remaining | Workstream |
| --- | --- | --- |
| Publisher Imprint Review | Paused | Workstream 1 |
| JM Signature Review | 1 | Workstream 2 |
| Contract Reconciliation | 122 | Workstream 3 |
| Stripe Migration | 71 | Workstream 4 |
| Royalty Automation Readiness | 71 | Workstream 5 |

## Remaining Publisher Decisions

Publisher imprint review is paused. The prior 43-title packet must not be used for governance until title/author relationships are rebuilt from Dataverse Contacts, `jm1pub_title`, and governed evidence.

## Source-of-Truth Gap

See `EOP-001-Author-Title-Source-of-Truth-Gap-Report.md`.

## Remaining JM Signature Reviews

| Title | Author | Current Published Imprint | Recommended Imprint | Required Decision |
| --- | --- | --- | --- | --- |
| A Portrait of Paradise | Iyorwuese Hagher | JM Signature | JM Signature | Publisher JM Signature decision required |
