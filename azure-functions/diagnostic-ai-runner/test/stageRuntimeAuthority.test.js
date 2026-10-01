"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readEditorialStageAuthority } = require("../src/lifecycle/stageRuntimeAuthority");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";

function client(overrides = {}) {
  return {
    async first(entitySet) {
      return entitySet === "jm1pub_editorialstages"
        ? { jm1pub_editorialstageid: stageId, jm1pub_stagetype: 100000001,
            jm1pub_stagestatus: 100000002, _jm1pub_titleid_value: titleId,
            ...(overrides.stage || {}) }
        : { jm1pub_titleid: titleId, jm1pub_stage: 100000006,
            _jm1_primaryauthor_value: "106a78d0-fb9a-f111-b8dc-6045bdd69738",
            ...(overrides.title || {}) };
    }
  };
}

test("reads exact live editorial stage/title authority", async () => {
  const result = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" }, client());
  assert.equal(result.current, true);
  assert.equal(result.stageCode, "07_DEVELOPMENTAL_EDITING");
});

test("denies cross-title and mismatched stage type", async () => {
  const crossTitle = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ stage: { _jm1pub_titleid_value: "11111111-1111-1111-1111-111111111111" } }));
  assert.equal(crossTitle.current, false);
  const wrongStage = await readEditorialStageAuthority({ titleId, stageId, stageCode: "08_LINE_EDITING" }, client());
  assert.equal(wrongStage.stageCode, "");
  const completed = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ stage: { jm1pub_stagestatus: 100000008 } }));
  assert.equal(completed.current, false);
  const wrongLifecycle = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ title: { jm1pub_stage: 100000007 } }));
  assert.equal(wrongLifecycle.current, false);
});

test("denies unsupported stages until their canonical adapter is commissioned", async () => {
  await assert.rejects(readEditorialStageAuthority({ titleId, stageId, stageCode: "13_PRODUCTION" }, client()),
    /AUTHORITY_ADAPTER_NOT_COMMISSIONED/);
});
