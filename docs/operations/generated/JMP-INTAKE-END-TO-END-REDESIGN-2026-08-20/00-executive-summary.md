# JMP Intake End-to-End Redesign - Executive Summary

Date: 2026-08-20

Classification: FRONT_DOOR_CONTROLLED_COMMISSIONING

This package documents the first controlled redesign implementation for the J Merrill Publishing `/join` front door. The work was performed in a clean worktree from `origin/main` at:

`/Volumes/UsersExternal/Developer/codex-worktrees/jmp-intake-redesign`

Implemented foundation:

- Canonical production origins merge with governed config.
- `/join` captures address, billing-address distinction, returning-author signal, referral, discovery, accessibility, rights, AI/sensitive disclosures, service consent, and optional marketing consent.
- Manuscript can be submitted now or later.
- `.docx`, `.doc`, `.pages`, `.rtf`, and `.pdf` are accepted by policy.
- Apple Pages is preserved as original source and marked for normalization instead of being represented as DOCX.
- Dataverse is used as the intake authority; no website database was introduced.
- Duplicate replay checks Dataverse idempotency before issuing a new intake reference.
- Editorial Review orchestration is only attempted when manuscript evidence exists.

Not yet production-commissioned:

- No production deployment was performed in this turn.
- Live synthetic Turnstile-valid submissions were not run.
- Secure continuation upload and operator email-binding UI/API are specified but not completed.
- Managed Dataverse columns for full native canon remain recommended; current implementation packs extended context into existing safe notes to avoid failing writes on unknown columns.

