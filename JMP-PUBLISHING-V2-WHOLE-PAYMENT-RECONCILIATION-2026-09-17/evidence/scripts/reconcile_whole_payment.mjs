import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ROOT = "JMP-PUBLISHING-V2-WHOLE-PAYMENT-RECONCILIATION-2026-09-17";
const OUTPUT = `${ROOT}/evidence/whole_payment_reconciliation.json`;
const CORE = "https://jm1hq.crm.dynamics.com";
const UAT = "https://jm1test.crm.dynamics.com";
const EXPECTED_UAT_ORG = "bb7a9d9e-8e73-f111-b27b-000d3a31ff17";

const AUTHOR_ID = "106a78d0-fb9a-f111-b8dc-6045bdd69738";
const TITLE_ID = "daf8180f-85a3-f111-b8de-000d3a14673b";
const ENGAGEMENT_ID = "0038ee51-27a9-f111-aaab-70a8a59b112b";
const LIFECYCLE_ID = "0238ee51-27a9-f111-aaab-70a8a59b112b";
const PAYMENT_REQUIREMENT_KEY = "WHOLE-STAGE05-FULL-PAYMENT-V1";
const PAYMENT_EVIDENCE_KEY = "WHOLE-STAGE05-STRIPE-AF63A5E8-0001-PAID-V1";
const PAYMENT_IDEMPOTENCY_KEY = "WHOLE|JACKULINE-FLY|STARTER|AF63A5E8-0001|PAID";
const RECONCILIATION_EVENT_KEY = "WHOLE-STAGE05-STRIPE-PAID-MANUAL-RECONCILIATION-V1";
const DEFECT_EVENT_KEY = "WHOLE-STAGE05-STRIPE-WEBHOOK-CORRELATION-DEFECT-V1";
const FINAL_AGREEMENT_KEY = "WHOLE-STAGE05-FINAL-AGREEMENT-V2-AUTHOR-ADDRESS";
const STRIPE_INVOICE_ID = "in_1UGHtWJCiOVFpgYurkA4KOl6";
const STRIPE_PAYMENT_INTENT_ID = "pi_3UGHtfJCiOVFpgYu1zhhFjhM";
const STRIPE_INVOICE_NUMBER = "AF63A5E8-0001";
const RECEIVED_AT = "2026-09-16T19:22:18Z";
const CANONICAL_WORKSPACE_ITEM_ID = "01DF3SEQMAUJPNMVSYYNAJHWCYEFSEVLLO";
const CANONICAL_WORKSPACE_PATH = "01_Pipeline_A-Z/05 - Agreement & Payment/Fly, Jackuline - Whole";

function accessToken(resource) {
  return execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
}

function stripe(args) {
  return JSON.parse(execFileSync("stripe", [...args, "--live"], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }));
}

async function request(base, token, route, options = {}) {
  const response = await fetch(`${base}/api/data/v9.2/${route}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || "GET"} ${route} failed ${response.status}: ${text.slice(0, 1200)}`);
  return body;
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function main() {
  const startedAt = new Date().toISOString();
  const coreToken = accessToken(CORE);
  const uatToken = accessToken(UAT);
  const core = (route, options) => request(CORE, coreToken, route, options);
  const uat = (route, options) => request(UAT, uatToken, route, options);
  const rows = async (set, filter) => (await uat(`${set}?$filter=${encodeURIComponent(filter)}`)).value || [];

  const invoice = stripe(["invoices", "retrieve", STRIPE_INVOICE_ID]);
  const [who, contact, title, engagement, lifecycle, requirements, paymentEvidenceBefore, agreements, agreementExecutions, joinedBefore, onboardingBefore, transitionsBefore, workspaceBindings] = await Promise.all([
    uat("WhoAmI()"),
    core(`contacts(${AUTHOR_ID})?$select=contactid,fullname,emailaddress1,statecode`),
    core(`jm1pub_titles(${TITLE_ID})?$select=jm1pub_titleid,jm1pub_titlename,_jm1_primaryauthor_value`),
    uat(`jmpv2_publishingengagements(${ENGAGEMENT_ID})`),
    uat(`jmpv2_lifecycleinstances(${LIFECYCLE_ID})`),
    rows("jmpv2_paymentrequirements", `jmpv2_engagementid eq '${ENGAGEMENT_ID}' and jmpv2_requirementkey eq '${PAYMENT_REQUIREMENT_KEY}'`),
    rows("jmpv2_paymentevidences", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_agreementrecords", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_agreementexecutions", `jmpv2_agreementkey eq '${FINAL_AGREEMENT_KEY}'`),
    rows("jmpv2_joinedfamilymilestones", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_onboardingrecords", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_transitionevents", `jmpv2_lifecyclekey eq '${LIFECYCLE_ID}'`),
    rows("jmpv2_sharepointworkspacebindings", `jmpv2_lifecycleinstanceid eq '${LIFECYCLE_ID}'`),
  ]);

  const finalAgreement = agreements.find((row) => row.jmpv2_agreementkey === FINAL_AGREEMENT_KEY);
  const requirement = requirements[0];
  const exactExistingEvidence = paymentEvidenceBefore.filter((row) => row.jmpv2_idempotencykey === PAYMENT_IDEMPOTENCY_KEY || row.jmpv2_providerreference?.includes(STRIPE_INVOICE_ID));
  const preChecks = {
    uatAuthority: String(who.OrganizationId).toLowerCase() === EXPECTED_UAT_ORG,
    authorIdentity: contact.contactid === AUTHOR_ID && contact.fullname === "Jackuline Fly" && contact.emailaddress1 === "jackie2doreen@att.net" && contact.statecode === 0,
    titleIdentity: title.jm1pub_titleid === TITLE_ID && title.jm1pub_titlename === "Whole",
    engagementIdentity: engagement.jmpv2_canonicalauthorname === "Jackuline Fly" && engagement.jmpv2_canonicaltitlename === "Whole",
    starterPackage: engagement.jmpv2_package === "Starter Publishing Package" && Number(engagement.jmpv2_packageprice) === 1999,
    currentStage: engagement.jmpv2_currentstage === "05_AGREEMENT_PAYMENT" && lifecycle.jmpv2_currentstagecode === "05_AGREEMENT_PAYMENT" && lifecycle.jmpv2_isactive === true,
    onePaymentRequirement: requirements.length === 1 && Number(requirement?.jmpv2_amountdue) === 1999 && requirement?.jmpv2_currency === "USD",
    stripeInvoiceBinding: invoice.id === STRIPE_INVOICE_ID && invoice.number === STRIPE_INVOICE_NUMBER && invoice.customer_name === "Jackuline Fly" && invoice.customer_email === "jackie2doreen@att.net",
    stripeMetadataBinding: invoice.metadata?.jm1_engagement_id === ENGAGEMENT_ID && invoice.metadata?.jm1_title === "Whole" && invoice.metadata?.jm1_package === "Starter" && invoice.metadata?.jm1_payment_option === "FULL_PAY",
    stripePaymentParity: invoice.status === "paid" && invoice.paid === true && invoice.amount_paid === 199900 && invoice.amount_remaining === 0 && invoice.payment_intent === STRIPE_PAYMENT_INTENT_ID,
    noDuplicatePaymentBinding: exactExistingEvidence.length <= 1,
    canonicalWorkspaceBinding: workspaceBindings.length === 1 && workspaceBindings[0].jmpv2_workspaceitemid === CANONICAL_WORKSPACE_ITEM_ID && workspaceBindings[0].jmpv2_workspacepath === CANONICAL_WORKSPACE_PATH,
  };
  assert(Object.values(preChecks).every(Boolean), `FAIL_CLOSED_PRECHECK:${JSON.stringify(preChecks)}`);

  const correlationId = exactExistingEvidence[0]?.jmpv2_correlationid || crypto.randomUUID();
  let paymentEvidence = exactExistingEvidence[0] || null;
  let paymentEvidenceCreated = false;
  if (!paymentEvidence) {
    paymentEvidence = await uat("jmpv2_paymentevidences", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        jmpv2_paymentevidencekey: PAYMENT_EVIDENCE_KEY,
        jmpv2_requirementkey: PAYMENT_REQUIREMENT_KEY,
        jmpv2_engagementid: ENGAGEMENT_ID,
        jmpv2_amountreceived: "1999.00",
        jmpv2_currency: "USD",
        jmpv2_paymentstatus: "PAID",
        jmpv2_providerreference: `STRIPE_INVOICE:${STRIPE_INVOICE_ID}|NUMBER:${STRIPE_INVOICE_NUMBER}|PAYMENT_INTENT:${STRIPE_PAYMENT_INTENT_ID}`,
        jmpv2_correlationid: correlationId,
        jmpv2_idempotencykey: PAYMENT_IDEMPOTENCY_KEY,
        jmpv2_testclassification: "REAL_WHOLE_PAYMENT_RECONCILIATION_UAT",
        jmpv2_receivedat: RECEIVED_AT,
      },
    });
    paymentEvidenceCreated = true;
  }

  if (requirement.jmpv2_requirementstatus !== "PAID") {
    await uat(`jmpv2_paymentrequirements(${requirement.jmpv2_paymentrequirementid})`, {
      method: "PATCH",
      body: {
        jmpv2_requirementstatus: "PAID",
        jmpv2_paymentpolicy: "FULL_PAY|STRIPE_INVOICE|PAID|BALANCE_ZERO|FOUNDER_EVIDENCE_PLUS_STRIPE_NATIVE_READBACK",
        jmpv2_correlationid: correlationId,
      },
    });
  }

  async function createEventOnce(key, eventType, result, reasonCode) {
    const existing = await rows("jmpv2_executionevents", `jmpv2_executionkey eq '${key}'`);
    assert(existing.length <= 1, `DUPLICATE_EXECUTION_EVENT:${key}`);
    if (existing.length === 1) return { row: existing[0], created: false };
    const eventId = crypto.randomUUID();
    const row = await uat("jmpv2_executionevents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        jmpv2_executioneventid: eventId,
        jmpv2_executionkey: key,
        jmpv2_eventtype: eventType,
        jmpv2_sourcecomponent: "FOUNDER_EVIDENCE_PLUS_STRIPE_NATIVE_READBACK",
        jmpv2_lifecyclekey: LIFECYCLE_ID,
        jmpv2_causationid: STRIPE_INVOICE_ID,
        jmpv2_correlationid: correlationId,
        jmpv2_environment: "JM1-Test",
        jmpv2_result: result,
        jmpv2_reasoncode: reasonCode,
        jmpv2_eventtimestamp: new Date().toISOString(),
      },
    });
    return { row, created: true };
  }

  const reconciliationEvent = await createEventOnce(RECONCILIATION_EVENT_KEY, "STRIPE_PAYMENT_MANUAL_RECONCILIATION", "SUCCEEDED", "PAYMENT_BOUND_TO_WHOLE_STARTER_INVOICE_PAID");
  const defectEvent = await createEventOnce(DEFECT_EVENT_KEY, "STRIPE_PAYMENT_AUTOMATION_DEFECT", "DEFECT_RECORDED", "INVOICE_PAID_NOT_AUTOMATICALLY_CORRELATED_OR_CLEARED");

  const [requirementAfter, paymentEvidenceAfter, joinedAfter, onboardingAfter, transitionsAfter, engagementAfter, lifecycleAfter] = await Promise.all([
    uat(`jmpv2_paymentrequirements(${requirement.jmpv2_paymentrequirementid})`),
    rows("jmpv2_paymentevidences", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_joinedfamilymilestones", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_onboardingrecords", `jmpv2_engagementid eq '${ENGAGEMENT_ID}'`),
    rows("jmpv2_transitionevents", `jmpv2_lifecyclekey eq '${LIFECYCLE_ID}'`),
    uat(`jmpv2_publishingengagements(${ENGAGEMENT_ID})`),
    uat(`jmpv2_lifecycleinstances(${LIFECYCLE_ID})`),
  ]);

  const boundEvidence = paymentEvidenceAfter.filter((row) => row.jmpv2_idempotencykey === PAYMENT_IDEMPOTENCY_KEY);
  assert(boundEvidence.length === 1, "PAYMENT_EVIDENCE_READBACK_MISMATCH");
  assert(requirementAfter.jmpv2_requirementstatus === "PAID", "PAYMENT_REQUIREMENT_NOT_PAID");
  assert(Number(boundEvidence[0].jmpv2_amountreceived) === 1999 && boundEvidence[0].jmpv2_paymentstatus === "PAID", "PAYMENT_PARITY_READBACK_FAILED");
  assert(engagementAfter.jmpv2_currentstage === "05_AGREEMENT_PAYMENT" && lifecycleAfter.jmpv2_currentstagecode === "05_AGREEMENT_PAYMENT", "UNAUTHORIZED_STAGE_CHANGE");
  assert(joinedAfter.length === joinedBefore.length && onboardingAfter.length === onboardingBefore.length && transitionsAfter.length === transitionsBefore.length, "UNAUTHORIZED_DOWNSTREAM_EFFECT");

  const agreementExecuted = agreementExecutions.length === 1 && agreementExecutions[0].jmpv2_status === "EXECUTED";
  const result = {
    status: "PASS_PAYMENT_RECONCILED_STAGE_HELD_BY_EXECUTED_AGREEMENT_GATE",
    startedAt,
    completedAt: new Date().toISOString(),
    authority: {
      author: "Jackuline Fly",
      title: "Whole",
      package: "Starter",
      engagementId: ENGAGEMENT_ID,
      stripeInvoiceId: STRIPE_INVOICE_ID,
      stripeInvoiceNumber: STRIPE_INVOICE_NUMBER,
      stripePaymentIntentId: STRIPE_PAYMENT_INTENT_ID,
      amountReceivedUsd: "1999.00",
      balanceDueUsd: "0.00",
      paidAt: RECEIVED_AT,
    },
    preChecks,
    payment: {
      status: requirementAfter.jmpv2_requirementstatus,
      gate: "SATISFIED",
      evidenceId: boundEvidence[0].jmpv2_paymentevidenceid,
      evidenceCreatedByThisRun: paymentEvidenceCreated,
      evidenceCountForBinding: boundEvidence.length,
      duplicatePaymentBinding: "NO",
      followUpRequired: "NO",
    },
    contract: {
      finalAgreementStatus: finalAgreement?.jmpv2_status || "NOT_FOUND",
      agreementExecutionCount: agreementExecutions.length,
      status: agreementExecuted ? "EXECUTED" : "SENT_NOT_EXECUTED",
    },
    pipeline: {
      currentStage: engagementAfter.jmpv2_currentstage,
      nextStage: "06_ONBOARDING",
      advancementExecuted: "NO",
      blocker: agreementExecuted ? null : "EXECUTED_AGREEMENT_EVIDENCE_REQUIRED",
      joinedFamilyRecordsCreated: joinedAfter.length - joinedBefore.length,
      onboardingRecordsCreated: onboardingAfter.length - onboardingBefore.length,
      transitionsCreated: transitionsAfter.length - transitionsBefore.length,
    },
    workspace: {
      canonicalPath: workspaceBindings[0].jmpv2_workspacepath,
      canonicalItemId: workspaceBindings[0].jmpv2_workspaceitemid,
      moved: "NO",
      duplicateWorkspaceCreatedByThisRun: "NO",
      preExistingLegacyDuplicateDetected: "YES / 01 - Inquiry/Fly, Jackuline - Whole",
    },
    automation: {
      paymentEventDetectedAutomatically: "NO",
      paymentTitleCorrelationAutomatic: "NO",
      paymentGateClearedAutomatically: "NO",
      pipelineAdvancementTriggeredAutomatically: "NO",
      systemDefectRecorded: "YES",
      defect: "Stripe invoice.paid was not ingested/correlated into Dataverse; no payment evidence, gate update, or transition existed before founder-directed reconciliation.",
      reconciliationEventId: reconciliationEvent.row.jmpv2_executioneventid,
      defectEventId: defectEvent.row.jmpv2_executioneventid,
    },
    negativeProof: {
      paymentRemindersSent: 0,
      failedPaymentNoticesSent: 0,
      invoicesCreated: 0,
      paymentRequestsCreated: 0,
      authorCommunicationsSent: 0,
      workspaceMoves: 0,
      duplicateWorkspacesCreated: 0,
      unauthorizedStageTransitions: 0,
    },
    nextTitleAction: agreementExecuted
      ? "Run fresh Stage 05 to Stage 06 eligibility and advance through governed transition authority."
      : "Obtain and bind completed Adobe agreement evidence for Jackuline Fly; then run Stage 05 to Stage 06 eligibility and reconcile the pre-existing Stage 01 duplicate workspace before any physical move.",
  };

  fs.mkdirSync(`${ROOT}/evidence`, { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
