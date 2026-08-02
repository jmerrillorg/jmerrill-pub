# JM1 Human-First Service Delivery Standard v1.0

**Document ID:** JM1-HUMAN-FIRST-SERVICE-DELIVERY-STANDARD-v1.0
**Classification:** CANONICAL ENTERPRISE STANDARD
**Authority:** Jackie Smith, Jr. executive directive, 2026-08-02
**Scope:** J Merrill One enterprise service delivery, including Publishing, Financial, Foundation, Productions, corporate JM1, and AIC-adjacent supported surfaces where JM1 systems are involved.
**Purpose:** Ensure every workflow, communication, portal, application, automation, and governance process serves the person first.

## Enterprise Vision

People first.
Legacy always.
Technology in service to both.

JM1 systems may be sophisticated internally, but the person being served should experience clarity, dignity, and useful help. A technical transaction is not complete unless the person can understand, access, use, and respond to the delivered outcome.

## Governing Sequence

Every client-facing service decision must be evaluated in this order:

1. Human need
2. Business purpose
3. Simplest safe experience
4. Internal governance
5. Automation
6. Technical optimization

If a later step burdens an earlier one, the later step yields unless law, security, privacy, payment safety, or contractual duty requires otherwise.

## Delivery Contract

Every workflow has two layers.

### Internal Layer

- Dataverse records
- SharePoint files
- workflow execution
- evidence
- audit history
- package manifests
- response contracts
- stage gates
- orchestration

### Human-Facing Layer

- plain-language communication
- usable documents
- one clear request
- optional portal access where helpful
- email, phone, or direct support fallback
- branded support experience

**Requirement:** Internal complexity exposed to clients, authors, donors, partners, or congregants must be zero.

## Portal Policy

Portal access is an optional enhancement unless a documented legal, security, privacy, payment, or operational requirement makes it necessary.

Primary service paths should be email, phone, direct document delivery, forms, or scheduled support as appropriate to the person and context.

Any workflow requiring portal access must document:

- why the portal is necessary;
- what the person can do if access fails;
- who owns support;
- how completion can still occur safely;
- and how the portal status is distinguished from the business outcome.

## Publishing Author Package Rule

For ordinary editorial review, the default author-facing package is limited to:

1. The document the author must review.
2. Clear editorial notes when needed.
3. Simple instructions.

Do not expose:

- Markdown
- JSON
- package manifests
- response-mechanism artifacts
- ledgers
- audit logs
- system terminology
- internal stage IDs
- execution records

Email reply remains a valid response path. The Author Operating Center may provide history, downloads, status, approvals, and version history, but it is not the prerequisite for ordinary editorial review.

## Human Experience Acceptance Gates

Before a client-facing workflow is considered production-ready, the following must pass:

- Why-first purpose review
- Plain-language review
- Brand and tone review
- Actual file open test
- Actual link test
- Mobile test
- Nontechnical-user test
- Human fallback
- End-user completion

System logs, HTTP status codes, provider acceptance, and database writes are supporting evidence. They are not the final success criterion.

## Human Outcome Measures

JM1 tracks these outcomes separately from technical telemetry:

- client received what they needed;
- client understood the request;
- client could open the documents;
- client could complete the action;
- client knew how to get help;
- client did not encounter internal system language;
- client did not require executive intervention.

## Executive Capacity Protection

No ordinary workflow should require Jackie to serve as:

- technical support;
- attachment tester;
- deployment validator;
- workflow investigator;
- identity administrator;
- manual integration layer.

Each such dependency must be classified as:

- Automate safely
- Delegate
- Simplify
- Eliminate
- Retain as executive decision

The system must create executive capacity, not consume it.

## Freeze Boundary

Until critical human-experience failures are closed, do not commission:

- new infrastructure modernization;
- new pipeline programs;
- new AI agents;
- new portals;
- new automation waves;
- Wave 3;
- nonessential architectural enhancements;
- additional author-package complexity.

Permitted work:

- urgent client and author service;
- production incident correction;
- safe completion of current obligations;
- usability remediation;
- human-first communication improvements;
- evidence required to support this review.

## Relationship to Existing Canon

This standard extends `JM1-WEB-WHYFIRST-DOCTRINE-v1.0` beyond public websites into full service delivery. Where a process is both public-facing and operational, this standard and the Web Why-First Doctrine apply together.

## Clean Worktree Operating Rule

Every governed initiative begins from current `origin/main` in a dedicated clean worktree and branch.

A worktree may contain one initiative only. A merged initiative's worktree must be reconciled and retired before it is reused.

No client-facing production change may be prepared from a worktree containing unrelated modifications.

Production-oriented execution must run a dirty-worktree scope preflight. If changed files fall outside the declared initiative scope, the preflight must report:

`DIRTY_WORKTREE_UNRELATED_CHANGES`

The production-oriented action must stop until the unrelated changes are isolated, preserved, or moved to their own governed branch.
