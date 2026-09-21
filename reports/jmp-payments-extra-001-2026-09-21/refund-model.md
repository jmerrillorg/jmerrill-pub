# Refund Model

A successful refund references an existing payment, cannot cumulatively exceed it, preserves the original payment, and restores the refunded gross amount to the agreement balance. Failed refunds have no effect. Duplicate refund IDs are idempotent; conflicting reuse is denied.

QBO reversal remains a required adapter responsibility and is not commissioned here.

