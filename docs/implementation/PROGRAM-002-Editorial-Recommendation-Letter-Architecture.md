# PROGRAM-002 Editorial Recommendation Letter Architecture

**Status:** Canon implementation candidate  
**Scope:** Author Recommendation Experience  
**Commissioning title:** The Intentional Leader  
**Reference:** JMP-INT-202607-0W5PTQ

## Canon Rule

The author recommendation is now the Editorial Recommendation Letter. It is a permanent publishing artifact rendered from governed Dataverse and Editorial Review data. Email is only the delivery mechanism.

The letter is built from fixed canon copy plus dynamic Editorial Review content. Fixed canon copy is not AI-generated. Dynamic content is limited to the Editorial Review Summary, package rationale, imprint rationale, and optional personal encouragement.

## Renderer Binding

The production renderer binds:

- first name
- title
- Editorial Review summary
- recommendation rationale
- recommended package
- recommended package price
- alternate package
- alternate package price
- imprint recommendation
- publisher recommendation context

The renderer must not hardcode live business values in author-facing output. Package labels and prices come from the governed package map already used by the Editorial Review recommendation path.

## Author Workspace Artifact

The rendered Editorial Recommendation Letter is persisted through the confirmed safe author-draft fields on `jm1pub_editorialdiagnostic`. The Author Workspace may display this persisted artifact after author-specific authorization is confirmed.

No contracts, payment links, Stripe links, invoices, SignNow links, onboarding checklists, workspace access codes, or package comparison tables are included in the letter.

## Controlled Replacement Send

For a controlled replacement send:

1. Render the Editorial Recommendation Letter from Dataverse.
2. Mark the prior author recommendation as superseded through `jm1_executionlog`.
3. Send exactly one replacement letter through the configured ACS author-response provider.
4. Create the Dataverse send-log evidence.
5. Preserve workflow state as `Awaiting Author Response`.

The replacement send does not change package recommendation, editorial review output, Opportunity, Stripe, Business Central, royalties, payments, contracts, production, distribution, launch, marketing, or workspace movement.

## Validation

Required validation:

- Why-First philosophy is present.
- Editorial Review Summary renders.
- Recommendation rationale renders.
- Package names and prices render without SKU codes.
- Alternate package shows meaningful differences only.
- Acceptance instruction matches canon.
- No payment mechanics are included.
- Letter is persisted for Author Workspace display.
- Renderer uses Dataverse-backed recommendation data.
- No duplicate recommendation send is created.
- Type-check, lint, build, `git diff --check`, and secret scan pass before deployment.
