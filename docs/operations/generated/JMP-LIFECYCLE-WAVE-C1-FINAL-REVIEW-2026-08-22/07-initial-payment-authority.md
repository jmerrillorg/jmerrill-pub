# Initial Payment Authority

Initial payment authority: 3/5 opportunities.

Source: opportunity first-payment status + confirmed timestamp + confirmation source, populated by the governed payment runtime.

Limitations: final sanitized readback did not store external payment identifiers, amount-level details, refund/reversal details, or raw payment references in repository evidence. Payment event mirroring remains bounded and should preserve sensitive references outside public repo artifacts.
