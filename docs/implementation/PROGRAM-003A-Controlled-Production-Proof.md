## PROGRAM-003A Controlled Production Proof

Status: Completed in JM1-Core / Azure runtime on 2026-07-10

Objective
- Prove one governed Agent 365 / Azure AI Foundry transaction without using a real manuscript and without changing live author, gate, or stage truth.

Controlled run
- Function: `run-stage0-diagnostic`
- Runtime: `func-jm1-diagnostic-ai-runner`
- Correlation ID: `PROGRAM003A-FOUNDRY-PROOF-20260710-01`
- Diagnostic ID: `11111111-1111-1111-1111-111111111111`
- Intake reference: `JMP-INT-202607-CTRL01`
- Mode: `controlled-ai-test`
- Fixture: `.txt`
- Request result: HTTP `202`

Governed prompt proof
- Prompt source: Dataverse
- Prompt key: `jm1-prompt-pub-stage0-diagnostic`
- Prompt version: `PUB-STAGE0-DIAGNOSTIC-V1`
- Prompt record ID: `ef8acd4f-6869-f111-a826-000d3a14673b`
- Deployment alias: `jm1-pub-diagnostic-primary`
- Fallback result: not used
- Effective state: active governed prompt

Execution proof
- AI provider used: `azure-openai`
- Model HTTP result: `200`
- Token counts:
  - input: `7582`
  - output: `197`
  - total: `7779`
- Confidence routing result: `Needs Human Review`
- Human review required: `true`

Audit evidence
- AI request log ID: `f39b45d1-a57c-f111-ab0f-7c1e525b15c2`
- Execution log ID: `3c2bb0cb-a57c-f111-ab0f-6045bdd69678`

Telemetry evidence
- Blob knowledge read dependency: success
- Dataverse prompt template read dependency: success
- Azure OpenAI chat completion dependency: success
- Dataverse execution log write dependency: success
- Dataverse AI request log write dependency: success

Observed dependency timings
- Blob Knowledge Read: `486 ms`
- Dataverse Prompt Template Read: `119 ms`
- Azure OpenAI Chat Completion: `3117 ms`
- Dataverse Execution Log Write: `337 ms`
- Dataverse AI Request Log Write: `264 ms`

Safety boundary preserved
- No real manuscript content accessed
- No prompt body stored
- No raw model output stored
- No A2 gate change
- No developmental-stage advancement
- No author-facing update triggered

Conclusion
- The first governed Foundry transaction completed end to end through:
  governed request -> governed prompt resolution -> Azure OpenAI execution -> JM1-Core audit writeback -> dependency telemetry
