# Quote and Pricing Integration

The canonical commercial catalog and pricing authority remain source authority. Dynamics 365 Sales consumes projections only.

| Object | Canonical authority | Dynamics role | Disposition | Boundary |
| --- | --- | --- | --- | --- |
| Commercial catalog item | Dataverse `jm1pub_commercialcatalogitem` / Slice 2 seed authority | D365 Product projection | EXTEND | D365 product must reference SKU/catalog row; cannot become authority. |
| Pricing | Final pricing authority register / Matrix v1.1 as amended | D365 Price List projection | EXTEND | Price list generated from canonical authority; exceptions require Jackie approval. |
| Package offer | Catalog package + selected track/PFs | D365 Quote | CONFIGURE | Quote holds commercial offer status but not source pricing authority. |
| Order/commitment | Accepted quote/agreement boundary | D365 Order candidate | CONFIGURE | Order cannot authorize fulfillment without agreement/payment/intake gate. |
| SOW/quote-required items | Catalog SOW gate and pricing method | D365 quote line requiring manual approval | EXTEND | PF-08 and quote-sow items fail closed without approved scope. |
