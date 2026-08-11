# Manual Recovery Boundary

Last verified: 2026-08-11T11:18:00Z

| Capability | Manual-recovery behavior |
| --- | --- |
| Response capture | AUTOMATIC |
| Decision classification | AUTOMATIC / GOVERNED |
| Author notes persistence | AUTOMATIC |
| Matching awaiting-response closure | AUTOMATIC when safe |
| Production stage progression | MANUAL / JACKIE-GATED |

The consumer records `manualRecovery=YES` in capture evidence and keeps `productionProgression=0`.

PR #431 remains manual recovery. No title production state was changed.

