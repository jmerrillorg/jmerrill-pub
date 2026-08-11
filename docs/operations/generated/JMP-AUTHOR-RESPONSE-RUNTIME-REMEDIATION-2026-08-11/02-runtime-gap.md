# Runtime Gap

Last verified: 2026-08-11T11:18:00Z

PR #464 established that Iyorwuese Hagher's inbound response existed in the governed publishing mailbox but was not durably captured in runtime evidence.

The reusable gap had three parts:

1. The live mailbox consumer did not preserve `APPROVED_WITH_CORRECTIONS` as a canonical decision.
2. Manual-recovery titles were not proven as supported for response capture while preserving production holds.
3. The inbound capture event did not explicitly carry the minimum governed evidence fields required by the new invariant.

The remediation closes those runtime gaps without reconciling the historical message.

