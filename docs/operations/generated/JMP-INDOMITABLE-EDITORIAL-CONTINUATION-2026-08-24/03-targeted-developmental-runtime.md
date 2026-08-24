# Targeted Developmental Runtime

Last Verified: 2026-08-24T21:47:21.416Z

## Dry Run

```json
{
  "ok": true,
  "status": "DRY_RUN_READY",
  "executionMode": "DRY_RUN",
  "idempotencyKey": "122948b80c5d614fc4c5e3dc0a80516974b1a039efc756af817f78087fa4e870",
  "canonicalTitle": {
    "titleId": "fd577d2b-01a0-f111-b8dc-000d3a14673b",
    "title": "Indomitable",
    "author": "Quanisha Dockery"
  },
  "currentStage": {
    "stageId": "0f587d2b-01a0-f111-b8dc-000d3a14673b",
    "stageName": "Developmental Editing - Indomitable",
    "stageCode": "DEVELOPMENTAL_EDITING",
    "stageStatus": 100000001
  },
  "exactSourceArtifact": {
    "artifactId": "c373402b-01a0-f111-b8db-7c1e525801f6",
    "name": "Governed Source Manuscript - Indomitable",
    "filename": "Indomitable_Compiled_Batch1_2.docx",
    "sha256": "08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181",
    "currentApproved": true
  },
  "authorApprovalEvidence": {
    "approvedArtifactId": "c373402b-01a0-f111-b8db-7c1e525801f6",
    "gates": [
      {
        "gateId": "2a869367-04a0-f111-b8dc-000d3a14673b",
        "decisionOn": "2026-08-20T16:17:16Z",
        "deliverableArtifactId": "c373402b-01a0-f111-b8db-7c1e525801f6"
      }
    ]
  },
  "styleGuide": [],
  "targetStage": "DEVELOPMENTAL_EDITING",
  "providerRoute": {
    "provider": "stage-policy",
    "deploymentAlias": "jm1-editorial-devline-primary",
    "silentFallbackAllowed": false
  },
  "expectedMutations": [
    "claim target editorial stage",
    "read exact source artifact",
    "invoke governed provider route",
    "persist output artifacts",
    "write QA evidence",
    "create package manifest",
    "create mandatory author-review gate"
  ],
  "expectedOutputArtifactType": [
    "editedManuscript",
    "developmentalMemo",
    "changeLedger",
    "qaEvidence"
  ],
  "expectedNextAuthorGate": {
    "stageCode": "DEVELOPMENTAL_EDITING",
    "nextStageAuthorized": false
  },
  "mutationsPerformed": 0,
  "externalSends": 0
}
```

## Execute

```json
{
  "ok": true,
  "status": "EXECUTED",
  "executionMode": "EXECUTE",
  "idempotencyKey": "122948b80c5d614fc4c5e3dc0a80516974b1a039efc756af817f78087fa4e870",
  "canonicalTitle": {
    "titleId": "fd577d2b-01a0-f111-b8dc-000d3a14673b",
    "title": "Indomitable",
    "author": "Quanisha Dockery"
  },
  "currentStage": {
    "stageId": "0f587d2b-01a0-f111-b8dc-000d3a14673b",
    "stageName": "Developmental Editing - Indomitable",
    "stageCode": "DEVELOPMENTAL_EDITING",
    "stageStatus": 100000001
  },
  "exactSourceArtifact": {
    "artifactId": "c373402b-01a0-f111-b8db-7c1e525801f6",
    "name": "Governed Source Manuscript - Indomitable",
    "filename": "Indomitable_Compiled_Batch1_2.docx",
    "sha256": "08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181",
    "currentApproved": true
  },
  "commissioned": {
    "idempotent": true,
    "logId": "3d484a9a-1984-f111-ab0f-00224820105b"
  },
  "result": {
    "stageId": "0f587d2b-01a0-f111-b8dc-000d3a14673b",
    "titleId": "fd577d2b-01a0-f111-b8dc-000d3a14673b",
    "stageCode": "DEVELOPMENTAL_EDITING",
    "status": "VALIDATING",
    "sourceArtifactId": "c373402b-01a0-f111-b8db-7c1e525801f6",
    "outputs": [
      {
        "outputName": "Developmentally Edited Manuscript",
        "artifactId": "13393cd5-04a0-f111-b8dc-000d3a14673b",
        "itemId": "01DF3SEQNHDRZ7XCN2UJGLXJWQ5T4N62J3",
        "filename": "2026-08-24-Developmental-Editing-Indomitable-Developmentally-Edited-Manuscript.docx",
        "extension": "docx",
        "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size": 45710,
        "sha256": "f01472b5efbffdb8563e2e6b7f5791b742b2837d04765d444af73610d5a4c05c",
        "modelProvider": "microsoft-foundry-claude",
        "modelDeployment": "jm1-editorial-devline-primary",
        "promptVersion": "CC010-DEVELOPMENTAL_EDITING-V1"
      },
      {
        "outputName": "Developmental Memo",
        "artifactId": "e6f7a1d7-04a0-f111-b8dc-00224820105b",
        "itemId": "01DF3SEQIAKIINJXOMTFHICOTJINZE42BX",
        "filename": "2026-08-24-Developmental-Editing-Indomitable-Developmental-Memo.docx",
        "extension": "docx",
        "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size": 20486,
        "sha256": "6d8a0abb7da2e8c67108bd06b7b1960f6ad576f96c7dacf889e20aa490e3d9b1",
        "modelProvider": "microsoft-foundry-claude",
        "modelDeployment": "jm1-editorial-devline-primary",
        "promptVersion": "CC010-DEVELOPMENTAL_EDITING-V1"
      },
      {
        "outputName": "Developmental Review Instructions",
        "artifactId": "22393cd5-04a0-f111-b8dc-000d3a14673b",
        "itemId": "01DF3SEQNBWNV3JO5YGVHKWXF3S4Y33FJ2",
        "filename": "2026-08-24-Developmental-Editing-Indomitable-Developmental-Review-Instructions.txt",
        "extension": "txt",
        "contentType": "text/plain",
        "size": 802,
        "sha256": "23d8166a976a7665d5ad15f6e13c5abd18ac70a0afb59ec3c433682dbc305e97",
        "modelProvider": "microsoft-foundry-claude",
        "modelDeployment": "jm1-editorial-devline-primary",
        "promptVersion": "CC010-DEVELOPMENTAL_EDITING-V1"
      },
      {
        "outputName": "Change Ledger",
        "artifactId": "f4f7a1d7-04a0-f111-b8dc-00224820105b",
        "itemId": "01DF3SEQMDMPWKMSYTRVFLBUJ5EOWJYBAL",
        "filename": "2026-08-24-Developmental-Editing-Indomitable-Change-Ledger.md",
        "extension": "md",
        "contentType": "text/markdown",
        "size": 8735,
        "sha256": "3b88f53f4e039a4bdda55410d565586d266ee62563948bc3baf7cd74aa67b7bc",
        "modelProvider": "microsoft-foundry-claude",
        "modelDeployment": "jm1-editorial-devline-primary",
        "promptVersion": "CC010-DEVELOPMENTAL_EDITING-V1"
      },
      {
        "outputName": "Developmental QA Evidence",
        "artifactId": "74a256d7-04a0-f111-b8db-7c1e525801f6",
        "itemId": "01DF3SEQJUPO2XF7AQIBAZGGXMI4HLNCMW",
        "filename": "2026-08-24-Developmental-Editing-Indomitable-Developmental-QA-Evidence.md",
        "extension": "md",
        "contentType": "text/markdown",
        "size": 8747,
        "sha256": "771e96b9b9de5614c9a44bab85b531b5a5b5cb95d46ffa3640332330f665c6fa",
        "modelProvider": "microsoft-foundry-claude",
        "modelDeployment": "jm1-editorial-devline-primary",
        "promptVersion": "CC010-DEVELOPMENTAL_EDITING-V1"
      }
    ],
    "outputLogId": "24393cd5-04a0-f111-b8dc-000d3a14673b",
    "qaLogId": "25393cd5-04a0-f111-b8dc-000d3a14673b",
    "packageHandoff": {
      "packageId": "pkg-0f587d2b-01a0-f111-b8dc-000d3a14673b-developmental-editing-v1",
      "packageVersion": "v1",
      "manifestArtifactId": "75a256d7-04a0-f111-b8db-7c1e525801f6",
      "packageChecksum": "64b763a95f9a16bf4374c85928fcfbbdbf1183e7453d29f2288c9e0783af95c9",
      "qaStatus": "READY_INTERNAL",
      "cadenceStatus": "CADENCE_HOLD",
      "notificationPolicy": "AUTHOR_REVIEW_AFTER_STAGE_COMPLETION_AND_CADENCE",
      "workspaceVisibility": "VISIBLE_AFTER_COMPLETE_NOTIFICATION",
      "nextGovernedAction": "Canonical author package release after stage QA and cadence authorization.",
      "authorGate": {
        "ok": true,
        "idempotent": false,
        "stageCode": "DEVELOPMENTAL_EDITING",
        "titleId": "fd577d2b-01a0-f111-b8dc-000d3a14673b",
        "stageId": "0f587d2b-01a0-f111-b8dc-000d3a14673b",
        "artifactId": "13393cd5-04a0-f111-b8dc-000d3a14673b",
        "artifactHash": "f01472b5efbffdb8563e2e6b7f5791b742b2837d04765d444af73610d5a4c05c",
        "nextStageAuthorized": false,
        "gateStatus": 196650002,
        "reviewPrompt": "Your Developmental Edit Is Ready for Review",
        "authorLabel": "Developmental Edit",
        "gateId": "0cf8a1d7-04a0-f111-b8dc-00224820105b"
      }
    }
  },
  "externalSends": 0
}
```
