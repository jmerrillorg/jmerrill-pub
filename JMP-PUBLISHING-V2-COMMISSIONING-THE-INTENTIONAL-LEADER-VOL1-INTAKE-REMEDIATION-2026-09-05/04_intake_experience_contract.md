# Intake Experience Contract

The author experience exposes five current questions: target audience, rights/provenance, sensitive content, accessibility, and series information. It supports partial save, resume, review, and final submit.

Every persisted response is bound by the `jmpv2_SaveIntakeResponses` server action to the authorized contact, engagement, lifecycle, Intake, question code, value, update time, authority context, correlation ID, response version, and environment. The browser cannot provide alternate authority IDs.

Partial save keeps Stage 02 and derives `REQUIRES_CLARIFICATION` with one deterministic reason per missing answer. Saving all five answers derives `READY_TO_SUBMIT`; only explicit submit can derive `COMPLETE`. The response capability cannot advance the lifecycle or create downstream work.
