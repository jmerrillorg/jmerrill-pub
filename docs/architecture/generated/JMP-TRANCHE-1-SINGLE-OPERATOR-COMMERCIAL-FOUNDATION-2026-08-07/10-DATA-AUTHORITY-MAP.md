# Data Authority Map

| Data object | Authority | Tranche 1 role | Boundary |
| --- | --- | --- | --- |
| Lead | Dynamics 365 Sales Lead after configuration | Commercial front-door record | No duplicate custom lead authority. |
| Contact / Author identity | Dataverse contact / D365 contact relationship as configured | Identity and relationship reference | Do not duplicate legal identity in agreement pipeline. |
| Opportunity | Dynamics 365 Sales Opportunity | Qualified commercial pursuit | Dataverse projects publishing authorization state only. |
| Product / package / SKU | Canonical commercial catalog / `jm1pub_commercialcatalogitem` | D365 projection only | No second catalog authority. |
| Pricing | Final pricing authority register / Matrix v1.1 as amended | D365 price-list projection only | No second pricing authority. |
| Quote / Offer | D365 Quote tied to catalog projection | Commercial offer state | Quote does not override catalog/pricing authority. |
| Agreement template | Implementation HQ Agreement Templates | Template selection/version reference | Templates unchanged. |
| Generated agreement artifact | Governed generated agreement storage | Artifact reference/status | Executed agreement never regenerated from newer template. |
| Payment transaction | Stripe | Payment truth | Dataverse/D365 projection only; BC later accounting handoff. |
| Fulfillment authorization | Dataverse Publishing operational projection | Start-work gate | Requires agreement + payment + package/track + intake evidence. |
| Evidence/audit | Dataverse execution/evidence references + SharePoint/GitHub evidence | Readback and proof | No silent state change. |
| Accounting handoff | Business Central, Tranche 2 | Handoff only | No BC posting in Tranche 1. |
