# 04 - Transition Contract

Validator path: `lib/publishing/lifecycle/validation.ts`

The transition contract supports:

- fromStage/fromSubstage;
- toStage/toSubstage;
- title-specific applicability;
- completed substages;
- artifact evidence;
- human gate evidence;
- commercial states;
- execution status;
- terminal event marker.

## Canonical Sequencing Enforced

| Rule | Validation behavior |
|---|---|
| Developmental approval -> Line | Allowed when approved Developmental artifact exists, unless Developmental is not applicable |
| Line approval -> Copy | Allowed when approved Line artifact exists |
| Copy approval -> Layout | Allowed |
| Copy -> Proof | Rejected without Layout |
| Proof -> Layout | Rejected |
| Proof -> Final Author Approval | Requires proof artifact and valid gate |
| Final Author Approval -> Production Finalization | Requires Final Interior and completed final approval |
| Distribution Release | Requires distribution artifact |
| Stage 10 -> Stage 09 | Rejected for ordinary post-publication workstreams |
