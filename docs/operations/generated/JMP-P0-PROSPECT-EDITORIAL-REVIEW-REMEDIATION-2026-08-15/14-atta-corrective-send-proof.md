# Atta Corrective Send Proof

Last verified: 2026-08-16T02:38:45Z

Evidence source: source inspection of production sender path and live Dataverse read-only Atta probe.

Status:

HELD / NOT EXECUTED.

Reason:

The corrected production website policy is live, but the current Azure diagnostic function path used for publisher recommendation resend still:

- calls `run-publisher-recommendation-action`;
- allows `RESEND_EDITORIAL_RECOMMENDATION_LETTER`;
- persists `jm1_authordraftsendstatus = AUTHOR_RESPONSE_SENT`;
- writes approval notes containing `Workflow remains Awaiting Author Response`;
- returns `workflowStatus: Awaiting Author Response`.

That route has not absorbed the PR #513 prospect package-selection correction. Sending through it would reintroduce the same semantic defect this remediation is meant to prevent.

Author/prospect sends performed during this closeout: `0`.
