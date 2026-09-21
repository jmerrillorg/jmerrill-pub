"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DEVELOPMENTAL_ENTRY_MARKER,
  DEPENDENCY_CLASSES,
  evaluateDevelopmentalEntry,
  hasDevelopmentalParallelEntryAuthority
} = require("../src/editorial/parallelWorkstreamPolicy");
const {
  evaluateDevelopmentalEntryMaterialization,
  runDevelopmentalEntryMaterialization
} = require("../src/editorial/developmentalEntryMaterialization");

function materializationClient(overrides = {}) {
  const rows = {
    titles: [{ jm1pub_titleid: "title-1", jm1pub_titlename: "Whole", jm1pub_authorname: "Jackuline Fly" }],
    artifacts: [{ jm1pub_editorialartifactid: "source-1", jm1pub_filename: "whole.docx", jm1pub_sha256: "sha-1", jm1pub_iscurrentapproved: true, _jm1pub_titleid_value: "title-1" }],
    contacts: [{ contactid: "contact-1", fullname: "Jackuline Fly", emailaddress1: "author@example.com" }],
    stages: [],
    logs: [],
    ...overrides
  };
  return {
    creates: [],
    async list(entitySet) {
      if (entitySet === "jm1pub_titles") return rows.titles;
      if (entitySet === "jm1pub_editorialartifacts") return rows.artifacts;
      if (entitySet === "contacts") return rows.contacts;
      if (entitySet === "jm1pub_editorialstages") return rows.stages;
      if (entitySet === "jm1_executionlogs") return rows.logs;
      throw new Error(`Unexpected entity set ${entitySet}`);
    },
    async create(entitySet, payload) {
      this.creates.push({ entitySet, payload });
      return entitySet === "jm1pub_editorialstages" ? "stage-created" : "log-created";
    }
  };
}

function entryInput(overrides = {}) {
  return {
    executionMode: "DRY_RUN",
    titleId: "title-1",
    sourceArtifactId: "source-1",
    sourceChecksum: "sha-1",
    contactId: "contact-1",
    recipient: "author@example.com",
    agreementEvidenceId: "agreement-1",
    commercialEvidenceId: "payment-1",
    packageName: "Starter",
    agreementExecuted: true,
    paymentOrPackageAuthoritySatisfied: true,
    onboardingComplete: false,
    ...overrides
  };
}

test("dependency taxonomy contains every governed dependency class", () => {
  assert.deepEqual(DEPENDENCY_CLASSES, [
    "HARD_PREREQUISITE", "SOFT_DEPENDENCY", "PARALLELIZABLE",
    "AUTHOR_DEPENDENCY", "PROVIDER_DEPENDENCY", "CADENCE_DEPENDENCY"
  ]);
});

test("Developmental Editing is actionable while onboarding remains incomplete", () => {
  const result = evaluateDevelopmentalEntry({
    agreementExecuted: true,
    paymentOrPackageAuthoritySatisfied: true,
    authoritativeManuscriptAvailable: true,
    onboardingComplete: false
  });
  assert.equal(result.actionable, true);
  assert.equal(result.onboardingBlocksDevelopmentalEditing, false);
  assert.deepEqual(result.parallelWorkstreams, ["AUTHOR_ONBOARDING", "DEVELOPMENTAL_EDITING"]);
});

test("Developmental entry fails closed when a real commercial gate is absent", () => {
  const result = evaluateDevelopmentalEntry({
    agreementExecuted: true,
    paymentOrPackageAuthoritySatisfied: false,
    authoritativeManuscriptAvailable: true,
    onboardingComplete: false
  });
  assert.equal(result.actionable, false);
  assert.deepEqual(result.blockers, ["PAYMENT_OR_PACKAGE_AUTHORITY_NOT_SATISFIED"]);
});

test("materializer validates exact source and recipient without mutating on dry run", async () => {
  const client = materializationClient();
  const result = await evaluateDevelopmentalEntryMaterialization(entryInput(), { client });
  assert.equal(result.ok, true);
  assert.equal(result.status, "DRY_RUN_READY");
  assert.equal(result.policy.onboardingBlocksDevelopmentalEditing, false);
  assert.equal(client.creates.length, 0);
});

test("materializer refuses a contact/recipient mismatch", async () => {
  const result = await evaluateDevelopmentalEntryMaterialization(entryInput({ recipient: "wrong@example.com" }), { client: materializationClient() });
  assert.equal(result.ok, false);
  assert.equal(result.code, "CONTACT_RECIPIENT_MISMATCH");
});

test("materializer creates one marked stage and one immutable log", async () => {
  const client = materializationClient();
  const result = await runDevelopmentalEntryMaterialization(entryInput({ executionMode: "EXECUTE" }), {
    client,
    writeLog: async (boundClient, payload) => boundClient.create("jm1_executionlogs", payload)
  });
  assert.equal(result.status, "MATERIALIZED");
  assert.equal(result.mutationsPerformed, 2);
  assert.equal(client.creates.length, 2);
  const stage = client.creates[0].payload;
  assert.match(stage.jm1pub_internaloperationalsummary, new RegExp(DEVELOPMENTAL_ENTRY_MARKER));
  assert.match(stage.jm1pub_internaloperationalsummary, /sourceArtifactId=source-1/);
});

test("unmarked Developmental stage cannot bypass the upstream author gate", async () => {
  assert.equal(hasDevelopmentalParallelEntryAuthority({ jm1pub_internaloperationalsummary: "ordinary stage" }, "source-1"), false);
});
