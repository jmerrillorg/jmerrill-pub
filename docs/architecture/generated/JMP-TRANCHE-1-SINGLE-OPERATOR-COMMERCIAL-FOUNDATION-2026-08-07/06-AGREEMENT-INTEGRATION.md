# Agreement Integration

Agreement templates are preserved. No contract language or template is modified.

Active templates: Hybrid `JMP_Publishing_Agreement_v1.3.1.docx`; JM Signature `JM_Signature_Publishing_Agreement_v1.0.docx`.

| Field | Source | Agreement use | Tranche 1 handoff |
| --- | --- | --- | --- |
| author legal name | Author/contact legal identity | Existing placeholder | D365/Dataverse contact -> agreement generator |
| title | Inquiry/opportunity/title candidate | Existing placeholder | Opportunity/title projection -> agreement generator |
| publishing track | Commercial decision | Template selection key | D365 opportunity/quote field -> agreement selector |
| package | Commercial catalog package | Schedule/addendum fields | D365 quote/order line projection -> agreement fields |
| elected Product Forms | Commercial catalog and package/PF election | Schedule fields | Quote lines/Dataverse projection -> agreement fields |
| pricing | Canonical pricing authority | Schedule/payment fields | Catalog-backed quote -> agreement fields |
| payment plan | Commercial/payment terms | Schedule fields | Quote/payment terms -> agreement fields |
| effective date | Issuance/execution context | Existing placeholder | Agreement generation timestamp or approved effective date |
| agreement version | Template register | Manifest/version reference | Agreement pipeline version register |
