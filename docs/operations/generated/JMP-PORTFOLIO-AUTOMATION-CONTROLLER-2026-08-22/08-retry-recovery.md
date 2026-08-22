# Retry / Recovery

Retry policy by failure class:

| Failure | Controller behavior |
| --- | --- |
| 429 / provider capacity | BACKPRESSURE and retry when capacity is available |
| Temporary 5xx | RETRYING until bounded retry is exhausted |
| Relay unavailable | Persist failure and retry, then SYSTEM_ATTENTION_REQUIRED |
| Validation failure | SYSTEM_ATTENTION_REQUIRED; no blind retry |
| Missing author approval | WAITING_ON_AUTHOR; no retry loop |
