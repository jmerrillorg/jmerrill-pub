"use strict";

const JSZip = require("jszip");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { replaceBracketPlaceholder } = require("./agreementDocumentFiller");
const { computeSha256 } = require("./templateHasher");
const { selectAgreementTemplateForTrack } = require("./governedAgreementTemplateRegistry");

const GATE_NAME = "JM1_GOVERNED_AGREEMENT_PIPELINE_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "GOVERNED_AGREEMENT_GENERATED";
const AGENT_MODEL_NAME = "governed-agreement-pipeline-runner";
const AGENT_NAME = "jm1-diagnostic-ai-runner";
const BAND_LEVEL = Object.freeze({ BAND_1: 835500000 });
const EXECUTION_STATUS = Object.freeze({ SUCCESS: 835500001 });
const SOURCE_ENTITY = "jm1pub_editorialdiagnostic";

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
  return { ok: false, code: "GOVERNED_AGREEMENT_PIPELINE_BLOCKED", reason, ...extra };
}

function safeSlug(value) {
  const slug = normalizeString(value)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "agreement";
}

function agreementMergeValues(input) {
  return {
    "[Author Legal Name]": input.authorLegalName,
    "[Author Full Legal Name]": input.authorLegalName,
    "[Effective Date]": input.effectiveDate,
    "[Book Title]": input.bookTitle,
    "[Working Title]": input.bookTitle,
    "[Territory]": input.territory,
    "[State of Incorporation]": input.stateOfIncorporation,
    "[JM1 Business Address]": input.publisherBusinessAddress,
    "[Author Address]": input.authorAddress,
    "[Final Title and Subtitle]": input.finalTitleAndSubtitle,
    "[Author's Legal and Professional/Pen Name]": input.authorNameForSchedule,
    "[Manuscript Delivery Requirements (format, word-processing program, method of delivery)]": input.manuscriptDeliveryRequirements,
    "[Anticipated Word Count]": input.anticipatedWordCount,
    "[Delivery Date]": input.deliveryDate,
    "[Genre / Category]": input.genreCategory,
    "[Language]": input.language,
    "[Formats Acquired (print / ebook / audio)]": input.formatsAcquired,
    "[Series Information (if applicable)]": input.seriesInformation,
    "[Target Publication Date or Window]": input.targetPublicationDateOrWindow,
    "[Royalty Allocation Among Co-Authors, if applicable]": input.royaltyAllocationAmongCoAuthors,
    "[Complimentary-Copy Configuration (if different from the governed package policy)]": input.complimentaryCopyConfiguration,
    "[Special Permissions or Third-Party Content Required]": input.specialPermissionsOrThirdPartyContent,
    "[Approved Deviations from Standard Agreement Terms, if any]": input.approvedDeviationsFromStandardAgreementTerms,
    "[Artwork (as referenced in Section 3C.0)]": input.artwork,
    "[Frontmatter / Backmatter (as referenced in Section 3C.0)]": input.frontmatterBackmatter
  };
}

function validateGenerationInput(input) {
  const errors = [];
  if (!normalizeString(input.titleId)) errors.push("TITLE_ID_REQUIRED");
  if (!normalizeString(input.bookTitle)) errors.push("BOOK_TITLE_REQUIRED");
  if (!normalizeString(input.authorId)) errors.push("AUTHOR_ID_REQUIRED");
  if (!normalizeString(input.authorLegalName)) errors.push("AUTHOR_LEGAL_NAME_REQUIRED");
  if (!normalizeString(input.publishingTrack)) errors.push("PUBLISHING_TRACK_REQUIRED");
  if (!normalizeString(input.effectiveDate)) errors.push("EFFECTIVE_DATE_REQUIRED");
  if (!normalizeString(input.territory)) errors.push("TERRITORY_REQUIRED");
  if (!normalizeString(input.correlationId)) errors.push("CORRELATION_ID_REQUIRED");
  return errors;
}

async function fillDocxTemplate(buffer, mergeValues) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlPath = "word/document.xml";
  const originalXml = await zip.file(documentXmlPath).async("string");
  let xml = originalXml;
  const filledFields = [];
  const deferredFields = [];

  for (const [placeholder, rawValue] of Object.entries(mergeValues)) {
    const value = normalizeString(rawValue);
    const before = xml;
    if (value) {
      const result = replaceBracketPlaceholder(xml, placeholder, value);
      xml = result.xml;
      if (result.occurrences > 0) {
        filledFields.push({ placeholder, occurrences: result.occurrences, value });
      }
    }
    if (before.includes(placeholder) && !value) {
      deferredFields.push({ placeholder, reason: "SOURCE_VALUE_NOT_PRESENT" });
    }
  }

  const remainingPlaceholders = Array.from(new Set(xml.match(/\[[^\]]+\]/g) || []))
    .sort()
    .map((placeholder) => ({ placeholder, reason: "NO_APPROVED_SOURCE_VALUE" }));

  zip.file(documentXmlPath, xml);
  const outputBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    buffer: outputBuffer,
    filledFields,
    deferredFields: [...deferredFields, ...remainingPlaceholders],
    sha256: computeSha256(outputBuffer)
  };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`${command} exited ${code}: ${stderr || stdout}`), { safeCode: "PDF_GENERATION_FAILED" }));
    });
  });
}

async function convertDocxToPdfBuffer(docxBuffer, basename, deps = {}) {
  if (typeof deps.convertDocxToPdf === "function") {
    return deps.convertDocxToPdf(docxBuffer, basename);
  }
  const sofficeBin = normalizeString(deps.sofficeBin || process.env.JM1_SOFFICE_BIN || "soffice");
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jm1-agreement-pdf-"));
  const inputPath = path.join(tmpDir, `${basename}.docx`);
  const outputPath = path.join(tmpDir, `${basename}.pdf`);
  const profileDir = path.join(tmpDir, "lo-profile");
  await fs.mkdir(profileDir, { recursive: true });
  await fs.writeFile(inputPath, docxBuffer);
  try {
    await runProcess(sofficeBin, [
      "--headless",
      `-env:UserInstallation=file://${profileDir}`,
      "--convert-to",
      "pdf",
      "--outdir",
      tmpDir,
      inputPath
    ]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function writeImmutableOutput(name, buffer, deps) {
  if (typeof deps.outputExists === "function" && await deps.outputExists(name)) {
    throw Object.assign(new Error(`Generated agreement output already exists: ${name}`), { safeCode: "GENERATED_AGREEMENT_ALREADY_EXISTS" });
  }
  const storageLocation = await deps.writeOutput(name, buffer);
  return { name, storageLocation, sha256: computeSha256(buffer), byteLength: buffer.length };
}

async function generateGovernedAgreement(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });
  if (typeof deps.readTemplate !== "function" || typeof deps.writeOutput !== "function") {
    return blocked("DEPS_MISSING_READ_OR_WRITE");
  }

  const normalizedInput = {
    ...input,
    correlationId: normalizeString(input.correlationId || randomUUID()),
    effectiveDate: normalizeString(input.effectiveDate),
    territory: normalizeString(input.territory || "World")
  };
  const errors = validateGenerationInput(normalizedInput);
  if (errors.length > 0) return blocked("INPUT_VALIDATION_FAILED", { errors });

  let selectedTemplate;
  try {
    selectedTemplate = selectAgreementTemplateForTrack(normalizedInput.publishingTrack);
  } catch (err) {
    return blocked(err.safeCode || "AGREEMENT_TEMPLATE_SELECTION_FAILED");
  }

  try {
    const templateBuffer = await deps.readTemplate(selectedTemplate);
    const templateSha256 = computeSha256(templateBuffer);
    const filled = await fillDocxTemplate(templateBuffer, agreementMergeValues(normalizedInput));
    const outputBase = [
      "JM1",
      safeSlug(selectedTemplate.agreementType),
      safeSlug(selectedTemplate.version),
      safeSlug(normalizedInput.titleId),
      safeSlug(normalizedInput.correlationId)
    ].join("_");

    const docxArtifact = await writeImmutableOutput(`${outputBase}.docx`, filled.buffer, deps);
    const pdfBuffer = await convertDocxToPdfBuffer(filled.buffer, outputBase, deps);
    const pdfArtifact = await writeImmutableOutput(`${outputBase}.pdf`, pdfBuffer, deps);
    const generatedAt = new Date().toISOString();
    const manifest = {
      agreementSelected: selectedTemplate.templateName,
      agreementType: selectedTemplate.agreementType,
      agreementVersion: selectedTemplate.version,
      templateFilename: selectedTemplate.filename,
      templateGovernedPath: selectedTemplate.governedPath,
      templateSha256,
      generationTimestamp: generatedAt,
      title: { id: normalizedInput.titleId, name: normalizedInput.bookTitle },
      author: { id: normalizedInput.authorId, legalName: normalizedInput.authorLegalName },
      publishingTrack: normalizedInput.publishingTrack,
      executionCorrelationId: normalizedInput.correlationId,
      generatedArtifacts: [docxArtifact, pdfArtifact],
      filledFields: filled.filledFields,
      deferredFields: filled.deferredFields,
      immutableAfterExecution: true,
      authorFacingOutputSent: false,
      clientTitleAutomation: "FROZEN"
    };

    let executionLog = { created: false, id: null, payload: buildGovernedAgreementExecutionLogPayload({ manifest, completedAt: generatedAt }), error: "NOT_ATTEMPTED", diagnostics: null };
    if (deps.getToken || (process.env.DATAVERSE_WEB_API_BASE_URL && process.env.DATAVERSE_RESOURCE_URL)) {
      try {
        const tokenProvider = deps.getToken || require("../dataverse/authorDraftPersistenceClient").getDataverseToken;
        const token = await tokenProvider(process.env.DATAVERSE_RESOURCE_URL);
        const result = await postExecutionLogRecord(process.env.DATAVERSE_WEB_API_BASE_URL, token, executionLog.payload);
        executionLog = { created: true, id: result.id, payload: executionLog.payload, error: null, diagnostics: null };
      } catch (err) {
        const diagnostics = (() => {
          try {
            return require("../author/milestone6OpportunityWriter").classifyDataverseWriteError(err);
          } catch {
            return null;
          }
        })();
        executionLog = { created: false, id: null, payload: executionLog.payload, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics };
      }
    }

    return {
      ok: true,
      code: "GOVERNED_AGREEMENT_GENERATION_COMPLETE",
      manifest,
      executionLog,
      gateUsed: GATE_NAME,
      liveActions: {
        selectedAgreementAutomatically: true,
        readCanonicalPublishingData: true,
        wroteDocx: true,
        wrotePdf: true,
        sentAuthorFacingOutput: false,
        requestedSignature: false,
        activatedClientTitleAutomation: false,
        changedDataverseSchema: false,
        changedBusinessCentral: false
      }
    };
  } catch (err) {
    return blocked(err.safeCode || "GOVERNED_AGREEMENT_GENERATION_FAILED", { detail: String(err.message || err).slice(0, 200) });
  }
}

function buildGovernedAgreementExecutionLogPayload({ manifest, completedAt }) {
  const docLocations = manifest.generatedArtifacts.map((a) => `${a.name} -> ${a.storageLocation}`).join("; ");
  const description = [
    `Governed agreement generated for title ${manifest.title.name} (${manifest.title.id}).`,
    `Author: ${manifest.author.legalName} (${manifest.author.id}).`,
    `Publishing Track: ${manifest.publishingTrack}.`,
    `Agreement selected: ${manifest.agreementSelected} ${manifest.agreementVersion}.`,
    `Template: ${manifest.templateFilename} sha256:${manifest.templateSha256}.`,
    `Artifacts: ${docLocations}.`,
    `Correlation ID: ${manifest.executionCorrelationId}.`,
    "DOCX and PDF generated and stored as immutable governed publishing artifacts.",
    "No author communication, signature request, client-title automation, Business Central change, or schema change occurred."
  ].join(" ");

  return {
    jm1_name: `GOVERNED-AGREEMENT-${manifest.executionCorrelationId}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: manifest.title.id
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
    throw Object.assign(new Error(body?.error?.message || `HTTP ${response.status}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: body?.error?.code || response.status
    });
  }
  return { id: typeof body.jm1_executionlogid === "string" ? body.jm1_executionlogid : null };
}

module.exports = {
  generateGovernedAgreement,
  fillDocxTemplate,
  agreementMergeValues,
  convertDocxToPdfBuffer,
  buildGovernedAgreementExecutionLogPayload,
  GATE_NAME,
  EVENT_TYPE
};
