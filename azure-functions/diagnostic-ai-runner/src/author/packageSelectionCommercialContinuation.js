"use strict";

/**
 * Governed package-selection commercial continuation.
 *
 * This replaces title-specific Opportunity allowlisting with eligibility
 * checks for live commissioning assets. It may create or reuse exactly one
 * native Dynamics Opportunity after a package-selection event is durably
 * captured. It never sends author email, creates payment links, creates
 * invoices, sends agreements, posts to Business Central, or starts production.
 */

const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { PACKAGE_CATALOG, STRIPE_PACKAGE_MAPPINGS, resolveAlternativePackage } = require("./milestone6BusinessSourceLayer");

const GATE_NAME = "JM1_PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_COMPLETED";
const MODEL_NAME = "package-selection-commercial-continuation";

const OPPORTUNITY_STATUS = Object.freeze({
  packageSelected: "PACKAGE_SELECTED",
  stripeMappingConfirmed: "STRIPE_MAPPING_CONFIRMED",
  paymentOptionsReady: "PAYMENT_OPTIONS_READY_AFTER_PACKAGE_SELECTION",
  agreementReady: "AGREEMENT_PREPARATION_READY",
  onboardingReady: "ONBOARDING_READY",
  businessHandoffReady: "BUSINESS_HANDOFF_READY"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function encodeODataString(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_BLOCKED", reason, ...extra };
}

function apiBase() {
  return normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
}

function resourceUrl() {
  return normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
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
  return { body, etag: normalizeString(body["@odata.etag"]) || null, entityId: normalizeString(response.headers.get("OData-EntityId")) || null };
}

function lookup(row, field) {
  return normalizeString(row?.[field]);
}

function packageCodeFromText(value) {
  const match = normalizeString(value).toUpperCase().match(/JMP-PKG-[A-Z]+/);
  return match && PACKAGE_CATALOG[match[0]] ? match[0] : "";
}

function buildOpportunityPayload({ intake, contactId, leadId, selectedPackageCode }) {
  const title = normalizeString(intake.jm1_projecttitle) || normalizeString(intake.jm1_name) || "Publishing Intake";
  const intakeReferenceCode = normalizeString(intake.jm1_intakereferencecode);
  return {
    name: `Publishing Opportunity - ${title}`.slice(0, 300),
    jm1pub_projecttitle: title,
    jm1pub_intaketrackingid: intakeReferenceCode,
    jm1pub_packagerecommended: selectedPackageCode,
    jm1_m6packageselectionstatus: OPPORTUNITY_STATUS.packageSelected,
    jm1_m6authorselectedpackagecode: selectedPackageCode,
    jm1_m6stripeproductmappingstatus: OPPORTUNITY_STATUS.stripeMappingConfirmed,
    jm1_m6stripepricemappingstatus: OPPORTUNITY_STATUS.stripeMappingConfirmed,
    jm1_m6paymentoptionpreparationstatus: OPPORTUNITY_STATUS.paymentOptionsReady,
    jm1_m6agreementpreparationstatus: OPPORTUNITY_STATUS.agreementReady,
    jm1_m6onboardingstatus: OPPORTUNITY_STATUS.onboardingReady,
    jm1_m6businesshandoffstatus: OPPORTUNITY_STATUS.businessHandoffReady,
    "customerid_contact@odata.bind": `/contacts(${contactId})`,
    "parentcontactid@odata.bind": `/contacts(${contactId})`,
    "originatingleadid@odata.bind": `/leads(${leadId})`,
    "jm1_OriginLead@odata.bind": `/leads(${leadId})`
  };
}

function buildExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, selectedPackageCode, createdOpportunity, correlationId, completedAt }) {
  const alternatePackageCode = resolveAlternativePackage(selectedPackageCode);
  return {
    jm1_name: `PKG-COMMERCIAL-CONTINUATION-${diagnosticId}`,
    jm1_actiondescription: [
      `Package-selection commercial continuation completed for intake ${intakeReferenceCode}.`,
      `${createdOpportunity ? "Created" : "Reused"} native Dynamics Opportunity ${opportunityId}; duplicate Opportunity count preserved at zero.`,
      `Author selected package ${selectedPackageCode}.`,
      alternatePackageCode ? `Alternate package ${alternatePackageCode}.` : "No alternate package.",
      `Gate used: ${GATE_NAME}.`,
      correlationId ? `Correlation ID: ${correlationId}.` : null,
      "No author email, payment link, checkout session, invoice, agreement send, Business Central posting, Flow D activation, production automation, ISBN assignment, distribution submission, manuscript text, raw model output, secrets, tokens, or headers stored."
    ].filter(Boolean).join(" ").slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

async function continuePackageSelectionCommercialPath(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode).toUpperCase();
  const correlationId = normalizeString(input.correlationId) || null;
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (input.confirmPackageSelectionCommercialContinuation !== true) return blocked("CONFIRMATION_REQUIRED");
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
    const diagnostic = (await dataverseRequest(
      api,
      token,
      `jm1pub_editorialdiagnostics(${diagnosticId})?$select=jm1pub_editorialdiagnosticid,jm1pub_name,jm1pub_recommendedpackage,_jm1pub_publishingintake_value,_jm1pub_authorcontact_value,_jm1pub_lead_value,_jm1pub_opportunity_value`
    )).body;
    const intakeId = lookup(diagnostic, "_jm1pub_publishingintake_value");
    const contactId = lookup(diagnostic, "_jm1pub_authorcontact_value");
    const leadId = lookup(diagnostic, "_jm1pub_lead_value");
    if (!intakeId) return blocked("INTAKE_LINK_MISSING");
    if (!contactId) return blocked("CONTACT_LINK_MISSING");
    if (!leadId) return blocked("LEAD_LINK_MISSING");

    const intake = (await dataverseRequest(
      api,
      token,
      `jm1_publishingintakes(${intakeId})?$select=jm1_publishingintakeid,jm1_intakereferencecode,jm1_projecttitle,jm1_name,_jm1_opportunity_value,_jm1_linkedcontact_value,_jm1_linkedlead_value,_jm1_lead_value`
    )).body;
    if (normalizeString(intake.jm1_intakereferencecode).toUpperCase() !== intakeReferenceCode) {
      return blocked("INTAKE_REFERENCE_MISMATCH");
    }

    const packageLogFilter = encodeURIComponent([
      `jm1_sourcerecordid eq '${encodeODataString(diagnosticId)}'`,
      "jm1_actiontype eq 'PACKAGE_SELECTED'"
    ].join(" and "));
    const packageLog = (await dataverseRequest(
      api,
      token,
      `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,jm1_actiondescription,createdon&$filter=${packageLogFilter}&$orderby=createdon desc&$top=1`
    )).body?.value?.[0];
    const selectedPackageCode = packageCodeFromText(packageLog?.jm1_actiondescription) || packageCodeFromText(diagnostic.jm1pub_recommendedpackage);
    if (!selectedPackageCode) return blocked("PACKAGE_SELECTION_EVIDENCE_MISSING");
    if (!STRIPE_PACKAGE_MAPPINGS[selectedPackageCode]) return blocked("STRIPE_MAPPING_MISSING", { selectedPackageCode });

    let opportunityId = lookup(diagnostic, "_jm1pub_opportunity_value") || lookup(intake, "_jm1_opportunity_value");
    let createdOpportunity = false;
    if (!opportunityId) {
      const duplicateFilter = encodeURIComponent(`jm1pub_intaketrackingid eq '${encodeODataString(intakeReferenceCode)}'`);
      const existing = (await dataverseRequest(
        api,
        token,
        `opportunities?$select=opportunityid,name,jm1pub_intaketrackingid&$filter=${duplicateFilter}&$orderby=createdon desc&$top=2`
      )).body?.value || [];
      if (existing.length > 1) return blocked("DUPLICATE_OPPORTUNITY_CANDIDATES", { count: existing.length });
      if (existing.length === 1) {
        opportunityId = normalizeString(existing[0].opportunityid);
      } else {
        const created = await dataverseRequest(api, token, "opportunities", {
          method: "POST",
          step: "opportunity:create",
          headers: { Prefer: "return=representation" },
          body: buildOpportunityPayload({ intake, contactId, leadId, selectedPackageCode })
        });
        opportunityId = normalizeString(created.body.opportunityid);
        if (!opportunityId && created.entityId) {
          const match = created.entityId.match(/opportunities\(([0-9a-f-]{36})\)/i);
          opportunityId = match ? match[1] : "";
        }
        createdOpportunity = true;
      }
    }
    if (!opportunityId) return blocked("OPPORTUNITY_ID_NOT_RETURNED");

    const opportunityPatch = buildOpportunityPayload({ intake, contactId, leadId, selectedPackageCode });
    delete opportunityPatch["customerid_contact@odata.bind"];
    delete opportunityPatch["parentcontactid@odata.bind"];
    delete opportunityPatch["originatingleadid@odata.bind"];
    delete opportunityPatch["jm1_OriginLead@odata.bind"];
    await dataverseRequest(api, token, `opportunities(${opportunityId})`, {
      method: "PATCH",
      step: "opportunity:patch",
      headers: { Prefer: "return=representation" },
      body: opportunityPatch
    });
    await dataverseRequest(api, token, `jm1_publishingintakes(${intakeId})`, {
      method: "PATCH",
      step: "intake:link-opportunity",
      body: { "jm1_Opportunity@odata.bind": `/opportunities(${opportunityId})` }
    });
    await dataverseRequest(api, token, `jm1pub_editorialdiagnostics(${diagnosticId})`, {
      method: "PATCH",
      step: "diagnostic:link-opportunity",
      body: { "jm1pub_Opportunity@odata.bind": `/opportunities(${opportunityId})` }
    });

    const completedAt = new Date().toISOString();
    const log = await dataverseRequest(api, token, EXECUTION_LOG_ENTITY_SET, {
      method: "POST",
      step: "execution-log:create",
      headers: { Prefer: "return=representation" },
      body: buildExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, selectedPackageCode, createdOpportunity, correlationId, completedAt })
    });

    return {
      ok: true,
      code: "PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_COMPLETED",
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      selectedPackageCode,
      createdOpportunity,
      executionLogId: normalizeString(log.body.jm1_executionlogid) || null,
      gateUsed: GATE_NAME,
      liveActions: {
        createsOpportunity: createdOpportunity,
        createsDuplicateOpportunity: false,
        sendsAuthorEmail: false,
        createsPaymentLink: false,
        createsCheckoutSession: false,
        createsInvoice: false,
        sendsAgreement: false,
        postsBusinessCentral: false,
        activatesFlowD: false,
        startsProduction: false,
        assignsIsbn: false
      }
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
  continuePackageSelectionCommercialPath,
  buildOpportunityPayload,
  buildExecutionLogPayload,
  packageCodeFromText,
  GATE_NAME,
  EVENT_TYPE
};
