# PROGRAM-002 Phase I Commissioning Report

Program: PROGRAM-002 - Autonomous Publishing Production Pipeline

Status: Phase I certified baseline

Commissioning title: The Intentional Leader

Reference: JMP-INT-202607-0W5PTQ

## Certification Scope

This report certifies the commissioned Phase I path from public `/join` through Active Publishing workspace unlock and Production Pipeline Commissioning Hold.

This is a closeout certification. It does not authorize new production logic, public release, royalties, Business Central posting, author payments, Stripe expansion, SignNow expansion, or workflow changes.

## Commissioned Gate Matrix

| Gate | Technical State | Business State | Operational State | Commissioning State |
| --- | --- | --- | --- | --- |
| `/join` | Governed production route | Operational front door | Live | Certified |
| Intake | Dataverse write + safe success path | Inquiry accepted | Operational | Certified |
| Contact | Linked/created through intake lifecycle | Party record established | Operational | Certified |
| Lead | Linked/created through intake lifecycle | Project inquiry represented | Operational | Certified |
| SharePoint Workspace | Canonical inquiry workspace created | Project workspace exists | Operational | Certified |
| Manuscript Upload | File/link support with workspace storage | Manuscript received for review | Operational | Certified |
| Editorial Review | Pre-package runner and run control | Review completed | Operational | Certified |
| Editorial Recommendation Letter | Canonical why-first renderer | Author recommendation sent | Operational | Certified |
| Package Recommendation | Recommended package rendered and persisted | Author received package path | Operational | Certified |
| Premier Publishing Package | Canon package restored at $7,500 | Selected package for title | Operational | Certified |
| Imprint Recommendation | Separate from package recommendation | Publishing identity preserved | Operational | Certified |
| Author Acceptance | Reply processed and persisted | Author accepted recommendation | Operational | Certified |
| Opportunity Creation | Existing governed Opportunity path | Business pipeline created | Operational | Certified |
| Author Workspace Invitation | Author-specific access path | Workspace invite sent | Operational | Certified |
| Pre-Contract Workspace | Locked setup surface | Onboarding before agreement | Operational | Certified |
| Author Onboarding | Submission and fallback repaired | Author setup captured | Operational | Certified |
| Stripe Connect | Split-key v1 Connect path | Recipient onboarding completed | Operational | Certified |
| Commissioning Payment | $1.00 scoped override | Initial payment confirmed | Operational | Certified |
| Agreement Domain | `jm1pub_contract` canonical | Agreement record active | Operational | Certified |
| Publisher Signature | Governed signature asset embedded | Publisher execution standard | Operational | Certified |
| SignNow Integration | API/webhook path operational | Agreement sent/signed | Operational | Certified |
| Agreement Execution | Signed agreement reflected in Dataverse | Legal relationship active | Operational | Certified |
| Author Status Activation | Contact author flag set | Author relationship active | Operational | Certified |
| Workspace Unlock | Agreement + payment unlock rule applied | Full workspace visible | Operational | Certified |
| Active Author Workspace | Author-facing modules gated | Active project workspace | Operational | Certified |
| Production Pipeline | Editorial through royalty-readiness surfaces | Production path visible | Operational to hold | Certified |
| Commissioning Hold | Distribution release blocked | No public release | Operational guard | Certified |

## Program Health

### Operational

- `/join` intake
- author acknowledgment
- internal notification
- SharePoint workspace creation
- manuscript upload/reference handling
- Editorial Review
- Editorial Recommendation Letter
- package selection and Premier package alignment
- Opportunity creation
- Author Workspace invitation/access
- onboarding capture path
- Stripe Connect commissioning path
- Stripe commissioning payment confirmation
- agreement generation
- publisher signature application
- SignNow send/signature/webhook evidence
- active author status
- full Author Workspace unlock
- author-facing production module visibility
- Commissioning Hold boundary

### In Progress

- Production execution beyond readiness
- distribution-release execution
- royalty reporting/automation
- post-publication author success
- legacy catalog adoption

### Blocked

- Public release without title-specific authorization
- retailer/Ingram submission without release approval
- royalty payments without royalty automation certification
- Business Central posting without financial commissioning

### Planned

- Distribution Release
- Royalty Automation
- Post-Publication Author Success
- OP-000 Catalog Adoption
- Legacy Author Workspace
- Returning Author Experience

### Retired

- Signature Publishing Package as a service package
- generic shared Author Workspace code as a long-term access model
- QBO as source for new billing/payment logic
- pre-contract-only Author Workspace as the active workspace model

## Author Experience Review

### Journey Evaluated

Join the Family -> inquiry acceptance -> manuscript handling -> Editorial Review -> recommendation -> acceptance -> workspace invitation -> onboarding/payment/agreement -> active workspace -> Commissioning Hold.

### Friction Observed and Addressed

- False `/join` failure after successful intake was repaired.
- Author acknowledgment branch was restored.
- Manuscript upload and workspace writeback were stabilized.
- Pre-contract workspace copy was simplified.
- Author Workspace session/access behavior was stabilized.
- Active workspace pages were changed from internal command-center language to author-first module copy.

### Remaining Friction

- The author still needs a clearer future path for what happens after Commissioning Hold.
- Stripe/royalty setup language should remain warm and low-friction as it expands beyond commissioning.
- Production module statuses are currently readiness-oriented; future Phase II work should connect them to live title-specific progress.

### Technical Leakage Review

The live Author Workspace modules were validated so author-facing surfaces do not expose Dataverse, SharePoint, execution-log, command-center, system-of-record, internal routing, or Business Central language.

### Human Tone Review

Areas that feel human:

- why-first Editorial Recommendation Letter
- Author Workspace landing page
- module pages that explain why each step matters
- direct publishing@jmerrill.one support cue

Areas to improve in Phase II:

- post-release support experience
- royalty statement explanations
- distribution/release education before public launch

## System Cleanliness Review

### Git

- PR #185 merged.
- merged feature branch deleted from origin.
- local commissioning worktree returned to `main`.

### Azure

- Static Web Apps production deployment succeeded from merge commit `abcaf53`.
- Diagnostic runner Function App deployment succeeded for SignNow/publisher-signature runtime updates.
- No production secrets were printed or committed.

### SharePoint

- Commissioning title workspace exists once under `00_Inquiry`.
- Agreement-preparation files are present.
- OP folder structure is present.
- Workspace has not moved past the documented movement gate.

### Dataverse

- Contract state is signed.
- Contact author flag is true.
- Opportunity package/payment/workspace/agreement status reflects commissioned state.
- Execution-log evidence exists for major commissioning gates.

### Power Automate

- Intake and notification paths are operational.
- No new workflow modification was performed during closeout.

### Documentation

- Phase I closeout docs now define the certified baseline and Phase II entry point.
- Older blocker reports remain historical evidence and should not be interpreted as current state unless superseding closeout docs are ignored.

## Program Metrics

| Metric | Value |
| --- | --- |
| Major commissioning PR range | #140 through #185 |
| Key merged commissioning PRs listed in closeout | 43 |
| Production deployment for closeout | Azure Static Web Apps run `28758881205` |
| Function routes added | SignNow webhook receiver plus agreement/Stripe/editorial HTTP routes from prior commissioning PRs |
| Dataverse agreement entity | `jm1pub_contract` |
| Execution-log event families | intake, editorial, recommendation, package, Stripe, agreement, workspace, production hold |
| Active workspace modules | 8 |
| Production routes validated live | 10 author/workspace routes |
| Current commissioning title status | Active Author Workspace; Production Pipeline visible; Distribution in Commissioning Hold |

## Key PR Evidence

| PR | Purpose | Merge commit |
| --- | --- | --- |
| #140 | OP-003 Author Portal MVP | `3da8612be2533414ddb16302957d4e42b8521476` |
| #141 | OP-003 operational certification | `5b359e8734de41da19646e76d119ad8466afa5d4` |
| #142 | Portal lifecycle and access correction | `4230dc37b1d68887ccc5331981570a37967ba381` |
| #145 | Pre-contract Author Workspace correction | `5c8e6aa7dfd978e25bd1e926fa67f39bad1e430e` |
| #148 | OP-005 Editorial Command Center | `bd56c2443dbce7d5045444fcecfd34094d2ee3ad` |
| #151 | PROGRAM-002 command-center wave | `85aea8e206fbccbcdc25e5052df1080b7e5bb220` |
| #152 | Wave operational certification | `899a8f69f51a90868929d114285a9b01b4fafabe` |
| #155-#160 | `/join` acknowledgment, upload, and safe-success fixes | see GitHub PR records |
| #161 | Editorial Review run control | `89ba293a3f143114642ff3f14f3332c4884abd9f` |
| #168 | Canonical Editorial Recommendation Letter | `ab866beea678a7c62e008250011c394841da96bd` |
| #169 | Author response processor | `00f25a9e2e651b384dcaddffc2f95764904b4022` |
| #174-#179 | Stripe Connect/payment commissioning | see GitHub PR records |
| #180 | Premier Publishing Package restoration | `110bd6c02bcecf92b10ca3ce4d03aac0fda6c22c` |
| #182 | Commissioning title aligned to Premier | `e8a23ad170f4cf5194d698d14efdc7ca1559c77f` |
| #183-#185 | Agreement domain, SignNow, publisher signature, active workspace | see GitHub PR records |

## Canon Review

| Canon decision | Implementation alignment |
| --- | --- |
| Premier Publishing Package | Implemented as $7,500 package; Signature package retired |
| JM Signature | Remains imprint only |
| Editorial Recommendation Letter | Canonical why-first renderer implemented and sent |
| Publisher Signature Doctrine | Governed publisher signature asset embedded during generation |
| Agreement Domain | `jm1pub_contract` is canonical merged contract/agreement entity |
| SignNow transport | SignNow is signing transport; Dataverse remains agreement status record |
| Commissioning Override | $1.00 payment scoped only to The Intentional Leader |
| Author Workspace lifecycle | Workspace created before agreement, unlocked after signed agreement + payment |
| Operational Hygiene | Branch cleanup, deployment validation, and evidence logging performed |
| Incidental Completion Rule | Applied to adjacent defects without expanding into unrelated systems |

## Certification Result

PROGRAM-002 Phase I is certified as the baseline from `/join` through Active Author Workspace and Production Pipeline Commissioning Hold.

Phase II should begin only from this certified state.

