# Human-First Canonicalization and Worktree Reconciliation Addendum

**Date:** 2026-08-02
**Repository:** jmerrillorg/jmerrill-pub
**Original dirty worktree:** `/Users/jmerrillone/Developer/jmerrill-pub`
**Original branch:** `codex/program-002-op000-track-a-pilot`
**Original HEAD:** `3f8eaf47be3e61e132820802db97f7e0bfaba843`
**Original upstream:** `origin/codex/program-002-op000-track-a-pilot`
**Original ahead / behind:** ahead 3, behind 40
**Safety package:** `/Users/jmerrillone/.codex/safety/jmerrill-pub-dirty-reconcile-20260802T162019`

## Corrected Classification

The prior shorthand classification `COMPLETE - JM1 HUMAN-FIRST ENTERPRISE REALIGNMENT` overstated operational completion.

Correct classification:

**PARTIALLY COMPLETE - HUMAN-FIRST REALIGNMENT PREPARED, VALIDATED, AND APPROVED FOR CANONICALIZATION**

| Dimension | Disposition |
|---|---|
| Governance design completion | COMPLETE |
| Repository canonicalization | PENDING until merged to `main` |
| Immediate client recovery execution | AUTHORIZED / QUEUED |
| Immediate client recoveries completed | 0 |
| Five-title author service recovery | ACTIVE / NOT COMPLETE |
| Per-title usability certification | PENDING EXECUTION |

## Dirty Worktree Capture

The dirty repository state was preserved before isolation.

| Metric | Count |
|---|---:|
| Staged files | 0 |
| Modified files | 37 |
| Deleted files | 7 |
| Untracked files | 203 |
| Total dirty paths classified | 247 |
| Unclassified dirty paths | 0 |

Preserved local safety artifacts:

- `00-command-capture.md`
- `unstaged.diff`
- `staged.diff`
- `status-porcelain.txt`
- `untracked-files.txt`
- `untracked-files.tar.gz`
- `repository-refs.bundle`
- `checksums.sha256`

The safety package is intentionally outside the repository and is not committed because it may contain broad mixed-initiative work and local evidence.

## Human-First Isolation Boundary

Only the Human-First doctrine, Human-First evidence package, the dirty-worktree reconciliation register, and the clean-worktree guard belong in this canonicalization PR.

Excluded from this PR:

- title-dispatch runtime changes;
- author portal source changes;
- Azure Functions changes;
- public website assets;
- temporary package binaries;
- prior wave evidence;
- local-only evidence;
- client communications;
- production configuration;
- tenant or permission changes.

## Permanent Worktree Rule

The Human-First standard now requires:

Every governed initiative begins from current `origin/main` in a dedicated clean worktree and branch.

A worktree may contain one initiative only.

A merged initiative's worktree must be reconciled and retired before it is reused.

No client-facing production change may be prepared from a worktree containing unrelated modifications.

The supporting guard is:

`npm run dirty-worktree-scope-guard -- --scope <path-or-comma-separated-paths>`

If changed files exist outside the declared initiative scope, the guard fails with:

`DIRTY_WORKTREE_UNRELATED_CHANGES`

## Remaining Dirty Work Disposition

The original worktree contains mixed historical and active work. The register `06-dirty-worktree-reconciliation-register.csv` classifies every path and preserves the required next disposition.

No file is classified as disposable solely because a related initiative may have merged.

Required next handling after this package is canonical:

- preserve original safety package;
- move any continued active work into dedicated clean branches/worktrees;
- confirm already-merged or superseded files against `main` before removing local copies;
- keep local-only evidence outside repository unless explicitly promoted;
- do not reuse the original mixed worktree for client-facing production work.

## Production and Communication Boundary

This package sends no client communication, changes no production configuration, changes no permissions, and triggers no deployment.

The next governed operational action remains execution of the queued five-title author service recoveries from clean, title-scoped worktrees under the deployed email-first Author Experience Reset.
