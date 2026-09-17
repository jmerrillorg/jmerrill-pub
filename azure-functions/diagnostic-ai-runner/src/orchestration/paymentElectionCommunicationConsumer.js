"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { buildPaymentPlans } = require("../author/paymentPolicyEngine");
const { PAYMENT_ELECTION_ACTION_TYPE } = require("../author/paymentElectionActionRequest");
const { createDataverseClient } = require("./authorReviewResponseConsumer");

const TEMPLATE_ID = "PUBLISHING.PAYMENT_ELECTION_REQUIRED";
const TEMPLATE_VERSION = "1.0.0";
const ADOPTION_MARKER = "communicationAuthority=JM1_COMMS_002A";
const EXECUTION_STATUS = Object.freeze({ SUCCESS: 835500001, FAILED: 835500002 });
const BAND_LEVEL_1 = 835500000;
const EFFECT_STATE = Object.freeze({
  PENDING: "PAYMENT_ELECTION_COMMUNICATION_PENDING",
  ACCEPTED: "PAYMENT_ELECTION_COMMUNICATION_ACCEPTED",
  FAILED: "PAYMENT_ELECTION_COMMUNICATION_FAILED",
  CANCELLED: "PAYMENT_ELECTION_COMMUNICATION_CANCELLED_SUPERSEDED",
  MANUAL: "PAYMENT_ELECTION_COMMUNICATION_MANUALLY_FULFILLED",
  WAITING: "WAITING_ON_AUTHOR_PAYMENT_OPTION_SELECTION"
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function odata(value) {
  return text(value).replace(/'/g, "''");
}

function parseFields(description) {
  const fields = {};
  for (const part of text(description).split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    fields[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  return fields;
}

function parsePaymentElectionActionRequest(row = {}) {
  const fields = parseFields(row.jm1_actiondescription);
  return {
    actionRequestId: text(row.jm1_executionlogid || row.actionRequestId),
    status: text(fields.status || row.status).toUpperCase(),
    currentRequirement: text(fields.currentRequirement).toUpperCase(),
    communicationAuthority: text(fields.communicationAuthority),
    opportunityId: text(fields.opportunityId || row.opportunityId),
    agreementId: text(fields.agreementId || row.agreementId),
    agreementVersion: text(fields.agreementVersion || row.agreementVersion),
    agreementChecksum: text(fields.agreementChecksum || row.agreementChecksum).toLowerCase(),
    correlationId: text(fields.correlationId || row.correlationId),
    contractedTotalUsd: Number(fields.contractedTotalUsd || row.contractedTotalUsd),
    paymentPolicyVersion: text(fields.paymentPolicyVersion || row.paymentPolicyVersion),
    packageName: text(fields.packageName || row.packageName),
    title: text(fields.title || row.title),
    createdOn: text(row.createdon || row.createdOn)
  };
}

function stableCommunicationIdempotencyKey(request) {
  return `payment-election-email:${request.actionRequestId}:${TEMPLATE_ID}:${TEMPLATE_VERSION}`;
}

function communicationEnabled() {
  return text(process.env.JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED).toLowerCase() === "true";
}

function dataverseConfig() {
  const apiBase = text(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const resourceUrl = text(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  if (!apiBase || !resourceUrl) throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  return { apiBase, resourceUrl };
}

async function findCurrentActionRequests(client, maxRequests = 10) {
  const limit = Math.min(Math.max(Number(maxRequests) || 10, 1), 25);
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `jm1_actiontype eq '${PAYMENT_ELECTION_ACTION_TYPE}' and contains(jm1_actiondescription,'${ADOPTION_MARKER}')`,
    $orderby: "createdon desc",
    $top: String(limit)
  });
  return rows.map(parsePaymentElectionActionRequest).filter((request) => request.status === "OPEN" && request.currentRequirement === "YES");
}

async function findEffectLog(client, requestId, actionTypes) {
  for (const actionType of actionTypes) {
    const found = await client.first("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
      $filter: `jm1_sourcerecordid eq '${odata(requestId)}' and jm1_actiontype eq '${odata(actionType)}'`,
      $orderby: "createdon desc"
    });
    if (found) return found;
  }
  return null;
}

async function resolveCurrentRequirement(client, request) {
  if (!request.actionRequestId || request.communicationAuthority !== "JM1_COMMS_002A") return { ok: false, reason: "NOT_COMMS_002A_CURRENT_REQUIREMENT" };
  if (!/^[0-9a-f-]{36}$/i.test(request.opportunityId) || !/^[0-9a-f-]{36}$/i.test(request.agreementId)) {
    return { ok: false, reason: "CURRENT_REQUIREMENT_IDENTITY_INVALID" };
  }
  const opportunity = await client.first("opportunities", {
    $select: "opportunityid,name,jm1pub_projecttitle,jm1_m6paymentoptionselectionstatus,jm1_m6selectedpaymentoption,jm1_m6selectedinstallmentcount,_parentcontactid_value,_customerid_value,statecode",
    $filter: `opportunityid eq ${request.opportunityId}`
  });
  if (!opportunity || Number(opportunity.statecode) !== 0) return { ok: false, reason: "OPPORTUNITY_NOT_CURRENT" };
  if (text(opportunity.jm1_m6selectedpaymentoption) || Number(opportunity.jm1_m6selectedinstallmentcount || 0) > 0 || text(opportunity.jm1_m6paymentoptionselectionstatus).toUpperCase() === "PAYMENT_OPTION_SELECTED") {
    return { ok: false, reason: "PAYMENT_OPTION_ALREADY_SELECTED" };
  }

  const contracts = await client.list("jm1pub_contracts", {
    $select: "jm1pub_contractid,jm1pub_providerstatus,jm1pub_docurl,jm1pub_selectedpackagecode,jm1pub_standardpackageprice,statecode,modifiedon",
    $filter: `_jm1pub_opportunity_value eq ${request.opportunityId} and statecode eq 0`,
    $orderby: "modifiedon desc",
    $top: "1"
  });
  const contract = contracts[0];
  if (!contract || text(contract.jm1pub_contractid).toLowerCase() !== request.agreementId.toLowerCase() || Number(contract.statecode) !== 0) {
    return { ok: false, reason: "AGREEMENT_SUPERSEDED" };
  }
  if (!/SIGNED|COMPLETED|EXECUTED/i.test(text(contract.jm1pub_providerstatus))) return { ok: false, reason: "AGREEMENT_NOT_EXECUTED" };
  if (request.agreementChecksum && !text(contract.jm1pub_docurl).toLowerCase().includes(request.agreementChecksum.slice(0, 16))) {
    return { ok: false, reason: "AGREEMENT_CHECKSUM_DRIFT" };
  }

  const contactId = text(opportunity._parentcontactid_value || opportunity._customerid_value);
  if (!/^[0-9a-f-]{36}$/i.test(contactId)) return { ok: false, reason: "AUTHOR_IDENTITY_MISSING" };
  const contact = await client.first("contacts", {
    $select: "contactid,fullname,firstname,emailaddress1,statecode",
    $filter: `contactid eq ${contactId}`
  });
  if (!contact || Number(contact.statecode) !== 0 || !text(contact.emailaddress1)) return { ok: false, reason: "AUTHOR_RECIPIENT_NOT_CURRENT" };

  const contractedTotalUsd = Number(contract.jm1pub_standardpackageprice || request.contractedTotalUsd);
  if (!Number.isFinite(contractedTotalUsd) || contractedTotalUsd <= 0) return { ok: false, reason: "CONTRACTED_TOTAL_INVALID" };
  if (Number.isFinite(request.contractedTotalUsd) && Math.round(request.contractedTotalUsd * 100) !== Math.round(contractedTotalUsd * 100)) {
    return { ok: false, reason: "CONTRACTED_TOTAL_DRIFT" };
  }

  return {
    ok: true,
    value: {
      recipient: text(contact.emailaddress1).toLowerCase(),
      authorFirstName: text(contact.firstname) || text(contact.fullname).split(/\s+/)[0],
      projectTitle: text(opportunity.jm1pub_projecttitle) || text(opportunity.name) || request.title,
      packageName: text(contract.jm1pub_selectedpackagecode) || request.packageName,
      contractedTotalUsd,
      paymentPolicyVersion: request.paymentPolicyVersion,
      agreementId: text(contract.jm1pub_contractid)
    }
  };
}

function buildTemplateData(state) {
  const baseAmountCents = Math.round(state.contractedTotalUsd * 100);
  const plans = buildPaymentPlans(baseAmountCents, state.paymentPolicyVersion);
  return {
    authorFirstName: state.authorFirstName,
    projectTitle: state.projectTitle,
    packageName: authorFacingPackageName(state.packageName),
    baseAmountCents,
    options: plans.map((plan) => ({
      code: plan.planCode,
      paymentAmountsCents: plan.installments.map((installment) => installment.totalDueCents),
      totalBeforeTaxCents: plan.totalDueCents
    }))
  };
}

function authorFacingPackageName(value) {
  const name = text(value).replace(/_/g, " ").replace(/\s+/g, " ");
  if (!name) return "Publishing Package";
  if (/package$/i.test(name)) return name;
  return `${name.replace(/\b\w/g, (letter) => letter.toUpperCase())} Publishing Package`;
}

function buildCommunicationRequest(request, state) {
  return {
    brand: "PUBLISHING",
    recipient: { address: state.recipient, displayName: state.authorFirstName },
    messageType: "PAYMENT_ELECTION_REQUIRED",
    riskClassification: "ROUTINE",
    sourceRecord: request.actionRequestId,
    businessObjectType: "PAYMENT_ELECTION_REQUIREMENT",
    businessObjectId: request.actionRequestId,
    correlationId: request.correlationId || request.actionRequestId,
    templateId: TEMPLATE_ID,
    templateVersion: TEMPLATE_VERSION,
    idempotencyKey: stableCommunicationIdempotencyKey(request),
    templateData: buildTemplateData(state)
  };
}

async function sendGovernedCommunication(payload, deps = {}) {
  const relayUrl = text(process.env.JM1_ENTERPRISE_RELAY_URL).replace(/\/$/, "");
  const audience = text(process.env.JM1_ENTERPRISE_RELAY_AUDIENCE);
  if (!relayUrl || !audience) return { ok: false, reason: "ENTERPRISE_RELAY_CONFIG_MISSING" };
  const credential = deps.credential || new DefaultAzureCredential();
  const token = await credential.getToken(`${audience.replace(/\/$/, "")}/.default`);
  if (!token?.token) return { ok: false, reason: "ENTERPRISE_RELAY_TOKEN_FAILED" };
  const response = await (deps.fetch || fetch)(`${relayUrl}/api/send-enterprise-governed-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, reason: body.reason || body.code || `ENTERPRISE_RELAY_HTTP_${response.status}`, status: response.status, body };
  return { ok: body.accepted === true, pending: body.inProgress === true, status: response.status, body };
}

async function writeEffectLog(client, requestId, actionType, description, failed = false) {
  return client.create("jm1_executionlogs", {
    jm1_name: `${actionType} - ${requestId}`.slice(0, 200),
    jm1_actiontype: actionType,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_agentname: "JM1 Payment Election Communication Consumer",
    jm1_agentmodel: "jm1-comms-002a-payment-election",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: "jm1_executionlog",
    jm1_sourcerecordid: requestId
  });
}

async function processPaymentElectionCommunication(client, request, deps = {}) {
  const terminal = await (deps.findEffectLog || findEffectLog)(client, request.actionRequestId, [EFFECT_STATE.ACCEPTED, EFFECT_STATE.WAITING, EFFECT_STATE.CANCELLED, EFFECT_STATE.MANUAL]);
  if (terminal) return { actionRequestId: request.actionRequestId, outcome: "IDEMPOTENT_NO_SEND", terminalState: terminal.jm1_actiontype };

  const current = await (deps.resolveCurrentRequirement || resolveCurrentRequirement)(client, request);
  if (!current.ok) {
    await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.CANCELLED,
      `Payment-election communication cancelled without send; reason=${current.reason}; status=CANCELLED_SUPERSEDED; historicalBackfill=0; paymentRequestCreated=0.`);
    return { actionRequestId: request.actionRequestId, outcome: "CANCELLED_SUPERSEDED", reason: current.reason };
  }

  let payload;
  try {
    payload = buildCommunicationRequest(request, current.value);
  } catch (error) {
    const reason = error.code || "PAYMENT_POLICY_RESOLUTION_FAILED";
    await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.FAILED,
      `Communication failed before relay; failureClass=${reason}; requirementStatus=OPEN; governedRetryAllowed=NO; paymentRequestCreated=0.`, true);
    return { actionRequestId: request.actionRequestId, outcome: "COMMUNICATION_FAILED", reason };
  }
  const pending = await (deps.findEffectLog || findEffectLog)(client, request.actionRequestId, [EFFECT_STATE.PENDING]);
  if (!pending) {
    await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.PENDING,
      `Communication pending; template=${TEMPLATE_ID}; version=${TEMPLATE_VERSION}; idempotencyKey=${payload.idempotencyKey}; recipientAuthority=currentContact; paymentRequestCreated=0.`);
  }

  let delivery;
  try {
    delivery = await (deps.sendGovernedCommunication || sendGovernedCommunication)(payload, deps);
  } catch (error) {
    delivery = { ok: false, reason: error.safeCode || error.code || "ENTERPRISE_RELAY_FAILED" };
  }
  if (delivery.pending) return { actionRequestId: request.actionRequestId, outcome: "COMMUNICATION_PENDING", idempotencyKey: payload.idempotencyKey };
  if (!delivery.ok) {
    await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.FAILED,
      `Communication failed; failureClass=${delivery.reason}; requirementStatus=OPEN; governedRetryAllowed=YES; idempotencyKey=${payload.idempotencyKey}; paymentRequestCreated=0.`, true);
    return { actionRequestId: request.actionRequestId, outcome: "COMMUNICATION_FAILED", reason: delivery.reason };
  }

  const body = delivery.body || {};
  await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.ACCEPTED,
    `ACS accepted payment-election communication; jm1MessageId=${text(body.jm1MessageId)}; providerMessageId=${text(body.providerMessageId)}; template=${TEMPLATE_ID}; version=${TEMPLATE_VERSION}; sender=${text(body.senderAddress)}; brandCc=${(body.brandCc || []).join(",")}; replyTo=${text(body.replyTo)}; deliveryReadback=ACCEPTANCE_ONLY; idempotencyKey=${payload.idempotencyKey}.`);
  await (deps.writeEffectLog || writeEffectLog)(client, request.actionRequestId, EFFECT_STATE.WAITING,
    `Waiting on author payment-option selection; communicationState=COMMUNICATION_ACCEPTED; authorReceivedNotAsserted=YES; paymentRequestCreated=0; jm1MessageId=${text(body.jm1MessageId)}.`);
  return {
    actionRequestId: request.actionRequestId,
    outcome: "COMMUNICATION_ACCEPTED",
    jm1MessageId: text(body.jm1MessageId),
    providerMessageId: text(body.providerMessageId),
    deliveryState: text(body.deliveryState) || "ACCEPTED",
    replay: body.replay === true
  };
}

async function runPaymentElectionCommunicationConsumer(input = {}, deps = {}) {
  if (!communicationEnabled() && input.forceEnabled !== true) {
    return { enabled: false, processed: 0, accepted: 0, failed: 0, cancelled: 0, results: [] };
  }
  const client = deps.client || createDataverseClient(dataverseConfig(), deps);
  const requests = await (deps.findActionRequests || findCurrentActionRequests)(client, input.maxRequests || 10);
  const results = [];
  for (const request of requests) results.push(await processPaymentElectionCommunication(client, request, deps));
  return {
    enabled: true,
    processed: results.length,
    accepted: results.filter((result) => result.outcome === "COMMUNICATION_ACCEPTED").length,
    failed: results.filter((result) => result.outcome === "COMMUNICATION_FAILED").length,
    cancelled: results.filter((result) => result.outcome === "CANCELLED_SUPERSEDED").length,
    results
  };
}

module.exports = {
  ADOPTION_MARKER,
  EFFECT_STATE,
  TEMPLATE_ID,
  TEMPLATE_VERSION,
  authorFacingPackageName,
  buildCommunicationRequest,
  buildTemplateData,
  findCurrentActionRequests,
  parsePaymentElectionActionRequest,
  processPaymentElectionCommunication,
  resolveCurrentRequirement,
  runPaymentElectionCommunicationConsumer,
  sendGovernedCommunication,
  stableCommunicationIdempotencyKey
};
