# 17 - Operating Center Gap Analysis

## Current Strength

`lib/server/publisher-operating-center.ts` is already close to the desired read-model surface: it reads intakes, titles, assets, editorial stages, approval gates, opportunities, diagnostics, logs, production projects, and production tasks; then projects queue, workload, portfolio, production command, author responses, Today, and title operating view.

## Current Gap

The Operating Center creates stage semantics from workload strings and row heuristics. It should consume canonical registry state instead.

## Required Fields

Publisher Operating Center target fields:

- canonical stage/substage;
- lifecycle dimension;
- waiting owner;
- system attention;
- next governed action;
- runtime readiness;
- evidence link;
- source row ids;
- blockers;
- owner and execution mode.

## Proposed Wave B Assertion

"The Operating Center consumes canonical lifecycle state without changing live title records."
