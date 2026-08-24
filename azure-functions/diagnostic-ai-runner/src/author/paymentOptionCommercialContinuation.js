"use strict";

/**
 * Governed payment-option commercial continuation.
 *
 * Consumes an existing Opportunity whose author payment option has
 * already been captured, locks the immutable pricing snapshot through
 * safe execution-log evidence, and advances only existing Opportunity
 * readiness fields. It never creates an Opportunity, agreement,
 * Stripe object, invoice, charge, author email, paid e-sign envelope,
 * signature-provider callback dependency, or production action.
 */

const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS } = require("../dataverse/metadataWriter");
const { NEW_FINANCING_POLICY_VERSION } = require("./authorOfferEngine");
const { computeInstallmentStripeAmountFromAuthorOffer } = require("../payment/agreementPaymentLinkMapping");

const GATE_NAME = "JM1_PAYMENT_OPTION_COMMERCIAL_CONTINUATION_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const OPPORTUNITY_ENTITY_SET = "opportunities";
const EVENT_TYPE = "PAYMENT_OPTION_PRICING_LOCKED";
const MODEL_NAME = "payment-option-commercial-continuation";
const OPPORTUNITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AGREEMENT_PREPARATION_READY = "AGREEMENT_PREPARATION_READY";
const READY_FOR_MANUAL_SIGNATURE_SEND = "READY_FOR_MANUAL_SIGNATURE_SEND";
const WAITING_ON_JMP = "WAITING_ON_JMP";
const PAYMENT_SELECTION_STATUS = "PAYMENT_OPTION_SELECTED";
const NEXT_AGREEMENT_ACTION = "GENERATE_VALIDATE_AGREEMENT_PACKAGE_FOR_MANUAL_SIGNATURE_SEND";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PAYMENT_OPTION_COMMERCIAL_CONTINUATION_BLOCKED", reason, ...extra };
}

function apiBase() {
  return normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
}

function resourceUrl() {
  return normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
}

function encodeODataString(value) {
  return normalizeString(value).replace(/'/g, "''");
}

async function dataverseRequest(api, token, path, options = {}) {
  const response = await fetch(`${api}/${path.replace(/^\//, "")}`, {
    method: options.method || "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse request failed: ${response.status}`), {
      safeCode: "DATAVERSE_REQUEST_FAILED",
      httpStatus: response.status,
      dvCode: body?.error?.code || null,
      dvMessage: typeof body?.error?.message === "string"
        ? body.error.message.replace(/\s+/g, " ").slice(0, 500)
        : null,
      step: options.step || null
    });
  }
  return { body, entityId: normalizeString(response.headers?.get?.("OData-EntityId")) || null };
}

function selectedPaymentPlanFromOpportunity(opportunity) {
  return {
    packageCode: normalizeString(opportunity.jm1_m6authorselectedpackagecode).toUpperCase(),
    paymentOptionCode: normalizeString(opportunity.jm1_m6selectedpaymentoption).toUpperCase(),
    installments: opportunity.jm1_m6selectedinstallmentcount,
    perInstallmentUsd: opportunity.jm1_m6selectedpaymentamount,
    totalUsd: opportunity.jm1_m6selectedpaymenttotal
  };
}

function validateSelectedPaymentState(opportunity) {
  const errors = [];
  if (normalizeString(opportunity.jm1_m6paymentoptionselectionstatus).toUpperCase() !== PAYMENT_SELECTION_STATUS) {
    errors.push("PAYMENT_OPTION_NOT_SELECTED");
  }
  const selected = selectedPaymentPlanFromOpportunity(opportunity);
  if (!selected.packageCode) errors.push("PACKAGE_CODE_MISSING");
  if (!selected.paymentOptionCode) errors.push("PAYMENT_OPTION_CODE_MISSING");
  if (!Number.isInteger(selected.installments) || selected.installments < 1 || selected.installments > 24) {
    errors.push("INSTALLMENT_COUNT_INVALID");
  }
  if (typeof selected.perInstallmentUsd !== "number" || !Number.isFinite(selected.perInstallmentUsd) || selected.perInstallmentUsd < 0) {
    errors.push("PER_INSTALLMENT_AMOUNT_INVALID");
  }
  if (typeof selected.totalUsd !== "number" || !Number.isFinite(selected.totalUsd) || selected.totalUsd < 0) {
    errors.push("TOTAL_AMOUNT_INVALID");
  }
  return { ok: errors.length === 0, errors, selected };
}

function buildPricingLockSnapshot({ opportunity, computed, lockedAt }) {
  const selected = selectedPaymentPlanFromOpportunity(opportunity);
  return {
    snapshotStatus: "PRICING_LOCKED",
    lockedAt,
    opportunityId: normalizeString(opportunity.opportunityid),
    intakeReferenceCode: normalizeString(opportunity.jm1pub_intaketrackingid),
    title: normalizeString(opportunity.jm1pub_projecttitle),
    packageCode: selected.packageCode,
    packageName: computed.offer.packageName,
    basePackagePrice: computed.offer.basePackagePrice,
    adjustedPackagePrincipal: computed.offer.adjustedPackagePrincipal,
    paymentOptionCode: selected.paymentOptionCode,
    planCode: computed.plan.planCode,
    installmentCount: computed.plan.paymentCount,
    regularPayment: computed.plan.installments[0]?.totalDue || 0,
    finalPayment: computed.plan.installments[computed.plan.installments.length - 1]?.totalDue || 0,
    totalBeforeTax: computed.plan.totalDue,
    paymentPolicyVersion: computed.paymentPolicyVersion,
    taxTreatment: computed.offer.taxTreatment,
    pricingException: false,
    downstreamAuthority: [
      "Dynamics Opportunity",
      "Agreement / Title Addendum",
      "Stripe arrangement",
      "Author Workspace",
      "Publisher Operating Center",
      "Business Central when integrated"
    ]
  };
}

function buildPricingLockExecutionLogPayload({ opportunity, snapshot, correlationId, completedAt }) {
  const description = [
    `Payment-option pricing locked for Opportunity ${snapshot.opportunityId}.`,
    `Intake ${snapshot.intakeReferenceCode}; title ${snapshot.title || "unknown"}.`,
    `Package ${snapshot.packageCode}; selected option ${snapshot.paymentOptionCode}; plan ${snapshot.planCode}.`,
    `Principal $${snapshot.adjustedPackagePrincipal.toFixed(2)}; term ${snapshot.installmentCount}; regular payment $${snapshot.regularPayment.toFixed(2)}; final payment $${snapshot.finalPayment.toFixed(2)}; total before tax $${snapshot.totalBeforeTax.toFixed(2)}.`,
    `Payment policy ${snapshot.paymentPolicyVersion}; pricing_exception=0; tax remains externally calculated.`,
    `Agreement preparation status advanced to ${AGREEMENT_PREPARATION_READY}.`,
    `Next governed action: ${NEXT_AGREEMENT_ACTION}; paid e-sign provider not required.`,
    correlationId ? `Correlation ID: ${correlationId}.` : null,
    "No author email, payment-options resend, Stripe customer, payment schedule, checkout session, invoice, charge, agreement send, paid e-sign envelope, Adobe Sign call, SignNow call, Business Central posting, production action, manuscript text, raw model output, secrets, tokens, or headers stored."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `PAYMENT-OPTION-PRICING-LOCK-${snapshot.opportunityId}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: OPPORTUNITY_ENTITY_SET,
    jm1_sourcerecordid: normalizeString(opportunity.opportunityid)
  };
}

function amountsMatch(computed, selected) {
  return computed.plan.paymentCount === selected.installments &&
    computed.plan.installments[0]?.totalDue === selected.perInstallmentUsd &&
    computed.plan.totalDue === selected.totalUsd;
}

async function continuePaymentOptionCommercialPath(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  const opportunityId = normalizeString(input.opportunityId);
  const correlationId = normalizeString(input.correlationId) || null;
  if (!opportunityId || !OPPORTUNITY_ID_PATTERN.test(opportunityId)) return blocked("OPPORTUNITY_ID_INVALID");
  if (input.confirmPaymentOptionCommercialContinuation !== true) return blocked("CONFIRMATION_REQUIRED");
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const api = deps.apiBase || apiBase();
  const resource = deps.resourceUrl || resourceUrl();
  if (!api || !resource) return blocked("DATAVERSE_CONFIG_MISSING");

  let token;
  try {
    token = deps.getToken ? await deps.getToken(resource) : await getDataverseToken(resource);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_AUTH_FAILED");
  }

  try {
    const opportunity = (await dataverseRequest(
      api,
      token,
      `opportunities(${opportunityId})?$select=opportunityid,name,jm1pub_intaketrackingid,jm1pub_projecttitle,jm1_m6authorselectedpackagecode,jm1_m6paymentoptionselectionstatus,jm1_m6selectedpaymentoption,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal,jm1_m6paymentselectionreceivedon,jm1_m6paymentselectionsource,jm1_m6agreementpreparationstatus,jm1pub_contractstatus,jm1pub_contracturl`
    )).body;

    const state = validateSelectedPaymentState(opportunity);
    if (!state.ok) return blocked("PAYMENT_OPTION_STATE_INVALID", { errors: state.errors });

    if (opportunity.jm1pub_contractstatus != null || normalizeString(opportunity.jm1pub_contracturl)) {
      return blocked("EXISTING_AGREEMENT_OR_CONTRACT_STATE_PRESENT", {
        contractStatus: opportunity.jm1pub_contractstatus ?? null,
        contractUrlPresent: Boolean(normalizeString(opportunity.jm1pub_contracturl))
      });
    }

    const intakeReferenceCode = normalizeString(opportunity.jm1pub_intaketrackingid);
    if (!intakeReferenceCode) return blocked("INTAKE_REFERENCE_MISSING");

    const duplicateFilter = encodeURIComponent(`jm1pub_intaketrackingid eq '${encodeODataString(intakeReferenceCode)}'`);
    const duplicates = (await dataverseRequest(
      api,
      token,
      `opportunities?$select=opportunityid,name,jm1pub_intaketrackingid&$filter=${duplicateFilter}&$top=2`
    )).body?.value || [];
    if (duplicates.length !== 1 || normalizeString(duplicates[0].opportunityid).toLowerCase() !== opportunityId.toLowerCase()) {
      return blocked("DUPLICATE_OR_CONFLICTING_OPPORTUNITY", { duplicateCount: duplicates.length });
    }

    const lockFilter = encodeURIComponent([
      `jm1_sourcerecordid eq '${encodeODataString(opportunityId)}'`,
      `jm1_actiontype eq '${EVENT_TYPE}'`
    ].join(" and "));
    const existingLock = (await dataverseRequest(
      api,
      token,
      `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,jm1_actiondescription,createdon&$filter=${lockFilter}&$orderby=createdon desc&$top=1`
    )).body?.value?.[0] || null;

    const computed = computeInstallmentStripeAmountFromAuthorOffer({
      packageCode: state.selected.packageCode,
      paymentOptionCode: state.selected.paymentOptionCode,
      paymentPolicyVersion: normalizeString(input.paymentPolicyVersion) || NEW_FINANCING_POLICY_VERSION
    });
    if (!computed.ok) return blocked(computed.error || "PRICING_COMPUTATION_FAILED");
    if (!amountsMatch(computed, state.selected)) {
      return blocked("PRICING_MISMATCH", {
        expected: {
          installments: computed.plan.paymentCount,
          regularPayment: computed.plan.installments[0]?.totalDue || null,
          finalPayment: computed.plan.installments[computed.plan.installments.length - 1]?.totalDue || null,
          totalBeforeTax: computed.plan.totalDue
        },
        observed: state.selected
      });
    }

    const lockedAt = normalizeString(existingLock?.createdon) || new Date().toISOString();
    const snapshot = buildPricingLockSnapshot({ opportunity, computed, lockedAt });
    let executionLogId = normalizeString(existingLock?.jm1_executionlogid) || null;
    let idempotentReplay = Boolean(existingLock);

    if (!existingLock) {
      const log = await dataverseRequest(api, token, EXECUTION_LOG_ENTITY_SET, {
        method: "POST",
        step: "pricing-lock-log:create",
        headers: { Prefer: "return=representation" },
        body: buildPricingLockExecutionLogPayload({ opportunity, snapshot, correlationId, completedAt: lockedAt })
      });
      executionLogId = normalizeString(log.body.jm1_executionlogid) || null;
    }

    await dataverseRequest(api, token, `opportunities(${opportunityId})`, {
      method: "PATCH",
      step: "opportunity:agreement-ready",
      body: {
        jm1_m6agreementpreparationstatus: AGREEMENT_PREPARATION_READY
      }
    });

    return {
      ok: true,
      code: "PAYMENT_OPTION_COMMERCIAL_CONTINUATION_COMPLETED",
      opportunityId,
      intakeReferenceCode,
      pricingLocked: true,
      idempotentReplay,
      executionLogId,
      snapshot,
      agreement: {
        generated: false,
        validated: false,
        sent: false,
        readyForManualSignatureSend: false,
        manualSignaturePolicy: true,
        waitingOn: WAITING_ON_JMP,
        nextAction: NEXT_AGREEMENT_ACTION,
        blocker: null
      },
      communication: {
        from: "publishing@email.jmerrill.one",
        replyTo: "publishing@jmerrill.one",
        cc: "publishing@jmerrill.one",
        htmlRequired: true,
        sent: false,
        blocker: null
      },
      stripe: {
        customerCreated: false,
        scheduleCreated: false,
        chargeCreated: false,
        nextGate: "AGREEMENT_ACCEPTANCE_OR_INITIAL_PAYMENT_AUTHORIZATION"
      },
      liveActions: {
        updatedOpportunity: true,
        createdPricingLockEvent: !existingLock,
        createdDuplicatePricingLock: false,
        createdOpportunity: false,
        createdDuplicateOpportunity: false,
        resentPaymentOptionsEmail: false,
        sentAgreementEmail: false,
        createdEsignTransaction: false,
        invokedAdobeSign: false,
        invokedSignNow: false,
        createdStripeCustomer: false,
        createdStripeSchedule: false,
        createdInvoice: false,
        chargedCard: false,
        postedBusinessCentral: false,
        startedProduction: false
      },
      firstBrokenLink: "CONTROLLER_NOT_INVOKED",
      downstreamBlocker: null,
      requiredNextStateAfterAgreementValidation: READY_FOR_MANUAL_SIGNATURE_SEND,
      gateUsed: GATE_NAME
    };
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_OPERATION_FAILED", {
      httpStatus: err.httpStatus || null,
      dvCode: err.dvCode || null,
      dvMessage: err.dvMessage || null,
      step: err.step || null
    });
  }
}

module.exports = {
  continuePaymentOptionCommercialPath,
  buildPricingLockExecutionLogPayload,
  buildPricingLockSnapshot,
  validateSelectedPaymentState,
  selectedPaymentPlanFromOpportunity,
  GATE_NAME,
  EVENT_TYPE,
  AGREEMENT_PREPARATION_READY,
  READY_FOR_MANUAL_SIGNATURE_SEND,
  WAITING_ON_JMP,
  NEXT_AGREEMENT_ACTION
};
