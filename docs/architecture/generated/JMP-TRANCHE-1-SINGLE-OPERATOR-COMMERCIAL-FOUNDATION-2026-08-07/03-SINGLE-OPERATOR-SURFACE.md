# Single-Operator Daily Surface

Target classification: EXTEND. Configure Microsoft-native surfaces first: Power Apps as the daily operating surface, Dynamics views for sales records, Power BI for rollups, Teams/Approvals for exceptions, Outlook for native activities. Extend only where the one daily view must combine publishing authorization projections across systems.

| Question | Target surface | Data / queue | Disposition |
| --- | --- | --- | --- |
| What requires Jackie today? | Power Apps daily view backed by D365/Dataverse plus Teams approvals | Exception approvals, stalled items, special terms, fulfillment overrides | CONFIGURE |
| Which inquiries need action? | Dynamics Lead view / Power Apps queue | New lead with no owner/next activity | CONFIGURE |
| Which opportunities are stalled? | Dynamics Opportunity dashboard | No stage movement or overdue next activity | CONFIGURE |
| Which quotes are waiting? | Dynamics Quote view | Quote prepared/not sent/sent without response | CONFIGURE |
| Which agreements are unsigned? | Dataverse/D365 agreement status projection plus SharePoint artifact reference | Agreement generated but not executed | EXTEND |
| Which payments are incomplete? | Dataverse payment projection from Stripe evidence | Payment pending/failed/partial/stale/refund exception | EXTEND |
| Which authors are cleared to begin? | Fulfillment Authorized list in Dataverse/Power Apps | Gate passes formula and evidence complete | EXTEND |
| Which exceptions require review? | Teams/Approvals queue surfaced in Power Apps | Special terms, override, stale payment, mismatched package, manual correction | CONFIGURE |
