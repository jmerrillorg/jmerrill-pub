# JM1 Governed Bootstrap Standard v1.0

Status: CANON
Owner: J Merrill One

## Governing Principle

THREAD CONTEXT IS NOT AUTHORITY.

Merged canon plus verified runtime configuration plus current initiative state equals execution authority. Conversation history may orient a session, but it must not be the only place where operational canon exists.

## Required Layers

Every new Cody thread, worktree, recovery session, scheduled run, or delegated execution must load:

- Layer A: JM1 Enterprise Canon
- Layer B: Repository and Program Canon
- Layer C: Runtime and Environment Canon
- Layer D: Initiative Context

A failed enterprise-canon load stops mutation work.

## Bootstrap Result

The bootstrap must return exactly one of:

- BOOTSTRAP PASS
- BOOTSTRAP PASS WITH HOLDS
- BOOTSTRAP FAIL

PASS WITH HOLDS allows read-only validation, local evidence preparation, and dry-run work. It does not authorize production mutation, author send, deployment, or response-clock start.

## Startup Rule

Every new Cody thread must begin by running:

```bash
npm run jm1-bootstrap -- --initiative "<initiative>" --mode "<mode>"
```

Then the thread must read `.bootstrap/current-bootstrap.json`, read the active initiative handoff, state controlling canon, state current authority, state allowed and prohibited actions, and only then begin substantive work.

## Hard Stops

Mutation must stop on:

- enterprise canon missing;
- repository head stale;
- dirty worktree outside initiative scope;
- runtime conflict with repository canon;
- ambiguous initiative identity;
- noncanonical sender or Reply-To;
- multiple active gates;
- unavailable protected mutation authority;
- unresolved title artifact authority.
