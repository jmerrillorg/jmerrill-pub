# Negative Proof

Last Verified: 2026-08-20

| Control | Value | Evidence |
|---|---:|---|
| `retention_threshold_lowered` | 0 | No retention/QA thresholds changed. |
| `silent_provider_fallback` | 0 | Worker rejects `fellBack=true`; route remains Microsoft Foundry Claude. |
| `direct_provider_bypass` | 0 | No direct Anthropic/OpenAI bypass added. |
| `completed_chunks_restarted_after_429` | 0 | Focused test proves chunks 1-3 are not rerun after chunk 4 429. |
| `partial_Line_artifact_sent` | 0 | No author send path invoked. |
| `author_gate_created_before_full_QA` | 0 | Gate status remains `NOT_CREATED` until certification. |
| `Copy_stage_created_before_Line_approval` | 0 | Worker does not create Copy stage. |
| `Long_Watch_processed_before_General_Will_pass` | 0 | No Long Watch execution performed. |
| `branch_only_code_used_in_production` | 0 | No real title retry or production deployment performed. |
| `manuscript_text_logged_publicly` | 0 | Operator view excludes manuscript text and chunk output text. |
| `async_job_fire_and_forget_without_visibility` | 0 | Worker exposes job/chunk/checkpoint/backpressure view. |

