"use strict";
const b = require("./newSubmissionStage03Budget");
const stage02 = require("./newSubmissionStage02");
const policy = require("./jackieInternalTitlePolicy");
const MODES = ["SUBMISSION_06_PREFLIGHT", "SUBMISSION_06_ACCEPT", "SUBMISSION_06_READBACK"];
const required = ["legalName", "phone", "mailingAddress", "genre", "targetAudience", "shortDescription", "manuscriptStatus",
  "preferredPrintFormat", "preferredTrimSize", "interiorColor", "paperTypePreference", "bindingType", "publishingGoal", "governedFormatSelection"];
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function validateSubmission(row, bundle, execution) {
  let payload;
  try { payload = JSON.parse(row?.jm1pub_rawpayload); } catch { deny("STAGE06_SUBMISSION_INVALID"); }
  const a = payload.governedAuthority, answers = payload.rawFormData;
  if (!row["@odata.etag"] || !row.jm1pub_submissionid || row.jm1pub_formtype !== "author-onboarding-attempt" ||
      row._jm1pub_linkedcontact_value !== policy.CONTACT || a?.contactId !== policy.CONTACT ||
      a.titleId !== bundle.offer.titleId || a.agreementSha256 !== execution.agreementSha256 ||
      a.policyVersion !== "PUBLISHER_FUNDED_ONBOARDING_V1" || payload.bookTitle !== bundle.title ||
      !answers || answers.bookTitle !== bundle.title || answers.packageConfirmation !== "PUBLISHER_FUNDED" ||
      required.some(k => typeof answers[k] !== "string" || !answers[k].trim()) ||
      ![true, "true"].includes(answers.rightsHolderConfirmed) || payload.rightsHolderConfirmed !== true ||
      row.jm1pub_rightsholderconfirmed !== true || payload.email !== answers.email || row.jm1pub_email !== answers.email) deny("STAGE06_SUBMISSION_BINDING_CONFLICT");
  return { submissionId: row.jm1pub_submissionid, etag: row["@odata.etag"], rawPayloadSha256: b.sha(row.jm1pub_rawpayload),
    agreementSha256: a.agreementSha256, formats: answers.governedFormatSelection,
    provenance: answers.submissionProvenance || { actor: "AUTHOR_BOUND_FORM" } };
}
function validateExecution(execution, bundle) {
  if (execution?.titleId !== bundle.offer.titleId || execution.offerSha256 !== bundle.offer.offerSha256 ||
      execution.status !== "REPLACEMENT_EXECUTION_VERIFIED" || execution.stage05Complete !== true ||
      execution.authorDueCents !== 0 || execution.authorPaymentDisposition !== "NOT_APPLICABLE_PUBLISHER_FUNDED" ||
      execution.paymentCreated !== false || !execution.proof?.seal?.fullDocumentIntegrity || execution.proof.requiredPartyEvents !== 2) deny("STAGE06_EXECUTION_REQUIRED");
}
async function readiness(titleId, submissionId, deps) {
  const bundle = await require("./publisherFundedStage04").load(titleId, deps);
  const executionReference = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}/replacement-v2/execution.json`;
  const execution = (await b.read(deps.containerClient, executionReference)).value;
  validateExecution(execution, bundle);
  const prepared = (await b.read(deps.containerClient, executionReference.replace("execution.json", "prepared.json"))).value;
  if (prepared.agreementSha256 !== execution.agreementSha256 || prepared.authorElectionReference !== execution.authorElectionReference) deny("STAGE06_EXECUTION_VERSION_CONFLICT");
  const row = await deps.authorityClient.first("jm1pub_submissions", { $filter: `jm1pub_submissionid eq ${submissionId}` });
  const submission = validateSubmission(row, bundle, execution);
  const sourceReference = `new-submission-stage02/${titleId}/${bundle.sourceFingerprint}/receipt.json`;
  const source = (await b.read(deps.containerClient, sourceReference)).value;
  if (source.titleId !== titleId || source.contactId !== policy.CONTACT || source.sourceFingerprint !== bundle.sourceFingerprint ||
      source.status !== "COMPLETED" || source.stageCode !== "02_INTAKE" || source.outputs?.length !== bundle.offer.components.length ||
      source.collectionTreatment !== (source.outputs.length > 1 ? "SEPARATE_COMPONENTS_NO_ORDER_OR_CONCATENATION_INFERRED" : "SINGLE_WORKING_SOURCE")) deny("STAGE06_WORKSPACE_UNPROVEN");
  for (const output of source.outputs) {
    if (output.role !== "EDITORIAL_WORKING_SOURCE") deny("STAGE06_WORKSPACE_UNPROVEN");
    await stage02.verifyOutput(output, deps);
  }
  await stage02.verifyOutput(source.manifest, deps);
  const second = await deps.authorityClient.first("jm1pub_submissions", { $filter: `jm1pub_submissionid eq ${submissionId}` });
  if (second?.["@odata.etag"] !== row["@odata.etag"] || second.jm1pub_rawpayload !== row.jm1pub_rawpayload) deny("STAGE06_SUBMISSION_CHANGED");
  return { schemaVersion: 1, titleId, contactId: policy.CONTACT, offerSha256: bundle.offer.offerSha256,
    agreementSha256: execution.agreementSha256, executionReference, submission, sourceReference,
    sourceFingerprint: bundle.sourceFingerprint, workingSources: source.outputs, collectionTreatment: source.collectionTreatment,
    stageCode: "06_ONBOARDING", status: "COMPLETED", stage06Complete: true,
    nextStage: "07_DEVELOPMENTAL_EDITING", nextWork: "HELD_FOR_APPROVED_INTERNAL_BUDGET_AND_EDITORIAL_GATES",
    authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", authorDueCents: 0,
    portalRequired: false, stripeConnectIndependent: true, payments: 0, communications: 0, modelCalls: 0,
    reference: `publisher-funded/stage06/${titleId}/${execution.agreementSha256}/receipt.json` };
}
async function handler(body, supplied = {}) {
  if (!MODES.includes(body.mode) || !Object.hasOwn(policy.TITLES, body.titleId || "") ||
      !/^[a-f0-9-]{36}$/.test(body.submissionId || "") || Object.keys(body).some(k => !["mode", "titleId", "submissionId"].includes(k))) return { status: 400, jsonBody: { code: "STAGE06_SCOPE_DENIED" } };
  const env = supplied.env || process.env;
  if (body.mode === "SUBMISSION_06_ACCEPT" && (env.JM1_NEW_SUBMISSION_STAGE06_ENABLED !== "true" ||
      !(env.JM1_NEW_SUBMISSION_STAGE06_TITLE_IDS || "").split(",").includes(body.titleId) ||
      ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"].some(k => env[k] !== "false"))) return { status: 403, jsonBody: { code: "STAGE06_DISABLED" } };
  try {
    const deps = await require("./newSubmissionStage01").native(supplied);
    if ((await deps.containerClient.getProperties()).blobPublicAccess) deny("STAGE06_PRIVATE_STORAGE_REQUIRED");
    const result = await readiness(body.titleId, body.submissionId, deps);
    const prior = await b.optional(deps.containerClient, result.reference);
    if (prior && JSON.stringify(prior.value) !== JSON.stringify(result)) deny("STAGE06_RECEIPT_CONFLICT");
    if (body.mode === "SUBMISSION_06_ACCEPT") await b.immutable(deps.containerClient, result.reference, result);
    return { status: 200, jsonBody: { readiness: result, accepted: Boolean(prior) || body.mode === "SUBMISSION_06_ACCEPT", replay: Boolean(prior), payments: 0, communications: 0, modelCalls: 0 } };
  } catch (e) { return { status: 409, jsonBody: { code: /^STAGE06_[A-Z_]+$/.test(e.safeCode || "") ? e.safeCode : "STAGE06_DEPENDENCY_FAILED", providerStatus: e.statusCode || null } }; }
}
module.exports = { MODES, validateSubmission, validateExecution, readiness, handler };
