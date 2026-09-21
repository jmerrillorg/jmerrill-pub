"use strict";

const crypto = require("node:crypto");
const { DEVELOPMENTAL_ENTRY_MARKER, evaluateDevelopmentalEntry } = require("./parallelWorkstreamPolicy");

const MODES = Object.freeze({ DRY_RUN: "DRY_RUN", EXECUTE: "EXECUTE" });
const DEVELOPMENTAL_STAGE_TYPE = 100000001;
const IN_PROGRESS_STAGE_STATUS = 100000001;
function clean(value) { return String(value || "").trim(); }
function blocked(code, detail, extra = {}) { return { ok: false, status: "BLOCKED", code, detail, mutationsPerformed: 0, externalSends: 0, ...extra }; }
function runtime() { return require("./editorialExecutionRuntime"); }

function idempotencyKey(input) {
  return crypto.createHash("sha256").update([
    DEVELOPMENTAL_ENTRY_MARKER, clean(input.titleId), clean(input.sourceArtifactId), clean(input.sourceChecksum),
    clean(input.contactId), clean(input.agreementEvidenceId), clean(input.commercialEvidenceId)
  ].join(":"), "utf8").digest("hex");
}

async function evaluateDevelopmentalEntryMaterialization(input = {}, deps = {}) {
  const executionMode = clean(input.executionMode).toUpperCase();
  if (!Object.values(MODES).includes(executionMode)) return blocked("EXECUTION_MODE_REQUIRED", "executionMode must be DRY_RUN or EXECUTE.");
  for (const field of ["titleId", "sourceArtifactId", "sourceChecksum", "contactId", "recipient", "agreementEvidenceId", "commercialEvidenceId", "packageName"]) {
    if (!clean(input[field])) return blocked(`${field.replace(/([A-Z])/g, "_$1").toUpperCase()}_REQUIRED`, `${field} is required.`);
  }

  const policy = evaluateDevelopmentalEntry({
    agreementExecuted: input.agreementExecuted === true,
    paymentOrPackageAuthoritySatisfied: input.paymentOrPackageAuthoritySatisfied === true,
    authoritativeManuscriptAvailable: true,
    onboardingComplete: input.onboardingComplete === true
  });
  if (!policy.actionable) return blocked("DEVELOPMENTAL_ENTRY_GATES_NOT_SATISFIED", policy.blockers.join("; "), { policy });

  const editorialRuntime = deps.client ? null : runtime();
  const client = deps.client || editorialRuntime.createDataverseClient(editorialRuntime.requireDataverseConfig(), deps);
  const [titles, artifacts, contacts, stages] = await Promise.all([
    client.list("jm1pub_titles", { $select: "jm1pub_titleid,jm1pub_titlename,jm1pub_authorname", $filter: `jm1pub_titleid eq ${clean(input.titleId)}`, $top: "2" }),
    client.list("jm1pub_editorialartifacts", { $select: "jm1pub_editorialartifactid,jm1pub_filename,jm1pub_sha256,jm1pub_iscurrentapproved,_jm1pub_titleid_value", $filter: `jm1pub_editorialartifactid eq ${clean(input.sourceArtifactId)} and _jm1pub_titleid_value eq ${clean(input.titleId)}`, $top: "2" }),
    client.list("contacts", { $select: "contactid,fullname,emailaddress1", $filter: `contactid eq ${clean(input.contactId)}`, $top: "2" }),
    client.list("jm1pub_editorialstages", { $select: "jm1pub_editorialstageid,jm1pub_internaloperationalsummary,jm1pub_stagestatus,_jm1pub_titleid_value", $filter: `_jm1pub_titleid_value eq ${clean(input.titleId)} and jm1pub_stagetype eq ${DEVELOPMENTAL_STAGE_TYPE}`, $orderby: "modifiedon desc", $top: "5" })
  ]);
  if (titles.length !== 1) return blocked("TITLE_NOT_UNIQUE", "Exactly one title must resolve.", { resolvedCount: titles.length });
  if (artifacts.length !== 1) return blocked("SOURCE_ARTIFACT_NOT_UNIQUE", "Exactly one title-bound source artifact must resolve.", { resolvedCount: artifacts.length });
  if (contacts.length !== 1) return blocked("CONTACT_NOT_UNIQUE", "Exactly one author contact must resolve.", { resolvedCount: contacts.length });
  const artifact = artifacts[0];
  if (clean(artifact.jm1pub_sha256) !== clean(input.sourceChecksum)) return blocked("SOURCE_CHECKSUM_MISMATCH", "Registered source checksum does not match the authorized checksum.", { actualChecksum: clean(artifact.jm1pub_sha256) });
  if (artifact.jm1pub_iscurrentapproved !== true) return blocked("SOURCE_ARTIFACT_NOT_CURRENT_APPROVED", "Source artifact is not current approved.");
  if (clean(contacts[0].emailaddress1).toLowerCase() !== clean(input.recipient).toLowerCase()) return blocked("CONTACT_RECIPIENT_MISMATCH", "Resolved contact email does not match the governed recipient.");

  const key = idempotencyKey(input);
  const existing = stages.find((stage) => clean(stage.jm1pub_internaloperationalsummary).includes(`Idempotency ${key}`));
  if (existing) return { ok: true, status: "IDEMPOTENT", executionMode, idempotencyKey: key, stageId: existing.jm1pub_editorialstageid, policy, mutationsPerformed: 0, externalSends: 0 };
  if (stages.length > 0) return blocked("DEVELOPMENTAL_STAGE_ALREADY_EXISTS", "A different Developmental stage already exists for the title.", { existingStageIds: stages.map((stage) => stage.jm1pub_editorialstageid) });

  return {
    ok: true, status: executionMode === MODES.DRY_RUN ? "DRY_RUN_READY" : "EXECUTION_READY", executionMode,
    idempotencyKey: key, policy, canonicalTitle: titles[0], sourceArtifact: artifact, contact: contacts[0],
    expectedMutations: ["create one exact Developmental stage", "write one immutable execution record"], mutationsPerformed: 0, externalSends: 0
  };
}

async function runDevelopmentalEntryMaterialization(input = {}, deps = {}) {
  const evaluated = await evaluateDevelopmentalEntryMaterialization(input, deps);
  if (!evaluated.ok || evaluated.status === "IDEMPOTENT" || evaluated.executionMode === MODES.DRY_RUN) return evaluated;
  const editorialRuntime = deps.client && deps.writeLog ? null : runtime();
  const client = deps.client || editorialRuntime.createDataverseClient(editorialRuntime.requireDataverseConfig(), deps);
  const writeExecutionLog = deps.writeLog || editorialRuntime.writeLog;
  const title = clean(evaluated.canonicalTitle.jm1pub_titlename);
  const summary = `${DEVELOPMENTAL_ENTRY_MARKER}; sourceArtifactId=${clean(input.sourceArtifactId)}; sourceChecksum=${clean(input.sourceChecksum)}; agreementEvidence=${clean(input.agreementEvidenceId)}; commercialEvidence=${clean(input.commercialEvidenceId)}; package=${clean(input.packageName)}; onboardingComplete=${input.onboardingComplete === true}; Idempotency ${evaluated.idempotencyKey}.`;
  const stageId = await client.create("jm1pub_editorialstages", {
    jm1pub_name: `Developmental Editing - ${title}`, jm1pub_projecttitle: title,
    jm1pub_author: clean(evaluated.canonicalTitle.jm1pub_authorname), jm1pub_stagetype: DEVELOPMENTAL_STAGE_TYPE,
    jm1pub_stagestatus: IN_PROGRESS_STAGE_STATUS, jm1pub_stagesequence: 2,
    jm1pub_authorsafesummary: "Developmental Editing is proceeding while any remaining onboarding tasks continue independently.",
    jm1pub_internaloperationalsummary: summary, jm1pub_correlationid: `DEV-PARALLEL-${evaluated.idempotencyKey}`.slice(0, 100),
    jm1pub_stagestartdate: new Date().toISOString(), jm1pub_currentartifactcount: 0, jm1pub_currentgatecount: 0, jm1pub_openexceptioncount: 0,
    "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${clean(input.titleId)})`,
    "Jm1pub_Contactid@odata.bind": `/contacts(${clean(input.contactId)})`
  });
  const executionLogId = await writeExecutionLog(client, {
    name: `DEVELOPMENTAL_PARALLEL_ENTRY_MATERIALIZED - ${title}`, actionType: "DEVELOPMENTAL_PARALLEL_ENTRY_MATERIALIZED",
    description: `${summary} stageId=${stageId}; recipient=${clean(input.recipient)}; no author communication sent; no onboarding mutation performed.`,
    sourceEntity: "jm1pub_editorialstage", sourceRecordId: stageId
  });
  return { ...evaluated, status: "MATERIALIZED", stageId, executionLogId, mutationsPerformed: 2, externalSends: 0 };
}

module.exports = { MODES, idempotencyKey, evaluateDevelopmentalEntryMaterialization, runDevelopmentalEntryMaterialization };
