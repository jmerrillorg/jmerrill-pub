# Dataverse Model

Current write authority: `jm1_publishingintakes`

Current confirmed columns support the base durable intake:

- identity: name, email, phone
- project: title, type, genre, word count, manuscript status
- submission identity: intake reference, idempotency key, intake channel, consent timestamp
- manuscript pointers: URL, received flag, SharePoint workspace fields
- author notes/context: `jm1_additionalnotes`

The redesign avoids writing unknown columns because Dataverse rejects unknown logical names and would break intake durability.

Recommended managed-solution additions:

- payload version
- submitted on
- prospect state
- manuscript lifecycle state
- waiting owner
- notification state
- full mailing/billing address fields
- address provenance snapshot fields
- referral attribution fields
- marketing attribution fields
- rights/AI/sensitive disclosure fields
- artifact lineage table or related entity for manuscript artifacts
- continuation token table/entity
- email-binding action/entity

