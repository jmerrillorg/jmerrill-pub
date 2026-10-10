"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { projectCommissioningEligibility: project } = require("../src/lifecycle/titleCommissioningEligibilityProjection");
const base = { source: { role: "CONTROLLING_SOURCE" }, scopePersisted: true,
  execution: { status: "COMPLETED" }, receipt: {} };
test("source and scope holds override later review records without granting execution", () => {
  assert.equal(project({ ...base, scopePersisted: false }).action, "OWNER_SCOPE_BINDING_REQUIRED");
  const p = project({ ...base, source: { role: "RECEIVED_ORIGINAL" }, reviewReceipt: { status: "ready" } });
  assert.equal(p.action, "CONTROLLING_SOURCE_REVIEW_REQUIRED");
  assert.equal(p.executionAuthorized, false); assert.equal(p.authorApprovalInferred, false);
});
test("owner retry, claim, hold and publisher action remain distinct", () => {
  for (const [status, action] of [["HELD", "EXACT_REVIEW_OWNER_RECOVERY_REQUIRED"],
    ["RETRY_PENDING", "WAIT_FOR_OWNER_RETRY"], ["CLAIMED", "WAIT_FOR_OWNER_CLAIM_RECONCILIATION"]]) {
    assert.equal(project({ ...base, reviewExecution: { status } }).action, action);
  }
  assert.equal(project({ ...base, reviewReceipt: {} }).action, "PUBLISHER_REVIEW_REQUIRED");
  assert.equal(project(base).action, "REVIEW_AUTHORITY_AND_ENABLEMENT_REQUIRED");
  assert.equal(project({ ...base, receipt: null }).action, "INTAKE_OWNER_RECONCILIATION_REQUIRED");
});
