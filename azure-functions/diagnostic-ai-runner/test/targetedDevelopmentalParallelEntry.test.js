"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateTargetedEditorialExecution } = require("../src/editorial/editorialExecutionRuntime");
const { DEVELOPMENTAL_ENTRY_MARKER } = require("../src/editorial/parallelWorkstreamPolicy");

function client(marked = true) {
  const stage = {
    jm1pub_editorialstageid: "stage-dev", jm1pub_name: "Developmental Editing - Whole",
    jm1pub_stagetype: 100000001, jm1pub_stagestatus: 100000001, _jm1pub_titleid_value: "title-1",
    jm1pub_internaloperationalsummary: marked
      ? `${DEVELOPMENTAL_ENTRY_MARKER}; sourceArtifactId=source-1; agreementEvidence=agreement-1; commercialEvidence=payment-1;`
      : "ordinary Developmental stage"
  };
  return {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1pub_titles") return [{ jm1pub_titleid: "title-1", jm1pub_titlename: "Whole", jm1pub_authorname: "Jackuline Fly" }];
      if (entitySet === "jm1pub_editorialstages") {
        if (/jm1pub_stagetype eq 100000001/.test(query.$filter || "")) return [stage];
        if (/jm1pub_stagetype eq 100000000/.test(query.$filter || "")) return [];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        if (/jm1pub_editorialartifactid eq source-1/.test(query.$filter || "")) return [{
          jm1pub_editorialartifactid: "source-1", jm1pub_filename: "whole.docx", jm1pub_sha256: "sha-1",
          jm1pub_iscurrentapproved: true, _jm1pub_titleid_value: "title-1"
        }];
        return [];
      }
      if (entitySet === "jm1pub_editorialapprovalgates" || entitySet === "jm1_executionlogs") return [];
      throw new Error(`Unexpected ${entitySet} ${JSON.stringify(query)}`);
    }
  };
}

const request = {
  titleId: "title-1", stageCode: "DEVELOPMENTAL_EDITING", sourceArtifactId: "source-1",
  sourceChecksum: "sha-1", authorApprovalRequired: false, executionMode: "DRY_RUN"
};

test("targeted Developmental execution accepts a system-marked commercial/manuscript entry", async () => {
  const result = await evaluateTargetedEditorialExecution(request, { client: client(true) });
  assert.equal(result.ok, true);
  assert.equal(result.authorApprovalEvidence.authorityType, "COMMERCIAL_MANUSCRIPT_PARALLEL_ENTRY");
});

test("targeted Developmental execution denies an unmarked stage without prior approval", async () => {
  const result = await evaluateTargetedEditorialExecution(request, { client: client(false) });
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUTHOR_APPROVAL_NOT_EXACT_ARTIFACT_BOUND");
});
