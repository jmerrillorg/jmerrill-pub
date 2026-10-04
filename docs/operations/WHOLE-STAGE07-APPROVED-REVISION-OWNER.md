# Whole Stage 07 approved revision owner

Packet: JMP-WHOLE-STAGE07-OWNER-INTEGRATION-002. This is a bounded deterministic
revision owner, not commissioning of general developmental editing or author
delivery. It consumes the existing Publishing task, exact Publisher disposition,
registered source and canonical byte-identical Pipeline A-Z copy. The original
and delivered v2 remain unchanged.

## Authority and scope

The pinned policy is `azure-functions/diagnostic-ai-runner/config/whole-stage07-approved-revision.json`.
No request can supply manuscript text, a replacement plan, alternate source,
title, publisher, decision or artifact ID. The existing global style guide,
title style sheet, voice profile, author rulings and developmental canon are
read and bound. Existing author rulings supply preferences for this approved
formatting-only scope; no general preference profile is invented. The Publisher
disposition is not final author approval.

Only 32 existing category headings receive spacing/keep-with-next properties;
eight final Core Components sentences receive a checkbox prefix. All eight
tables and original text/run formatting are retained. Review has 40 native Word
revisions; clean accepts only those revisions. No LLM call is needed for these
fixed instructions. New files are internal draft candidates, not current
approved manuscripts. Both package selection paths exclude this owner's
correlation marker, including if visibility drifts.

## Durable execution

Existing ten-minute editorial timer and targeted editorial queue invoke the
same owner. The broad `WORD_NATIVE_AUTHOR_DOCUMENT_NOT_COMMISSIONED` hold is
unchanged. No new stage event, pipeline, worker or communication owner exists.

The existing private `agentic-audit` container holds
`publishing/editorial-revisions/v1/<taskId>/`. A renewable 60-second blob lease
serializes execution. Intent binds policy/authority hashes before generation.
One immutable generated envelope contains both variants and the internal
manifest, allowing a restart after any partial storage write. Source authority
is reread before external persistence. SharePoint uses conflict-fail upload
sessions and exact-byte readback; Dataverse registrations use deterministic
IDs. A timeout recovers forward by readback, never a replacement file or ID.
Receipt is canonical completion evidence even if the final state write failed.

Transient failures use persisted exponential backoff (2, 4, 8, 16 minutes;
five attempts maximum), evaluated on the existing timer. Authority conflicts
hold; exhaustion holds. Lease expiry permits a new claim, not authority bypass.
Failures are retained with safe codes and emitted through existing Function
telemetry. There is no chat-triggered reset or silent destructive rollback.

## Protected release and acceptance

1. Validate PR #906 and merge through normal repository controls. Use only its
   resulting canonical protected Function deployment; do not deploy a PR merge
   ref or reuse an older protected run. Human environment approval remains required.
2. Verify health release SHA against the protected artifact manifest. Read current
   task, disposition, source hashes and author gates. Verify private audit storage.
3. With execution still disabled, call the existing key-authenticated targeted
   route with only `revisionTaskId` and `executionMode: DRY_RUN`. Require exact
   seven-source binding, eight grids, 32 headings, eight checkbox targets and zero
   artifact writes. Missing access is a hold, not permission to broaden credentials.
4. Under the approved bounded activation, set
   `JM1_APPROVED_EDITORIAL_REVISION_TASK_ID=f369abf6-a3ec-5346-a12b-c3bd44f29dfb`
   and `JM1_APPROVED_EDITORIAL_REVISION_ENABLED=true`. Only this task can execute.
   Observe the existing timer or enqueue the existing task through the same route
   using `EXECUTE_ASYNC`. Do not supply an edit plan or call the DOCX transformer
   locally on the real manuscript.
5. Independently read the durable receipt, both SharePoint files and two Dataverse
   registrations. Verify byte hashes, draft/internal status, original source
   preservation, unchanged task/author gates and zero sends/stage advancement.
6. Repeat receipt readback and normal owner dispatch: no new upload, artifact,
   generation or send. Download the exact produced versions, render both, inspect
   every page, and retain visual QA separately. Do not infer visual QA from XML.
7. Keep the task and author review pending. Separate delivery authorization and
   actual approval on the corrected version are outside this owner.

## Disable and recovery

Set only `JM1_APPROVED_EDITORIAL_REVISION_ENABLED=false` to stop new owner work;
readback and no-write dry run remain available. Inspect claims, intent, failure
and receipt before a recovery decision. Preserve all files/audit records, even
if only one output registered. Do not delete artifacts, release a live lease,
mark the task complete, advance Stage 07 or resend an author package. A protected
release rollback uses the existing last-known-good artifact process; it must not
erase successful business evidence. General workers, payments, identity and
other titles are not enabled or changed by this packet.

Tests prove synthetic behavior, not live commissioning. Real output and visual
QA remain unproven until the reviewed protected artifact is deployed and this
acceptance sequence succeeds.
