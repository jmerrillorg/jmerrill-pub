# INT-PUB-005 Pre-Milestone 9 Gate Completion Pass

## Purpose

This pass completes the governed readiness layer for the gates that must precede Milestone #9 Launch Readiness:

- BP-06 AI Disclosure Capture
- BP-09 Cover Validation
- BP-10 Release Lock

Milestone #9 Launch Readiness is modeled only after those three gates are ready. This pass does not start public launch/release work.

## Gate Defaults

| Gate | Default | Purpose |
| --- | --- | --- |
| `JM1_AI_DISCLOSURE_CAPTURE_ENABLED` | `false` | BP-06 disclosure capture automation |
| `JM1_COVER_VALIDATION_ENABLED` | `false` | BP-09 cover validation automation |
| `JM1_RELEASE_LOCK_ENABLED` | `false` | BP-10 release-lock automation |
| `JM1_LAUNCH_READINESS_ENABLED` | `false` | Milestone #9 launch-readiness automation |
| `JM1_MARKETING_AGENT_ENABLED` | `false` | Future BP-12 marketing agent |

Readiness models can evaluate governed state. They do not enable live/public execution.

## BP-06 AI Disclosure Capture

Canon source:

- `JMP-FLOW-BP06-AIDisclosureCapture-v1_0.md`

Readiness rule:

1. Manuscript received.
2. AI disclosure status is `RECORDED`.
3. AI disclosure percentage is a valid number from 0 to 100.
4. AI disclosure portions are present.
5. `JM1_AI_DISCLOSURE_CAPTURE_ENABLED=true` for live processing.

Important canon behavior:

- `0%` with `None declared` is a complete disclosure.
- File-first and form-first orders are both valid.
- Missing disclosure is a warm route-back process gap, not a manuscript judgment.
- Reminder cadence is day 0, day 3, day 7 with Jackie escalation at day 7.
- Over-cap advisory is internal-only and never gates the author or sends author ACS.
- Legacy projects are excluded.

Schema targets on `jm1_project`:

- `jm1pub_manuscriptreceived`
- `jm1pub_manuscriptreceiveddate`
- `jm1pub_manuscripturl`
- `jm1pub_aidisclosurestatus`
- `jm1pub_aidisclosurepct`
- `jm1pub_aidisclosureportions`
- `jm1pub_aidisclosureurl`
- `jm1pub_aidisclosuredate`
- `jm1pub_overcapadvisory`

This pass prepares evidence only. It does not send disclosure reminders or breach language.

## BP-09 Cover Validation

Canon source:

- `JMP-FLOW-BP09-CoverValidation-v1_0.md`

Readiness rule:

1. Title production specs are present.
2. ISBN is available for print barcode validation.
3. Print cover status is `VALIDATED`.
4. Digital cover status is `VALIDATED`.
5. `JM1_COVER_VALIDATION_ENABLED=true` for live processing.

Important canon behavior:

- Both print and digital covers are required.
- Partial pass is never allowed.
- Validation is deterministic measurement, not aesthetic judgment.
- Spine tolerance is `+/- 1/16 inch`.
- Missing specs, missing ISBN, failed inspection, or engine failure fail loudly and do not pass.
- Legacy titles are excluded.

Schema targets on `jm1pub_title`:

- `jm1pub_printcoverstatus`
- `jm1pub_digitalcoverstatus`
- `jm1pub_printcoverurl`
- `jm1pub_digitalcoverurl`
- `jm1pub_g4apassed`
- `jm1pub_g4adate`
- `jm1pub_covervalidationreport`
- `jm1pub_coverfailreasons`
- `jm1pub_trimsize`
- `jm1pub_pagecount`
- `jm1pub_paperstock`
- `jm1pub_trimsizecustom`

This pass does not inspect assets, write live G4a, submit distribution, or start release lock.

## BP-10 Release Lock

Canon source:

- `JMP-FLOW-BP10-ReleaseLock-v1_0.md`

Readiness rule:

1. G4a passed.
2. Payment status is `PAID_IN_FULL_CLEARED`.
3. Jackie-set proposed release date is present.
4. Release is not already locked.
5. `JM1_RELEASE_LOCK_ENABLED=true` for live processing.

Important canon behavior:

- Cleared funds are distinct from received payment.
- Jackie is the Phase A authority for cleared funds and proposed release date.
- The flow locks a Jackie-set date; it never invents one.
- Marketing date gate opens only after release lock.
- Author release confirmation requires the actual locked date; no placeholder send.
- Override requires Jackie and an override reason.
- Legacy titles are excluded.

Schema targets on `jm1_project` / `jm1pub_title`:

- `jm1pub_paymentstatus`
- `jm1pub_releasedate`
- `jm1pub_releaselocked`
- `jm1pub_g4bpassed`
- `jm1pub_g4bdate`
- `jm1pub_marketingdategate`
- `jm1pub_releaseoverridereason`

This pass does not lock a release date, open the marketing date gate live, trigger distribution, or send release confirmation.

## Milestone 9 Launch Readiness

Canon sources:

- `JMP-FLOW-BP11-LaunchReadiness-v1_0.md`
- `JMP-AGENT-BP12-MarketingAgent-v1_0.md`
- `jm1-author-book-marketing-SKILL.md`
- `jm1-publishing-marketing-SKILL.md`
- `jm1-publishing-strategist-SKILL.md`
- `publishing-strategy.md`
- `blog-editorial.md`

Milestone #9 launch readiness may only pass after BP-06, BP-09, and BP-10 are ready.

Launch readiness also requires:

- author marketing kit complete
- author page ready
- comp copy plan ready
- launch copy human-approved
- `JM1_LAUNCH_READINESS_ENABLED=true`
- `JM1_MARKETING_AGENT_ENABLED=false` for this readiness pass

Readiness prepares safe evidence and internal visibility to:

- `publishing@jmerrill.one`

It does not:

- set a public release date
- send launch email
- schedule a public campaign
- activate the marketing agent
- submit to retailers
- create royalty setup
- start post-release work

## Implementation

The implementation is:

`azure-functions/diagnostic-ai-runner/src/launch/preMilestone9GateCompletion.js`

Focused tests are:

`azure-functions/diagnostic-ai-runner/test/preMilestone9GateCompletion.test.js`

## Boundary Confirmation

This pass does not activate Flow D, does not run diagnostics, does not send author-facing output, does not create Opportunity, does not use QBO, does not use `@jmerrill.pub` as an active mailbox, and does not commit secrets.
