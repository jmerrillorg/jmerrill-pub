# Cover Design System Commissioning 001

Status: CONTINUE_INTERNAL_IMPLEMENTATION
Scope: OP-006 within Production and Distribution

## Reused authority

- OP-006 remains the cover readiness and BP-09 gate surface. No competing top-level cover architecture was introduced.
- `fullWrapExecutor.js` provides deterministic trim, spine, and bleed calculations. It produces a working specification, not a rendered full-wrap PDF.
- Existing Cody-generated Before You Were Born concepts in the canonical `12 - Cover Design` folder remain unapproved, non-governing creative references. They were not regenerated, moved, or used as commissioning output.
  - Concept A checksum: `f867ce3ab88ed36457930defd50cd6e1b7685c2055c8ab1ab2cf6b329fb4ed33`.
  - Concept B checksum: `c4298d947911b8f0ab229d33ae554182b36e4da8617585e77b0daaa10546a114`.

## Implemented in this source branch

- `coverDesignRuntime.js` defines a versioned title-bound creative-brief and concept-execution contract. Runtime generation accepts a title ID, requires a Dataverse authority reader, and fails closed when required authority is absent.
- `coverTitleAuthorityReader.js` now reads the live Dataverse title, canonical author contact reference, formatted imprint, and current Paperback/eBook identifier rows. It does not treat empty title genre/audience/description fields or stale interior references as authority.
- `coverAuthorityBundle.js` defines the per-field source map, freshness and conflict rules, and exact provenance required before any creative brief. `coverAuthoritySnapshotStore.js` writes and reads back the bundle immutably before brief preparation.
- `coverExecutionStore.js` uses conditional Blob writes for single-flight execution, idempotent completed replay, controlled failed-attempt retry, and stale transition denial. These are fixture-proven modules; no production caller has been deployed.
- Concept generation uses a versioned, reusable prompt policy with two or three bounded directions. The image stage creates artwork only; a separately typeset and preflighted review package is required before the human approval state.
- An atomic execution reservation is required for idempotency; the runtime denies in-flight duplicates, returns an existing completed result on replay, and records failures for controlled retry.
- Before any image-provider call, the runtime now requires a write-once generation request containing the title/author IDs, brief identity and digest, prompt version, named model deployment, variant count, execution ID, idempotency key, and timestamp. A failed or conflicting write blocks generation. `coverGenerationRequestStore.js` provides a managed-identity Azure Blob implementation with conditional creation; a live caller and governed storage container are not yet wired or proven.
- `azureFoundryCoverImageProvider.js` uses Microsoft Entra authentication to call the Foundry image API, checks PNG dimensions and checksum, and requires safety and governed storage adapters. It cannot emit a reviewable concept without those adapters.
- The existing `ais-jm1-foundry` resource now has a successful `jm1-pub-cover-image-primary` deployment of `gpt-image-2`, version `2026-04-21`, GlobalStandard capacity 1. The existing Publishing function managed identity has a scoped Foundry role. No production image request was made.
- Review validation rejects stale brief/package versions and requires authenticated, authorized reviewer context. No live review was recorded.

## Before You Were Born authority readback

Canonical Dataverse title ID: `91c5e1ef-2980-f111-ab0f-7c1e525b15c2`.

Production title readback confirms title, subtitle, and `Sean Arron Crowley` author display. The same title row does not itself provide genre, audience, description, trim size, or page count. These must be resolved from governed title/production records into the runtime authority reader; the system must not fill them from a Cody-written prompt or historical reference image.

The canonical September 29 print export is 102 pages at 6 x 9 inches (SHA-256 `b84b89d86fcf1930ee251879512bad283e01c5a5d1fd6e60b2c96976b22e047b`). The current Dataverse Paperback asset row still references the September 15 interior. The September 29 file cannot yet be promoted to the producer's page-count authority without current artifact registration and readback. The retail metadata and cover creative brief in the title workspace both declare themselves drafts; neither proves an approved category or public description. No BYWB creative brief or Foundry image call is authorized by the current authority bundle.

## Uncommissioned gates

1. Implement the trusted Dataverse/production-record authority reader and immutable per-field provenance for the missing BYWB creative and format inputs.
2. Wire an atomic durable execution store and retry lease, the write-once request store, governed SharePoint title-folder asset storage, and an image safety/preflight service to the provider adapter. The request store has fixture proof only.
3. Implement deterministic title/subtitle/byline typesetting and the author-safe concept review package. Then capture genuine human creative approval through authenticated current-state review.
4. Produce final front and eBook masters plus a rendered paperback full-wrap file using approved back-cover copy, barcode authority, printer specification, and the existing full-wrap geometry. Run file-level and BP-09 QA.
5. Deploy the source runtime, run synthetic next-title proof, then run BYWB through the production system. Only then can the cover producer be called commissioned.

No BYWB system-generated brief, concepts, approval request, final cover, author communication, or provider submission was produced by this packet.
