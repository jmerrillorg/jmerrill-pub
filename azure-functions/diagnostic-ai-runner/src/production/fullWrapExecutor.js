"use strict";

const { createHash } = require("node:crypto");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS } = require("../dataverse/metadataWriter");
const {
  DERIVED_VALUE,
  resolveProductionAuthority
} = require("./productionAuthorityResolver");

const GATE_NAME = "JM1_FULL_WRAP_EXECUTOR_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const PRODUCTION_TASK_ENTITY_SET = "jm1_productiontasks";
const TITLE_ENTITY_SET = "jm1pub_titles";
const ACTION_TYPE_EXECUTED = "FULL_WRAP_EXECUTED";
const ACTION_TYPE_BLOCKED = "FULL_WRAP_EXECUTION_BLOCKED";
const MODEL_NAME = "full-wrap-executor";
const BLEED_INCHES = 0.125;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAPER_PROFILES = {
  "50_WHITE": { label: "50 lb white", spineInchesPerPage: 0.002252 },
  "55_CREAM": { label: "55 lb cream", spineInchesPerPage: 0.0025 },
  "60_WHITE": { label: "60 lb white", spineInchesPerPage: 0.002347 }
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen(deps = {}) {
  if (typeof deps.gateOpen === "boolean") return deps.gateOpen;
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "FULL_WRAP_EXECUTION_BLOCKED", reason, ...extra };
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

function parseTrimSize(value) {
  const raw = normalizeString(value);
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:x|×|by)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return {
    label: `${width} x ${height}`,
    width,
    height
  };
}

function paperProfileFor(value) {
  const key = normalizeKey(value);
  if (PAPER_PROFILES[key]) return { key, ...PAPER_PROFILES[key] };
  if (/50.*WHITE|WHITE.*50/.test(key)) return { key: "50_WHITE", ...PAPER_PROFILES["50_WHITE"] };
  if (/55.*CREAM|CREAM.*55|CREAM/.test(key)) return { key: "55_CREAM", ...PAPER_PROFILES["55_CREAM"] };
  if (/60.*WHITE|WHITE.*60/.test(key)) return { key: "60_WHITE", ...PAPER_PROFILES["60_WHITE"] };
  return null;
}

function roundInches(value) {
  return Math.round(value * 10000) / 10000;
}

function calculateSpineWidth({ pageCount, paperStock }) {
  const pages = Number(pageCount);
  const profile = paperProfileFor(paperStock);
  if (!Number.isInteger(pages) || pages <= 0 || !profile) return null;
  return {
    inches: roundInches(pages * profile.spineInchesPerPage),
    paperProfile: profile
  };
}

function normalizeAsset(asset) {
  if (!isPlainObject(asset)) return null;
  const type = normalizeString(asset.type);
  const location = normalizeString(asset.location);
  const sha256 = normalizeString(asset.sha256);
  if (!type || !location) return null;
  return {
    type,
    location,
    sha256: sha256 || null,
    authority: normalizeString(asset.authority) || "provided"
  };
}

function normalizeFullWrapInput(input = {}) {
  const sourceAssets = Array.isArray(input.sourceAssets)
    ? input.sourceAssets.map(normalizeAsset).filter(Boolean)
    : [];
  return {
    taskId: normalizeString(input.taskId),
    titleId: normalizeString(input.titleId),
    title: normalizeString(input.title),
    author: normalizeString(input.author),
    genre: normalizeString(input.genre),
    bookType: normalizeString(input.bookType),
    productionProfile: normalizeString(input.productionProfile),
    publicationIntent: normalizeString(input.publicationIntent),
    titlePurpose: normalizeString(input.titlePurpose),
    trimSize: normalizeString(input.trimSize),
    trimAuthority: normalizeString(input.trimAuthority),
    pageCountAuthority: normalizeString(input.pageCountAuthority),
    imprintAuthority: normalizeString(input.imprintAuthority),
    backCoverCopyAuthority: normalizeString(input.backCoverCopyAuthority),
    interiorColorMode: normalizeString(input.interiorColorMode),
    paperColor: normalizeString(input.paperColor),
    paperStock: normalizeString(input.paperStock),
    paperWeight: normalizeString(input.paperWeight),
    paperbackFinish: normalizeString(input.paperbackFinish),
    hardcoverConstruction: normalizeString(input.hardcoverConstruction),
    hardcoverFinish: normalizeString(input.hardcoverFinish),
    pageCount: Number.isInteger(Number(input.pageCount)) ? Number(input.pageCount) : null,
    isbn: normalizeString(input.isbn),
    barcode: normalizeString(input.barcode),
    imprint: normalizeString(input.imprint),
    distributionPath: normalizeString(input.distributionPath),
    isbnRequired: typeof input.isbnRequired === "boolean" ? input.isbnRequired : undefined,
    barcodeRequired: typeof input.barcodeRequired === "boolean" ? input.barcodeRequired : undefined,
    distributionRequired: typeof input.distributionRequired === "boolean" ? input.distributionRequired : undefined,
    publicationLaunchRequired: typeof input.publicationLaunchRequired === "boolean" ? input.publicationLaunchRequired : undefined,
    backCoverCopy: normalizeString(input.backCoverCopy),
    sourceAssets,
    confirmFullWrapExecution: input.confirmFullWrapExecution === true
  };
}

function validateFullWrapInputs(input = {}) {
  const normalized = normalizeFullWrapInput(input);
  const authority = resolveProductionAuthority(normalized);
  const missing = [];
  const invalid = [];
  if (!normalized.taskId || !GUID_PATTERN.test(normalized.taskId)) missing.push("TASK_ID");
  if (!normalized.titleId || !GUID_PATTERN.test(normalized.titleId)) missing.push("TITLE_ID");
  if (!normalized.title) missing.push("TITLE");
  if (!normalized.author) missing.push("AUTHOR");
  const trim = parseTrimSize(normalized.trimSize);
  if (!normalized.trimSize) missing.push("TRIM_SIZE");
  else if (!trim) invalid.push("TRIM_SIZE_UNPARSEABLE");
  if (!normalized.pageCount) missing.push("FINAL_PAGE_COUNT");
  const resolvedPaperStock = normalized.paperStock || authority.selectable.paperStock.value;
  if (!resolvedPaperStock) missing.push("PAPER_STOCK");
  else if (!paperProfileFor(resolvedPaperStock)) invalid.push("PAPER_STOCK_UNSUPPORTED");
  if (authority.commercial.isbnRequired && !normalized.isbn) missing.push("ISBN");
  if (authority.commercial.barcodeRequired && !normalized.barcode) missing.push("BARCODE");
  if (!normalized.imprint) missing.push("IMPRINT");
  if (authority.commercial.distributionRequired && !normalized.distributionPath) missing.push("DISTRIBUTION_PATH");
  if (!normalized.backCoverCopy) missing.push("BACK_COVER_COPY");
  const assetTypes = new Set(normalized.sourceAssets.map((asset) => normalizeKey(asset.type)));
  if (!assetTypes.has("FRONT_COVER")) missing.push("FRONT_COVER_ASSET");
  if (!assetTypes.has("INTERIOR_PROOF")) missing.push("INTERIOR_PROOF_ASSET");
  return {
    ok: missing.length === 0 && invalid.length === 0,
    normalized,
    authority,
    missing,
    invalid
  };
}

function buildFullWrapSpec(input = {}) {
  const validation = validateFullWrapInputs(input);
  if (!validation.ok) return validation;
  const normalized = validation.normalized;
  const authority = validation.authority;
  const trim = parseTrimSize(normalized.trimSize);
  const resolvedPaperStock = normalized.paperStock || authority.selectable.paperStock.value;
  const spine = calculateSpineWidth({
    pageCount: normalized.pageCount,
    paperStock: resolvedPaperStock
  });
  const calculatedAt = new Date().toISOString();
  const dimensions = {
    trimWidthInches: trim.width,
    trimHeightInches: trim.height,
    bleedInches: BLEED_INCHES,
    spineWidthInches: spine.inches,
    fullWrapWidthInches: roundInches((trim.width * 2) + spine.inches + (BLEED_INCHES * 2)),
    fullWrapHeightInches: roundInches(trim.height + (BLEED_INCHES * 2))
  };
  authority.derived = {
    spineWidth: {
      attribute: "spineWidth",
      value: String(spine.inches),
      authoritySource: DERIVED_VALUE,
      sourceRecord: "finalPageCount+paperProfile",
      sourceArtifact: authority.lifecycleAuthorities.finalPageCount.sourceArtifact,
      sourceTimestamp: null,
      resolvedAt: calculatedAt,
      calculation: `${normalized.pageCount} pages * ${spine.paperProfile.spineInchesPerPage} inches/page`
    },
    fullWrapDimensions: {
      attribute: "fullWrapDimensions",
      value: `${dimensions.fullWrapWidthInches} x ${dimensions.fullWrapHeightInches}`,
      authoritySource: DERIVED_VALUE,
      sourceRecord: "trim+spine+bleed",
      sourceArtifact: null,
      sourceTimestamp: null,
      resolvedAt: calculatedAt
    }
  };
  const spec = {
    artifactType: "JMP_FULL_WRAP_WORKING_SPEC",
    version: "1.1",
    titleId: normalized.titleId,
    taskId: normalized.taskId,
    title: normalized.title,
    author: normalized.author,
    titlePurpose: normalized.titlePurpose || null,
    publicationIntent: authority.publicationIntent,
    imprint: normalized.imprint,
    commercialMetadata: {
      isbnRequired: authority.commercial.isbnRequired,
      isbn: authority.commercial.isbnRequired ? normalized.isbn : null,
      barcodeRequired: authority.commercial.barcodeRequired,
      barcode: authority.commercial.barcodeRequired ? normalized.barcode : null,
      distributionRequired: authority.commercial.distributionRequired,
      distributionPath: authority.commercial.distributionRequired ? normalized.distributionPath : null,
      publicationLaunchRequired: authority.commercial.publicationLaunchRequired,
      authority: authority.commercial.commercialMetadataAuthority
    },
    pageCount: normalized.pageCount,
    trimSize: trim.label,
    paperProfile: spine.paperProfile,
    resolvedProductionAttributes: {
      interiorColorMode: authority.selectable.interiorColorMode,
      paperColor: authority.selectable.paperColor,
      paperStock: authority.selectable.paperStock,
      paperWeight: authority.selectable.paperWeight,
      paperbackFinish: authority.selectable.paperbackFinish,
      hardcoverConstruction: authority.selectable.hardcoverConstruction,
      hardcoverFinish: authority.selectable.hardcoverFinish
    },
    productionProfile: authority.profile,
    authorityProvenance: authority,
    dimensions,
    sourceAssets: normalized.sourceAssets,
    backCoverCopy: normalized.backCoverCopy,
    constraints: [
      "Preserve source front-cover and interior-proof assets.",
      ...(authority.commercial.barcodeRequired ? ["Reserve distributor barcode zone."] : ["Do not create barcode placeholder for non-release/commissioning cover."]),
      "Do not advance release, distribution, or author approval from this artifact alone.",
      ...(authority.commercial.distributionRequired ? [] : ["Do not create distribution submission or publication launch for non-release/commissioning title."]),
      "Validate final printer/distributor template before final production cover approval."
    ]
  };
  return {
    ok: true,
    normalized,
    spec,
    checksum: createHash("sha256").update(JSON.stringify(spec)).digest("hex")
  };
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

async function resolveDataverse(deps = {}) {
  const api = deps.apiBase || apiBase();
  const resource = deps.resourceUrl || resourceUrl();
  if (!api || !resource) return { ok: false, result: blocked("DATAVERSE_CONFIG_MISSING") };
  try {
    const token = deps.getToken ? await deps.getToken(resource) : await getDataverseToken(resource);
    return { ok: true, api, token };
  } catch (err) {
    return { ok: false, result: blocked(err.safeCode || "DATAVERSE_AUTH_FAILED") };
  }
}

async function hydrateFromTask(api, token, taskId, deps = {}) {
  const request = deps.dataverseRequest || dataverseRequest;
  const task = (await request(
    api,
    token,
    `${PRODUCTION_TASK_ENTITY_SET}(${taskId})?$select=jm1_productiontaskid,jm1_taskname,jm1_status,jm1_assignedto`
  )).body;
  return {
    taskId,
    taskName: normalizeString(task.jm1_taskname),
    assignedTo: normalizeString(task.jm1_assignedto)
  };
}

async function findExistingEvent(api, token, taskId, actionType, deps = {}) {
  const request = deps.dataverseRequest || dataverseRequest;
  const filter = encodeURIComponent([
    `jm1_sourcerecordid eq '${encodeODataString(taskId)}'`,
    `jm1_actiontype eq '${actionType}'`
  ].join(" and "));
  return (await request(
    api,
    token,
    `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,createdon&$filter=${filter}&$orderby=createdon desc&$top=1`
  )).body?.value?.[0] || null;
}

function buildExecutionLogPayload({ input, result, actionType, status, timestamp }) {
  const missing = Array.isArray(result.missing) && result.missing.length
    ? ` Missing inputs: ${result.missing.join(", ")}.`
    : "";
  const invalid = Array.isArray(result.invalid) && result.invalid.length
    ? ` Invalid inputs: ${result.invalid.join(", ")}.`
    : "";
  const output = result.ok ? ` Output checksum ${result.checksum}.` : "";
  return {
    jm1_name: `${actionType}-${normalizeString(input.taskId)}`,
    jm1_actiondescription: [
      `${actionType} for ${normalizeString(input.title) || "title"} (${normalizeString(input.taskId)}).`,
      `Full Wrap executor validation result: ${status}.`,
      missing,
      invalid,
      output,
      "Source assets preserved; no author communication, distribution submission, release gate, payment, or Business Central action executed."
    ].join(" ").replace(/\s+/g, " ").trim().slice(0, 1000),
    jm1_actiontype: actionType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: status === "SUCCESS" ? EXECUTION_STATUS.SUCCESS : EXECUTION_STATUS.FAILED,
    jm1_startedon: timestamp,
    jm1_completedon: timestamp,
    jm1_sourceentity: PRODUCTION_TASK_ENTITY_SET,
    jm1_sourcerecordid: normalizeString(input.taskId)
  };
}

async function executeFullWrapPreparation(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  if (input.confirmFullWrapExecution !== true) return blocked("CONFIRMATION_REQUIRED");
  if (!isGateOpen(deps)) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const resolved = await resolveDataverse(deps);
  if (!resolved.ok) return resolved.result;
  const { api, token } = resolved;

  try {
    let hydrated = {};
    const taskId = normalizeString(input.taskId);
    if (taskId && GUID_PATTERN.test(taskId)) {
      hydrated = deps.hydrateFromTask
        ? await deps.hydrateFromTask(taskId)
        : await hydrateFromTask(api, token, taskId, deps);
    }

    const merged = normalizeFullWrapInput({
      ...hydrated,
      ...input,
      sourceAssets: input.sourceAssets || hydrated.sourceAssets || []
    });
    const specResult = buildFullWrapSpec(merged);
    const actionType = specResult.ok ? ACTION_TYPE_EXECUTED : ACTION_TYPE_BLOCKED;
    const existing = await findExistingEvent(api, token, merged.taskId, actionType, deps);
    const timestamp = normalizeString(existing?.createdon) || new Date().toISOString();
    let executionLogId = normalizeString(existing?.jm1_executionlogid) || null;

    if (!existing) {
      const request = deps.dataverseRequest || dataverseRequest;
      const log = await request(api, token, EXECUTION_LOG_ENTITY_SET, {
        method: "POST",
        step: "full-wrap:execution-log",
        headers: { Prefer: "return=representation" },
        body: buildExecutionLogPayload({
          input: merged,
          result: specResult,
          actionType,
          status: specResult.ok ? "SUCCESS" : "FAILED",
          timestamp
        })
      });
      executionLogId = normalizeString(log.body.jm1_executionlogid) || null;
    }

    if (!specResult.ok) {
      return {
        ok: false,
        code: ACTION_TYPE_BLOCKED,
        reason: "REQUIRED_INPUT_DATA_MISSING",
        missing: specResult.missing,
        invalid: specResult.invalid,
        taskId: merged.taskId,
        titleId: merged.titleId,
        title: merged.title,
        author: merged.author,
        executionLogId,
        idempotentReplay: Boolean(existing),
        liveActions: {
          createdExecutionLog: !existing,
          generatedFullWrapArtifact: false,
          advancedLifecycle: false,
          sentAuthorCommunication: false,
          submittedDistribution: false
        }
      };
    }

    return {
      ok: true,
      code: ACTION_TYPE_EXECUTED,
      taskId: merged.taskId,
      titleId: merged.titleId,
      title: merged.title,
      author: merged.author,
      outputArtifact: {
        type: specResult.spec.artifactType,
        checksum: specResult.checksum,
        spec: specResult.spec
      },
      executionLogId,
      idempotentReplay: Boolean(existing),
      liveActions: {
        createdExecutionLog: !existing,
        generatedFullWrapArtifact: true,
        advancedLifecycle: false,
        sentAuthorCommunication: false,
        submittedDistribution: false
      }
    };
  } catch (err) {
    return blocked(err.safeCode || "FULL_WRAP_EXECUTION_FAILED", {
      httpStatus: err.httpStatus || null,
      dvCode: err.dvCode || null,
      dvMessage: err.dvMessage || null,
      step: err.step || null
    });
  }
}

module.exports = {
  ACTION_TYPE_BLOCKED,
  ACTION_TYPE_EXECUTED,
  BLEED_INCHES,
  GATE_NAME,
  PAPER_PROFILES,
  buildFullWrapSpec,
  calculateSpineWidth,
  executeFullWrapPreparation,
  normalizeFullWrapInput,
  parseTrimSize,
  validateFullWrapInputs
};
