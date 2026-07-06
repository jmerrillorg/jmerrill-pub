# PROGRAM-002 Phase I Lessons Learned

Program: PROGRAM-002 - Autonomous Publishing Production Pipeline

Status: Phase I closeout artifact

## Summary

Phase I proved that the publishing pipeline can be commissioned through a live title while preserving governance. The most important lesson is that live commissioning reveals business-process truth faster than isolated design work, but only if the system is allowed to stop at true governance boundaries and repair adjacent defects cleanly.

## Lessons

### 1. Author-first copy matters as much as workflow correctness

The pipeline became more usable when internal command-center language was replaced with plain author-facing module language. Authors need to know where they are, why the step matters, and what comes next. They do not need to see implementation architecture.

### 2. `/join` must be treated as a required completion transaction

Intake is not complete simply because a row exists. The front door requires intake creation, acknowledgment, internal notice, workspace creation, manuscript handling, and safe failure behavior. False failures create duplicate submissions and author confusion.

### 3. Workspace lifecycle belongs before agreement generation

Contract generation depends on author-provided onboarding data. The Author Workspace must exist before contract execution, initially locked to setup modules and then unlocked after agreement + payment completion.

### 4. Package and imprint concepts must stay separate

Restoring Premier Publishing Package clarified package scope while preserving JM Signature as an imprint only. Packages define service scope. Imprints define editorial identity.

### 5. Transport providers are not systems of record

Stripe and SignNow are transport layers. Dataverse remains the operational record. SharePoint remains the file/workspace layer. This made provider work easier to govern.

### 6. Commissioning overrides must be scoped tightly

The $1.00 commissioning payment worked because it was tied only to The Intentional Leader and never became a general package price.

### 7. Evidence must be operational, not decorative

`jm1_executionlog` evidence was useful when diagnosing Stripe, SignNow, workspace unlock, and publisher-signature milestones. Event names should stay stable and meaningful.

### 8. Operational hygiene prevents drift

Merged branch cleanup, deployment validation, and documentation closeout are part of the product. A messy environment creates friction and future uncertainty.

### 9. Incidental completion works when boundaries are respected

Fixing adjacent defects in the same movement reduced future manual work. The rule remained safe because it avoided unrelated systems, new architecture, money movement, public release, and business decisions.

### 10. Historical docs should remain, but closeout docs must identify current state

Earlier blocker reports are valuable evidence. They should not be rewritten as if blockers never existed. Closeout reports should supersede them by certifying the current state.

## Practices to Preserve

- Use a live commissioning title when the business path must be proven.
- Keep public release and financial action behind explicit gates.
- Prefer author-facing language in workspace routes.
- Keep Dataverse/SharePoint/provider responsibilities separate.
- Write safe execution-log evidence for meaningful transitions.
- Clean branches and stale deployments after merge.
- Treat old blocker docs as historical unless superseded by closeout.

## Risks to Watch in Phase II

- accidental public distribution while validating release readiness
- royalty/payment action before financial governance is complete
- workspace duplication for returning authors
- legacy title adoption creating duplicate evidence instead of certifying current state
- author-facing pages drifting back into implementation vocabulary

