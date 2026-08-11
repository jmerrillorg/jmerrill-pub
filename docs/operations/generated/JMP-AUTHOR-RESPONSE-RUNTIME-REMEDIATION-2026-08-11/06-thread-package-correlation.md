# Thread Package Correlation

Last verified: 2026-08-11T11:18:00Z

Correlation now checks the strongest available evidence first:

1. Message reply/reference ID.
2. Thread/conversation ID.
3. Package ID.
4. Decision request ID.
5. Title/gate ID.
6. Subject probe only after author identity is validated and no contradictory identifier exists.

Wrong-title metadata fails closed and does not classify the response merely because the subject resembles a known title.

