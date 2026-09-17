import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(path.resolve(import.meta.dirname, "..", "plugin", "V2RequestTransitionPlugin.cs"), "utf8");

test("governed transition updates lifecycle and engagement in one plugin transaction", () => {
  assert.match(source, /service\.Update\(new Entity\("jmpv2_lifecycleinstance"/);
  assert.match(source, /EnsureEngagementProjection\(service, command, command\.RequestedNextStage\)/);
  assert.match(source, /service\.Update\(new Entity\("jmpv2_publishingengagement"/);
});

test("idempotent replay reconciles projection without creating another transition", () => {
  const existingBranch = source.slice(source.indexOf("if (existing != null)"), source.indexOf("var lifecycleEntity"));
  assert.match(existingBranch, /EnsureEngagementProjection/);
  assert.doesNotMatch(existingBranch, /service\.Create\(new Entity\("jmpv2_transitionevent"/);
  assert.match(existingBranch, /replay: true|true\);/);
});

test("projection fails closed on cardinality and conflicting state", () => {
  assert.match(source, /ENGAGEMENT_PROJECTION_CARDINALITY_INVALID/);
  assert.match(source, /ENGAGEMENT_PROJECTION_CONFLICT/);
  assert.match(source, /statecode/);
});

test("authorization, stage order, version, and direct-write guards remain", () => {
  for (const guard of ["phase1b-authorized-actor", "V2_TRANSITION_AUTHORITY", "STALE_COMMAND", "SKIPPED_STAGE", "DIRECT_CURRENT_STATE_WRITE_DENIED"])
    assert.match(source, new RegExp(guard));
});
