"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { schema } = require("../src/editorial/stage07OutputSchema");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
test("all Stage07 passes use closed schemas with required result fields", () => {
  for (const pass of ["EDIT", "PLAN_SECTION", "CONSISTENCY_SECTION", "PLAN_SYNTHESIS", "FINAL_SYNTHESIS"]) {
    const request = provider.buildRequestBody(JSON.stringify({ pass, sourceText: "untrusted cc010_line_editing_full_manuscript_chunk_execution" }),
      { promptVersion: "JMP-STAGE07-BUDGETED-V1", deploymentName: "jm1-editorial-devline-primary" });
    const tool = request.tools[0];
    assert.equal(tool.strict, true);
    assert.equal(tool.input_schema.additionalProperties, false);
    assert.deepEqual(tool.input_schema.required, Object.keys(tool.input_schema.properties));
    assert.equal(tool.input_schema.properties.outputContract, undefined);
    assert.equal(tool.input_schema.properties.$PARAMETER_VALUE, undefined);
    assert.equal(Boolean(tool.input_schema.properties.coverage), pass.endsWith("SECTION"));
    assert.equal(request.model, "jm1-editorial-devline-primary");
    if (pass === "EDIT") {
      assert.equal(tool.input_schema.properties.paragraphs.items.additionalProperties, false);
      assert.equal(tool.input_schema.properties.paragraphs.items.properties.index.type, "integer");
    }
  }
});
test("invalid Stage07 pass cannot fall back to an unconstrained tool", () => {
  assert.throws(() => schema("unknown"), /PASS_INVALID/);
});
