# Open Exceptions

No blocking GATE-W1 certification exceptions remain.

| Exception ID | Description | Risk | Production Impact | Recommended Remediation | Blocking |
| --- | --- | --- | --- | --- | --- |
| GATE-W1-OBS-001 | The current `/join` intake router creates a Lead routing record, not a Dataverse Appointment. | Terminology mismatch if future runbooks continue to say Appointment. | None; the active path is functioning and certified with one Lead routing record. | Align future documentation to the active routing model or authorize a separate Appointment requirement. | No |
| GATE-W1-OBS-002 | Link-only/PDF and short-DOCX synthetic attempts reached governed diagnostic exception states before the final long-DOCX positive proof. | None; they confirm exception handling. | None. | Retain as evidence of governed exception behavior; use sufficiently long DOCX fixtures for future positive-path tests. | No |
| GATE-W1-OBS-003 | Production slot-swap rollback was not performed. | Production swap tests remain separately approval-gated. | None; staging immutable-artifact rollback/roll-forward is proven and production rollback instructions remain documented. | Use explicit Jackie approval before any future production swap/rollback drill. | No |

## Exception Decision

CERTIFIED_REFERENCE. The former blocking exceptions GATE-W1-EX-007 and GATE-W1-EX-008 are closed.
