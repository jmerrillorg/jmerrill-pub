"use strict";

/**
 * Governed payment-link creation for the controlled agreement.
 *
 * Creates a Stripe payment link sized for the author's selected payment
 * plan (e.g. 8 payments of $585.00 for JMP-PKG-PRO), using only the
 * already-confirmed package/Stripe mapping and the already-confirmed
 * payment-option figures captured on the Opportunity. This module never
 * invents a price, never creates a Stripe Customer (a Payment Link's
 * customer is created by Stripe automatically when the author pays —
 * this module never pre-creates one), and never sends the resulting
 * link to the author — sending is a separate, not-yet-built and
 * separately-gated step.
 *
 * Critical invariant: creating a payment link is NOT a payment. No
 * production authorization ever follows from link creation alone —
 * isProductionAuthorized() always requires an explicit, separately
 * confirmed payment-received signal.
 *
 * Requires JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED="true" (the existing
 * dedicated gate already defined in milestone6BusinessSourceLayer.js),
 * checked fresh on every call. Even when open, this module only builds
 * and (if a real Stripe client is injected) creates the link — it never
 * creates an invoice, a subscription, a checkout session, or charges a
 * card.
 */

const {
  computeInstallmentStripeAmount,
  crossValidateAgainstConfirmedFigures,
  GATE_NAME
} = require("./agreementPaymentLinkMapping");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "AGREEMENT_PAYMENT_LINK_CREATED";
const AGENT_MODEL_NAME = "agreement-payment-link-runner";

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
  return { ok: false, code: "AGREEMENT_PAYMENT_LINK_BLOCKED", reason, ...extra };
}

/**
 * Pure guard. Production may never be authorized on the basis of a
 * payment LINK existing — only on an explicit, separately confirmed
 * payment-received signal (e.g. a Stripe webhook-confirmed charge,
 * checked by a future, separately-built and separately-gated step).
 *
 * @param {{ paymentReceived: boolean }} input
 * @returns {boolean}
 */
function isProductionAuthorized(input = {}) {
  return isPlainObject(input) && input.paymentReceived === true;
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.error?.code || response.status;
    const msg = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }
  return { id: typeof body.jm1_executionlogid === "string" ? body.jm1_executionlogid : null };
}

function buildPaymentLinkExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, computed, completedAt }) {
  // Deliberately never includes the payment-link URL itself, the price
  // ID's full Stripe object response, or any raw Stripe payload — only
  // the already-confirmed package code, installment count, and amounts.
  const actionDescription = [
    `Agreement payment link created for intake ${intakeReferenceCode}, Opportunity ${opportunityId}.`,
    `Package: JMP-PKG-PRO. Installments: ${computed.option.payments}. Per-installment: $${computed.perInstallmentUsd.toFixed(2)}. Total: $${computed.totalUsd.toFixed(2)}.`,
    "Link creation is not a payment — production authorization requires a separately confirmed payment-received signal, not link creation alone.",
    "No Stripe Customer pre-created. No invoice, subscription, or checkout session created.",
    "No production/distribution/launch/royalty/marketing action occurred. Link was not sent to the author in this step."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `AGREEMENT-PAYMENT-LINK-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * Creates (or, when the gate is closed, refuses to create) a Stripe
 * payment link sized for the author's confirmed payment plan.
 *
 * @param {{
 *   diagnosticId: string, intakeReferenceCode: string, opportunityId: string,
 *   packageCode: string, paymentOptionCode: string,
 *   confirmedInstallments: number, confirmedPerInstallmentUsd: number, confirmedTotalUsd: number
 * }} input
 * @param {{
 *   getToken?: Function,
 *   createPaymentLink?: (args: { priceId: string, productId: string, perInstallmentCents: number, installments: number, metadata: object }) => Promise<{ paymentLinkId: string, paymentLinkUrl: string }>
 * }} deps
 * @returns {Promise<object>}
 */
async function createAgreementPaymentLink(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const packageCode = normalizeString(input.packageCode);
  const paymentOptionCode = normalizeString(input.paymentOptionCode);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");
  if (!packageCode) return blocked("PACKAGE_CODE_MISSING");
  if (!paymentOptionCode) return blocked("PAYMENT_OPTION_CODE_MISSING");

  const computed = computeInstallmentStripeAmount({ packageCode, paymentOptionCode });
  if (!computed.ok) return blocked("STRIPE_MAPPING_RESOLUTION_FAILED", { detail: computed.error });

  const crossValidation = crossValidateAgainstConfirmedFigures(computed, {
    installments: input.confirmedInstallments,
    perInstallmentUsd: input.confirmedPerInstallmentUsd,
    totalUsd: input.confirmedTotalUsd
  });
  if (!crossValidation.ok) {
    return blocked("CONFIRMED_FIGURES_MISMATCH", { mismatches: crossValidation.mismatches });
  }

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", {
      gate: GATE_NAME,
      // Safe to report even while blocked — these are already-confirmed
      // figures, not anything newly computed or sensitive.
      wouldCreateLinkFor: { installments: computed.option.payments, perInstallmentUsd: computed.perInstallmentUsd, totalUsd: computed.totalUsd }
    });
  }

  if (typeof deps.createPaymentLink !== "function") {
    return blocked("DEPS_MISSING_CREATE_PAYMENT_LINK");
  }

  let linkResult;
  try {
    linkResult = await deps.createPaymentLink({
      priceId: computed.mapping.priceId,
      productId: computed.mapping.productId,
      perInstallmentCents: computed.perInstallmentCents,
      installments: computed.option.payments,
      metadata: { diagnosticId, intakeReferenceCode, opportunityId, packageCode, paymentOptionCode }
    });
  } catch (err) {
    return blocked("PAYMENT_LINK_CREATION_FAILED", { detail: err.safeCode || null });
  }

  const completedAt = new Date().toISOString();
  let executionLog = { created: false, id: null, error: null, diagnostics: null };
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (apiBase && resourceUrl) {
    try {
      const resolveToken = deps.getToken || (async () => { throw Object.assign(new Error("getToken not supplied"), { safeCode: "GET_TOKEN_NOT_SUPPLIED" }); });
      const token = await resolveToken(resourceUrl);
      const payload = buildPaymentLinkExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, computed, completedAt });
      const result = await postExecutionLogRecord(apiBase, token, payload);
      executionLog = { created: true, id: result.id, error: null, diagnostics: null };
    } catch (err) {
      executionLog = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics: classifyDataverseWriteError(err) };
    }
  } else {
    executionLog = { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING", diagnostics: null };
  }

  return {
    ok: true,
    code: "AGREEMENT_PAYMENT_LINK_CREATED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    installments: computed.option.payments,
    perInstallmentUsd: computed.perInstallmentUsd,
    totalUsd: computed.totalUsd,
    feeApplied: computed.feeApplied,
    paymentLinkId: linkResult.paymentLinkId || null,
    // The actual URL is returned to the caller (who must keep it out of
    // any log) but is never included in the execution-log evidence above.
    paymentLinkUrl: linkResult.paymentLinkUrl || null,
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      createsPaymentLink: true,
      createsStripeCustomer: false,
      createsInvoice: false,
      createsSubscription: false,
      chargesCard: false,
      sentAuthorFacingOutput: false,
      startsProduction: false,
      submitsDistribution: false,
      activatesLaunch: false,
      createsRoyaltyAction: false,
      activatesMarketing: false
    }
  };
}

module.exports = {
  createAgreementPaymentLink,
  isProductionAuthorized,
  buildPaymentLinkExecutionLogPayload,
  GATE_NAME,
  EVENT_TYPE
};
