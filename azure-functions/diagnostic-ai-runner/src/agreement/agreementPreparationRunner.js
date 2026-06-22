"use strict";

/**
 * Governed pre-contract agreement document preparation.
 *
 * Fills the three canonical J Merrill Publishing templates (Publishing
 * Agreement, Publishing Package Addendum, Audiobook Addendum) for the
 * controlled record, plus generates a Schedule A / Payment Schedule
 * Attachment when the selected payment plan exceeds the Addendum's
 * 3-row payment table. Documents are PREPARED ONLY — this module never
 * sends anything, never touches the Opportunity, never creates a
 * payment/Stripe object, never starts production.
 *
 * Safety boundaries:
 *   - Every fill operation is a narrow, literal substitution performed
 *     by agreementDocumentFiller.js (bracket placeholder replace, or
 *     the first underscore blank after a known label) — canonical
 *     legal language is never rewritten, no clause is ever removed.
 *   - Every value inserted comes from agreementFieldComputer.js, which
 *     itself never invents a value — unknown fields (e.g. Author
 *     street address) are left unfilled and reported as deferred
 *     rather than guessed.
 *   - This run never reads the manuscript and never calls an AI model
 *     — it has no access to raw manuscript text or model output to
 *     leak in the first place.
 *
 * Requires JM1_AGREEMENT_DOCUMENT_PREPARATION_ENABLED="true", checked
 * fresh on every call.
 */

const JSZip = require("jszip");
const { replaceBracketPlaceholder, replaceBlankAfterLabel } = require("./agreementDocumentFiller");
const { computeAgreementFields } = require("./agreementFieldComputer");
const { generateScheduleADocument } = require("./scheduleAGenerator");
const { buildPreparationManifest } = require("./agreementPreparationManifest");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const GATE_NAME = "JM1_AGREEMENT_DOCUMENT_PREPARATION_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "AGREEMENT_DOCUMENT_PREPARATION_PERFORMED";
const AGENT_MODEL_NAME = "agreement-preparation-runner";

const TEMPLATE_NAME = Object.freeze({
  PUBLISHING_AGREEMENT: "JMP_Publishing_Agreement_v3.docx",
  PACKAGE_ADDENDUM: "JMP_Publishing_Package_Addendum_v3.docx",
  AUDIOBOOK_ADDENDUM: "JMP_Audiobook_Addendum_v3.docx"
});

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
  return { ok: false, code: "AGREEMENT_DOCUMENT_PREPARATION_BLOCKED", reason, ...extra };
}

function wordCountDisplay(fields) {
  return `${fields.officialManuscriptWordCount.toLocaleString("en-US")} (manuscript-derived)`;
}

/**
 * Fills the Publishing Agreement's bracket placeholders. Pure — XML
 * string in, XML string + tracking out.
 */
function fillPublishingAgreement(xml, fields) {
  const filledFields = [];
  const unmatchedFields = [];

  const steps = [
    { placeholder: "[Author Legal Name]", value: fields.authorLegalName, name: "authorLegalName" },
    { placeholder: "[Book Title]", value: fields.title, name: "title" },
    { placeholder: "[Effective Date]", value: fields.contractDate, name: "contractDate" }
  ];

  let current = xml;
  for (const step of steps) {
    const result = replaceBracketPlaceholder(current, step.placeholder, step.value);
    current = result.xml;
    if (result.occurrences > 0) {
      filledFields.push({ field: step.name, placeholder: step.placeholder, occurrences: result.occurrences, value: step.value });
    } else {
      unmatchedFields.push(step.name);
    }
  }

  return { xml: current, filledFields, unmatchedFields, deferredFields: ["address", "cityStateZip"] };
}

/**
 * Fills the Publishing Package Addendum: bracket placeholders, the
 * Selected Package / Imprint / Word Count / Manuscript Deadline blanks,
 * and the three Complimentary Copies quantity blanks (scoped to start
 * searching only after the "COMPLIMENTARY COPIES" section heading, so
 * the identical "Paperback"/"Hardcover" labels used earlier in the
 * services tables are never touched).
 */
function fillPackageAddendum(xml, fields) {
  const filledFields = [];
  const unmatchedFields = [];
  let current = xml;

  const bracketSteps = [
    { placeholder: "[Date]", value: fields.contractDate, name: "date" },
    { placeholder: "[Author Legal Name]", value: fields.authorLegalName, name: "authorLegalName" },
    { placeholder: "[Book Title]", value: fields.title, name: "title" },
    { placeholder: "[Contract Date]", value: fields.contractDate, name: "contractDateField" }
  ];
  for (const step of bracketSteps) {
    const result = replaceBracketPlaceholder(current, step.placeholder, step.value);
    current = result.xml;
    if (result.occurrences > 0) {
      filledFields.push({ field: step.name, placeholder: step.placeholder, occurrences: result.occurrences, value: step.value });
    } else {
      unmatchedFields.push(step.name);
    }
  }

  const blankSteps = [
    { label: "Selected Package: ", value: fields.packageLabel, name: "selectedPackage" },
    { label: "Imprint: ", value: fields.imprintLabel, name: "imprint" },
    { label: "Word Count (approx.): ", value: wordCountDisplay(fields), name: "wordCount" },
    { label: "Manuscript Deadline: ", value: fields.manuscriptDeadlineText, name: "manuscriptDeadline" }
  ];
  let cursor = 0;
  for (const step of blankSteps) {
    const result = replaceBlankAfterLabel(current, step.label, step.value, { fromIndex: cursor });
    current = result.xml;
    cursor = result.nextIndex;
    if (result.found) {
      filledFields.push({ field: step.name, label: step.label, value: step.value });
    } else {
      unmatchedFields.push(step.name);
    }
  }

  // Complimentary copies — scoped to start only after the section heading.
  const complimentaryAnchor = current.indexOf("COMPLIMENTARY COPIES");
  if (complimentaryAnchor === -1) {
    unmatchedFields.push("complimentaryPaperback", "complimentaryHardcover", "complimentaryEbook");
  } else {
    const copySteps = [
      { label: "Paperback", value: String(fields.complimentaryCopies.paperback), name: "complimentaryPaperback" },
      { label: "Hardcover", value: String(fields.complimentaryCopies.hardcover), name: "complimentaryHardcover" },
      { label: "eBook", value: String(fields.complimentaryCopies.ebook), name: "complimentaryEbook" }
    ];
    let copyCursor = complimentaryAnchor;
    for (const step of copySteps) {
      const result = replaceBlankAfterLabel(current, step.label, step.value, { fromIndex: copyCursor });
      current = result.xml;
      copyCursor = result.nextIndex;
      if (result.found) {
        filledFields.push({ field: step.name, label: step.label, value: step.value });
      } else {
        unmatchedFields.push(step.name);
      }
    }
  }

  // The 3-row payment table is intentionally left blank for per-row
  // amounts/dates when the plan exceeds 3 installments — a Schedule A
  // attachment governs instead, per instruction not to force inaccurate
  // data into a table that cannot represent it. The TOTAL row, however,
  // is a single figure the table CAN represent accurately.
  if (fields.paymentSchedule.requiresScheduleAAttachment) {
    const totalAnchor = current.indexOf("TOTAL");
    if (totalAnchor !== -1) {
      // The template's TOTAL blank is "$____________" with the currency
      // symbol already baked into the same text run as the underscores
      // — supply only the numeric portion so the $ isn't duplicated.
      const totalNumericOnly = fields.paymentSchedule.totalFormatted.replace("$", "");
      const result = replaceBlankAfterLabel(current, "TOTAL", totalNumericOnly, { fromIndex: totalAnchor, minUnderscores: 1 });
      current = result.xml;
      if (result.found) {
        filledFields.push({ field: "paymentTotal", label: "TOTAL", value: fields.paymentSchedule.totalFormatted });
      } else {
        unmatchedFields.push("paymentTotal");
      }
    }
  }

  return {
    xml: current,
    filledFields,
    unmatchedFields,
    deferredFields: [
      "individualPaymentRowAmountsAndDates (see Schedule A attachment instead)",
      "packageSelectionCheckboxGlyph (written Selected Package field is filled; visual checkbox left as-is)"
    ]
  };
}

/**
 * Fills the Audiobook Addendum's bracket placeholders. The "Special
 * notes" table cell in Section 9 is left empty in the canonical
 * template with no existing text run to anchor a safe insertion against
 * — annotating it is deferred to manual review rather than risking an
 * unsupported structural edit.
 */
function fillAudiobookAddendum(xml, fields) {
  const filledFields = [];
  const unmatchedFields = [];

  const steps = [
    { placeholder: "[Date]", value: fields.contractDate, name: "date" },
    { placeholder: "[Author Legal Name]", value: fields.authorLegalName, name: "authorLegalName" },
    { placeholder: "[Book Title]", value: fields.title, name: "title" },
    { placeholder: "[Contract Date]", value: fields.contractDate, name: "contractDateField" }
  ];

  let current = xml;
  for (const step of steps) {
    const result = replaceBracketPlaceholder(current, step.placeholder, step.value);
    current = result.xml;
    if (result.occurrences > 0) {
      filledFields.push({ field: step.name, placeholder: step.placeholder, occurrences: result.occurrences, value: step.value });
    } else {
      unmatchedFields.push(step.name);
    }
  }

  return {
    xml: current,
    filledFields,
    unmatchedFields,
    deferredFields: [
      "specialNotesAnnotation (recommend manual note: 'AI audiobook production included via Professional Package — no additional $699 fee applies')"
    ]
  };
}

async function fillDocxBuffer(buffer, fillFn, fields) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlPath = "word/document.xml";
  const originalXml = await zip.file(documentXmlPath).async("string");
  const result = fillFn(originalXml, fields);
  zip.file(documentXmlPath, result.xml);
  const outputBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return { buffer: outputBuffer, filledFields: result.filledFields, unmatchedFields: result.unmatchedFields, deferredFields: result.deferredFields };
}

/**
 * Prepares the governed agreement document package for the controlled
 * record: fills the three canonical templates, generates a Schedule A
 * attachment when required, and writes the document-preparation
 * manifest plus one safe execution-log evidence record.
 *
 * Requires JM1_AGREEMENT_DOCUMENT_PREPARATION_ENABLED="true". Never
 * reads the manuscript, never calls an AI model, never sends anything.
 *
 * @param {{
 *   diagnosticId: string, intakeReferenceCode: string, opportunityId: string,
 *   title: string, authorLegalName: string, imprintLabel: string,
 *   officialManuscriptWordCount: number, selectedPackageCode: string,
 *   paymentOption: string, contractDate?: string
 * }} input
 * @param {{
 *   getToken?: Function,
 *   readTemplate: (templateName: string) => Promise<Buffer>,
 *   writeOutput: (outputName: string, buffer: Buffer) => Promise<string>
 * }} deps — readTemplate/writeOutput are required; the caller controls
 *   where templates come from and where outputs are written.
 * @returns {Promise<object>}
 */
async function prepareAgreementDocumentPackage(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);

  let readTemplate = deps.readTemplate;
  let writeOutput = deps.writeOutput;
  if (typeof readTemplate !== "function" || typeof writeOutput !== "function") {
    // Local/dev mode reads the OneDrive canon directly when
    // deps.localCanonPath is supplied; Azure/runtime mode reads from
    // Blob Storage when deps.blobClientDeps is supplied. Generated
    // output always goes to the separate generated-agreements path —
    // never back into the template path, and never into the local
    // canon folder.
    if (deps.localCanonPath || deps.blobClientDeps) {
      try {
        const resolved = require("./agreementTemplateSource").resolveAgreementPrepDeps({
          mode: deps.templateSourceMode,
          diagnosticId,
          localCanonPath: deps.localCanonPath,
          blobClientDeps: deps.blobClientDeps
        });
        readTemplate = readTemplate || resolved.readTemplate;
        writeOutput = writeOutput || resolved.writeOutput;
      } catch (err) {
        return blocked(err.safeCode || "TEMPLATE_SOURCE_RESOLUTION_FAILED");
      }
    }
  }
  if (typeof readTemplate !== "function" || typeof writeOutput !== "function") {
    return blocked("DEPS_MISSING_READ_OR_WRITE");
  }

  const resolveToken = deps.getToken || getDataverseToken;
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const fields = computeAgreementFields(input);
  if (!fields.ok) return blocked("FIELD_COMPUTATION_FAILED", { errors: fields.errors });

  const documents = [];
  const allDeferred = new Set();

  try {
    const agreementBuf = await readTemplate(TEMPLATE_NAME.PUBLISHING_AGREEMENT);
    const agreementResult = await fillDocxBuffer(agreementBuf, fillPublishingAgreement, fields);
    const agreementOutputName = `JMP_Publishing_Agreement_FILLED_${diagnosticId}.docx`;
    const agreementOutputPath = await writeOutput(agreementOutputName, agreementResult.buffer);
    documents.push({ sourceTemplate: TEMPLATE_NAME.PUBLISHING_AGREEMENT, outputPath: agreementOutputPath, filledFields: agreementResult.filledFields, unmatchedFields: agreementResult.unmatchedFields });
    agreementResult.deferredFields.forEach((f) => allDeferred.add(f));

    const addendumBuf = await readTemplate(TEMPLATE_NAME.PACKAGE_ADDENDUM);
    const addendumResult = await fillDocxBuffer(addendumBuf, fillPackageAddendum, fields);
    const addendumOutputName = `JMP_Publishing_Package_Addendum_FILLED_${diagnosticId}.docx`;
    const addendumOutputPath = await writeOutput(addendumOutputName, addendumResult.buffer);
    documents.push({ sourceTemplate: TEMPLATE_NAME.PACKAGE_ADDENDUM, outputPath: addendumOutputPath, filledFields: addendumResult.filledFields, unmatchedFields: addendumResult.unmatchedFields });
    addendumResult.deferredFields.forEach((f) => allDeferred.add(f));

    let audiobookOutputPath = null;
    if (fields.audiobookIncluded) {
      const audiobookBuf = await readTemplate(TEMPLATE_NAME.AUDIOBOOK_ADDENDUM);
      const audiobookResult = await fillDocxBuffer(audiobookBuf, fillAudiobookAddendum, fields);
      const audiobookOutputName = `JMP_Audiobook_Addendum_FILLED_${diagnosticId}.docx`;
      audiobookOutputPath = await writeOutput(audiobookOutputName, audiobookResult.buffer);
      documents.push({ sourceTemplate: TEMPLATE_NAME.AUDIOBOOK_ADDENDUM, outputPath: audiobookOutputPath, filledFields: audiobookResult.filledFields, unmatchedFields: audiobookResult.unmatchedFields });
      audiobookResult.deferredFields.forEach((f) => allDeferred.add(f));
    }

    let scheduleAOutputPath = null;
    if (fields.paymentSchedule.requiresScheduleAAttachment) {
      const scheduleABuffer = await generateScheduleADocument(fields);
      const scheduleAOutputName = `JMP_Schedule_A_Payment_Schedule_${diagnosticId}.docx`;
      scheduleAOutputPath = await writeOutput(scheduleAOutputName, scheduleABuffer);
      documents.push({ sourceTemplate: "GENERATED:ScheduleA", outputPath: scheduleAOutputPath, filledFields: [{ field: "paymentSchedule", value: `${fields.paymentSchedule.installments} installments` }], unmatchedFields: [] });
    }

    const completedAt = new Date().toISOString();
    const manifest = buildPreparationManifest({ documents, deferredFields: Array.from(allDeferred), timestamp: completedAt });

    let executionLog;
    try {
      const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
      const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
      if (!apiBase || !resourceUrl) {
        executionLog = { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING", diagnostics: null };
      } else {
        const token = await resolveToken(resourceUrl);
        const payload = buildAgreementPreparationExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, fields, manifest, completedAt });
        const result = await postExecutionLogRecord(apiBase, token, payload);
        executionLog = { created: true, id: result.id, error: null, diagnostics: null };
      }
    } catch (err) {
      executionLog = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics: classifyDataverseWriteError(err) };
    }

    return {
      ok: true,
      code: "AGREEMENT_DOCUMENT_PREPARATION_COMPLETE",
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      manifest,
      scheduleAGenerated: fields.paymentSchedule.requiresScheduleAAttachment,
      audiobookAddendumGenerated: fields.audiobookIncluded,
      executionLog,
      gateUsed: GATE_NAME,
      liveActions: {
        readManuscript: false,
        calledAiModel: false,
        readTemplates: true,
        wroteOutputDocuments: true,
        updatedOpportunity: false,
        updatedDiagnosticRecord: false,
        sentAuthorFacingOutput: false,
        createsPaymentLink: false,
        startsProduction: false,
        activatesFlowD: false
      }
    };
  } catch (err) {
    return blocked("DOCUMENT_PREPARATION_FAILED", { detail: err.safeCode || String(err.message || err).slice(0, 200) });
  }
}

function buildAgreementPreparationExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, fields, manifest, completedAt }) {
  const actionDescription = [
    `Agreement document preparation performed for intake ${intakeReferenceCode}, Opportunity ${opportunityId}.`,
    `Package: ${fields.packageLabel}. Imprint: ${fields.imprintLabel}.`,
    `Official word count used: ${fields.officialManuscriptWordCount} (MANUSCRIPT_FILE).`,
    `Payment plan: ${fields.paymentSchedule.installments} x ${fields.paymentSchedule.perInstallmentFormatted}, total ${fields.paymentSchedule.totalFormatted}.`,
    fields.paymentSchedule.requiresScheduleAAttachment ? "Schedule A attachment generated (3-row table cannot represent this plan)." : "Payment fit within the 3-row table.",
    `Audiobook addendum generated: ${fields.audiobookIncluded} (included via package, no separate $699 fee).`,
    `${manifest.documents.length} document(s) prepared. Deferred fields: ${manifest.deferredFields.length === 0 ? "none" : manifest.deferredFields.join("; ")}.`,
    "Documents prepared only — not sent. No manuscript text, raw AI output, or prompt text included.",
    "No contract finalized, no author-facing send, no Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `AGREEMENT-PREPARATION-${diagnosticId}`,
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
  return {
    id: typeof body.jm1_executionlogid === "string" ? body.jm1_executionlogid : null
  };
}

module.exports = {
  prepareAgreementDocumentPackage,
  fillPublishingAgreement,
  fillPackageAddendum,
  fillAudiobookAddendum,
  buildAgreementPreparationExecutionLogPayload,
  TEMPLATE_NAME,
  GATE_NAME,
  EVENT_TYPE
};
