# 05 - Human Gate Contract

The validator defines `HumanGateEvidence` with:

- decisionMaker;
- decision;
- channel;
- occurredOn;
- recordedBy;
- artifactId;
- artifactChecksum;
- artifactVersion;
- titleId;
- gateId;
- nextStageAuthorization;
- replayKey.

Supported channels include email, portal, phone/verbal, and other approved channel.

The focused guard tests missing/wrong/ambiguous gate cases and valid email/verbal approvals. Duplicate replay is modeled by the optional replay key while preserving idempotent evidence semantics for downstream consumers.
