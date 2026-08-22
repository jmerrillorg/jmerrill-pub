# Historical Evidence Sources

Last Verified: 2026-08-22T01:52:35.358Z

| Source | Records Read | Use In This Pass |
| --- | ---: | --- |
| Bill.com-style governed vendor export candidate (3263988231707345883_J_Merrill_Publishing_Vendor_05-01-26-.csv) | 70 exact-author rows | Starting payee population; sensitive fields not stored in repository evidence |
| Dataverse Contact | 5000 | Existing identity, email, author flag, Stripe Connect state |
| Dataverse jm1pub_title | 400 | Governed title-author relationship evidence, including legacy author-name fields |
| Dataverse jm1pub_contract | 3 | Agreement relationship evidence where present |
| Dataverse jm1_royaltyprofile | 5 | Royalty relationship evidence where present |

## Source Hash Boundary

PR #558 baseline source hash: `40a34a1ded28e39b1931bf5b5d1795ab7429172f6537a4e612603a0047d079d1`

Located governed source candidate hash: `2a54c041a5e831ac25b5322a1666219f5b904591fd07c2abf62eb40b470b0393`

The hashes do not match, so this package treats the located file as governed historical evidence and preserves PR #558 as the baseline rather than rewriting it. No Gmail search was performed. No Outlook search was required for rows resolved by Dataverse/title evidence in this pass.
