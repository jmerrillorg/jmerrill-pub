# Current Waiting/Timer Dependency Map

Last verified: 2026-09-01T13:41:15.672Z

| Input | Current semantics | Consumer | Authority status | Known failure mode | Replacement authority |
|---|---|---|---|---|---|
| stageTruth.blockingTransition | Current outstanding governed transition | canonical waitingTruth | AUTHORITATIVE | None after Wave 3 | Blocking transition from governed stage truth |
| stageTruth.blockingPartyClass | Responsible party implied by transition | canonical waitingTruth | AUTHORITATIVE WHEN BLOCKED | Prior raw owner fields could override | Transition-derived waiting party |
| input.nextAction | Explicit surfaced work item/action | canonical waitingTruth | SUPPORTING | Could be stale if no current authority | Used only after current authority gate |
| input.owner / input.awaiting | Legacy owner hints | canonical waitingTruth fallback | NON-AUTHORITATIVE ALONE | Waiting On mismatch baseline 11 | Mapped only when explicit action evidence exists |
| input.waitingStartedAt | Responsibility-transfer timestamp | canonical waitingTruth timer | AUTHORITATIVE WHEN EVENT-NAMED | Was absent from prior model | Required for trusted timer |
| input.ageDays | Raw age display | legacy UI/metrics | NOT TIMER AUTHORITY | Timer semantic error baseline 381 | Never used as timer fallback |
| CreatedOn / ModifiedOn | Dataverse row timestamps | legacy derivations | NOT TIMER AUTHORITY | Fabricated active wait duration | Prohibited unless independently the wait-start event |
