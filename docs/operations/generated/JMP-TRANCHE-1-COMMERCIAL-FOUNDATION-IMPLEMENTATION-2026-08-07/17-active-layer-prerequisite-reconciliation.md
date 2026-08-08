# Active-Layer Prerequisite Reconciliation

Last verified: 2026-08-08T03:36:37.099920+00:00

Source register: `powerplatform/solutions/JM1PublishingSales/evidence/dependency-register-jm1-dev-2026-08-07.json`

Original ungoverned JM1 Active-layer prerequisites: 38

UNRESOLVED: 0

## Classification Counts

| Classification | Count |
| --- | ---: |
| `REQUIRED_SHARED_JM1` | 0 |
| `REQUIRED_PUBLISHING` | 3 |
| `EXISTING_GOVERNED_PREREQUISITE` | 0 |
| `MICROSOFT_FIRST_PARTY` | 0 |
| `NOT_REQUIRED_FOR_TRANCHE_1` | 28 |
| `OBSOLETE_OR_INCIDENTAL` | 7 |
| `UNRESOLVED` | 0 |

## Register

| Dependency | Type | Requiring component | Ruling | Notes |
| --- | --- | --- | --- | --- |
| `jm1_airunlog` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_authorprofile` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_consentrecord` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_documents` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_editorialjob` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_engagements` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_household` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_jm1policy` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_personrole` | Entity/Table | Entity/Table: /account; Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_project` | Entity/Table | Entity/Table: /account; Entity/Table: /contact; Entity/Table: /opportunity | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_projects` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_publishingintake` | Entity/Table | Entity/Table: /contact; Entity/Table: /lead; Entity/Table: /opportunity | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_royaltyprofile` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_royaltytransaction` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1fin_appointment` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1fin_case` | Entity/Table | Entity/Table: /account; Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1fnd_jm1fndconstituent` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1pub_editorialdiagnostic` | Entity/Table | Entity/Table: /contact; Entity/Table: /lead; Entity/Table: /opportunity | `REQUIRED_PUBLISHING` | Publishing-relevant in production evidence, but still blocked because governed source package was not located and Sales app prerequisite failed. |
| `jm1pub_editorialstage` | Entity/Table | Entity/Table: /contact | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1pub_submission` | Entity/Table | Entity/Table: /contact; Entity/Table: /lead | `REQUIRED_PUBLISHING` | Publishing-relevant in production evidence, but still blocked because governed source package was not located and Sales app prerequisite failed. |
| `jm1_name` | Attribute/Column | Relationship: jm1_project/jm1_opportunity_LinkedProject_jm1_project | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_accounttypechoice` | Option Set/Choice | Attribute/Column: account/jm1_accounttype | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_brandroles` | Option Set/Choice | Attribute/Column: contact/jm1_brandroles | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_contacttypeglobal` | Option Set/Choice | Attribute/Column: contact/jm1_contacttype | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_funeralhome` | Option Set/Choice | Attribute/Column: contact/jm1_funeralhome | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_genrechoice` | Option Set/Choice | Attribute/Column: opportunity/jm1pub_genre | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_interesttypechoice` | Option Set/Choice | Attribute/Column: lead/jm1_interesttype | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_lastactivitytype` | Option Set/Choice | Attribute/Column: contact/jm1_lastactivitytype | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_leadsource` | Option Set/Choice | Attribute/Column: contact/jm1_leadsource | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_leadstatus` | Option Set/Choice | Attribute/Column: contact/jm1_leadstatus | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_manuscripttype` | Option Set/Choice | Attribute/Column: opportunity/jm1pub_manuscripttype | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_originchoice` | Option Set/Choice | Attribute/Column: lead/jm1_origin | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_pipelinechoice` | Option Set/Choice | Attribute/Column: opportunity/jm1_pipeline | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_precoasyncstatus` | Option Set/Choice | Attribute/Column: contact/jm1_precoasyncstatus | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_preferredcommunicationchannelchoice` | Option Set/Choice | Attribute/Column: contact/jm1_preferredcommunicationchannel | `NOT_REQUIRED_FOR_TRANCHE_1` | Residue from Account/Contact or non-Tranche-1 standard-table customizations; pruned from proposed DEV package. |
| `jm1_primarylanguage` | Option Set/Choice | Attribute/Column: opportunity/jm1pub_primarylanguage | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1_trimsizechoice` | Option Set/Choice | Attribute/Column: opportunity/jm1pub_trimsize | `OBSOLETE_OR_INCIDENTAL` | Removed from the proposed Tranche 1 DEV boundary during pruning. |
| `jm1pub_imprint` | Option Set/Choice | Attribute/Column: lead/jm1pub_imprint | `REQUIRED_PUBLISHING` | Publishing-relevant in production evidence, but still blocked because governed source package was not located and Sales app prerequisite failed. |

## Finding

Dependency pruning reduced the proposed required ungoverned Active-layer prerequisites from 38 to 3. The remaining blocker is not those Active-layer rows; it is the inability to install or resolve the Microsoft Dynamics Sales table/application baseline in JM1-Dev through PAC.
