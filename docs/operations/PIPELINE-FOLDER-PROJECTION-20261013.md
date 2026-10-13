# Five fresh-title folder projection

Authority: Publisher instruction to restore the five fresh Jackie submissions'
human-visible placement in Stage 05, preserving accepted Stages 01-04 and the
unsigned agreement wait. This does not authorize a signature, Stage 06,
external-author automation, a permission expansion, or a manuscript change.

## Ownership and holds

The existing stage owners remain authoritative. Exact Stage 04 acceptance plus
the exact-version Stage 05 signature request establishes the present waiting
stage. Later stages require the fresh submission fingerprint on the canonical
engagement, current lifecycle/stage-instance agreement, and existing author
authority. A legacy title's later stage is not authority for a fresh submission.

`JM1-Publishing-Enterprise-Operating-Manual-v1.0.md` defines fail-closed as pausing
the affected movement pending the needed decision. No relocation to a separate
hold folder is introduced. An author wait stays in its current stage. Conflicting
authority, ancestry, custody, permissions, or verified-location drift is held.

## Runtime

`pipelineFolderProjection` uses same-drive Graph parent-only PATCH with If-Match.
It never copies, merges, renames, deletes, or creates title folders. Five stable
title-folder IDs are bound from the October 13 recursive SharePoint inventory.
The private stage-runtime container stores incremental pre/post inventories,
move intent, completion receipt, and retry state. A renewable 60-second lease
serializes each title. Provider timeouts recover by reading the same item ID.

Large inventories checkpoint after each item and yield after two minutes. The
existing five-minute author-response timer rotates one title per tick after its
response work; no new scheduler is introduced. Each title is normally checked
every 25 minutes. The canonical dispatch path also requires aligned placement
before invoking a bound title's owner. Partial custody verification must finish
before the location is accepted.

Inherited stage permissions must match. Post-move comparison requires the same
item identities, names, sizes, hashes supplied by Graph, file versions, descendant
parents, and permission records. Only the title folder's parent and current URLs
may change. Immutable source/offer/receipt paths remain historical evidence;
runtime source readers validate moved sources against verified stable ancestry
and the durable projection receipt without changing the source fingerprint.

## Enablement and rollback

Default is disabled. Set `JM1_PIPELINE_FOLDER_PROJECTION_ENABLED=true` only after
the reviewed Function release is live. Existing keyed source-registration modes
`PIPELINE_FOLDER_READBACK` and `PIPELINE_FOLDER_RECONCILE` accept only a bound title
ID; callers cannot supply a destination or alternate source.

Keep broad stage and wait workers disabled. Disable only the projection setting
to contain a projection fault; retain receipts, inventories and in-flight intent.
Do not move folders backward or redeploy an older source-path-only reader after a
successful move. Roll forward the reader or explicitly review a parent-only
recovery using preserved intent and fresh custody checks. Disabling projection
does not invalidate the accepted author elections or affect signature obligations.

## Acceptance evidence

Source tests are not live commissioning. The packet must additionally contain
the reviewed/deployed SHA, five live parent-ID readbacks, complete post-move
custody comparison, replay results, source/output read verification, reference
reconciliation, and a natural scheduled drift check. No Stage 05 completion or
Stage 06 start can be inferred from these receipts.
# Graph metadata recovery v2

The first production comparison held three moves because Graph version responses
included transient download URLs and application responses added false IRM fields.
One permissions response omitted sharing URLs; a fresh read with the original
delegated identity reproduced the complete original ACL unchanged.

Graph documents that permission `webUrl` secrets depend on caller authority:
https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions

Do not persist transient version download URLs. Compare substantive metadata,
including permission IDs, roles, principals, scope, version IDs, sizes and hashes.
Missing versus false IRM flags normalize; true IRM changes still fail closed.
Metadata-only held moves may recover only with a matching immutable intent,
the exact destination, and passing substantive before/after comparison. Recovery
records the original hold and performs a fresh resumable after-v2 inventory.
No second move is issued. Other holds and substantive custody differences remain held.
