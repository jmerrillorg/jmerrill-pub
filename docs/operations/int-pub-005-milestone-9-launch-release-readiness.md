# INT-PUB-005 Milestone 9 Launch / Release Readiness

## Purpose

Milestone #9 prepares a title for launch/release readiness without publishing, launching, submitting to retailers, starting royalties, or beginning post-release work.

The system evaluates readiness as a governed state and prepares safe evidence for human review.

## Source Authority

- `JMP-FLOW-BP11-LaunchReadiness-v1_0.md`
- `JMP-AGENT-BP12-MarketingAgent-v1_0.md`
- `jm1-author-book-marketing-SKILL.md`
- `jm1-publishing-marketing-SKILL.md`
- `jm1-publishing-strategist-SKILL.md`
- `blog-editorial.md`
- `publishing-strategy.md`
- `JMP-PIPELINE-BLUEPRINT-v1_0.md`
- `JMP-COMMAND-CENTER-MANIFEST-v1_0.md`
- `JMP-FLOW-BP10-ReleaseLock-v1_0.md`
- `JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md` for boundary awareness only

Milestone #10 is not started by this pass.

## Required Gates

All gates default to `false` unless separately authorized:

| Gate | Default | Purpose |
| --- | --- | --- |
| `JM1_AI_DISCLOSURE_CAPTURE_ENABLED` | `false` | BP-06 AI disclosure readiness |
| `JM1_COVER_VALIDATION_ENABLED` | `false` | BP-09 cover validation readiness |
| `JM1_RELEASE_LOCK_ENABLED` | `false` | BP-10 release lock readiness |
| `JM1_LAUNCH_READINESS_ENABLED` | `false` | BP-11 / Milestone #9 launch-release readiness |
| `JM1_MARKETING_AGENT_ENABLED` | `false` | BP-12 marketing agent; must remain inactive |

Readiness may be modeled with explicit test inputs, but live/public execution remains blocked unless every title-specific approval and release gate passes.

## Milestone #9 Dependencies

Milestone #9 launch/release readiness requires:

1. Production readiness complete.
2. Editorial command center status complete or production handoff approved.
3. Distribution setup readiness complete.
4. BP-06 AI Disclosure Capture passed or not applicable.
5. BP-09 Cover Validation passed.
6. BP-10 Release Lock passed.
7. Title metadata final confirmation.
8. Final file readiness confirmation.
9. Launch messaging human approval.
10. Author approval or Jackie-approved waiver.
11. Final publisher approval.
12. `JM1_LAUNCH_READINESS_ENABLED=true`.
13. `JM1_MARKETING_AGENT_ENABLED=false`.

No launch/release readiness may pass unless release lock is satisfied. Release lock cannot be bypassed.

## BP-11 Launch Readiness Behavior

BP-11 uses the canon four-green launch-readiness check:

| Condition | Required State |
| --- | --- |
| Marketing Kit | Complete, with all ten standard items present at expected paths |
| G4b Release Lock | `jm1pub_releaselocked` = yes and `jm1pub_releasedate` present |
| Comp Copies | `jm1pub_compcopystatus` = Dispatched or Delivered |
| Author Page | `jm1pub_authorpagestatus` = Live and URL reachable |

Partial readiness never passes. The readiness card is itemized and must name specific missing kit items or failed conditions.

The ten standard kit items are:

- author one-sheet
- back cover copy variants
- Amazon product description
- Goodreads description
- author bio variants
- five-post social launch package
- comp title list
- press release template
- core assets
- Author Activation Kit insert

Presence at expected path is the readiness check. Content quality and voice approval remain human/marketing review responsibilities.

## Release Readiness Behavior

Release readiness confirms:

- BP-10 release lock passed
- locked release date is present
- marketing date gate is open
- final files are ready
- distribution setup is complete
- final publisher approval exists

This pass does not set or announce a public release date. It only evaluates whether the date-lock dependency has been satisfied.

## BP-12 Marketing Agent Readiness

BP-12 is scaffolded for readiness only:

- agent id: `jm1-agent-pub-marketing-01`
- Lane A author/book marketing kit: scaffolded inactive
- Lane B brand marketing: scaffolded inactive and requires separate Jackie registry action
- confidence threshold: 80%
- human review required for every deliverable
- no autonomous external communication
- no public posts, ads, scheduler writes, or author/public emails

The marketing agent gate must remain false during this readiness pass.

## Dataverse Tables / Fields

Existing Dataverse sources remain preferred:

- existing Opportunity
- `jm1_publishingtasks`
- `jm1_executionlogs`
- `jm1pub_editorialstage`
- production readiness model
- distribution readiness model
- Pre-Milestone #9 gate model

Proposed or expected title fields:

- `jm1pub_kitstatus`
- `jm1pub_kitmissingitems`
- `jm1pub_compcopystatus`
- `jm1pub_authorpagestatus`
- `jm1pub_authorpageurl`
- `jm1pub_launchready`
- `jm1pub_launchreadydate`
- `jm1pub_releaselocked`
- `jm1pub_releasedate`
- `jm1pub_marketingdategate`
- `jm1pub_titlemetadatafinalstatus`
- `jm1pub_finalfilereadinessstatus`
- `jm1pub_distributionreadinessstatus`
- `jm1pub_launchmessagingstatus`
- `jm1pub_marketingreadinessstatus`
- `jm1pub_authorapprovalstatus`
- `jm1pub_publisherapprovalstatus`

If any launch/release field is not present in Dataverse, the implementation treats it as a schema confirmation item before live activation. This PR does not require live schema writes.

## Task / Status Model

Task payloads target `jm1_publishingtasks` and remain payloads only until a separate live task-write authorization exists.

Milestone #9 task paths:

- launch readiness checklist
- release readiness checklist
- title metadata final confirmation
- final file readiness confirmation
- distribution readiness confirmation
- launch messaging approval
- marketing readiness review
- author and publisher approval
- internal visibility review
- post-release stop review

All tasks are created as incomplete payloads and are not written to Dataverse by this readiness model.

## Internal Visibility

Internal visibility uses:

- `publishing@jmerrill.one`

Internal notification payloads are safe previews only. They do not include manuscript text, prompt body, raw model output, provider responses, credentials, tokens, headers, cookies, or secrets.

## Execution Log Evidence

Safe execution-log payloads target:

- `jm1_executionlogs`

The log description records:

- intake reference
- existing Opportunity usage
- readiness permitted yes/no
- itemized blockers
- explicit non-actions

## Explicit Non-Actions

Milestone #9 readiness does not:

- publish a title
- submit to retailers
- set or announce public release date
- send launch email
- send public marketing campaign
- activate the marketing agent
- write scheduler entries
- create royalty setup
- start post-release management
- start annual review or loyalty progression
- activate Flow D
- run diagnostics
- create duplicate Opportunity
- use QBO
- use `@jmerrill.pub` as an active mailbox
- expose or commit secrets

## Implementation

Implementation:

`azure-functions/diagnostic-ai-runner/src/launch/milestone9LaunchReleaseReadiness.js`

Focused tests:

`azure-functions/diagnostic-ai-runner/test/milestone9LaunchReleaseReadiness.test.js`
