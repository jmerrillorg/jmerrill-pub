# Cross-Brand Access Proof

The dedicated Phase 6 application user has one role with 45 effective privileges after managed import. Business-data privileges are restricted to Contact, Publishing titles, Publishing V2 engagement/lifecycle authority, and Phase 6-owned onboarding tables. It has no delete, assign, share, security-administration, solution-import, Financial, Foundation, Productions, AIC, provider, royalty, payment, or communication privilege.

Dataverse requires several unavoidable environment-level reads for organization, business unit, plug-in metadata, SDK message metadata, and SharePoint integration metadata. The platform also materialized SharePoint data/document support privileges in the effective role. Those grants do not provide unrelated JM1 brand table privileges and were not used by the certification route.

Configuration and live runtime boundary: `PASS`. The full suite executed through the application user while direct administrative invocation was rejected by the plug-in's exact caller binding.
