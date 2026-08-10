# JM1 Publishing Real-Title Pilot Governance v1.0

Classification: CANONICAL PILOT GOVERNANCE AFTER MERGE
Jackie rulings applied: 2026-08-09
Implementation authority: TITLE-SCOPED PILOT PREPARATION ONLY
Live activation authority: NO
Client-title automation: PARTIALLY THAWED ENTERPRISE-WIDE / TITLE-SCOPED PILOT NOT YET LIVE

## Purpose

This governance standard controls the first bounded real-title pilot after completion of the six-tranche Publishing implementation program.

## Scope

The pilot may prepare shadow and assisted validations for exactly one selected real title. It may not send author communications, activate marketing journeys, post to Business Central, move Stripe money, submit distribution, order author copies, charge annual fees, process royalties, authorize corrections, retire titles, revert rights, or thaw automation globally.

## Pilot Selection Rule

One title may be recommended only when it has no RED criterion and minimal YELLOW criteria. PR #431 manual-recovery titles are presumed excluded unless a separate executive ruling reverses the exclusion.

## Required Pilot States

Allowed states are FROZEN, INTERNAL_ONLY, SHADOW_MODE, ASSISTED, LIMITED_LIVE, CONTROLLED_LIVE, and SUSPENDED. This preparation package authorizes only INTERNAL_ONLY, SHADOW_MODE, and ASSISTED preparation unless Jackie separately authorizes a title-scoped live step.

## Selected Pilot

Recommended first pilot: The Intentional Leader / JMP-INT-202607-0W5PTQ

Risk: MODERATE

Pilot 1 readiness: PILOT READY FOR LIMITED LIVE ACTIVATION
Pilot 1 activation: NOT ACTIVATED

## Jackie Rulings Applied

Campaign Service candidates: APPROVED 2 / 2.

Approved Campaign Service SKUs:

- JMP-MKT-ARC - ARC Campaign Management
- JMP-MKT-PAID-SOCIAL-SETUP - Paid Social Ad Setup

Hybrid Marketing Disclosure: APPROVED / GOVERNED.

Attorney review: NOT REQUIRED BY JACKIE RULING - 2026-08-09.

Pilot gaps: ALL RULED / ACCEPTED FOR PILOT.

Wave C decisions: APPROVED 5 / 5.

Enterprise-wide blanket Wave C activation: NO.

## Title-Scoped Activation Principle

The approved Wave C decisions apply only to The Intentional Leader / JMP-INT-202607-0W5PTQ until Jackie approves another title. Pilot title state must be distinguished from enterprise default state in evidence and operator surfaces.

## Spend Authorization Separation

SKU available does not mean campaign authorized. Budget configured does not mean spend authorized. Wave C approved does not mean spend authorized.

Hybrid author-owned spend requires author approval. Traditional/JM Signature JMP-owned spend requires Jackie approval. Shared spend requires author and Jackie approval.

## Pilot Activation Prerequisite

The next governed action is Jackie review of the Pilot 1 Launch Card. This governance package stops before the first real external pilot action.

## Pilot PR Lifecycle Governance

Bounded pilot pull requests must not remain open after their operational role has been overtaken by later canonical evidence.

Readiness pull requests follow this lifecycle:

1. READINESS PR
2. Action authorized
3. EXECUTION PR
4. Observation or remediation
5. Canonical evidence established
6. Readiness PR closed as SUPERSEDED

Execution evidence pull requests follow this lifecycle:

1. EXECUTION EVIDENCE PR
2. Unique-evidence check
3. If unique evidence is required, merge the PR
4. If later canonical evidence fully supersedes it, close the PR as SUPERSEDED

Historical PRs are never deleted. Their comments, branches, commits, and discussion remain preserved as historical evidence even when the PR is closed without merge.

## Pilot PR Closeout Metadata

Every future pilot readiness or execution PR must include lifecycle metadata:

- Lifecycle status: ACTIVE, SUPERSEDED, MERGED / CANONICAL, or CLOSED / HISTORICAL
- Superseded by: PR number, merge SHA, or canonical evidence package when applicable
- Current authority: whether the PR is current operating authority, historical readiness evidence, or canonical evidence after merge
- Send/activation boundary: whether the PR authorizes an external send, response clock, marketing activation, distribution action, financial action, or none

When a readiness PR is superseded by later execution, observation, or remediation evidence, the readiness PR must receive a final closeout comment and be closed without merge unless its evidence is not otherwise preserved.

## Kill Switches

All live-capable paths must have an explicit disable control before use. When a stop criterion fires, the pilot moves to SUSPENDED and manual production remains controlling.

## Evidence

Controlling evidence package: docs/operations/generated/JMP-REAL-TITLE-PILOT-SELECTION-2026-08-09
