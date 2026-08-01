# Artifact Inventory and Release Blockers

Generated: 2026-08-01

## The Intentional Leader

Current approved proofread manuscript:

| Field | Value |
| --- | --- |
| Artifact ID | 6c01c3f7-0883-f111-ab0f-000d3a14673b |
| File | 2026-07-19-The-Intentional-Leader-Volume-I-Proofread-Manuscript.docx |
| SHA-256 | d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922 |

Interior Layout artifacts found:

| Artifact | Finding |
| --- | --- |
| Interior proof PDF | Not releasable; downloaded PDF is one page while manifest says pageCount 214 |
| Interior production DOCX | Not a complete interior proof; substantially smaller than approved proofread manuscript |
| Interior QA evidence | States final publisher review is still required |
| Interior manifest | Internal-only and inconsistent with actual proof file |

Blocker: REQUIRED_PRODUCTION_ARTIFACT_MISSING

Release action: blocked until a complete current Interior Layout proof exists and passes visual QA.

## Developmental Titles

Downloaded internal package artifacts were inspected by metadata and checksum only. Full manuscript contents were not retained in this repository evidence package.

| Title | Manifest SHA-256 | Internal package status | Blocker |
| --- | --- | --- | --- |
| The Long Watch | 81c04ed03e9438d16332c5bf6b22ff4818810a8d0a32f623e44c3d81e5bd85d7 | v2 internal manifest found | Active recipient and artifact integrity not yet repaired |
| Before You Were Born | 4eaab8738132ce712ce38a7a8f3ddc3506d1566510911105ea13bc9275318436 | v2 internal manifest found | Needs new governed release event and gate; July 30 evidence remains incomplete |
| The General's Will and Last Testament | 24aadf42a9ee8a4d7e9a45c17575ba90fe1befcd69440863635145d2694f4f2c | v2 internal manifest found | Release timing boundary 2026-08-06T03:20:05Z must be honored if not-before |
| Establishing Glory: The Library | 94d49faebc054f30ba0d794183668512be770bfa8e16fe81774d9569fbdfe680 | v2 internal manifest found | Active canonical recipient missing; internal label must not appear author-facing |

## Non-Release Decision

The presence of internal manifests and review instructions is not sufficient to create live author gates or send author communications. Each title must still pass recipient, package, manifest, QA, gate, notification, archive, and projection controls.
