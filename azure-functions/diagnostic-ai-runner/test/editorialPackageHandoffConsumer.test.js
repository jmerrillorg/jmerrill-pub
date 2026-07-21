"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { graphRequest } = require("../src/editorial/editorialExecutionRuntime");
const {
  deliverableForStage,
  newestByRole,
  runEditorialPackageHandoffConsumer
} = require("../src/editorial/editorialPackageHandoffConsumer");

function createStage() {
  return {
    jm1pub_editorialstageid: "stage-1",
    jm1pub_name: "Developmental Editing - Before You Were Born",
    jm1pub_stagetype: 100000001,
    jm1pub_stagestatus: 100000001,
    _jm1pub_titleid_value: "title-1",
    _jm1pub_publishingassetid_value: "asset-1"
  };
}

function artifact(name, extra = {}) {
  return {
    jm1pub_editorialartifactid: extra.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    jm1pub_editorialartifactname: name,
    jm1pub_filename: extra.filename || `${name}.md`,
    jm1pub_fileextension: extra.extension || "md",
    jm1pub_filesizebytes: extra.size || 128,
    jm1pub_repositorydriveid: "drive-1",
    jm1pub_repositoryitemid: extra.itemId || `${name}-item`,
    jm1pub_repositorypath: extra.path || "https://sharepoint/output",
    jm1pub_sha256: extra.sha256 || `${name}-sha`,
    jm1pub_iscurrentapproved: extra.currentApproved || false,
    modifiedon: extra.modifiedon || "2026-07-21T12:00:00Z",
    createdon: extra.createdon || "2026-07-21T12:00:00Z"
  };
}

function createClient({ existingCompleted = false, omitLedger = false } = {}) {
  const calls = { created: [], patched: [] };
  const stage = createStage();
  const source = artifact("Governed Source Manuscript - Before You Were Born", {
    id: "source-artifact",
    filename: "Before You Were Born.docx",
    extension: "docx",
    itemId: "source-item",
    sha256: "source-sha",
    currentApproved: true
  });
  const outputs = [
    artifact("Developmentally Edited Manuscript - Developmental Editing - Before You Were Born", {
      id: "edited-artifact",
      filename: "edited.docx",
      extension: "docx",
      sha256: "edited-sha"
    }),
    artifact("Developmental Memo - Developmental Editing - Before You Were Born", {
      id: "memo-artifact",
      filename: "memo.docx",
      extension: "docx",
      sha256: "memo-sha"
    }),
    artifact("Developmental Review Instructions - Developmental Editing - Before You Were Born", {
      id: "instructions-artifact",
      filename: "instructions.txt",
      extension: "txt",
      sha256: "instructions-sha"
    })
  ];
  if (!omitLedger) {
    outputs.push(
      artifact("Change Ledger - Developmental Editing - Before You Were Born", {
        id: "ledger-artifact",
        filename: "ledger.md",
        extension: "md",
        sha256: "ledger-sha"
      })
    );
  }
  return {
    calls,
    async list(entitySet, query = {}) {
      const filter = query.$filter || "";
      if (entitySet === "jm1_executionlogs") {
        if (filter.includes("EDITORIAL_PACKAGE_HANDOFF_COMPLETED") && existingCompleted) {
          return [{ jm1_executionlogid: "completed-log", jm1_actiondescription: "existing" }];
        }
        return [];
      }
      if (entitySet === "jm1pub_editorialstages") return [stage];
      if (entitySet === "jm1pub_editorialartifacts" && filter.includes("jm1pub_editorialartifactname eq")) return [];
      if (entitySet === "jm1pub_editorialartifacts") return [source, ...outputs];
      throw new Error(`Unexpected list ${entitySet} ${JSON.stringify(query)}`);
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      return `${payload.jm1_actiontype || entitySet}-${calls.created.length}`;
    },
    async patch(entitySet, id, payload) {
      calls.patched.push({ entitySet, id, payload });
    }
  };
}

test("developmental handoff selects the edited manuscript as the durable deliverable", () => {
  const outputs = newestByRole([
    artifact("Developmental Memo - Test", { id: "memo", filename: "memo.docx", extension: "docx" }),
    artifact("Developmentally Edited Manuscript - Test", { id: "edited", filename: "edited.docx", extension: "docx" })
  ]);
  const deliverable = deliverableForStage("DEVELOPMENTAL_EDITING", outputs);
  assert.equal(deliverable.artifactId, "edited");
});

test("QA-complete developmental output creates governed package v2 without direct stage transition", async () => {
  const client = createClient();
  graphRequest.override = async (path, options = {}) => {
    if (path.includes("?$select=id,parentReference")) return { id: "source-item", parentReference: { id: "parent-folder" } };
    if (options.method === "PUT") return { id: "manifest-item", name: "manifest-v2.json", size: 512, webUrl: "https://sharepoint/manifest-v2.json" };
    throw new Error(`Unexpected Graph path ${path}`);
  };
  try {
    const result = await runEditorialPackageHandoffConsumer(
      { correlationId: "handoff-test", maxOutputs: 1 },
      {
        client,
        qaLogs: [
          {
            jm1_executionlogid: "qa-log",
            jm1_actiontype: "ACTIVE_EDITORIAL_QA_COMPLETED",
            jm1_sourcerecordid: "stage-1"
          }
        ]
      }
    );
    assert.equal(result.completed, 1);
    assert.equal(result.results[0].packageResult.packageVersion, "v2");
    assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_REASSEMBLED_AFTER_QA_FAILURE"));
    assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "EDITORIAL_PACKAGE_HANDOFF_COMPLETED"));
    assert.equal(client.calls.created.some((call) => call.payload.jm1_actiontype === "PROOFREADING_STAGE_COMPLETED"), false);
  } finally {
    graphRequest.override = null;
  }
});

test("duplicate handoff completion prevents a second manifest and package version", async () => {
  const client = createClient({ existingCompleted: true });
  const result = await runEditorialPackageHandoffConsumer(
    { correlationId: "duplicate-test", maxOutputs: 1 },
    {
      client,
      qaLogs: [
        {
          jm1_executionlogid: "qa-log",
          jm1_actiontype: "ACTIVE_EDITORIAL_QA_COMPLETED",
          jm1_sourcerecordid: "stage-1"
        }
      ]
    }
  );
  assert.equal(result.idempotent, 1);
  assert.equal(client.calls.created.some((call) => call.entitySet === "jm1pub_editorialartifacts"), false);
});

test("missing package-required change ledger blocks handoff with an exact exception", async () => {
  const client = createClient({ omitLedger: true });
  const result = await runEditorialPackageHandoffConsumer(
    { correlationId: "missing-ledger-test", maxOutputs: 1 },
    {
      client,
      qaLogs: [
        {
          jm1_executionlogid: "qa-log",
          jm1_actiontype: "EDITORIAL_OUTPUT_QA_COMPLETED",
          jm1_sourcerecordid: "stage-1"
        }
      ]
    }
  );
  assert.equal(result.blocked, 1);
  assert.match(result.results[0].reason, /REQUIRED_STAGE_ARTIFACT_MISSING:changeLedger/);
});
