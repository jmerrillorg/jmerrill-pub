# JM1 Prerequisite Governance

Last verified: 2026-08-08T04:34:00Z

## Original Pruning Result

The prior pruning pass reduced the ungoverned JM1 Active-layer prerequisite set from 38 to 3:

- `jm1pub_submission`
- `jm1pub_editorialdiagnostic`
- `jm1pub_imprint`

## Import-Revealed Correction

During JM1-Enterprise-Dev import proof, the Publishing Opportunity Process BPF also required `opportunity/jm1pub_manuscripttype`, which depends on global option set `jm1_manuscripttype`.

Truthful required prerequisite count after BPF preservation: 4.

## Governed Components

| Component | Type | Governance action | Source |
| --- | --- | --- | --- |
| `jm1pub_submission` | Table | Present in source-controlled JM1PublishingSales as `jm1pub_PublishingSubmission`; imported to JM1-Enterprise-Dev. | `src/Entities/jm1pub_PublishingSubmission/` |
| `jm1pub_editorialdiagnostic` | Table | No longer required by the final pruned source boundary; no import blocker after source pruning. | Final import proof |
| `jm1pub_imprint` | Global option set | Recovered from JM1-Core metadata and added to source control. | `src/OptionSets/jm1pub_imprint.xml` |
| `jm1_manuscripttype` | Global option set | Recovered from JM1-Core metadata because BPF requires `jm1pub_manuscripttype`. | `src/OptionSets/jm1_manuscripttype.xml` |
| `opportunity/jm1pub_manuscripttype` | Opportunity field | Restored from JM1-Core metadata because BPF references the field. | `src/Entities/Opportunity/Entity.xml` |

## Production Metadata Recovery

The following production solution-boundary changes were performed to recover existing unmanaged metadata into source control:

- Added `jm1pub_imprint` option set to `JM1PublishingSales`.
- Added `jm1_manuscripttype` option set to `JM1PublishingSales`.

These were solution membership changes only. No business/client records were changed.

## Evidence

- `prod-jm1pub-imprint-globaloptionset-2026-08-08.json`
- `add-imprint-optionset-to-prod-solution-by-id-2026-08-08.log`
- `prod-jm1-manuscripttype-globaloptionset-2026-08-08.json`
- `add-manuscripttype-optionset-to-prod-solution-by-id-2026-08-08.log`
- `export-prod-with-imprint-recovery-2026-08-08.log`
- `export-prod-with-bpf-prereq-recovery-2026-08-08.log`
- `enterprise-dev-optionset-readback-2026-08-08.json`
