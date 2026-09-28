"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { reconcileDevelopmentalWorkspace } = require("../src/editorial/developmentalWorkspaceReconciliation");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
const gateId = "4d04daa2-67b5-f111-aaac-000d3a14673b";
const artifactId = "8ed48c9c-67b5-f111-aaab-000d3a10aa9c";
const checksum = "a".repeat(64);

function fixture({ laterStage = false, collision = false, missingPathBinding = false } = {}) {
  const state = { parent: "stage06", patches: [], logs: [], moves: 0 };
  const folder = (id, name, parent) => ({ id, name, folder: {}, parentReference: { id: parent },
    webUrl: `https://example.test/${name}` });
  const nodes = {
    anchor: { id: "anchor", name: "review.docx", parentReference: { id: "editorial" },
      webUrl: "https://example.test/01_Pipeline_A-Z/07%20-%20Developmental%20Editing/Whole/02_Editorial/review.docx" },
    editorial: folder("editorial", "02_Editorial", "whole"),
    whole: folder("whole", "Fly, Jackuline - Whole", "stage06"),
    stage06: folder("stage06", "06 - Onboarding", "pipeline"),
    stage07: folder("stage07", "07 - Developmental Editing", "pipeline"),
    pipeline: folder("pipeline", "01_Pipeline_A-Z", "root")
  };
  const client = {
    async list(set) {
      if (set === "jm1pub_editorialapprovalgates") return [{ jm1pub_editorialapprovalgateid: gateId,
        _jm1pub_titleid_value: titleId, _jm1pub_editorialstageid_value: stageId,
        _jm1pub_deliverableartifactid_value: artifactId, jm1pub_gatestatus: 196650002 }];
      if (set === "jm1pub_editorialstages") return laterStage ? [{ jm1pub_stagesequence: 3 }] : [];
    if (set === "jm1pub_editorialartifacts") return [{ jm1pub_editorialartifactid: artifactId,
      jm1pub_repositorydriveid: "drive", jm1pub_repositoryitemid: "anchor", jm1pub_sha256: checksum,
      jm1pub_repositorypath: "https://example.test/01_Pipeline_A-Z/06%20-%20Onboarding/Whole/02_Editorial/review.docx",
        _jm1pub_titleid_value: titleId, _jm1pub_editorialstageid_value: stageId },
      ...(missingPathBinding ? [{ jm1pub_editorialartifactid: "other", jm1pub_repositorydriveid: "",
        jm1pub_repositoryitemid: "", jm1pub_repositorypath: "https://example.test/01_Pipeline_A-Z/06%20-%20Onboarding/Whole/other.docx",
        _jm1pub_titleid_value: titleId }] : [])];
      if (set === "jm1_executionlogs") return state.logs;
      return [];
    },
    async patch(set, id, payload) { state.patches.push({ set, id, payload }); }
  };
  async function graph(path, options) {
    if (options?.method === "PATCH") {
      assert.match(path, /items\/whole$/);
      assert.deepEqual(JSON.parse(options.body), { parentReference: { id: "stage07" } });
      nodes.whole.parentReference.id = "stage07";
      state.moves += 1;
      return nodes.whole;
    }
    if (path.includes("items/pipeline:/")) return nodes.stage07;
    if (path.includes("items/stage07:/")) {
      if (collision) return { id: "other", name: "Fly, Jackuline - Whole" };
      throw Object.assign(new Error("not found"), { status: 404 });
    }
    const id = path.match(/items\/([^?]+)/)?.[1];
    return nodes[id] || null;
  }
  const input = { client, graph, writeLog: async (_, entry) => {
    state.logs.push({ jm1_executionlogid: "audit", jm1_actiondescription: entry.description });
    return "audit";
  }, releaseSha: "b".repeat(40),
  stage: { jm1pub_editorialstageid: stageId, _jm1pub_titleid_value: titleId,
    jm1pub_stagetype: 100000001, jm1pub_stagesequence: 2 },
  sent: { jm1_executionlogid: "delivery", jm1_sourcerecordid: stageId,
    jm1_actiontype: "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT",
    jm1_actiondescription: `DELIVERY_STATUS=SENT; gate=${gateId}; checksums=editedManuscript:${checksum};` } };
  return { input, state };
}

test("moves the existing title folder once and preserves its item identity on replay", async () => {
  const { input, state } = fixture();
  const first = await reconcileDevelopmentalWorkspace(input);
  assert.equal(first.status, "RECONCILED", first.reason);
  assert.equal(first.moved, true);
  assert.equal(first.folderId, "whole");
  assert.equal(state.moves, 1);
  assert.equal(state.patches.length, 1);
  assert.equal(state.patches[0].id, artifactId);
  const replay = await reconcileDevelopmentalWorkspace(input);
  assert.equal(replay.status, "RECONCILED");
  assert.equal(replay.moved, false);
  assert.equal(state.moves, 1);
  assert.equal(state.logs.length, 1);
});

test("does not move when a later editorial stage exists", async () => {
  const { input, state } = fixture({ laterStage: true });
  const result = await reconcileDevelopmentalWorkspace(input);
  assert.equal(result.reason, "LATER_EDITORIAL_STAGE_REQUIRES_WORKSPACE_REVIEW");
  assert.equal(state.moves, 0);
});

test("does not overwrite a different folder in the target stage", async () => {
  const { input, state } = fixture({ collision: true });
  const result = await reconcileDevelopmentalWorkspace(input);
  assert.equal(result.reason, "TARGET_TITLE_FOLDER_ALREADY_EXISTS");
  assert.equal(state.moves, 0);
});

test("rejects incomplete artifact bindings before moving the title folder", async () => {
  const { input, state } = fixture({ missingPathBinding: true });
  const result = await reconcileDevelopmentalWorkspace(input);
  assert.equal(result.reason, "ARTIFACT_PATH_BINDING_UNPROVEN");
  assert.equal(state.moves, 0);
});
