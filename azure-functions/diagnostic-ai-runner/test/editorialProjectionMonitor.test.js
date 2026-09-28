"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { runEditorialProjectionMonitor } = require("../src/editorial/editorialProjectionMonitor");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
const gateId = "4d04daa2-67b5-f111-aaac-000d3a14673b";
const artifactId = "8ed48c9c-67b5-f111-aaab-000d3a10aa9c";

function fixture(stageStatus = 100000002, folderStage = "07 - Developmental Editing", stageType = 100000001, nested = false) {
  const alerts = [];
  const patches = [];
  const nodes = { anchor: { id: "anchor", parentReference: { id: nested ? "original" : "editorial" } },
    editorial: { id: "editorial", name: "02_Editorial", parentReference: { id: "folder" } },
    original: { id: "original", name: "Original", folder: {}, parentReference: { id: "manuscript" } },
    manuscript: { id: "manuscript", name: "01_Manuscript", folder: {}, parentReference: { id: "folder" } },
    folder: { id: "folder", name: "Fly, Jackuline - Whole", folder: {}, parentReference: { id: "parent" } },
    parent: { id: "parent", name: folderStage, folder: {}, parentReference: { id: "pipeline" } },
    pipeline: { id: "pipeline", name: "01_Pipeline_A-Z", folder: {} } };
  const client = { async list(set, query) {
    if (set === "jm1pub_editorialstages") return [{ jm1pub_editorialstageid: stageId,
      _jm1pub_titleid_value: titleId, jm1pub_stagetype: stageType,
      jm1pub_stagesequence: 2, jm1pub_stagestatus: stageStatus }];
    if (set === "jm1pub_editorialapprovalgates") return [{ jm1pub_editorialapprovalgateid: gateId,
      _jm1pub_titleid_value: titleId, _jm1pub_editorialstageid_value: stageId,
      _jm1pub_deliverableartifactid_value: artifactId, jm1pub_gatestatus: 196650002 }];
    if (set === "jm1pub_editorialartifacts") return [{ jm1pub_editorialartifactid: artifactId,
      _jm1pub_titleid_value: titleId, _jm1pub_editorialstageid_value: stageId,
      jm1pub_repositorydriveid: "drive", jm1pub_repositoryitemid: "anchor" }];
    if (set === "jm1_executionlogs" && query.$filter.includes("EDITORIAL_PROJECTION_EXCEPTION")) {
      return alerts.filter((entry) => query.$filter.includes(entry.key)).map((entry) => ({ jm1_executionlogid: entry.key }));
    }
    if (set === "jm1_executionlogs" && query.$filter.includes("EDITORIAL_DELIVERED_REVIEW_STAGE_RECONCILED")) return [];
    if (set === "jm1_executionlogs") return [{ jm1_executionlogid: "delivery",
      jm1_actiontype: "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT", jm1_sourcerecordid: stageId,
      jm1_actiondescription: `DELIVERY_STATUS=SENT; gate=${gateId};` }];
    return [];
  }, async patch(set, id, payload) { patches.push({ set, id, payload }); },
  async create(set, payload) { alerts.push({ key: payload.jm1_actiondescription.match(/reconciliationId=([^;]+)/)?.[1], input: payload }); return "audit"; } };
  const graph = async (path) => nodes[path.match(/items\/([^?]+)/)?.[1]];
  const writeLog = async (_, input) => { alerts.push({ key: input.description.match(/reconciliationId=([^;]+)/)?.[1], input }); return "audit"; };
  return { deps: { client, graph, writeLog }, alerts, patches };
}

test("healthy delivered review stays quiet", async () => {
  const { deps, alerts } = fixture();
  const result = await runEditorialProjectionMonitor(deps);
  assert.equal(result.status, "HEALTHY");
  assert.equal(result.newAlerts, 0);
  assert.equal(alerts.length, 0);
});

test("a title already in Stage 07 is healthy when its artifact uses a nested manuscript folder", async () => {
  const { deps } = fixture(100000002, "07 - Developmental Editing", 100000001, true);
  const result = await runEditorialProjectionMonitor(deps);
  assert.equal(result.status, "HEALTHY");
  assert.equal(result.newAlerts, 0);
});

test("delivered stage and workspace lag alert once without changing business state", async () => {
  const { deps, alerts } = fixture(100000001, "06 - Onboarding");
  const first = await runEditorialProjectionMonitor(deps);
  assert.equal(first.newAlerts, 2);
  assert.deepEqual(first.exceptions.map((x) => x.classification), ["SYSTEM_ACTIONABLE", "SYSTEM_ACTIONABLE"]);
  const replay = await runEditorialProjectionMonitor(deps);
  assert.equal(replay.newAlerts, 0);
  assert.equal(alerts.length, 2);
  assert.equal(replay.authorCommunications, 0);
});

test("durable monitor repairs a bound delivered-stage lag without an author send", async () => {
  const { deps, patches } = fixture(100000001, "07 - Developmental Editing", 100000000);
  const originalList = deps.client.list;
  deps.client.list = (set, query) => {
    if (set === "jm1pub_editorialstages" && query.$filter?.includes("stagesequence gt")) return [];
    return originalList(set, query);
  };
  const result = await runEditorialProjectionMonitor({ ...deps, autoReconcile: true });
  assert.equal(result.status, "RECONCILED");
  assert.equal(result.remediated.length, 1);
  assert.deepEqual(patches, [{ set: "jm1pub_editorialstages", id: stageId,
    payload: { jm1pub_stagestatus: 100000002 } }]);
  assert.equal(result.authorCommunications, 0);
});
