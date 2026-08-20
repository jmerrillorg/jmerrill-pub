# Capacity Planning

Last Verified: 2026-08-20

Planning estimates use the conservative observed output-token gate of `5,000` output tokens per `60` seconds and a planning chunk size of about `800` manuscript words.

| Manuscript words | Approx chunks | Conservative output windows | Minimum elapsed under 5,000 output-token gate |
|---:|---:|---:|---:|
| 25,000 | 32 | 32 | ~32 minutes |
| 60,000 | 75 | 75 | ~75 minutes |
| 100,000 | 125 | 125 | ~125 minutes |
| 150,000 | 188 | 188 | ~188 minutes |

If Microsoft confirms a higher safe output-token allowance or removes the user/model output-token throttle, the worker can raise the configured output-token limit without changing the orchestration contract.

Deployment-level limits alone are not sufficient for planning because the live failure identified a narrower user/model output-token throttle.

