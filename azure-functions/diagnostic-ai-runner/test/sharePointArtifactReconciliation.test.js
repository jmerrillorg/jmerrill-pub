"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RESOLUTION_ORDER,
  evaluateSharePointArtifactReconciliation,
  runSharePointArtifactReconciliation,
  sha256
} = require("../src/editorial/sharePointArtifactReconciliation");

const bytes = Buffer.from("current governed SharePoint bytes", "utf8");
const oldChecksum = sha256(Buffer.from("older registered bytes", "utf8"));

function client() {
  return {
    patches: [],
    creates: [],
    async list() {
      return [{
        jm1pub_editorialartifactid: "artifact-1", jm1pub_filename: "manuscript.docx", jm1pub_sha256: oldChecksum,
        jm1pub_repositorydriveid: "drive-1", jm1pub_repositoryitemid: "item-1", jm1pub_repositorypath: "/canonical/manuscript.docx",
        jm1pub_iscurrentapproved: true, _jm1pub_titleid_value: "title-1"
      }];
    },
    async patch(entitySet, id, payload) { this.patches.push({ entitySet, id, payload }); },
    async create(entitySet, payload) { this.creates.push({ entitySet, payload }); return "log-1"; }
  };
}

const deps = (boundClient) => ({
  client: boundClient,
  resolveSourceGraphItem: async () => ({ driveId: "drive-1", item: { id: "item-1", name: "manuscript.docx" }, contentPath: "drives/drive-1/items/item-1/content" }),
  graphRequest: async () => bytes,
  writeLog: async (clientArg, payload) => clientArg.create("jm1_executionlogs", payload)
});

test("SharePoint-first resolution order preserves registered and canonical workspace authority", () => {
  assert.deepEqual(RESOLUTION_ORDER, [
    "REGISTERED_CANONICAL_ARTIFACT", "CANONICAL_SHAREPOINT_ONEDRIVE_TITLE_WORKSPACE",
    "GOVERNED_HISTORICAL_TITLE_WORKSPACE", "EXECUTION_EVIDENCE_RECOVERY_SOURCES", "GENUINELY_MISSING"
  ]);
});

test("dry run proves checksum drift without mutating or regenerating the artifact", async () => {
  const boundClient = client();
  const result = await evaluateSharePointArtifactReconciliation({ executionMode: "DRY_RUN", titleId: "title-1", artifactId: "artifact-1" }, deps(boundClient));
  assert.equal(result.status, "DRIFT_PROVEN");
  assert.equal(result.currentChecksum, sha256(bytes));
  assert.equal(result.checksumParity, false);
  assert.equal(boundClient.patches.length, 0);
});

test("execute repairs registration only and writes immutable evidence", async () => {
  const boundClient = client();
  const result = await runSharePointArtifactReconciliation({ executionMode: "EXECUTE", titleId: "title-1", artifactId: "artifact-1" }, deps(boundClient));
  assert.equal(result.status, "REGISTRATION_REPAIRED");
  assert.equal(result.mutationsPerformed, 2);
  assert.equal(boundClient.patches.length, 1);
  assert.equal(boundClient.patches[0].payload.jm1pub_sha256, sha256(bytes));
  assert.equal(boundClient.creates.length, 1);
});
