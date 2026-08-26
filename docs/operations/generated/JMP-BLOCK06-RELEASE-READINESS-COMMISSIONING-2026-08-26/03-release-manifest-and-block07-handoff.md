# Release Manifest and Block 07 Handoff

Last Verified: 2026-08-26

## Release Manifest

Block 06 now creates an exact, versioned `RELEASE_MANIFEST` carrying:

- title and edition
- release version
- formats
- final asset ids and checksums
- metadata snapshot
- identifier snapshot
- pricing snapshot
- rights and territory snapshot
- channel route snapshot
- publication date
- preorder configuration
- accessibility evidence
- author confirmation reference
- Publisher authorization reference
- freeze and certificate state

## Block 07 Handoff

Block 07 receives the frozen manifest and release-readiness certificate. It must not independently choose:

- which files
- which ISBN
- which price
- which territory
- which route
- which publication date
- whether preorder is enabled

Final handoff event:

`BLOCK07_HANDOFF_PACKAGE_READY`

Final authorization event:

`DISTRIBUTION_AUTHORIZED`

