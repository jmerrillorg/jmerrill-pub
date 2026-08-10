# Artifact Root Cause

Last verified: 2026-08-10T02:46:15Z

Root cause: ARTIFACT_REGISTRATION_GAP plus PACKAGE_ARTIFACT_LINK_GAP plus APPROVAL_ARTIFACT_LINK_GAP.

The approved 275-page proof existed and its checksum was later verified, but the original live artifact readback did not expose that exact proof as the current approved artifact for the protected closeout gate.

The defect was not a page-count question and not a filename question. The missing durable chain was:

review package -> approved artifact identity -> checksum -> decision correlation -> closeout evidence.

