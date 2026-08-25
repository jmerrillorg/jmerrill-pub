"use strict";

const crypto = require("node:crypto");
const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const { QueueServiceClient } = require("@azure/storage-queue");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const mammoth = require("mammoth");
const { routeToProvider } = require("../model/providerRouter");
const { summarizeCorrectionCount } = require("./correctionCounting");
const { validateEditorialCompliance } = require("./editorialComplianceValidator");
const { buildLineRetentionDriftQa } = require("./lineRetentionDriftQa");
const {
  createAuthorReviewGatePlan,
  gateBlocksCurrentStageRuntime,
  evaluateNextStageEligibility
} = require("./editorialAuthorGatePolicy");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002
};
const BAND_LEVEL_1 = 835500000;

const STAGE_TYPES = {
  EDITORIAL_REVIEW: 100000000,
  DEVELOPMENTAL_EDITING: 100000001,
  LINE_EDITING: 100000002,
  COPYEDITING: 100000003,
  PROOFREADING: 100000004,
  EDITORIAL_INTERNAL_QA: 100000006
};

const STAGE_STATUS = {
  IN_PROGRESS: 100000001,
  AUTHOR_REVIEW: 100000002,
  COMPLETE: 100000008
};
const AUTHOR_DECISION_APPROVE = 196650000;
const GATE_STATUS_APPROVED = 196650003;
const GATE_STATUS_READY_FOR_AUTHOR_REVIEW = 196650001;
const GATE_CODES = Object.freeze({
  EDITORIAL_REVIEW: 196650000,
  DEVELOPMENTAL_EDITING: 196650001,
  LINE_EDITING: 196650002,
  COPYEDITING: 196650003,
  PROOFREADING: 196650004
});
const DEFAULT_LINE_EDITING_CHUNK_WORD_LIMIT = 800;
const DEFAULT_LINE_EDITING_CHUNK_CONCURRENCY = 4;
const DEFAULT_LINE_EDITING_DEPLOYMENT_TPM = 100000;
const DEFAULT_LINE_EDITING_OUTPUT_TPM = 5000;
const DEFAULT_LINE_EDITING_OUTPUT_BUCKET_RATIO = 0.2;
const DEFAULT_LINE_EDITING_CAPACITY_HEADROOM_RATIO = 0.3;
const DEFAULT_LINE_EDITING_CHUNK_MAX_OUTPUT_TOKENS = 2000;
const DEFAULT_LINE_EDITING_ADAPTIVE_MAX_RETRIES = 2;
const DEFAULT_LINE_EDITING_ADAPTIVE_RETRY_FLOOR_MS = 5000;
const DEFAULT_LINE_EDITING_ADAPTIVE_RETRY_MAX_MS = 120000;
const DEFAULT_LINE_EDITING_SCHEMA_MISS_MAX_RETRIES = 3;
const DEFAULT_LINE_EDITING_TRANSIENT_MODEL_MAX_RETRIES = 3;
const DEFAULT_TARGETED_EDITORIAL_QUEUE_NAME = "jm1-targeted-editorial-execution";
const DEFAULT_TARGETED_EDITORIAL_CHECKPOINT_CONTAINER = "publishing";
const DEFAULT_TARGETED_EDITORIAL_CHECKPOINT_PREFIX = "targeted-editorial-execution";

const EXECUTOR_POLICIES = {
  EDITORIAL_REVIEW: {
    stageType: STAGE_TYPES.EDITORIAL_REVIEW,
    outputRoles: ["editorialAssessment", "recommendedEditorialPath", "riskRegister"],
    exactMissingSourceBlocker: "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  DEVELOPMENTAL_EDITING: {
    stageType: STAGE_TYPES.DEVELOPMENTAL_EDITING,
    outputRoles: ["editedManuscript", "developmentalMemo", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  LINE_EDITING: {
    stageType: STAGE_TYPES.LINE_EDITING,
    outputRoles: ["editedManuscript", "lineEditingSummary", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "LINE_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  COPYEDITING: {
    stageType: STAGE_TYPES.COPYEDITING,
    outputRoles: ["editedManuscript", "copyeditingSummary", "styleSheet", "qaEvidence"],
    exactMissingSourceBlocker: "COPYEDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  PROOFREADING: {
    stageType: STAGE_TYPES.PROOFREADING,
    outputRoles: ["proofreadManuscript", "proofreadingCoverNote", "qaEvidence"],
    exactMissingSourceBlocker: "PROOFREADING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  EDITORIAL_INTERNAL_QA: {
    stageType: STAGE_TYPES.EDITORIAL_INTERNAL_QA,
    outputRoles: ["qaEvidence", "exceptionEvidence"],
    exactMissingSourceBlocker: "EDITORIAL_QA_BLOCKED — SOURCE_ARTIFACT_MISSING"
  }
};

const TARGETED_EXECUTION_MODES = Object.freeze({
  DRY_RUN: "DRY_RUN",
  EXECUTE: "EXECUTE",
  EXECUTE_ASYNC: "EXECUTE_ASYNC"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
}

function normalizeStageCode(stage) {
  const type = Number(stage?.jm1pub_stagetype);
  const name = normalizeString(stage?.jm1pub_name).toLowerCase();
  if (type === STAGE_TYPES.DEVELOPMENTAL_EDITING || name.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (type === STAGE_TYPES.LINE_EDITING || name.includes("line editing")) return "LINE_EDITING";
  if (type === STAGE_TYPES.COPYEDITING || name.includes("copyedit")) return "COPYEDITING";
  if (type === STAGE_TYPES.PROOFREADING || name.includes("proofread")) return "PROOFREADING";
  if (type === STAGE_TYPES.EDITORIAL_INTERNAL_QA || name.includes("qa")) return "EDITORIAL_INTERNAL_QA";
  return "EDITORIAL_REVIEW";
}

function stageStatusIsExecutable(stage) {
  const status = Number(stage?.jm1pub_stagestatus);
  return status === STAGE_STATUS.IN_PROGRESS;
}

function isLivePortfolioStage(stage) {
  const text = [
    stage?.jm1pub_name,
    stage?.jm1pub_internaloperationalsummary,
    stage?.jm1pub_authorsafesummary
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (!text) return true;
  if (/\btest\b/.test(text) && !/\btestament\b/.test(text)) return false;
  return ![
    "synthetic",
    "fixture",
    "gate-w1",
    "gate w1",
    "certification manuscript",
    "duplicate proof",
    "preview proof",
    "staging",
    "final proof 202607"
  ].some((marker) => text.includes(marker));
}

function authorGateBlocksRuntime(gate) {
  return gateBlocksCurrentStageRuntime(gate);
}

function stageTypeForCode(stageCode) {
  return EXECUTOR_POLICIES[stageCode]?.stageType || null;
}

function transactionForStage(stageCode) {
  if (stageCode === "EDITORIAL_REVIEW") return "editorial_diagnostic";
  if (stageCode === "DEVELOPMENTAL_EDITING") return "developmental_editing";
  if (stageCode === "LINE_EDITING") return "line_editing";
  if (stageCode === "COPYEDITING") return "copy_editing";
  if (stageCode === "PROOFREADING") return "proofreading";
  return "independent_quality_review";
}

function preferredDeploymentAliasForStage(stageCode) {
  if (stageCode === "COPYEDITING" || stageCode === "PROOFREADING") {
    return normalizeString(process.env.JM1_COPY_PROOF_MODEL_DEPLOYMENT_ALIAS);
  }
  return (
    normalizeString(process.env.JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS) ||
    normalizeString(process.env.AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME)
  );
}

function targetedExecutionIdempotencyKey(input) {
  return crypto
    .createHash("sha256")
    .update([
      "TARGETED_EDITORIAL_EXECUTION_V1",
      normalizeString(input.titleId),
      normalizeString(input.stageCode),
      normalizeString(input.sourceArtifactId),
      normalizeString(input.sourceChecksum)
    ].join(":"))
    .digest("hex");
}

function targetedBlocked(input, code, detail, extra = {}) {
  return {
    ok: false,
    status: "BLOCKED",
    code,
    detail,
    executionMode: normalizeString(input.executionMode),
    titleId: normalizeString(input.titleId),
    stageCode: normalizeString(input.stageCode),
    sourceArtifactId: normalizeString(input.sourceArtifactId),
    sourceChecksum: normalizeString(input.sourceChecksum),
    ...extra
  };
}

function validateTargetedExecutionInput(input = {}) {
  const mode = normalizeString(input.executionMode).toUpperCase();
  const stageCode = normalizeString(input.stageCode).toUpperCase();
  if (normalizeString(input.bulkSelector) || normalizeString(input.portfolioSelector) || normalizeString(input.query)) {
    return targetedBlocked(input, "BULK_SELECTOR_NOT_ALLOWED", "Targeted execution accepts one explicit title/stage/source request only.");
  }
  if (!normalizeString(input.titleId)) return targetedBlocked(input, "TITLE_ID_REQUIRED", "titleId is required.");
  if (!EXECUTOR_POLICIES[stageCode]) return targetedBlocked(input, "SUPPORTED_STAGE_CODE_REQUIRED", "stageCode must resolve to one supported editorial executor.");
  if (!normalizeString(input.sourceArtifactId)) return targetedBlocked(input, "SOURCE_ARTIFACT_ID_REQUIRED", "sourceArtifactId is required.");
  if (!normalizeString(input.sourceChecksum)) return targetedBlocked(input, "SOURCE_CHECKSUM_REQUIRED", "sourceChecksum is required.");
  if (!Object.values(TARGETED_EXECUTION_MODES).includes(mode)) {
    return targetedBlocked(input, "EXECUTION_MODE_REQUIRED", "executionMode must be DRY_RUN, EXECUTE, or EXECUTE_ASYNC.");
  }
  if (input.authorApprovalRequired !== true) {
    return targetedBlocked(input, "AUTHOR_APPROVAL_REQUIRED", "authorApprovalRequired must be true for targeted editorial execution.");
  }
  return null;
}

async function findExactTitle(client, titleId) {
  return client.list("jm1pub_titles", {
    $select: "jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,modifiedon",
    $filter: `jm1pub_titleid eq ${normalizeString(titleId)}`,
    $top: "2"
  });
}

async function findExactStage(client, titleId, stageCode) {
  const stageType = stageTypeForCode(stageCode);
  return client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${normalizeString(titleId)} and jm1pub_stagetype eq ${stageType}`,
    $orderby: "modifiedon desc",
    $top: "2"
  });
}

async function findExactSourceArtifact(client, titleId, sourceArtifactId) {
  return client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_iscurrentapproved,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter:
      `jm1pub_editorialartifactid eq ${normalizeString(sourceArtifactId)} and _jm1pub_titleid_value eq ${normalizeString(titleId)}`,
    $top: "2"
  });
}

function expectedCurrentStageMatches(input, upstream, stageCode) {
  const expected = normalizeString(input.expectedCurrentStage).toUpperCase();
  if (!expected) return { ok: true, reason: "NO_EXPECTED_CURRENT_STAGE_SPECIFIED" };
  if (expected === "DEVELOPMENTAL_COMPLETE" && stageCode === "LINE_EDITING") {
    const stage = (upstream.stages || []).find((row) => Number(row.jm1pub_stagetype) === STAGE_TYPES.DEVELOPMENTAL_EDITING);
    if (!stage) return { ok: false, reason: "EXPECTED_DEVELOPMENTAL_STAGE_NOT_FOUND" };
    if (Number(stage.jm1pub_stagestatus) !== STAGE_STATUS.COMPLETE) return { ok: false, reason: "EXPECTED_DEVELOPMENTAL_STAGE_NOT_COMPLETE" };
    return { ok: true, reason: "DEVELOPMENTAL_COMPLETE_CONFIRMED" };
  }
  return { ok: false, reason: `EXPECTED_CURRENT_STAGE_UNSUPPORTED_FOR_TARGET:${expected}:${stageCode}` };
}

async function evaluateTargetedEditorialExecution(input = {}, deps = {}) {
  const normalized = {
    ...input,
    executionMode: normalizeString(input.executionMode).toUpperCase(),
    stageCode: normalizeString(input.stageCode).toUpperCase()
  };
  const invalid = validateTargetedExecutionInput(normalized);
  if (invalid) return invalid;

  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const idempotencyKey = targetedExecutionIdempotencyKey(normalized);
  const [titles, stages, artifacts] = await Promise.all([
    findExactTitle(client, normalized.titleId),
    findExactStage(client, normalized.titleId, normalized.stageCode),
    findExactSourceArtifact(client, normalized.titleId, normalized.sourceArtifactId)
  ]);

  if (titles.length === 0) return targetedBlocked(normalized, "TITLE_NOT_FOUND", "No title resolves to the supplied titleId.", { idempotencyKey });
  if (titles.length > 1) return targetedBlocked(normalized, "TITLE_NOT_UNIQUE", "More than one title resolved for the supplied titleId.", { idempotencyKey, resolvedCount: titles.length });
  if (stages.length === 0) return targetedBlocked(normalized, "TARGET_STAGE_NOT_FOUND", "No target stage resolves to the supplied titleId and stageCode.", { idempotencyKey });
  if (stages.length > 1) return targetedBlocked(normalized, "TARGET_STAGE_NOT_UNIQUE", "More than one target stage resolved for the supplied titleId and stageCode.", { idempotencyKey, resolvedCount: stages.length });
  if (artifacts.length === 0) return targetedBlocked(normalized, "SOURCE_ARTIFACT_NOT_FOUND", "No source artifact resolves to the supplied titleId and sourceArtifactId.", { idempotencyKey });
  if (artifacts.length > 1) return targetedBlocked(normalized, "SOURCE_ARTIFACT_NOT_UNIQUE", "More than one source artifact resolved for the supplied titleId and sourceArtifactId.", { idempotencyKey, resolvedCount: artifacts.length });

  const title = titles[0];
  const stage = stages[0];
  const sourceArtifact = artifacts[0];
  const actualStageCode = normalizeStageCode(stage);
  if (actualStageCode !== normalized.stageCode) {
    return targetedBlocked(normalized, "TARGET_STAGE_CODE_MISMATCH", "Resolved target stage does not match requested stageCode.", {
      idempotencyKey,
      actualStageCode
    });
  }
  if (!stageStatusIsExecutable(stage)) {
    return targetedBlocked(normalized, "TARGET_STAGE_NOT_EXECUTABLE", "Resolved target stage is not IN_PROGRESS.", {
      idempotencyKey,
      stageStatus: stage.jm1pub_stagestatus
    });
  }
  if (normalizeString(sourceArtifact.jm1pub_sha256) !== normalizeString(normalized.sourceChecksum)) {
    return targetedBlocked(normalized, "SOURCE_CHECKSUM_MISMATCH", "Resolved source artifact checksum does not match request.", {
      idempotencyKey,
      actualChecksum: normalizeString(sourceArtifact.jm1pub_sha256)
    });
  }

  const upstream = await findUpstreamApprovalEvidence(client, stage, normalized.stageCode);
  if (!upstream.ok) {
    return targetedBlocked(normalized, "AUTHOR_APPROVAL_NOT_EXACT_ARTIFACT_BOUND", upstream.reason || "Required upstream approval is missing.", {
      idempotencyKey
    });
  }
  if (normalizeString(upstream.approvedArtifactId) !== normalizeString(normalized.sourceArtifactId)) {
    return targetedBlocked(normalized, "AUTHOR_APPROVAL_BINDS_DIFFERENT_ARTIFACT", "Upstream approval does not bind to the requested source artifact.", {
      idempotencyKey,
      approvedArtifactId: upstream.approvedArtifactId
    });
  }
  const expected = expectedCurrentStageMatches(normalized, upstream, normalized.stageCode);
  if (!expected.ok) return targetedBlocked(normalized, "EXPECTED_CURRENT_STAGE_MISMATCH", expected.reason, { idempotencyKey });

  const outputReadyVersion = normalized.stageCode === "EDITORIAL_REVIEW" ? "v5" : "v4";
  const existingOutput = await findExecutionLog(
    client,
    "ACTIVE_EDITORIAL_OUTPUT_CREATED",
    `editorial-runtime:output-ready-${outputReadyVersion}:${stage.jm1pub_editorialstageid}:${normalized.stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`
  );
  if (existingOutput) {
    return targetedBlocked(normalized, "TARGET_STAGE_ALREADY_COMPLETED_FOR_SOURCE", "Output is already recorded for the target stage/source combination.", {
      idempotencyKey,
      existingOutputLogId: existingOutput.jm1_executionlogid
    });
  }

  return {
    ok: true,
    status:
      normalized.executionMode === TARGETED_EXECUTION_MODES.DRY_RUN
        ? "DRY_RUN_READY"
        : normalized.executionMode === TARGETED_EXECUTION_MODES.EXECUTE_ASYNC
          ? "QUEUE_READY"
          : "EXECUTION_READY",
    executionMode: normalized.executionMode,
    idempotencyKey,
    canonicalTitle: {
      titleId: title.jm1pub_titleid,
      title: normalizeString(title.jm1pub_titlename || title.jm1pub_name),
      author: normalizeString(title.jm1pub_authorname)
    },
    currentStage: {
      stageId: stage.jm1pub_editorialstageid,
      stageName: stage.jm1pub_name,
      stageCode: normalized.stageCode,
      stageStatus: stage.jm1pub_stagestatus
    },
    exactSourceArtifact: {
      artifactId: sourceArtifact.jm1pub_editorialartifactid,
      name: sourceArtifact.jm1pub_editorialartifactname,
      filename: sourceArtifact.jm1pub_filename,
      sha256: sourceArtifact.jm1pub_sha256,
      currentApproved: sourceArtifact.jm1pub_iscurrentapproved === true
    },
    authorApprovalEvidence: {
      approvedArtifactId: upstream.approvedArtifactId,
      gates: (upstream.gates || [])
        .filter((gate) =>
          Number(gate.jm1pub_gatestatus) === GATE_STATUS_APPROVED &&
          Number(gate.jm1pub_authordecision) === AUTHOR_DECISION_APPROVE &&
          gate.jm1pub_nextstageauthorized === true
        )
        .map((gate) => ({
          gateId: gate.jm1pub_editorialapprovalgateid,
          decisionOn: gate.jm1pub_authordecisionon,
          deliverableArtifactId: gate._jm1pub_deliverableartifactid_value
        }))
    },
    styleGuide: selectedStyleGuidesForStage(normalized.stageCode),
    targetStage: normalized.stageCode,
    providerRoute: {
      provider: normalized.stageCode === "LINE_EDITING" ? "microsoft-foundry-claude" : "stage-policy",
      deploymentAlias: preferredDeploymentAliasForStage(normalized.stageCode),
      silentFallbackAllowed: false
    },
    expectedMutations: [
      "claim target editorial stage",
      "read exact source artifact",
      "invoke governed provider route",
      "persist output artifacts",
      "write QA evidence",
      "create package manifest",
      "create mandatory author-review gate"
    ],
    expectedOutputArtifactType: EXECUTOR_POLICIES[normalized.stageCode].outputRoles,
    expectedNextAuthorGate: {
      stageCode: normalized.stageCode,
      nextStageAuthorized: false
    },
    stage,
    sourceArtifact,
    upstream
  };
}

async function runTargetedEditorialExecution(input = {}, deps = {}) {
  const evaluated = await evaluateTargetedEditorialExecution(input, deps);
  if (!evaluated.ok) return evaluated;
  if (evaluated.executionMode === TARGETED_EXECUTION_MODES.DRY_RUN) {
    const { stage, sourceArtifact, upstream, ...safe } = evaluated;
    return { ...safe, mutationsPerformed: 0, externalSends: 0 };
  }

  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const commissioned = await recordRuntimeCommissioned(client, evaluated.targetStage, `TARGETED-${evaluated.idempotencyKey}`);
  const result = await processStage(client, evaluated.stage, `TARGETED-${evaluated.idempotencyKey}`, {
    sourceArtifact: evaluated.sourceArtifact
  });
  return {
    ok: true,
    status: "EXECUTED",
    executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
    idempotencyKey: evaluated.idempotencyKey,
    canonicalTitle: evaluated.canonicalTitle,
    currentStage: evaluated.currentStage,
    exactSourceArtifact: evaluated.exactSourceArtifact,
    commissioned,
    result,
    externalSends: 0
  };
}

function buildChunkedLineEditingInvocation(chunkCheckpoints = []) {
  const ordered = chunkCheckpoints
    .slice()
    .sort((left, right) => Number(left.chunkIndex || 0) - Number(right.chunkIndex || 0));
  const tokenCounts = { input: 0, output: 0, total: 0 };
  for (const item of ordered) {
    tokenCounts.input += item.modelResult?.tokenCounts?.input || 0;
    tokenCounts.output += item.modelResult?.tokenCounts?.output || 0;
    tokenCounts.total += item.modelResult?.tokenCounts?.total || 0;
  }
  const first = ordered.find((item) => item.modelResult)?.modelResult || {};
  return {
    ...first,
    ok: true,
    fellBack: false,
    tokenCounts,
    output: {
      editedManuscript: ordered.map((item) => normalizeString(item.output?.editedManuscript)).join("\n\n"),
      lineEditingSummary: ordered
        .map((item) => `Chunk ${item.chunkIndex}: ${normalizeString(item.output?.lineEditingSummary) || "Line editing completed."}`)
        .join("\n"),
      retentionNotes: ordered
        .map((item) => `Chunk ${item.chunkIndex}: ${normalizeString(item.output?.retentionNotes) || "Source content retained."}`)
        .join("\n"),
      changeLedger: ordered.flatMap((item) => {
        const entries = Array.isArray(item.output?.changeLedger) ? item.output.changeLedger : [];
        return entries.length
          ? entries.map((entry) => `Chunk ${item.chunkIndex}: ${entry}`)
          : [`Chunk ${item.chunkIndex}: No recurring line-editing pattern separately reported.`];
      }),
      authorQueries: ordered.flatMap((item) => {
        const entries = Array.isArray(item.output?.authorQueries) ? item.output.authorQueries : [];
        return entries.map((entry) => `Chunk ${item.chunkIndex}: ${entry}`);
      })
    },
    chunkCount: ordered.length,
    scheduler: {
      mode: "durable_queue_checkpoint",
      chunkInvocations: ordered.length,
      maxChunksPerInvocation: 1
    },
    promptVersion: "CC010-LINE_EDITING-CHUNK-V1"
  };
}

async function loadTargetedLineEditingSource(stage, sourceArtifact, upstream, correlationId) {
  const sourceRef = await resolveSourceGraphItem(sourceArtifact, "LINE_EDITING");
  const sourceBuffer = await graphRequest(sourceRef.contentPath).catch((error) => {
    throw Object.assign(error, {
      safeCode: `LINE_EDITING_BLOCKED — ${error.safeCode || "GRAPH_DOWNLOAD_FAILED"}`,
      graphDetail: graphFailureDetail(error, sourceArtifact)
    });
  });
  const actualSha = crypto.createHash("sha256").update(sourceBuffer).digest("hex");
  const expectedSha = normalizeString(sourceArtifact.jm1pub_sha256);
  if (expectedSha && actualSha !== expectedSha) {
    throw Object.assign(new Error("Source checksum mismatch"), {
      safeCode: "LINE_EDITING_BLOCKED — SOURCE_CHECKSUM_MISMATCH"
    });
  }
  const extracted = await extractSourceText(sourceBuffer, "LINE_EDITING");
  const sourceText = extracted.value || "";
  const chunks = splitLineEditingSourceChunks(sourceText);
  return {
    sourceSha256: actualSha,
    totalWordCount: summarizeExtractedText(sourceText).words,
    chunkWordLimit: lineEditingChunkWordLimit(),
    chunkCount: chunks.length,
    chunks,
    upstreamSummary: summarizeUpstreamContextForPrompt(stage, "LINE_EDITING", sourceArtifact, upstream || {}),
    correlationId
  };
}

async function runChunkedTargetedEditorialExecution(input = {}, deps = {}) {
  const evaluated = await evaluateTargetedEditorialExecution(input, deps);
  if (!evaluated.ok) return evaluated;
  if (evaluated.executionMode === TARGETED_EXECUTION_MODES.DRY_RUN) {
    const { stage, sourceArtifact, upstream, ...safe } = evaluated;
    return { ...safe, mutationsPerformed: 0, externalSends: 0 };
  }
  if (evaluated.targetStage !== "LINE_EDITING") {
    return runTargetedEditorialExecution(input, deps);
  }

  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const { checkpointStore, queueClient } = createStorageClients(deps);
  const correlationId = `TARGETED-${evaluated.idempotencyKey}`;
  const stage = evaluated.stage;
  const stageCode = "LINE_EDITING";
  const sourceArtifact = evaluated.sourceArtifact;
  const completeName = "complete.json";
  if (await checkpointExists(checkpointStore, evaluated.idempotencyKey, completeName)) {
    return {
      ok: true,
      status: "OUTPUT_ALREADY_RECORDED",
      executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
      idempotencyKey: evaluated.idempotencyKey,
      canonicalTitle: evaluated.canonicalTitle,
      currentStage: evaluated.currentStage,
      exactSourceArtifact: evaluated.exactSourceArtifact,
      checkpoint: await downloadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, completeName),
      externalSends: 0
    };
  }

  const commissioned = await recordRuntimeCommissioned(client, stageCode, correlationId);
  const claim = await claimStageTask(client, stage, stageCode, correlationId);
  const exactBlocker = buildExactBlocker(stageCode, sourceArtifact);
  if (exactBlocker) {
    const blocked = await recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId);
    return {
      ok: true,
      status: "EXCEPTION",
      executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
      idempotencyKey: evaluated.idempotencyKey,
      exactBlocker,
      claim,
      blocked,
      externalSends: 0
    };
  }
  await recordSourceExecutionReadiness(client, stage, stageCode, sourceArtifact, correlationId);
  await recordLegacyOutputScopeClarification(client, stage, stageCode, sourceArtifact, correlationId);

  const outputReadyVersion = "v4";
  const outputIdempotencyKey = `editorial-runtime:output-ready-${outputReadyVersion}:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", outputIdempotencyKey);
  if (existing) {
    const existingOutputs = await findExistingOutputArtifacts(client, stage, stageCode);
    const reviewArtifact = selectPrimaryAuthorReviewArtifact(existingOutputs, null);
    const authorGate = reviewArtifact
      ? await createAuthorReviewGate(client, stage, stageCode, reviewArtifact, correlationId)
      : { ok: false, reason: "AUTHOR_REVIEW_ARTIFACT_BINDING_MISSING" };
    const checkpoint = await uploadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, completeName, {
      completedAt: new Date().toISOString(),
      status: "OUTPUT_ALREADY_RECORDED",
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      authorGate
    });
    return {
      ok: true,
      status: "OUTPUT_ALREADY_RECORDED",
      executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
      idempotencyKey: evaluated.idempotencyKey,
      checkpoint,
      authorGate,
      externalSends: 0
    };
  }

  const source = await loadTargetedLineEditingSource(stage, sourceArtifact, evaluated.upstream, correlationId);
  const planName = "plan.json";
  const plan = {
    idempotencyKey: evaluated.idempotencyKey,
    titleId: evaluated.canonicalTitle.titleId,
    stageId: evaluated.currentStage.stageId,
    stageCode,
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    sourceSha256: source.sourceSha256,
    chunkCount: source.chunkCount,
    chunkWordLimit: source.chunkWordLimit,
    totalWordCount: source.totalWordCount,
    createdAt: new Date().toISOString()
  };
  await uploadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, planName, plan);

  const requestedChunkCursor = Math.max(0, Math.min(source.chunkCount - 1, parseNonNegativeInteger(input.chunkCursor, 0)));
  const nextMissingChunkCursor = await firstMissingLineEditingChunkCursor(
    checkpointStore,
    evaluated.idempotencyKey,
    source.chunkCount
  );
  const chunkCursor =
    nextMissingChunkCursor < source.chunkCount
      ? nextMissingChunkCursor
      : requestedChunkCursor;
  const chunkIndex = chunkCursor + 1;
  const chunkName = lineEditingChunkCheckpointName(chunkIndex);
  let chunkCheckpoint;
  if (nextMissingChunkCursor >= source.chunkCount) {
    chunkCheckpoint = await downloadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, chunkName);
  } else if (await checkpointExists(checkpointStore, evaluated.idempotencyKey, chunkName)) {
    chunkCheckpoint = await downloadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, chunkName);
  } else {
    const schemaRetryAttempt = parseNonNegativeInteger(
      input.chunkSchemaRetryAttempt,
      parseNonNegativeInteger(input.chunkRetryAttempt, 0)
    );
    const modelResult = await invokeSingleStageModelProvider({
      stage,
      stageCode,
      sourceArtifact,
      extractedText: source.chunks[chunkCursor],
      correlationId: `${correlationId}:chunk-${chunkIndex}-of-${source.chunkCount}`,
      upstreamContext: evaluated.upstream,
      promptBody: buildLineEditingChunkPrompt({
        stage,
        sourceArtifact,
        chunkText: source.chunks[chunkCursor],
        chunkIndex,
        chunkCount: source.chunkCount,
        totalWordCount: source.totalWordCount,
        upstreamContext: evaluated.upstream,
        schemaRetryAttempt
      }),
      diagnosticId: `${normalizeString(stage._jm1pub_titleid_value) || normalizeString(stage.jm1pub_editorialstageid)}:line-chunk-${chunkIndex}`,
      promptVersion: "CC010-LINE_EDITING-CHUNK-V1"
    });
    if (!modelResult.ok || modelResult.fellBack) {
      const modelRetryAttempt = parseNonNegativeInteger(
        input.chunkTransientRetryAttempt,
        parseNonNegativeInteger(input.chunkRetryAttempt, 0)
      );
      if (isRateLimitModelResult(modelResult)) {
        const retryAfterSeconds = Math.max(
          60,
          Math.ceil(adaptiveLineEditingRetryDelayMs(modelResult, modelRetryAttempt + 1) / 1000)
        );
        const queued = await enqueueTargetedEditorialChunk(queueClient, {
          ...input,
          kind: "TARGETED_EDITORIAL_EXECUTION",
          version: 1,
          chunked: true,
          chunkCursor,
          chunkRetryAttempt: modelRetryAttempt + 1,
          chunkTransientRetryAttempt: modelRetryAttempt + 1,
          executionMode: "EXECUTE"
        }, { visibilityTimeout: retryAfterSeconds });
        return {
          ok: true,
          status: "CHUNK_REQUEUED_AFTER_RATE_LIMIT",
          executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
          idempotencyKey: evaluated.idempotencyKey,
          chunkIndex,
          chunkCount: source.chunkCount,
          retryAfterSeconds,
          queued,
          externalSends: 0
        };
      }
      if (isTransientModelCallResult(modelResult) && modelRetryAttempt < lineEditingTransientModelMaxRetries()) {
        const retryAfterSeconds = Math.max(
          60,
          Math.ceil(adaptiveLineEditingRetryDelayMs(modelResult, modelRetryAttempt + 1) / 1000)
        );
        const queued = await enqueueTargetedEditorialChunk(queueClient, {
          ...input,
          kind: "TARGETED_EDITORIAL_EXECUTION",
          version: 1,
          chunked: true,
          chunkCursor,
          chunkRetryAttempt: modelRetryAttempt + 1,
          chunkTransientRetryAttempt: modelRetryAttempt + 1,
          executionMode: "EXECUTE"
        }, { visibilityTimeout: retryAfterSeconds });
        return {
          ok: true,
          status: "CHUNK_REQUEUED_AFTER_TRANSIENT_MODEL_ERROR",
          executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
          idempotencyKey: evaluated.idempotencyKey,
          chunkIndex,
          chunkCount: source.chunkCount,
          retryAfterSeconds,
          exactReason: safeBlockerReason(modelResult.error, "MODEL_INVOCATION_FAILED"),
          queued,
          externalSends: 0
        };
      }
      const exact = `LINE_EDITING_BLOCKED — ${safeBlockerReason(modelResult.error, "MODEL_INVOCATION_FAILED")}`;
      const blocked = await recordBlockedTask(client, stage, stageCode, exact, correlationId);
      return {
        ok: true,
        status: "EXCEPTION",
        executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
        idempotencyKey: evaluated.idempotencyKey,
        chunkIndex,
        chunkCount: source.chunkCount,
        exactBlocker: exact,
        blocked,
        externalSends: 0
      };
    }
    const output = lineEditingOutput(modelResult);
    if (!output.editedManuscript) {
      if (schemaRetryAttempt < lineEditingSchemaMissMaxRetries()) {
        const queued = await enqueueTargetedEditorialChunk(queueClient, {
          ...input,
          kind: "TARGETED_EDITORIAL_EXECUTION",
          version: 1,
          chunked: true,
          chunkCursor,
          chunkRetryAttempt: schemaRetryAttempt + 1,
          chunkSchemaRetryAttempt: schemaRetryAttempt + 1,
          executionMode: "EXECUTE"
        }, { visibilityTimeout: 60 });
        return {
          ok: true,
          status: "CHUNK_REQUEUED_AFTER_SCHEMA_MISS",
          executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
          idempotencyKey: evaluated.idempotencyKey,
          chunkIndex,
          chunkCount: source.chunkCount,
          retryAfterSeconds: 60,
          queued,
          externalSends: 0
        };
      }
      const exact = "LINE_EDITING_BLOCKED — LINE_CHUNK_EDITED_MANUSCRIPT_MISSING";
      const blocked = await recordBlockedTask(client, stage, stageCode, exact, correlationId);
      return {
        ok: true,
        status: "EXCEPTION",
        executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
        idempotencyKey: evaluated.idempotencyKey,
        chunkIndex,
        chunkCount: source.chunkCount,
        exactBlocker: exact,
        blocked,
        externalSends: 0
      };
    }
    chunkCheckpoint = {
      chunkIndex,
      chunkCount: source.chunkCount,
      completedAt: new Date().toISOString(),
      modelResult: {
        ok: true,
        provider: modelResult.provider,
        routeAlias: modelResult.routeAlias,
        promptVersion: modelResult.promptVersion,
        tokenCounts: modelResult.tokenCounts || {},
        fellBack: false
      },
      output
    };
    await uploadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, chunkName, chunkCheckpoint);
  }

  if (nextMissingChunkCursor < source.chunkCount && chunkCursor < source.chunkCount - 1) {
    const queued = await enqueueTargetedEditorialChunk(queueClient, {
      ...input,
      kind: "TARGETED_EDITORIAL_EXECUTION",
      version: 1,
      chunked: true,
      chunkCursor: chunkCursor + 1,
      chunkRetryAttempt: 0,
      chunkSchemaRetryAttempt: 0,
      chunkTransientRetryAttempt: 0,
      executionMode: "EXECUTE"
    });
    return {
      ok: true,
      status: "CHUNK_COMPLETED_REQUEUED_NEXT",
      executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
      idempotencyKey: evaluated.idempotencyKey,
      chunkIndex,
      chunkCount: source.chunkCount,
      chunkCheckpoint: {
        completedAt: chunkCheckpoint.completedAt,
        modelProvider: chunkCheckpoint.modelResult?.provider || "",
        routeAlias: chunkCheckpoint.modelResult?.routeAlias || ""
      },
      queued,
      externalSends: 0
    };
  }

  const checkpoints = [];
  for (let index = 1; index <= source.chunkCount; index += 1) {
    checkpoints.push(await downloadJsonCheckpoint(
      checkpointStore,
      evaluated.idempotencyKey,
      lineEditingChunkCheckpointName(index)
    ));
  }
  const modelInvocation = buildChunkedLineEditingInvocation(checkpoints);
  let outputs;
  try {
    outputs = await materializeEditorialOutputs(
      client,
      stage,
      stageCode,
      sourceArtifact,
      correlationId,
      evaluated.upstream,
      { modelInvocation }
    );
  } catch (error) {
    const exact = error.safeCode || "LINE_EDITING_BLOCKED — OUTPUT_MATERIALIZATION_FAILED";
    const diagnostics = await recordRejectedLineOutputDiagnostics(client, stage, stageCode, sourceArtifact, error, correlationId);
    const blocked = await recordBlockedTask(client, stage, stageCode, exact, correlationId);
    return {
      ok: true,
      status: "EXCEPTION",
      executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
      idempotencyKey: evaluated.idempotencyKey,
      exactBlocker: exact,
      diagnostics,
      blocked,
      externalSends: 0
    };
  }
  const finalized = await finalizeMaterializedEditorialOutputs(client, stage, stageCode, sourceArtifact, outputs, correlationId);
  const completion = {
    completedAt: new Date().toISOString(),
    status: "EXECUTED",
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    outputCount: outputs.length,
    outputArtifacts: outputs.map((item) => ({
      outputName: item.outputName,
      artifactId: item.artifactId,
      sha256: item.sha256
    })),
    packageHandoff: finalized.packageHandoff || null
  };
  const checkpoint = await uploadJsonCheckpoint(checkpointStore, evaluated.idempotencyKey, completeName, completion);
  return {
    ok: true,
    status: "EXECUTED",
    executionMode: TARGETED_EXECUTION_MODES.EXECUTE,
    idempotencyKey: evaluated.idempotencyKey,
    canonicalTitle: evaluated.canonicalTitle,
    currentStage: evaluated.currentStage,
    exactSourceArtifact: evaluated.exactSourceArtifact,
    commissioned,
    claim,
    chunkCount: source.chunkCount,
    checkpoint,
    result: {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "VALIDATING",
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      outputs,
      ...finalized
    },
    externalSends: 0
  };
}

function compactPromptText(value, maxLength = 1200) {
  const text = normalizeString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function summarizeUpstreamContextForPrompt(stage, stageCode, sourceArtifact, upstreamContext = {}) {
  const approvedGate =
    (upstreamContext.gates || []).find((gate) =>
      Number(gate.jm1pub_gatestatus) === GATE_STATUS_APPROVED &&
      Number(gate.jm1pub_authordecision) === AUTHOR_DECISION_APPROVE &&
      gate.jm1pub_nextstageauthorized === true
    ) || null;
  const approvedArtifactId =
    normalizeString(upstreamContext.approvedArtifactId) ||
    normalizeString(approvedGate?._jm1pub_deliverableartifactid_value);
  const approvedArtifacts = (upstreamContext.artifacts || [])
    .filter((artifact) =>
      normalizeString(artifact.jm1pub_editorialartifactid) === approvedArtifactId ||
      artifact.jm1pub_iscurrentapproved === true
    )
    .slice(0, 5)
    .map((artifact) => ({
      artifactId: artifact.jm1pub_editorialartifactid,
      name: artifact.jm1pub_editorialartifactname,
      filename: artifact.jm1pub_filename,
      sha256: artifact.jm1pub_sha256,
      currentApproved: artifact.jm1pub_iscurrentapproved === true,
      modifiedOn: artifact.modifiedon
    }));
  return {
    manualCanon:
      "JMP-GPTs_2.zip editorial manuals plus Founder corrections canonicalized in repository canon cache.",
    currentStage: {
      stageId: stage.jm1pub_editorialstageid,
      stageCode,
      stageName: stage.jm1pub_name,
      internalSummary: compactPromptText(stage.jm1pub_internaloperationalsummary),
      authorSafeSummary: compactPromptText(stage.jm1pub_authorsafesummary)
    },
    sourceAuthority: {
      artifactId: sourceArtifact.jm1pub_editorialartifactid,
      name: sourceArtifact.jm1pub_editorialartifactname,
      filename: sourceArtifact.jm1pub_filename,
      sha256: sourceArtifact.jm1pub_sha256,
      currentApproved: sourceArtifact.jm1pub_iscurrentapproved === true
    },
    priorAuthorDecision: approvedGate
      ? {
          gateId: approvedGate.jm1pub_editorialapprovalgateid,
          decision: "APPROVED",
          decisionOn: approvedGate.jm1pub_authordecisionon,
          nextStageAuthorized: approvedGate.jm1pub_nextstageauthorized === true,
          deliverableArtifactId: approvedGate._jm1pub_deliverableartifactid_value
        }
      : null,
    approvedUpstreamArtifacts: approvedArtifacts,
    upstreamStages: (upstreamContext.stages || []).slice(0, 5).map((upstreamStage) => ({
      stageId: upstreamStage.jm1pub_editorialstageid,
      stageName: upstreamStage.jm1pub_name,
      stageType: upstreamStage.jm1pub_stagetype,
      stageStatus: upstreamStage.jm1pub_stagestatus,
      modifiedOn: upstreamStage.modifiedon
    })),
    inheritanceRequirements: [
      "Use the author-approved upstream artifact as the controlling prior-stage baseline.",
      "Use upstream Editorial Review or Developmental context when present; if absent, preserve the manuscript's existing style and flag the missing context.",
      "Line Editing must preserve at least 95% net source wording while separately controlling output expansion, structural loss, substantive invention, and copyediting drift.",
      "Line Editing completion creates an author review/approval gate and does not authorize Copyediting automatically."
    ]
  };
}

function buildStageModelPrompt({ stage, stageCode, sourceArtifact, extractedText, upstreamContext }) {
  const summary = summarizeExtractedText(extractedText || "");
  if (stageCode === "LINE_EDITING") {
    return JSON.stringify({
      task: "cc010_line_editing_execution",
      contract: "Return only JSON. Do not return markdown fences.",
      stageCode,
      stageName: stage.jm1pub_name,
      titleId: stage._jm1pub_titleid_value,
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      sourceSha256: sourceArtifact.jm1pub_sha256,
      sourceWordCount: summary.words,
      sourceParagraphCount: summary.paragraphs,
      lineScope:
        "Sentence-level clarity, paragraph flow, tone, rhythm, readability, and author voice preservation. Do not perform developmental restructuring, substantive invention, or copyediting drift.",
      upstreamContext: summarizeUpstreamContextForPrompt(stage, stageCode, sourceArtifact, upstreamContext),
      requiredOutput: {
        editedManuscript: "string containing the full line-edited manuscript text",
        lineEditingSummary: "string",
        changeLedger: ["specific line-level changes or recurring patterns"],
        retentionNotes: "string",
        authorQueries: ["string"]
      },
      mandatoryAuthorGate:
        "Line Editing completion must create an author review/approval gate. It must not advance to Copyediting automatically.",
      sourceSample: summary.sample.slice(0, 6000)
    });
  }
  return JSON.stringify({
    task: "cc010_stage_execution",
    contract: "Return only JSON.",
    stageCode,
    stageName: stage.jm1pub_name,
    titleId: stage._jm1pub_titleid_value,
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    sourceSha256: sourceArtifact.jm1pub_sha256,
    sourceWordCount: summary.words,
    sourceParagraphCount: summary.paragraphs,
    requiredOutput: {
      stageScopeSummary: "string",
      qualityNotes: ["string"],
      authorReviewSummary: "string",
      revisionCandidates: ["string"]
    },
    authorGateInvariant:
      "Model completion and QA are not author approval. The stage must wait for the author after artifact generation.",
    sourceSample: summary.sample.slice(0, 2000)
  });
}

function parsePositiveInteger(value, fallback) {
  const parsed = typeof value === "number" ? value : Number.parseInt(normalizeString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number.parseInt(normalizeString(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function lineEditingChunkWordLimit() {
  return parsePositiveInteger(process.env.JM1_LINE_EDITING_CHUNK_WORD_LIMIT, DEFAULT_LINE_EDITING_CHUNK_WORD_LIMIT);
}

function lineEditingChunkConcurrency() {
  return parsePositiveInteger(process.env.JM1_LINE_EDITING_CHUNK_CONCURRENCY, DEFAULT_LINE_EDITING_CHUNK_CONCURRENCY);
}

function lineEditingSchemaMissMaxRetries() {
  return parsePositiveInteger(
    process.env.JM1_LINE_EDITING_SCHEMA_MISS_MAX_RETRIES,
    DEFAULT_LINE_EDITING_SCHEMA_MISS_MAX_RETRIES
  );
}

function lineEditingTransientModelMaxRetries() {
  return parsePositiveInteger(
    process.env.JM1_LINE_EDITING_TRANSIENT_MODEL_MAX_RETRIES,
    DEFAULT_LINE_EDITING_TRANSIENT_MODEL_MAX_RETRIES
  );
}

function parseRatio(value, fallback) {
  const numeric = Number(normalizeString(value));
  return Number.isFinite(numeric) && numeric > 0 && numeric < 1 ? numeric : fallback;
}

function lineEditingCapacityOptions() {
  const configuredOutputTpm = parsePositiveInteger(process.env.JM1_LINE_EDITING_OUTPUT_TPM, 0);
  return {
    configuredMaxConcurrency: lineEditingChunkConcurrency(),
    deploymentTpm: parsePositiveInteger(
      process.env.JM1_LINE_EDITING_DEPLOYMENT_TPM || process.env.AZURE_FOUNDRY_DEPLOYMENT_TPM,
      DEFAULT_LINE_EDITING_DEPLOYMENT_TPM
    ),
    outputTpm: configuredOutputTpm || DEFAULT_LINE_EDITING_OUTPUT_TPM,
    outputBucketRatio: parseRatio(
      process.env.JM1_LINE_EDITING_OUTPUT_BUCKET_RATIO,
      DEFAULT_LINE_EDITING_OUTPUT_BUCKET_RATIO
    ),
    headroomRatio: parseRatio(
      process.env.JM1_LINE_EDITING_CAPACITY_HEADROOM_RATIO,
      DEFAULT_LINE_EDITING_CAPACITY_HEADROOM_RATIO
    ),
    maxOutputTokens: parsePositiveInteger(
      process.env.AZURE_FOUNDRY_LINE_CHUNK_MAX_OUTPUT_TOKENS,
      DEFAULT_LINE_EDITING_CHUNK_MAX_OUTPUT_TOKENS
    )
  };
}

function estimateLineEditingInputTokens(chunkText) {
  const words = summarizeExtractedText(chunkText || "").words;
  return Math.max(1000, Math.ceil(words * 1.6) + 2500);
}

function calculateLineEditingChunkConcurrency(chunks, options = {}) {
  const capacity = { ...lineEditingCapacityOptions(), ...options };
  const chunkCount = Array.isArray(chunks) ? chunks.length : Number(chunks) || 0;
  if (chunkCount <= 0) return 1;
  const effectiveTpm = Math.max(1, Math.floor(capacity.deploymentTpm * (1 - capacity.headroomRatio)));
  const configuredOutputTpm = parsePositiveInteger(capacity.outputTpm, 0);
  const outputTpm = configuredOutputTpm || Math.floor(capacity.deploymentTpm * capacity.outputBucketRatio);
  const effectiveOutputTpm = Math.max(1, Math.floor(outputTpm * (1 - capacity.headroomRatio)));
  const maxInputReservation = Array.isArray(chunks)
    ? Math.max(...chunks.map((chunk) => estimateLineEditingInputTokens(chunk)))
    : 1;
  const inputBound = Math.max(1, Math.floor(effectiveTpm / Math.max(1, maxInputReservation)));
  const outputBound = Math.max(1, Math.floor(effectiveOutputTpm / Math.max(1, capacity.maxOutputTokens)));
  return Math.max(
    1,
    Math.min(
      parsePositiveInteger(capacity.configuredMaxConcurrency, DEFAULT_LINE_EDITING_CHUNK_CONCURRENCY),
      inputBound,
      outputBound,
      chunkCount
    )
  );
}

function splitLineEditingSourceChunks(text, maxWords = lineEditingChunkWordLimit()) {
  const normalized = normalizeString(text).replace(/\r\n/g, "\n");
  const sourceParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks = [];
  let current = [];
  let currentWords = 0;
  for (const paragraph of sourceParagraphs) {
    const paragraphWords = paragraph.split(/\s+/).filter(Boolean).length;
    if (current.length && currentWords + paragraphWords > maxWords) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentWords = 0;
    }
    if (paragraphWords > maxWords) {
      const paragraphTokens = paragraph.split(/\s+/).filter(Boolean);
      for (let index = 0; index < paragraphTokens.length; index += maxWords) {
        if (current.length) {
          chunks.push(current.join("\n\n"));
          current = [];
          currentWords = 0;
        }
        chunks.push(paragraphTokens.slice(index, index + maxWords).join(" "));
      }
      continue;
    }
    current.push(paragraph);
    currentWords += paragraphWords;
  }
  if (current.length) chunks.push(current.join("\n\n"));
  return chunks.length ? chunks : [normalized];
}

function isRateLimitModelResult(result) {
  const status = Number(result?.httpStatus);
  return status === 429 || /(^|[^0-9])429([^0-9]|$)|HTTP_429|RATE_LIMIT/i.test(normalizeString(result?.error));
}

function isTransientModelCallResult(result) {
  const error = normalizeString(result?.error);
  return /MODEL_CALL_EXCEPTION/i.test(error) &&
    /FETCH_FAILED|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|UND_ERR|EAI_AGAIN|ENOTFOUND|socket hang up/i.test(error);
}

function adaptiveLineEditingRetryDelayMs(result, retryAttempt) {
  const retryAfterMs = Number(result?.rateLimit?.retryAfterMs);
  const floor = parsePositiveInteger(
    process.env.JM1_LINE_EDITING_ADAPTIVE_RETRY_FLOOR_MS,
    DEFAULT_LINE_EDITING_ADAPTIVE_RETRY_FLOOR_MS
  );
  const max = Math.max(
    floor,
    parsePositiveInteger(process.env.JM1_LINE_EDITING_ADAPTIVE_RETRY_MAX_MS, DEFAULT_LINE_EDITING_ADAPTIVE_RETRY_MAX_MS)
  );
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return Math.min(max, Math.max(floor, retryAfterMs));
  }
  return Math.min(max, Math.max(floor, floor * Math.pow(2, Math.max(0, retryAttempt - 1))));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function targetedEditorialCheckpointContainerName() {
  return normalizeString(process.env.JM1_TARGETED_EDITORIAL_CHECKPOINT_CONTAINER) ||
    DEFAULT_TARGETED_EDITORIAL_CHECKPOINT_CONTAINER;
}

function targetedEditorialCheckpointPrefix() {
  return normalizeString(process.env.JM1_TARGETED_EDITORIAL_CHECKPOINT_PREFIX) ||
    DEFAULT_TARGETED_EDITORIAL_CHECKPOINT_PREFIX;
}

function targetedEditorialQueueName() {
  return normalizeString(process.env.JM1_TARGETED_EDITORIAL_EXECUTION_QUEUE_NAME) ||
    DEFAULT_TARGETED_EDITORIAL_QUEUE_NAME;
}

function createStorageClients(deps = {}) {
  if (deps.checkpointStore && deps.queueClient) return deps;
  const connectionString = normalizeString(process.env.AzureWebJobsStorage);
  if (!connectionString && (!deps.checkpointStore || !deps.queueClient)) {
    throw Object.assign(new Error("AzureWebJobsStorage is required for targeted editorial chunk checkpoints."), {
      safeCode: "TARGETED_EDITORIAL_CHECKPOINT_STORAGE_MISSING"
    });
  }
  const blobServiceClient = deps.blobServiceClient || BlobServiceClient.fromConnectionString(connectionString);
  const queueServiceClient = deps.queueServiceClient || QueueServiceClient.fromConnectionString(connectionString);
  return {
    checkpointStore:
      deps.checkpointStore ||
      blobServiceClient.getContainerClient(targetedEditorialCheckpointContainerName()),
    queueClient:
      deps.queueClient ||
      queueServiceClient.getQueueClient(targetedEditorialQueueName())
  };
}

function targetedEditorialCheckpointBlobName(idempotencyKey, name) {
  return [
    targetedEditorialCheckpointPrefix().replace(/^\/+|\/+$/g, ""),
    normalizeString(idempotencyKey),
    name.replace(/^\/+/, "")
  ].join("/");
}

function lineEditingChunkCheckpointName(chunkIndex) {
  return `chunks/${String(chunkIndex).padStart(4, "0")}.json`;
}

async function firstMissingLineEditingChunkCursor(store, idempotencyKey, chunkCount) {
  const boundedChunkCount = Math.max(0, parseNonNegativeInteger(chunkCount, 0));
  for (let index = 1; index <= boundedChunkCount; index += 1) {
    if (!await checkpointExists(store, idempotencyKey, lineEditingChunkCheckpointName(index))) {
      return index - 1;
    }
  }
  return boundedChunkCount;
}

async function uploadJsonCheckpoint(store, idempotencyKey, name, value) {
  if (typeof store.createIfNotExists === "function") await store.createIfNotExists();
  const blob = store.getBlockBlobClient(targetedEditorialCheckpointBlobName(idempotencyKey, name));
  const body = Buffer.from(JSON.stringify(value, null, 2), "utf8");
  if (typeof blob.exists === "function" && await blob.exists()) {
    return { blobName: blob.name, sha256: crypto.createHash("sha256").update(body).digest("hex"), bytes: body.length, existed: true };
  }
  await blob.uploadData(body, {
    blobHTTPHeaders: { blobContentType: "application/json" }
  });
  return { blobName: blob.name, sha256: crypto.createHash("sha256").update(body).digest("hex"), bytes: body.length };
}

async function downloadJsonCheckpoint(store, idempotencyKey, name) {
  const blob = store.getBlockBlobClient(targetedEditorialCheckpointBlobName(idempotencyKey, name));
  const buffer = await blob.downloadToBuffer();
  return JSON.parse(buffer.toString("utf8"));
}

async function checkpointExists(store, idempotencyKey, name) {
  const blob = store.getBlockBlobClient(targetedEditorialCheckpointBlobName(idempotencyKey, name));
  return blob.exists();
}

async function enqueueTargetedEditorialChunk(queueClient, message, options = {}) {
  if (typeof queueClient.createIfNotExists === "function") await queueClient.createIfNotExists();
  const sendOptions = {};
  if (Number.isFinite(Number(options.visibilityTimeout))) {
    sendOptions.visibilityTimeout = Number(options.visibilityTimeout);
  }
  const result = await queueClient.sendMessage(JSON.stringify(message), sendOptions);
  return {
    messageId: result?.messageId || result?.messageID || null,
    insertedOn: result?.insertedOn || null
  };
}

function buildLineEditingChunkPrompt({
  stage,
  sourceArtifact,
  chunkText,
  chunkIndex,
  chunkCount,
  totalWordCount,
  upstreamContext,
  schemaRetryAttempt = 0
}) {
  const chunkSummary = summarizeExtractedText(chunkText || "");
  const retryAttempt = parseNonNegativeInteger(schemaRetryAttempt, 0);
  return JSON.stringify({
    task: "cc010_line_editing_full_manuscript_chunk_execution",
    contract:
      "Return only JSON. Do not return markdown fences. Return the full edited text for this chunk in editedManuscript.",
    stageCode: "LINE_EDITING",
    stageName: stage.jm1pub_name,
    titleId: stage._jm1pub_titleid_value,
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    sourceSha256: sourceArtifact.jm1pub_sha256,
    chunkIndex,
    chunkCount,
    sourceWordCount: totalWordCount,
    chunkWordCount: chunkSummary.words,
    lineScope:
      "Sentence-level clarity, paragraph flow, tone, rhythm, readability, and author voice preservation. Preserve this chunk's substantive content. Do not summarize, omit sections, invent content, perform developmental restructuring, or copyedit beyond Line scope.",
    upstreamContext: summarizeUpstreamContextForPrompt(stage, "LINE_EDITING", sourceArtifact, upstreamContext || {}),
    requiredOutput: {
      editedManuscript: "string containing the full line-edited text for this exact chunk",
      lineEditingSummary: "string",
      changeLedger: ["specific line-level changes or recurring patterns in this chunk"],
      retentionNotes: "string",
      authorQueries: ["string"]
    },
    requiredExactJsonKeys:
      ["editedManuscript", "lineEditingSummary", "changeLedger", "retentionNotes", "authorQueries"],
    schemaRetryInstruction:
      retryAttempt > 1
        ? "The previous chunk responses did not include editedManuscript. This retry must return a JSON object with editedManuscript exactly as a top-level key. editedManuscript must contain the complete text for this chunk. If no line edits are needed, copy sourceText into editedManuscript unchanged. Do not summarize or replace editedManuscript with notes."
        : retryAttempt > 0
          ? "The previous chunk response did not include editedManuscript. This retry must include editedManuscript exactly as a top-level output key containing the complete edited text for this chunk."
          : "",
    chunkAssemblyInvariant:
      "This is one governed chunk of a full-manuscript Line Editing pass. Preserve chunk order. Do not add headings unless present in the chunk. Do not omit source paragraphs.",
    sourceText: chunkText
  });
}

function selectedStyleGuidesForStage(stageCode) {
  if (stageCode === "LINE_EDITING" || stageCode === "COPYEDITING" || stageCode === "PROOFREADING") {
    return ["JMP-CG-LINE-COPY-PROOF-V1"];
  }
  return [];
}

async function invokeSingleStageModelProvider({
  stage,
  stageCode,
  sourceArtifact,
  extractedText,
  correlationId,
  upstreamContext = null,
  promptBody = null,
  diagnosticId = null,
  promptVersion = null
}) {
  if (typeof invokeSingleStageModelProvider.override === "function") {
    return invokeSingleStageModelProvider.override({
      stage,
      stageCode,
      sourceArtifact,
      extractedText,
      correlationId,
      upstreamContext,
      promptBody,
      diagnosticId,
      promptVersion
    });
  }
  const deploymentAlias = preferredDeploymentAliasForStage(stageCode);
  if (!deploymentAlias) {
    return {
      ok: false,
      provider: null,
      route: null,
      fellBack: false,
      error:
        stageCode === "COPYEDITING" || stageCode === "PROOFREADING"
          ? "COPY_PROOF_PREFERRED_MODEL_ROUTE_NOT_CONFIGURED"
          : "EDITORIAL_STAGE_MODEL_ROUTE_NOT_CONFIGURED"
    };
  }
  const result = await routeToProvider({
    promptBody: promptBody || buildStageModelPrompt({ stage, stageCode, sourceArtifact, extractedText, upstreamContext }),
    diagnosticId: diagnosticId || normalizeString(stage._jm1pub_titleid_value) || normalizeString(stage.jm1pub_editorialstageid),
    executionType: "default",
    editorialTransaction: transactionForStage(stageCode),
    modelDeploymentAlias: deploymentAlias,
    promptKey: `jm1-prompt-pub-${stageCode.toLowerCase().replace(/_/g, "-")}`,
    promptVersion: promptVersion || `CC010-${stageCode}-V1`,
    selectedStyleGuides: selectedStyleGuidesForStage(stageCode),
    allowFallback: false,
    telemetry: { correlationId }
  });
  return {
    ...result,
    fellBack: Boolean(result.route?.fallbackFromAlias),
    routeAlias: result.route?.deploymentAlias || deploymentAlias,
    promptVersion: promptVersion || `CC010-${stageCode}-V1`
  };
}

async function invokeLineEditingModelProvider(stage, sourceArtifact, extractedText, correlationId, upstreamContext = null) {
  const chunks = splitLineEditingSourceChunks(extractedText);
  const totalWordCount = summarizeExtractedText(extractedText || "").words;
  const tokenCounts = { input: 0, output: 0, total: 0 };
  const chunkResults = new Array(chunks.length);
  let concurrency = calculateLineEditingChunkConcurrency(chunks);
  const retryAttempts = new Array(chunks.length).fill(0);
  const maxAdaptiveRetries = parsePositiveInteger(
    process.env.JM1_LINE_EDITING_ADAPTIVE_MAX_RETRIES,
    DEFAULT_LINE_EDITING_ADAPTIVE_MAX_RETRIES
  );
  let failure = null;
  const scheduler = {
    initialConcurrency: concurrency,
    finalConcurrency: concurrency,
    adaptiveRetries: 0,
    rateLimitReductions: 0
  };

  async function runChunk(index) {
    const chunkIndex = index + 1;
    const result = await invokeSingleStageModelProvider({
      stage,
      stageCode: "LINE_EDITING",
      sourceArtifact,
      extractedText: chunks[index],
      correlationId: `${correlationId}:chunk-${chunkIndex}-of-${chunks.length}`,
      upstreamContext,
      promptBody: buildLineEditingChunkPrompt({
        stage,
        sourceArtifact,
        chunkText: chunks[index],
        chunkIndex,
        chunkCount: chunks.length,
        totalWordCount,
        upstreamContext
      }),
      diagnosticId: `${normalizeString(stage._jm1pub_titleid_value) || normalizeString(stage.jm1pub_editorialstageid)}:line-chunk-${chunkIndex}`,
      promptVersion: "CC010-LINE_EDITING-CHUNK-V1"
    });
    if (!result.ok || result.fellBack) return { chunkIndex, result, output: null, failed: true };
    const output = lineEditingOutput(result);
    if (!output.editedManuscript) {
      return {
        chunkIndex,
        result: {
          ...result,
          ok: false,
          error: "LINE_CHUNK_EDITED_MANUSCRIPT_MISSING"
        },
        output,
        failed: true
      };
    }
    return { chunkIndex, result, output, failed: false };
  }

  async function runRound(pendingIndexes) {
    const roundResults = [];
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < pendingIndexes.length) {
        const index = pendingIndexes[nextIndex];
        nextIndex += 1;
        const chunkResult = await runChunk(index);
        roundResults.push({ index, chunkResult });
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pendingIndexes.length) }, () => worker()));
    return roundResults;
  }

  let pendingIndexes = chunks.map((_chunk, index) => index);
  while (pendingIndexes.length && !failure) {
    const roundResults = await runRound(pendingIndexes);
    const retryable = [];
    for (const { index, chunkResult } of roundResults) {
      if (chunkResult.failed && isRateLimitModelResult(chunkResult.result) && retryAttempts[index] < maxAdaptiveRetries) {
        retryAttempts[index] += 1;
        retryable.push({ index, chunkResult });
        continue;
      }
      chunkResults[index] = chunkResult;
      if (chunkResult.failed) {
        failure = chunkResult;
      }
    }
    if (retryable.length && !failure) {
      scheduler.adaptiveRetries += retryable.length;
      scheduler.rateLimitReductions += 1;
      const retryDelayMs = Math.max(...retryable.map(({ chunkResult }) =>
        adaptiveLineEditingRetryDelayMs(chunkResult.result, retryAttempts[chunkResult.chunkIndex - 1])
      ));
      concurrency = Math.max(1, Math.floor(concurrency / 2));
      scheduler.finalConcurrency = concurrency;
      await wait(retryDelayMs);
      pendingIndexes = retryable.map(({ index }) => index);
    } else {
      pendingIndexes = [];
    }
  }

  for (const item of chunkResults.filter(Boolean)) {
    tokenCounts.input += item.result.tokenCounts?.input || 0;
    tokenCounts.output += item.result.tokenCounts?.output || 0;
    tokenCounts.total += item.result.tokenCounts?.total || 0;
  }

  const firstResult = chunkResults.find(Boolean)?.result || null;
  if (failure) return { ...failure.result, tokenCounts, chunkCount: chunks.length, failedChunk: failure.chunkIndex, scheduler };

  const chunkOutputs = chunkResults.map((item) => ({
    ...item.output,
    routeAlias: item.result.routeAlias,
    provider: item.result.provider,
    promptVersion: item.result.promptVersion
  }));

  return {
    ...(firstResult || {}),
    ok: true,
    tokenCounts,
    output: {
      editedManuscript: chunkOutputs.map((item) => item.editedManuscript).join("\n\n"),
      lineEditingSummary: chunkOutputs.map((item, index) => `Chunk ${index + 1}: ${item.lineEditingSummary || "Line editing completed."}`).join("\n"),
      retentionNotes: chunkOutputs.map((item, index) => `Chunk ${index + 1}: ${item.retentionNotes || "Source content retained."}`).join("\n"),
      changeLedger: chunkOutputs.flatMap((item, index) =>
        item.changeLedger.length
          ? item.changeLedger.map((entry) => `Chunk ${index + 1}: ${entry}`)
          : [`Chunk ${index + 1}: No recurring line-editing pattern separately reported.`]
      ),
      authorQueries: chunkOutputs.flatMap((item, index) =>
        item.authorQueries.map((entry) => `Chunk ${index + 1}: ${entry}`)
      )
    },
    chunkCount: chunks.length,
    scheduler,
    promptVersion: "CC010-LINE_EDITING-CHUNK-V1"
  };
}

async function invokeStageModelProvider(stage, stageCode, sourceArtifact, extractedText, correlationId, upstreamContext = null) {
  if (typeof invokeStageModelProvider.override === "function") {
    return invokeStageModelProvider.override(stage, stageCode, sourceArtifact, extractedText, correlationId, upstreamContext);
  }
  if (stageCode === "LINE_EDITING") {
    return invokeLineEditingModelProvider(stage, sourceArtifact, extractedText, correlationId, upstreamContext);
  }
  return invokeSingleStageModelProvider({ stage, stageCode, sourceArtifact, extractedText, correlationId, upstreamContext });
}

function requireDataverseConfig() {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }
  return { apiBase, resourceUrl };
}

async function getDataverseToken(resourceUrl) {
  const tenantId = normalizeString(process.env.DATAVERSE_TENANT_ID);
  const clientId = normalizeString(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeString(process.env.DATAVERSE_CLIENT_SECRET);
  const credential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

async function getGraphToken() {
  if (typeof getGraphToken.override === "function") {
    return getGraphToken.override();
  }
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Microsoft Graph token"), { safeCode: "GRAPH_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

function createDataverseClient(config, deps = {}) {
  const getToken = deps.getToken || getDataverseToken;
  let cachedToken = "";

  async function token() {
    if (!cachedToken) cachedToken = await getToken(config.resourceUrl);
    return cachedToken;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${config.apiBase}/${path.replace(/^\//, "")}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = body?.error?.message || `HTTP ${response.status}`;
      throw Object.assign(new Error(`Dataverse request failed: ${message}`), {
        safeCode: "DATAVERSE_REQUEST_FAILED",
        status: response.status,
        body
      });
    }
    return { body, headers: response.headers };
  }

  async function list(entitySet, query = {}) {
    const params = new URLSearchParams(query);
    const { body } = await request(`${entitySet}?${params.toString()}`, {
      method: "GET",
      prefer: "odata.maxpagesize=100"
    });
    return Array.isArray(body.value) ? body.value : [];
  }

  async function create(entitySet, payload) {
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || "");
  }

  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }

  return { list, create, patch };
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Automation",
    jm1_agentmodel: "jm1-editorial-execution-runtime",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function graphRequest(path, options = {}) {
  if (typeof graphRequest.override === "function") {
    return graphRequest.override(path, options);
  }
  const endpoint = `${GRAPH_BASE}/${path.replace(/^\//, "")}`;
  const response = await fetch(`${GRAPH_BASE}/${path.replace(/^\//, "")}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${await getGraphToken()}`,
      ...(options.headers || {})
    },
    redirect: "follow"
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const graphCode = normalizeString(body?.error?.code);
    const requestId =
      normalizeString(body?.error?.innerError?.["request-id"]) ||
      normalizeString(body?.error?.innerError?.requestId) ||
      normalizeString(response.headers.get("request-id")) ||
      normalizeString(response.headers.get("client-request-id"));
    const safeCode = classifyGraphFailure({ status: response.status, graphCode, path, method: options.method || "GET" });
    const details = {
      safeCode,
      status: response.status,
      graphCode,
      requestId,
      endpoint,
      path,
      method: options.method || "GET"
    };
    throw Object.assign(new Error(`Graph request failed: ${JSON.stringify(details)}`), {
      ...details,
      body: body || text
    });
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : Buffer.from(await response.arrayBuffer());
}

function classifyGraphFailure(input) {
  const path = normalizeString(input.path).toLowerCase();
  const graphCode = normalizeString(input.graphCode).toLowerCase();
  const status = Number(input.status);
  if (status === 401 || graphCode.includes("invalidauthenticationtoken")) return "GRAPH_TOKEN_SCOPE_INSUFFICIENT";
  if (status === 403 || graphCode.includes("accessdenied")) return "GRAPH_SITE_ACCESS_DENIED";
  if (status === 404 && path.includes("/drives/") && !path.includes("/items/")) return "GRAPH_DRIVE_NOT_FOUND";
  if (status === 404 && path.includes("/items/")) return "GRAPH_ITEM_NOT_FOUND";
  if (status === 408 || graphCode.includes("timeout")) return "GRAPH_TIMEOUT";
  if (status === 429 || graphCode.includes("throttl")) return "GRAPH_THROTTLED";
  if (path.includes("/content")) return input.method === "PUT" ? "GRAPH_CONTENT_STREAM_FAILED" : "GRAPH_DOWNLOAD_FAILED";
  if (status === 404 && path.includes(":")) return "GRAPH_SHAREPOINT_PATH_STALE";
  return "GRAPH_REQUEST_FAILED";
}

function graphFailureDetail(error, sourceArtifact = {}) {
  return [
    error.safeCode || "GRAPH_REQUEST_FAILED",
    `status=${error.status || "unknown"}`,
    `graphCode=${error.graphCode || "unknown"}`,
    `requestId=${error.requestId || "unknown"}`,
    `endpoint=${error.endpoint || "unknown"}`,
    `driveId=${sourceArtifact.jm1pub_repositorydriveid || "unknown"}`,
    `itemId=${sourceArtifact.jm1pub_repositoryitemid || "unknown"}`,
    `path=${sourceArtifact.jm1pub_repositorypath || "unknown"}`
  ].join("; ");
}

function graphShareToken(webUrl) {
  const normalized = normalizeString(webUrl);
  if (!/^https:\/\/.+/i.test(normalized)) return "";
  return `u!${Buffer.from(normalized).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
}

async function resolveSourceGraphItem(sourceArtifact, stageCode) {
  const driveId = normalizeString(sourceArtifact.jm1pub_repositorydriveid);
  const itemId = normalizeString(sourceArtifact.jm1pub_repositoryitemid);
  if (driveId && itemId) {
    const item = await graphRequest(`drives/${driveId}/items/${itemId}?$select=id,name,parentReference,size,webUrl`).catch((error) => {
      throw Object.assign(error, {
        safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_METADATA_READ_FAILED"}`,
        graphDetail: graphFailureDetail(error, sourceArtifact)
      });
    });
    return { item, driveId, contentPath: `drives/${driveId}/items/${itemId}/content` };
  }

  const shareToken = graphShareToken(sourceArtifact.jm1pub_repositorypath);
  if (!shareToken) {
    throw Object.assign(new Error("Source artifact is missing Graph drive/item identity"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_GRAPH_IDENTITY_MISSING`
    });
  }
  const item = await graphRequest(`shares/${shareToken}/driveItem?$select=id,name,parentReference,size,webUrl`).catch((error) => {
    throw Object.assign(error, {
      safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_SHARE_METADATA_READ_FAILED"}`,
      graphDetail: graphFailureDetail(error, sourceArtifact)
    });
  });
  const resolvedDriveId = normalizeString(item?.parentReference?.driveId);
  const resolvedItemId = normalizeString(item?.id);
  if (!resolvedDriveId || !resolvedItemId) {
    throw Object.assign(new Error("SharePoint source URL did not resolve to a Graph drive item"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_GRAPH_IDENTITY_MISSING`
    });
  }
  return { item, driveId: resolvedDriveId, contentPath: `shares/${shareToken}/driveItem/content` };
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc",
    $top: "1"
  });
  return rows[0] || null;
}

async function findUpstreamApprovalEvidence(client, stage, stageCode) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const previousType = stageTypeForCode(evaluateNextStageEligibility({ stageCode }).previousStageCode);
  if (!titleId || !previousType) {
    return { ok: true, reason: "NO_UPSTREAM_AUTHOR_GATE_REQUIRED", stages: [], artifacts: [], gates: [] };
  }
  const upstreamStages = await client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,_jm1pub_titleid_value,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and jm1pub_stagetype eq ${previousType}`,
    $orderby: "modifiedon desc",
    $top: "5"
  }).catch(() => []);
  const artifacts = [];
  const gates = [];
  for (const upstreamStage of upstreamStages) {
    const upstreamStageId = normalizeString(upstreamStage.jm1pub_editorialstageid);
    if (!upstreamStageId) continue;
    const stageArtifacts = await client.list("jm1pub_editorialartifacts", {
      $select:
        "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_iscurrentapproved,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon",
      $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${upstreamStageId}`,
      $orderby: "modifiedon desc",
      $top: "25"
    }).catch(() => []);
    const stageGates = await client.list("jm1pub_editorialapprovalgates", {
      $select:
        "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon",
      $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${upstreamStageId}`,
      $orderby: "modifiedon desc",
      $top: "25"
    }).catch(() => []);
    artifacts.push(...stageArtifacts);
    gates.push(...stageGates);
  }
  return {
    ...evaluateNextStageEligibility({ stageCode, upstreamArtifacts: artifacts, upstreamGates: gates }),
    stages: upstreamStages,
    artifacts,
    gates
  };
}

async function findActiveEditorialStages(client, maxTasks) {
  const rows = await client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
    $filter:
      `jm1pub_stagestatus eq ${STAGE_STATUS.IN_PROGRESS} and (` +
      Object.values(EXECUTOR_POLICIES)
        .map((policy) => `jm1pub_stagetype eq ${policy.stageType}`)
        .join(" or ") +
      ")",
    $orderby: "modifiedon asc",
    $top: String(maxTasks)
  });
  const liveRows = rows.filter(isLivePortfolioStage);
  const unblocked = [];
  for (const stage of liveRows) {
    const titleId = normalizeString(stage._jm1pub_titleid_value);
    const stageId = normalizeString(stage.jm1pub_editorialstageid);
    if (!titleId || !stageId) {
      unblocked.push(stage);
      continue;
    }
    const stageCode = normalizeStageCode(stage);
    const upstream = await findUpstreamApprovalEvidence(client, stage, stageCode);
    if (!upstream.ok) continue;
    const gates = await client.list("jm1pub_editorialapprovalgates", {
      $select:
        "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon",
      $filter:
        `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
      $orderby: "modifiedon desc",
      $top: "10"
    }).catch(() => []);
    if (!gates.some(authorGateBlocksRuntime)) unblocked.push(stage);
  }
  return unblocked;
}

async function findSourceArtifact(client, stage) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const stageId = normalizeString(stage.jm1pub_editorialstageid);
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_iscurrentapproved,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter:
      `_jm1pub_titleid_value eq ${titleId} and (` +
      `_jm1pub_editorialstageid_value eq ${stageId} or jm1pub_iscurrentapproved eq true or jm1pub_repositorypath ne null` +
      ")",
    $orderby: "modifiedon desc",
    $top: "20"
  }).catch(() => []);
  const candidates = rows.filter((row) => normalizeString(row.jm1pub_repositoryitemid || row.jm1pub_repositorypath || row.jm1pub_sha256));
  return (
    candidates.find((row) => {
      const name = normalizeString(row.jm1pub_editorialartifactname).toLowerCase();
      const filename = normalizeString(row.jm1pub_filename).toLowerCase();
      return (
        row.jm1pub_iscurrentapproved === true &&
        (name.includes("governed source manuscript") ||
          name.includes("source manuscript") ||
          name.includes("manuscript review copy") ||
          filename.endsWith(".docx") ||
          filename.endsWith(".doc"))
      );
    }) ||
    candidates.find((row) => {
      const filename = normalizeString(row.jm1pub_filename).toLowerCase();
      return row.jm1pub_iscurrentapproved === true && !filename.endsWith(".md") && !filename.endsWith(".pdf");
    }) ||
    null
  );
}

function extractExistingExactBlocker(stage) {
  const summary = normalizeString(stage?.jm1pub_internaloperationalsummary);
  const match = summary.match(/\b([A-Z][A-Z0-9_]+_BLOCKED\s+—\s+[^.]+)/);
  return match?.[1] || "";
}

function shouldPreserveExistingExactBlocker(exactBlocker) {
  if (!exactBlocker) return false;
  const retryableBlockers = [
    "SOURCE_GRAPH_IDENTITY_MISSING",
    "LINE_RETENTION_OUTSIDE_95_TO_100_PERCENT_WINDOW",
    "LINE_EDITED_MANUSCRIPT_MISSING",
    "LINE_CHUNK_EDITED_MANUSCRIPT_MISSING",
    "MODEL_INVOCATION_FAILED",
    "MODEL_RESPONSE_NOT_JSON",
    "MODEL_CALL_EXCEPTION_REQUEST_TIMEOUT",
    "MICROSOFT_FOUNDRY_HTTP_429",
    "RATE_LIMIT",
    "USERBYMODELBYMINUTEOUTPUTTOKENS",
    "USERBYMODELBYMINUTEUNCACHEDINPUTTOKENS"
  ];
  return !retryableBlockers.some((retryable) => exactBlocker.includes(retryable));
}

async function findArtifactByName(client, stage, artifactName) {
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_editorialartifactname",
    $filter:
      `_jm1pub_titleid_value eq ${normalizeString(stage._jm1pub_titleid_value)} and ` +
      `_jm1pub_editorialstageid_value eq ${normalizeString(stage.jm1pub_editorialstageid)} and ` +
      `jm1pub_editorialartifactname eq '${escapeODataText(artifactName)}'`,
    $top: "1"
  }).catch(() => []);
  return rows[0] || null;
}

async function findExistingOutputArtifacts(client, stage, stageCode) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const stageId = normalizeString(stage.jm1pub_editorialstageid);
  if (!titleId || !stageId) return [];
  const expectedNames = new Set(outputDefinitions(stageCode).map((name) => `${name} - ${stage.jm1pub_name}`));
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_fileextension,jm1pub_filesizebytes,jm1pub_sha256,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
    $orderby: "modifiedon desc",
    $top: "50"
  }).catch(() => []);
  return rows
    .filter((row) => expectedNames.has(normalizeString(row.jm1pub_editorialartifactname)))
    .map((row) => ({
      outputName: normalizeString(row.jm1pub_editorialartifactname).replace(new RegExp(`\\s+-\\s+${stage.jm1pub_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""),
      artifactId: row.jm1pub_editorialartifactid,
      filename: row.jm1pub_filename,
      extension: row.jm1pub_fileextension,
      size: row.jm1pub_filesizebytes,
      sha256: row.jm1pub_sha256
    }));
}

function buildExactBlocker(stageCode, sourceArtifact) {
  if (!sourceArtifact) return EXECUTOR_POLICIES[stageCode].exactMissingSourceBlocker;
  if (!normalizeString(sourceArtifact.jm1pub_sha256)) return `${stageCode}_BLOCKED — SOURCE_CHECKSUM_MISSING`;
  if (!normalizeString(sourceArtifact.jm1pub_repositoryitemid || sourceArtifact.jm1pub_repositorypath)) {
    return `${stageCode}_BLOCKED — SOURCE_LOCATION_MISSING`;
  }
  return "";
}

function safeBlockerReason(value, fallback) {
  const normalized = normalizeString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 160);
  return normalized || fallback;
}

async function extractSourceText(sourceBuffer, stageCode) {
  if (typeof extractSourceText.override === "function") {
    return extractSourceText.override(sourceBuffer, stageCode);
  }
  return mammoth.extractRawText({ buffer: sourceBuffer }).catch((error) => {
    throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_TEXT_EXTRACTION_FAILED` });
  });
}

async function claimStageTask(client, stage, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:claim:${stage.jm1pub_editorialstageid}:${stageCode}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_TASK_CLAIMED", idempotencyKey);
  if (existing) return { idempotent: true, idempotencyKey, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_TASK_CLAIMED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_TASK_CLAIMED",
    description:
      `JM1 Automation claimed ${stageCode} task ${stage.jm1pub_editorialstageid}. ` +
      `Execution state QUEUED -> EXECUTING. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, idempotencyKey, logId };
}

async function recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId) {
  const idempotencyKey = `editorial-runtime:block:${stage.jm1pub_editorialstageid}:${stageCode}:${exactBlocker}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_BLOCKED", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `${exactBlocker}. JM1 Automation claimed the stage but could not create a real editorial output because the governed source prerequisite is missing or incomplete. ` +
      `No stage advancement, package release, or author communication occurred. Correlation ${correlationId}.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_BLOCKED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_BLOCKED",
    failed: true,
    description:
      `${exactBlocker}. Stage ${stage.jm1pub_editorialstageid} remains In Progress with exact blocker; generic uncommissioned-runtime blocker removed. ` +
      `Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordRejectedLineOutputDiagnostics(client, stage, stageCode, sourceArtifact, error, correlationId) {
  if (stageCode !== "LINE_EDITING" || !error?.lineQa) return null;
  const outputHash = normalizeString(error.rejectedLineOutputHash) || "missing-output";
  const violationList = error.lineQa.violations.concat(error.lineQa.compliance?.violations || []);
  const idempotencyKey =
    `editorial-runtime:line-rejected-output-diagnostics:${stage.jm1pub_editorialstageid}:` +
    `${normalizeString(sourceArtifact?.jm1pub_editorialartifactid)}:${outputHash}:${violationList.join("|")}`;
  const existing = await findExecutionLog(client, "LINE_REJECTED_OUTPUT_QA_DIAGNOSTICS", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const logId = await writeLog(client, {
    name: `LINE_REJECTED_OUTPUT_QA_DIAGNOSTICS - ${stage.jm1pub_name}`,
    actionType: "LINE_REJECTED_OUTPUT_QA_DIAGNOSTICS",
    failed: true,
    description:
      `NON_GOVERNING / QA_REJECTED / NOT_AUTHOR_FACING. Line output failed stage-aware retention/drift QA before artifact persistence. ` +
      `Algorithm ${error.lineQa.algorithm}. Violations ${violationList.length ? violationList.join(", ") : "None"}. ` +
      `Metrics ${JSON.stringify(error.lineQa.metrics)}. Rejected output hash ${outputHash}. ` +
      `Source artifact ${normalizeString(sourceArtifact?.jm1pub_editorialartifactid)}; checksum ${normalizeString(sourceArtifact?.jm1pub_sha256) || "pending"}. ` +
      `No author gate, author communication, governing artifact, or Copyediting stage was created. ` +
      `Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordAuthorApprovalBlocked(client, stage, stageCode, upstream, correlationId) {
  const reason = upstream?.reason || `${stageCode}_AUTHOR_APPROVAL_REQUIRED`;
  const idempotencyKey = `editorial-runtime:author-gate-block:${stage.jm1pub_editorialstageid}:${stageCode}:${reason}`;
  const existing = await findExecutionLog(client, "EDITORIAL_STAGE_BLOCKED_BY_AUTHOR_GATE", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const logId = await writeLog(client, {
    name: `EDITORIAL_STAGE_BLOCKED_BY_AUTHOR_GATE - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_STAGE_BLOCKED_BY_AUTHOR_GATE",
    description:
      `${stageCode} did not execute because required upstream author approval is missing or not bound to the exact approved artifact. ` +
      `${reason}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

function summarizeExtractedText(text) {
  const normalized = normalizeString(text.replace(/\s+/g, " "));
  const words = normalized ? normalized.split(/\s+/).length : 0;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    words,
    paragraphs: paragraphs.length,
    sample: paragraphs
      .slice(0, 8)
      .map((part) => part.slice(0, 280))
      .join("\n\n")
  };
}

function analyzeManuscriptText(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const headings = paragraphs
    .filter((part) => {
      const words = part.split(/\s+/).length;
      return words <= 14 && part.length <= 120 && /[A-Za-z]/.test(part);
    })
    .slice(0, 30);
  const longParagraphs = paragraphs
    .map((part, index) => ({ index: index + 1, words: part.split(/\s+/).length, preview: part.slice(0, 160) }))
    .filter((item) => item.words >= 140)
    .slice(0, 12);
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const longSentences = sentences
    .map((sentence, index) => ({ index: index + 1, words: sentence.split(/\s+/).length, preview: sentence.slice(0, 180) }))
    .filter((item) => item.words >= 45)
    .slice(0, 12);
  const wordCounts = new Map();
  for (const word of text.toLowerCase().match(/\b[a-z][a-z'-]{4,}\b/g) || []) {
    if (["therefore", "because", "about", "which", "their", "would", "could", "should", "through"].includes(word)) continue;
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  const repeatedTerms = [...wordCounts.entries()]
    .filter(([, count]) => count >= 12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));
  return {
    headings,
    longParagraphs,
    longSentences,
    repeatedTerms,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return "_None found in this pass._";
  return [
    `| ${columns.map((column) => column.label).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => normalizeString(String(row[column.key] ?? "")).replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function outputDefinitions(stageCode) {
  if (stageCode === "EDITORIAL_REVIEW") {
    return ["Editorial Assessment", "Recommended Editorial Path", "Scope and Risk Register", "Editorial Review QA Evidence"];
  }
  if (stageCode === "DEVELOPMENTAL_EDITING") {
    return [
      "Developmentally Edited Manuscript",
      "Developmental Memo",
      "Developmental Review Instructions",
      "Change Ledger",
      "Developmental QA Evidence"
    ];
  }
  const displayNames = {
    editedManuscript: "Edited Manuscript",
    lineEditingSummary: "Line Editing Summary",
    copyeditingSummary: "Copyediting Summary",
    proofreadManuscript: "Proofread Manuscript",
    proofreadingCoverNote: "Proofreading Cover Note",
    styleSheet: "Style Sheet",
    changeLedger: "Change Ledger",
    qaEvidence: "QA Evidence",
    exceptionEvidence: "Exception Evidence"
  };
  return EXECUTOR_POLICIES[stageCode].outputRoles.map((role) => displayNames[role] || role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim());
}

function splitManuscriptParagraphs(text) {
  return normalizeString(text)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function paragraphFromText(text, options = {}) {
  return new Paragraph({
    heading: options.heading,
    spacing: { after: options.after ?? 160 },
    children: [new TextRun({ text: normalizeString(text), bold: Boolean(options.bold), italics: Boolean(options.italics) })]
  });
}

function developmentalAnnotationForParagraph(paragraph, index) {
  const words = paragraph.split(/\s+/).filter(Boolean).length;
  const sentences = paragraph.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  if (words >= 180) {
    return `Developmental note P${index + 1}: Consider dividing this paragraph or adding a transition so the reader can track the movement without losing the author's voice.`;
  }
  if (sentences.some((sentence) => sentence.split(/\s+/).length >= 45)) {
    return `Developmental note P${index + 1}: Review sentence length for clarity during line editing; preserve intentional cadence where it is part of the author's style.`;
  }
  if (/copyright|permission|quoted|scripture|lyrics|trademark|estate|legal/i.test(paragraph)) {
    return `Publisher review note P${index + 1}: Confirm rights, permissions, or legal posture before author-facing release.`;
  }
  return "";
}

async function buildDevelopmentalRevisionDocx(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId) {
  const stats = summarizeExtractedText(extractedText);
  const analysis = analyzeManuscriptText(extractedText);
  const sourceParagraphs = splitManuscriptParagraphs(extractedText);
  if (!sourceParagraphs.length) {
    throw Object.assign(new Error("Source text extraction did not produce manuscript body"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_TEXT_EXTRACTION_EMPTY`
    });
  }

  const children = [
    paragraphFromText(`${outputName} - ${stage.jm1pub_name}`, { heading: HeadingLevel.HEADING_1 }),
    paragraphFromText("Generated by: JM1 Automation"),
    paragraphFromText(`Stage: ${stageCode}`),
    paragraphFromText(`Generated at: ${new Date().toISOString()}`),
    paragraphFromText(`Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`),
    paragraphFromText(`Source checksum: ${sourceArtifact.jm1pub_sha256}`),
    paragraphFromText(`Correlation: ${correlationId}`),
    paragraphFromText(`Extracted word count: ${stats.words}`),
    paragraphFromText(`Extracted paragraph count: ${stats.paragraphs}`),
    paragraphFromText("Governed Developmental Revision Artifact", { heading: HeadingLevel.HEADING_2 }),
    paragraphFromText(
      "This package-grade revision artifact preserves the full extracted manuscript text and adds non-destructive developmental notes where structure, pacing, permissions, or publisher judgment may be needed. It does not silently rewrite author voice, adjudicate sensitive claims, or make rights decisions."
    ),
    paragraphFromText("Developmental Findings", { heading: HeadingLevel.HEADING_2 }),
    paragraphFromText(
      analysis.longParagraphs.length || analysis.longSentences.length
        ? "The manuscript contains pacing and readability candidates that should be addressed before line-level editing."
        : "No high-volume pacing issue was detected in the automated pass; publisher/editor review remains required before author release."
    ),
    paragraphFromText("Manuscript Revision Layer", { heading: HeadingLevel.HEADING_2 })
  ];

  sourceParagraphs.forEach((paragraph, index) => {
    children.push(paragraphFromText(paragraph));
    const annotation = developmentalAnnotationForParagraph(paragraph, index);
    if (annotation) {
      children.push(paragraphFromText(annotation, { italics: true }));
    }
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 220, after: 160 }, outlineLevel: 1 }
        }
      ]
    },
    sections: [{ children }]
  });

  return Packer.toBuffer(doc);
}

function modelTextField(output, fields) {
  for (const field of fields) {
    const value = output?.[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function modelArrayField(output, fields) {
  for (const field of fields) {
    const value = output?.[field];
    if (Array.isArray(value)) return value.map((item) => normalizeString(item)).filter(Boolean);
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/\n+/)
        .map((item) => item.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    }
  }
  return [];
}

function lineEditingOutput(modelInvocation = {}) {
  const output = modelInvocation.output || {};
  const editedManuscript = modelTextField(output, [
    "editedManuscript",
    "edited_manuscript",
    "lineEditedManuscript",
    "line_edited_manuscript",
    "lineEditedText",
    "line_edited_text",
    "fullEditedManuscript",
    "full_edited_manuscript",
    "editedText",
    "edited_text",
    "manuscriptText",
    "manuscript_text",
    "revisedText",
    "revised_text",
    "manuscript"
  ]);
  const lineEditingSummary = modelTextField(output, [
    "lineEditingSummary",
    "line_editing_summary",
    "stageScopeSummary",
    "stage_scope_summary",
    "authorReviewSummary",
    "author_review_summary"
  ]);
  const retentionNotes = modelTextField(output, ["retentionNotes", "retention_notes", "qualityNotes", "quality_notes"]);
  const changeLedger = modelArrayField(output, [
    "changeLedger",
    "change_ledger",
    "revisionCandidates",
    "revision_candidates",
    "qualityNotes",
    "quality_notes"
  ]);
  const authorQueries = modelArrayField(output, ["authorQueries", "author_queries", "queries"]);
  return { editedManuscript, lineEditingSummary, retentionNotes, changeLedger, authorQueries };
}

function buildLineEditingQa({ sourceText, editedText, modelInvocation, correlationId }) {
  const stageAwareQa = buildLineRetentionDriftQa({ sourceText, editedText });
  const correctionSummary = summarizeCorrectionCount({
    patterns: lineEditingOutput(modelInvocation).changeLedger.map((pattern) => ({ correctedInstances: 1, pattern })),
    preservedVoice: true,
    preservedDialect: true,
    preservedCadence: true
  });
  const compliance = validateEditorialCompliance({
    producingTransaction: "line_editing",
    producingModel: modelInvocation.provider || modelInvocation.route?.provider || "",
    validatorModel: "deterministic-runtime-qa",
    guideSelection: {
      selectedPrimaryGuide: "JMP Line Editing, Copyediting & Proofreading — Reference",
      conflicts: []
    },
    outputMetadata: {
      promptHash: crypto.createHash("sha256").update(JSON.stringify(modelInvocation.output || {})).digest("hex"),
      selectedGuideIds: selectedStyleGuidesForStage("LINE_EDITING"),
      voiceProtectionAcknowledged: true
    }
  });
  const violations = [...stageAwareQa.violations];
  if (modelInvocation.fellBack) violations.push("MODEL_FALLBACK_NOT_ALLOWED");
  if (modelInvocation.provider !== "microsoft-foundry-claude") violations.push("PREFERRED_LINE_MODEL_PROVIDER_NOT_USED");
  return {
    ok: violations.length === 0 && compliance.violations.length === 0,
    sourceWords: stageAwareQa.metrics.sourceWords,
    editedWords: stageAwareQa.metrics.outputWords,
    retentionRatio: stageAwareQa.metrics.netWordRetentionPercent / 100,
    retentionPercent: stageAwareQa.metrics.netWordRetentionPercent,
    measuredRetentionPercent: stageAwareQa.metrics.measuredRetentionPercent,
    netCharacterRetentionPercent: stageAwareQa.metrics.netCharacterRetentionPercent,
    structuralRetentionPercent: stageAwareQa.metrics.structuralRetentionPercent,
    paragraphRetentionPercent: stageAwareQa.metrics.paragraphRetentionPercent,
    headingRetentionPercent: stageAwareQa.metrics.headingRetentionPercent,
    sectionRetentionPercent: stageAwareQa.metrics.sectionRetentionPercent,
    outputExpansionPercent: stageAwareQa.metrics.outputExpansionPercent,
    rewriteMagnitudePercent: stageAwareQa.metrics.rewriteMagnitudePercent,
    substantiveDeletion: stageAwareQa.metrics.deletedWords,
    substantiveAddition: stageAwareQa.metrics.addedWords,
    violations,
    stageAwareQa,
    correctionSummary,
    compliance,
    provider: modelInvocation.provider || modelInvocation.route?.provider || "",
    deployment: modelInvocation.routeAlias || "",
    promptVersion: modelInvocation.promptVersion || "",
    fallback: Boolean(modelInvocation.fellBack),
    correlationId
  };
}

function assertLineEditingOutputReady(modelInvocation, sourceText, correlationId) {
  const lineOutput = lineEditingOutput(modelInvocation);
  const qa = buildLineEditingQa({
    sourceText,
    editedText: lineOutput.editedManuscript,
    modelInvocation,
    correlationId
  });
  if (!qa.ok) {
    throw Object.assign(new Error("Line Editing output failed governed QA"), {
      safeCode: `LINE_EDITING_BLOCKED — ${qa.violations.concat(qa.compliance.violations).join("_") || "LINE_OUTPUT_QA_FAILED"}`,
      lineQa: qa,
      rejectedLineOutputHash: crypto.createHash("sha256").update(lineOutput.editedManuscript || "").digest("hex")
    });
  }
  return { lineOutput, qa };
}

async function buildLineEditedManuscriptDocx(stage, sourceArtifact, outputName, extractedText, correlationId, modelInvocation) {
  const { lineOutput, qa } = assertLineEditingOutputReady(modelInvocation, extractedText, correlationId);
  const children = [
    paragraphFromText(`${outputName} - ${stage.jm1pub_name}`, { heading: HeadingLevel.HEADING_1 }),
    paragraphFromText("Generated by: JM1 Automation"),
    paragraphFromText("Stage: LINE_EDITING"),
    paragraphFromText(`Generated at: ${new Date().toISOString()}`),
    paragraphFromText(`Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`),
    paragraphFromText(`Source checksum: ${sourceArtifact.jm1pub_sha256}`),
    paragraphFromText(`Correlation: ${correlationId}`),
    paragraphFromText(`Model provider: ${qa.provider}`),
    paragraphFromText(`Model deployment: ${qa.deployment}`),
    paragraphFromText(`Model fallback: ${qa.fallback ? "YES" : "NO"}`),
    paragraphFromText(`Net word retention: ${qa.retentionPercent}%`),
    paragraphFromText(`Measured output/source word ratio: ${qa.measuredRetentionPercent}%`),
    paragraphFromText(`Output expansion: ${qa.outputExpansionPercent}%`),
    paragraphFromText(`Rewrite magnitude: ${qa.rewriteMagnitudePercent}%`),
    paragraphFromText("Governed Line-Edited Manuscript", { heading: HeadingLevel.HEADING_2 }),
    paragraphFromText(
      "This artifact uses the governed model output as the edited manuscript. The pass is limited to sentence-level clarity, paragraph flow, rhythm, readability, tone, and author-voice preservation. It does not authorize developmental restructuring, copyediting, proofreading, or progression to the next stage without author review."
    ),
    paragraphFromText("Edited Manuscript", { heading: HeadingLevel.HEADING_2 })
  ];
  splitManuscriptParagraphs(lineOutput.editedManuscript).forEach((paragraph) => children.push(paragraphFromText(paragraph)));
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{ children }]
  });
  return Packer.toBuffer(doc);
}

function buildLineEditingMarkdownOutput(stage, outputName, sourceArtifact, extractedText, correlationId, modelInvocation) {
  const { lineOutput, qa } = assertLineEditingOutputReady(modelInvocation, extractedText, correlationId);
  const base = [
    `# ${outputName} - ${stage.jm1pub_name}`,
    "",
    "Generated by: JM1 Automation",
    "Stage: LINE_EDITING",
    `Generated at: ${new Date().toISOString()}`,
    `Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`,
    `Source checksum: ${sourceArtifact.jm1pub_sha256}`,
    `Correlation: ${correlationId}`,
    `Model provider: ${qa.provider}`,
    `Model deployment: ${qa.deployment}`,
    `Model fallback: ${qa.fallback ? "YES" : "NO"}`,
    ""
  ];
  if (outputName === "Line Editing Summary") {
    return [
      ...base,
      "## Summary",
      lineOutput.lineEditingSummary || "Line Editing completed within the governed scope.",
      "",
      "## Scope Boundary",
      "Sentence-level clarity, paragraph flow, tone, rhythm, readability, and author voice preservation only.",
      "",
      "## Author Gate",
      "Author review/approval is required before Copyediting may begin."
    ].join("\n");
  }
  if (outputName === "Change Ledger") {
    return [
      ...base,
      "## Change Ledger",
      ...(lineOutput.changeLedger.length ? lineOutput.changeLedger.map((item) => `- ${item}`) : ["- No recurring line-editing pattern was separately reported by the model."]),
      "",
      "## Author Queries",
      ...(lineOutput.authorQueries.length ? lineOutput.authorQueries.map((item) => `- ${item}`) : ["- No author query was separately reported by the model."])
    ].join("\n");
  }
  if (outputName === "QA Evidence") {
    return [
      ...base,
      "## Retention / Drift QA",
      `Algorithm: ${qa.stageAwareQa.algorithm}`,
      `Source words: ${qa.sourceWords}`,
      `Edited words: ${qa.editedWords}`,
      `Measured output/source word ratio: ${qa.measuredRetentionPercent}%`,
      `Net word retention: ${qa.retentionPercent}%`,
      `Net character retention: ${qa.netCharacterRetentionPercent}%`,
      `Paragraph retention: ${qa.paragraphRetentionPercent}%`,
      `Heading retention: ${qa.headingRetentionPercent}%`,
      `Section retention: ${qa.sectionRetentionPercent}%`,
      `Output expansion: ${qa.outputExpansionPercent}%`,
      `Rewrite magnitude: ${qa.rewriteMagnitudePercent}%`,
      `Substantive additions: ${qa.substantiveAddition}`,
      `Substantive deletions: ${qa.substantiveDeletion}`,
      `Retention floor: net word retention >= 95%`,
      `Drift controls: no section loss, no material structure loss, no excessive rewrite magnitude, no substantive invention`,
      `Violations: ${qa.violations.length ? qa.violations.join(", ") : "None"}`,
      `QA result: ${qa.ok ? "PASS" : "FAIL"}`,
      "",
      "## Compliance",
      `Compliance score: ${qa.compliance.complianceScore}`,
      `Violations: ${qa.compliance.violations.length ? qa.compliance.violations.join(", ") : "None"}`,
      `Warnings: ${qa.compliance.warnings.length ? qa.compliance.warnings.join(", ") : "None"}`,
      `Author voice flags: ${qa.compliance.authorVoiceFlags.length ? qa.compliance.authorVoiceFlags.join(", ") : "None"}`,
      "",
      "## Correction Summary",
      qa.correctionSummary.authorSafeSummary,
      "",
      "## Boundary",
      "Line Editing output is not author approval. The next governed action is author review/approval before Copyediting."
    ].join("\n");
  }
  return buildOutputDocument(stage, "LINE_EDITING", sourceArtifact, outputName, extractedText, correlationId);
}

async function buildSimpleEditorialDocx(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId, modelInvocation = null) {
  const content =
    stageCode === "LINE_EDITING"
      ? buildLineEditingMarkdownOutput(stage, outputName, sourceArtifact, extractedText, correlationId, modelInvocation)
      : buildOutputDocument(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId);
  const children = content
    .split(/\n+/)
    .map((line) => normalizeString(line))
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("# ")) return paragraphFromText(line.replace(/^#\s+/, ""), { heading: HeadingLevel.HEADING_1 });
      if (line.startsWith("## ")) return paragraphFromText(line.replace(/^##\s+/, ""), { heading: HeadingLevel.HEADING_2 });
      return paragraphFromText(line.replace(/^- /, "• "));
    });
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{ children }]
  });
  return Packer.toBuffer(doc);
}

function buildReviewInstructionsText(stage, stageCode, sourceArtifact, correlationId) {
  return [
    `Review Instructions - ${stage.jm1pub_name}`,
    "",
    "Generated by: JM1 Automation",
    `Stage: ${stageCode}`,
    `Generated at: ${new Date().toISOString()}`,
    `Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`,
    `Source checksum: ${sourceArtifact.jm1pub_sha256}`,
    `Correlation: ${correlationId}`,
    "",
    "Instructions",
    "1. Review the developmentally edited manuscript artifact and the developmental memo together.",
    "2. Confirm publisher-sensitive, rights, legal, or doctrinal notes before any author-facing release.",
    "3. Do not release an author package until Package Engine QA, cadence policy, and notification policy all pass.",
    "4. Preserve author voice; high-risk recommendations must remain reviewable rather than silently applied."
  ].join("\n");
}

function buildOutputDocument(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId) {
  const stats = summarizeExtractedText(extractedText);
  const analysis = analyzeManuscriptText(extractedText);
  const base = [
    `# ${outputName} - ${stage.jm1pub_name}`,
    "",
    "Generated by: JM1 Automation",
    `Stage: ${stageCode}`,
    `Generated at: ${new Date().toISOString()}`,
    `Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`,
    `Source checksum: ${sourceArtifact.jm1pub_sha256}`,
    `Correlation: ${correlationId}`,
    `Extracted word count: ${stats.words}`,
    `Extracted paragraph count: ${stats.paragraphs}`,
    ""
  ];
  if (stageCode === "EDITORIAL_REVIEW") {
    return [
      ...base,
      "## Editorial Assessment",
      "The governed manuscript source was downloaded, checksum-validated, text-extracted, and assessed for structure, sequence, readability risk, and editorial-path readiness.",
      "",
      "## Recommended Editorial Path",
      analysis.longParagraphs.length || analysis.longSentences.length
        ? "Proceed to Developmental Editing before line-level editing. The manuscript shows structure/readability items that should be addressed before copyediting."
        : "Proceed to publisher editorial-path decision. Developmental Editing remains recommended unless publisher review determines that the manuscript may move directly to line-level editing.",
      "",
      "## Scope",
      "Structure, sequence, audience fit, manuscript readiness, rights-sensitive material, repetition/continuity indicators, and author-voice preservation.",
      "",
      "## Detected Structure Signals",
      markdownTable(analysis.headings.map((heading, index) => ({ index: index + 1, heading })), [
        { key: "index", label: "#" },
        { key: "heading", label: "Candidate heading / section marker" }
      ]),
      "",
      "## Readability Watchlist",
      markdownTable(analysis.longParagraphs, [
        { key: "index", label: "Paragraph" },
        { key: "words", label: "Words" },
        { key: "preview", label: "Preview" }
      ]),
      "",
      "## Sentence-Level Watchlist",
      markdownTable(analysis.longSentences, [
        { key: "index", label: "Sentence" },
        { key: "words", label: "Words" },
        { key: "preview", label: "Preview" }
      ]),
      "",
      "## Repetition Candidates",
      markdownTable(analysis.repeatedTerms, [
        { key: "term", label: "Term" },
        { key: "count", label: "Count" }
      ]),
      "",
      "## Editorial Risks",
      "- Confirm final canonical manuscript edition before downstream editing.",
      "- Preserve author voice and intentional theological, historical, or regional language.",
      "- Route rights-sensitive quoted material for publisher review before package release.",
      "- Resolve long paragraph and long sentence candidates during Developmental Editing or Line Editing as appropriate.",
      "",
      "## Manuscript Readiness Finding",
      "READY_FOR_PUBLISHER_EDITORIAL_PATH_DECISION",
      "",
      "## Source Sample Used For QA",
      stats.sample || "No extractable text sample was available.",
      ""
    ].join("\n");
  }
  return [
    ...base,
    "## Developmental Editing Output",
    "Developmental Editing has begun against the governed source manuscript. This artifact records the governed content pass inputs, manuscript structure signals, edit priorities, and package prerequisites. It is not an author-facing release package.",
    "",
    "## Developmental Memo",
    [
      "Initial priorities:",
      "- Clarify the through-line and reader promise.",
      "- Preserve author voice and intentional style.",
      "- Confirm chapter/section sequence before line-level editing.",
      "- Split or restructure long paragraph candidates where pacing or comprehension requires it.",
      "- Review long sentence candidates for clarity while avoiding voice flattening.",
      "- Isolate publisher sensitivity, rights, or legal review items before author-facing package release."
    ].join("\n"),
    "",
    "## Detected Structure Signals",
    markdownTable(analysis.headings.map((heading, index) => ({ index: index + 1, heading })), [
      { key: "index", label: "#" },
      { key: "heading", label: "Candidate heading / section marker" }
    ]),
    "",
    "## Developmental Work Queue",
    markdownTable(analysis.longParagraphs, [
      { key: "index", label: "Paragraph" },
      { key: "words", label: "Words" },
      { key: "preview", label: "Developmental issue candidate" }
    ]),
    "",
    "## Line-Level Deferral Queue",
    markdownTable(analysis.longSentences, [
      { key: "index", label: "Sentence" },
      { key: "words", label: "Words" },
      { key: "preview", label: "Candidate" }
    ]),
    "",
    "## Continuity / Repetition Candidates",
    markdownTable(analysis.repeatedTerms, [
      { key: "term", label: "Term" },
      { key: "count", label: "Count" }
    ]),
    "",
    "## Change Ledger",
    "- Source manuscript checksum validated before editing.",
    "- Working manuscript pass opened under JM1 Automation.",
    "- Structural/readability candidates extracted from the actual manuscript text.",
    "- No author-facing package released until stage completion, QA, cadence, and Package Engine policy are satisfied.",
    "- No stage advancement occurred before output and QA evidence.",
    "",
    "## QA Evidence",
    "Source checksum matched, file was readable, text extraction completed, and output is linked to the active editorial stage.",
    "",
    "## Current Execution State",
    "EXECUTING",
    "",
    "## Source Sample Used For QA",
    stats.sample || "No extractable text sample was available.",
    ""
  ].join("\n");
}

async function materializeEditorialOutputs(
  client,
  stage,
  stageCode,
  sourceArtifact,
  correlationId,
  upstreamContext = null,
  options = {}
) {
  const sourceRef = await resolveSourceGraphItem(sourceArtifact, stageCode);
  const driveId = sourceRef.driveId;
  const sourceItem = sourceRef.item;
  const sourceBuffer = await graphRequest(sourceRef.contentPath).catch((error) => {
    throw Object.assign(error, {
      safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_DOWNLOAD_FAILED"}`,
      graphDetail: graphFailureDetail(error, sourceArtifact)
    });
  });
  const actualSha = crypto.createHash("sha256").update(sourceBuffer).digest("hex");
  const expectedSha = normalizeString(sourceArtifact.jm1pub_sha256);
  if (expectedSha && actualSha !== expectedSha) {
    throw Object.assign(new Error("Source checksum mismatch"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_CHECKSUM_MISMATCH`
    });
  }
  const parentId = normalizeString(sourceItem?.parentReference?.id);
  if (!parentId) {
    throw Object.assign(new Error("Source parent folder missing"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_PARENT_FOLDER_MISSING`
    });
  }
  const extracted = await extractSourceText(sourceBuffer, stageCode);
  const modelInvocation = options.modelInvocation || await invokeStageModelProvider(
    stage,
    stageCode,
    sourceArtifact,
    extracted.value || "",
    correlationId,
    upstreamContext
  );
  if (!modelInvocation.ok || modelInvocation.fellBack) {
    throw Object.assign(new Error(modelInvocation.error || "Governed model route failed"), {
      safeCode: `${stageCode}_BLOCKED — ${safeBlockerReason(modelInvocation.error, "MODEL_INVOCATION_FAILED")}`
    });
  }
  const outputs = [];
  for (const outputName of outputDefinitions(stageCode)) {
    const isDevelopmentalManuscript =
      stageCode === "DEVELOPMENTAL_EDITING" && outputName === "Developmentally Edited Manuscript";
    const isDevelopmentalMemo = stageCode === "DEVELOPMENTAL_EDITING" && outputName === "Developmental Memo";
    const isLineEditedManuscript = stageCode === "LINE_EDITING" && outputName === "Edited Manuscript";
    const isEditedManuscript =
      (stageCode === "LINE_EDITING" || stageCode === "COPYEDITING") && outputName === "Edited Manuscript";
    const isProofreadManuscript = stageCode === "PROOFREADING" && outputName === "Proofread Manuscript";
    const isReviewInstructions = outputName.toLowerCase().includes("review instructions");
    const shouldBuildDocx = isDevelopmentalManuscript || isDevelopmentalMemo || isEditedManuscript || isProofreadManuscript;
    const extension = shouldBuildDocx ? "docx" : isReviewInstructions ? "txt" : "md";
    const contentType = shouldBuildDocx
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : isReviewInstructions
        ? "text/plain"
      : "text/markdown";
    const filename = `${new Date().toISOString().slice(0, 10)}-${stage.jm1pub_name.replace(/[^a-zA-Z0-9]+/g, "-")}-${outputName.replace(/[^a-zA-Z0-9]+/g, "-")}.${extension}`;
    const body = isDevelopmentalManuscript
      ? await buildDevelopmentalRevisionDocx(stage, stageCode, sourceArtifact, outputName, extracted.value || "", correlationId)
      : isLineEditedManuscript
        ? await buildLineEditedManuscriptDocx(stage, sourceArtifact, outputName, extracted.value || "", correlationId, modelInvocation)
      : shouldBuildDocx
        ? await buildSimpleEditorialDocx(stage, stageCode, sourceArtifact, outputName, extracted.value || "", correlationId, modelInvocation)
        : Buffer.from(
            stageCode === "LINE_EDITING"
              ? buildLineEditingMarkdownOutput(stage, outputName, sourceArtifact, extracted.value || "", correlationId, modelInvocation)
              : isReviewInstructions
              ? buildReviewInstructionsText(stage, stageCode, sourceArtifact, correlationId)
              : buildOutputDocument(stage, stageCode, sourceArtifact, outputName, extracted.value || "", correlationId),
            "utf8"
          );
    const uploaded = await graphRequest(`drives/${driveId}/items/${parentId}:/${encodeURIComponent(filename)}:/content`, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body
    }).catch((error) => {
      throw Object.assign(error, {
        safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_CONTENT_STREAM_FAILED"}`,
        graphDetail: graphFailureDetail(error, sourceArtifact)
      });
    });
    const artifactName = `${outputName} - ${stage.jm1pub_name}`;
    const artifactPayload = {
      jm1pub_editorialartifactname: artifactName,
      jm1pub_filename: uploaded.name || filename,
      jm1pub_fileextension: extension,
      jm1pub_filesizebytes: uploaded.size || body.length,
      jm1pub_repositorydriveid: driveId,
      jm1pub_repositoryitemid: uploaded.id,
      jm1pub_repositorypath: uploaded.webUrl,
      jm1pub_sha256: crypto.createHash("sha256").update(body).digest("hex"),
      jm1pub_artifactstatus: 196650002,
      jm1pub_visibility: 196650001,
      jm1pub_iscurrentapproved: false,
      jm1pub_notes: isDevelopmentalManuscript
        ? `Package-grade governed developmental revision artifact produced from source artifact ${sourceArtifact.jm1pub_editorialartifactid}. This preserves author voice and routes high-risk edits as notes instead of silent rewrites.`
        : isLineEditedManuscript
          ? `Package-grade governed Line Editing artifact produced from actual model output for source artifact ${sourceArtifact.jm1pub_editorialartifactid}. Retention/drift QA passed; author review is required before Copyediting.`
        : `Editorial runtime output produced from governed source artifact ${sourceArtifact.jm1pub_editorialartifactid}.`,
      jm1pub_correlationid: correlationId,
      "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${stage._jm1pub_titleid_value})`,
      "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`
    };
    if (normalizeString(stage._jm1pub_publishingassetid_value)) {
      artifactPayload["Jm1pub_Publishingassetid@odata.bind"] = `/jm1pub_publishingassets(${stage._jm1pub_publishingassetid_value})`;
    }
    const existing = await findArtifactByName(client, stage, artifactName);
    let artifactId = existing?.jm1pub_editorialartifactid;
    if (artifactId) {
      await client.patch("jm1pub_editorialartifacts", artifactId, artifactPayload);
    } else {
      artifactId = await client.create("jm1pub_editorialartifacts", artifactPayload);
    }
    outputs.push({
      outputName,
      artifactId,
      itemId: uploaded.id,
      filename: uploaded.name || filename,
      extension,
      contentType,
      size: uploaded.size || body.length,
      sha256: artifactPayload.jm1pub_sha256,
      modelProvider: modelInvocation.provider || modelInvocation.route?.provider || "",
      modelDeployment: modelInvocation.routeAlias || "",
      promptVersion: modelInvocation.promptVersion || ""
    });
  }
  outputs.modelInvocation = {
    provider: modelInvocation.provider || modelInvocation.route?.provider || "",
    routeAlias: modelInvocation.routeAlias || "",
    promptVersion: modelInvocation.promptVersion || "",
    transaction: transactionForStage(stageCode),
    fellBack: Boolean(modelInvocation.fellBack)
  };
  return outputs;
}

async function finalizeMaterializedEditorialOutputs(client, stage, stageCode, sourceArtifact, outputs, correlationId) {
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `${stageCode === "EDITORIAL_REVIEW" ? "PACKAGE_PREPARATION" : "EXECUTING"}: JM1 Automation created governed ${stageCode} output artifacts from checksum-validated source ${sourceArtifact.jm1pub_editorialartifactid}. QA evidence registered. Package release remains gated by stage completion, cadence, and canonical Package Engine policy.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const outputReadyVersion = stageCode === "EDITORIAL_REVIEW" ? "v5" : "v4";
  const idempotencyKey = `editorial-runtime:output-ready-${outputReadyVersion}:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const outputLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_CREATED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_CREATED",
    description:
      `${stageCode} produced governed output artifacts: ${outputs.map((item) => `${item.outputName} ${item.artifactId}`).join("; ")}. ` +
      `Model route ${outputs.modelInvocation?.routeAlias || "unknown"}; provider ${outputs.modelInvocation?.provider || "unknown"}; prompt ${outputs.modelInvocation?.promptVersion || "unknown"}. ` +
      `Fallback ${outputs.modelInvocation?.fellBack ? "true" : "false"}. ` +
      `Source artifact ${sourceArtifact.jm1pub_editorialartifactid}; checksum ${sourceArtifact.jm1pub_sha256 || "pending"}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  const qaLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_QA_COMPLETED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_QA_COMPLETED",
    description:
      `${stageCode} QA completed: source/output distinction validated, source checksum matched, source file was materialized, output artifacts were uploaded and linked to the active title/stage, and package-grade deliverable requirements were evaluated. Package assembly remains gated until stage completion and cadence policy allow release. Correlation ${correlationId}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  let packageHandoff = null;
  try {
    packageHandoff = await createPackageManifestArtifact(client, stage, stageCode, sourceArtifact, outputs, correlationId);
  } catch (error) {
    const exact = error.safeCode || `${stageCode}_BLOCKED — PACKAGE_ENGINE_HANDOFF_FAILED`;
    await recordBlockedTask(client, stage, stageCode, exact, correlationId);
    packageHandoff = { status: "EXCEPTION", exactBlocker: exact, graphDetail: error.graphDetail };
  }
  if (packageHandoff && !packageHandoff.skipped) {
    const reviewArtifact = selectPrimaryAuthorReviewArtifact(outputs, packageHandoff);
    const authorGate = reviewArtifact
      ? await createAuthorReviewGate(client, stage, stageCode, reviewArtifact, correlationId)
      : { ok: false, reason: "AUTHOR_REVIEW_ARTIFACT_BINDING_MISSING" };
    await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
      jm1pub_internaloperationalsummary:
        packageHandoff.status === "EXCEPTION"
          ? `EXCEPTION — ${packageHandoff.exactBlocker}${packageHandoff.graphDetail ? `. ${packageHandoff.graphDetail}` : ""}`
          : `PACKAGE_PREPARATION: Package Engine handoff completed for ${packageHandoff.packageId}; manifest ${packageHandoff.manifestArtifactId}; package checksum ${packageHandoff.packageChecksum}; QA ${packageHandoff.qaStatus}; cadence ${packageHandoff.cadenceStatus}; notification ${packageHandoff.notificationPolicy}; workspace ${packageHandoff.workspaceVisibility}. Author review gate ${authorGate.gateId || authorGate.reason || "pending"}. Next governed action: ${packageHandoff.nextGovernedAction}`,
      jm1pub_authorsafesummary:
        packageHandoff.status === "EXCEPTION"
          ? "Editorial work is in progress internally. No author action is required at this time."
          : "Editorial work has produced review materials. The publishing team will release them through the governed author review process when ready."
    });
    packageHandoff.authorGate = authorGate;
  }
  return { outputLogId, qaLogId, packageHandoff };
}

function selectPrimaryAuthorReviewArtifact(outputs, packageHandoff) {
  const artifacts = Array.isArray(outputs) ? outputs : [];
  return (
    artifacts.find((item) => packageRoleForOutput(item.outputName) === "editedManuscript") ||
    artifacts.find((item) => packageRoleForOutput(item.outputName) === "assessment") ||
    artifacts.find((item) => item.artifactId) ||
    (packageHandoff?.manifestArtifactId
      ? {
          outputName: "Package Manifest",
          artifactId: packageHandoff.manifestArtifactId,
          sha256: packageHandoff.packageChecksum
        }
      : null)
  );
}

async function findAuthorReviewGatesForStage(client, stage) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const stageId = normalizeString(stage.jm1pub_editorialstageid);
  if (!titleId || !stageId) return [];
  return client.list("jm1pub_editorialapprovalgates", {
    $select:
      "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
    $orderby: "modifiedon desc",
    $top: "25"
  }).catch(() => []);
}

async function createAuthorReviewGate(client, stage, stageCode, artifact, correlationId) {
  const existingGates = await findAuthorReviewGatesForStage(client, stage);
  const plan = createAuthorReviewGatePlan({
    stageCode,
    titleId: stage._jm1pub_titleid_value,
    stageId: stage.jm1pub_editorialstageid,
    artifact: {
      artifactId: artifact.artifactId,
      sha256: artifact.sha256
    },
    existingGates
  });
  if (!plan.ok) return plan;
  if (plan.idempotent) return plan;
  const payload = {
    jm1pub_editorialapprovalgatename: `${plan.authorLabel} Author Review - ${stage.jm1pub_name}`,
    jm1pub_gatecode: GATE_CODES[stageCode],
    jm1pub_gatestatus: GATE_STATUS_READY_FOR_AUTHOR_REVIEW,
    jm1pub_nextstageauthorized: false,
    jm1pub_awaitingsince: new Date().toISOString(),
    jm1pub_authorresponsesummary:
      `Awaiting full author approval for ${plan.authorLabel}. Bound deliverable artifact ${plan.artifactId}; checksum ${plan.artifactHash}.`,
    jm1pub_correlationid: correlationId,
    "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${stage._jm1pub_titleid_value})`,
    "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`,
    "Jm1pub_Deliverableartifactid@odata.bind": `/jm1pub_editorialartifacts(${plan.artifactId})`
  };
  if (normalizeString(stage._jm1pub_publishingassetid_value)) {
    payload["Jm1pub_Publishingassetid@odata.bind"] = `/jm1pub_publishingassets(${stage._jm1pub_publishingassetid_value})`;
  }
  const gateId = await client.create("jm1pub_editorialapprovalgates", payload);
  const idempotencyKey = `editorial-runtime:author-review-gate:${stage.jm1pub_editorialstageid}:${stageCode}:${plan.artifactId}:${plan.artifactHash}`;
  const existingLog = await findExecutionLog(client, "AUTHOR_REVIEW_GATE_CREATED", idempotencyKey);
  if (!existingLog) {
    await writeLog(client, {
      name: `AUTHOR_REVIEW_GATE_CREATED - ${stage.jm1pub_name}`,
      actionType: "AUTHOR_REVIEW_GATE_CREATED",
      description:
        `${stageCode} opened mandatory author review gate ${gateId} for artifact ${plan.artifactId}; checksum ${plan.artifactHash}. ` +
        (stageCode === "LINE_EDITING" ? "Copyediting is not authorized until author review/approval completes. " : "") +
        `No notification was sent by this runtime. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gateId
    });
  }
  return { ...plan, gateId };
}

function packageRoleForOutput(outputName) {
  const normalized = normalizeString(outputName).toLowerCase();
  if (normalized === "edited manuscript") return "editedManuscript";
  if (normalized.includes("developmentally edited manuscript")) return "editedManuscript";
  if (normalized.includes("developmental memo")) return "developmentalMemo";
  if (normalized.includes("line editing summary")) return "lineEditingSummary";
  if (normalized.includes("copyediting summary")) return "copyeditingSummary";
  if (normalized.includes("proofread manuscript")) return "proofreadManuscript";
  if (normalized.includes("proofreading cover note")) return "proofreadingCoverNote";
  if (normalized.includes("style sheet")) return "styleSheet";
  if (normalized.includes("change ledger")) return "changeLedger";
  if (normalized.includes("author-query") || normalized.includes("author query")) return "authorQueryList";
  if (normalized.includes("review instructions")) return "reviewInstructions";
  if (normalized.includes("editorial assessment")) return "assessment";
  if (normalized.includes("recommended editorial path")) return "recommendedEditorialPath";
  if (normalized.includes("scope and risk")) return "riskRegister";
  if (normalized.includes("qa evidence")) return "qaEvidence";
  return "";
}

function requiredPackageRoles(stageCode) {
  if (stageCode === "DEVELOPMENTAL_EDITING") return ["editedManuscript", "developmentalMemo", "changeLedger", "reviewInstructions"];
  if (stageCode === "EDITORIAL_REVIEW") return ["assessment", "recommendedEditorialPath", "riskRegister", "qaEvidence"];
  if (stageCode === "LINE_EDITING") return ["editedManuscript", "lineEditingSummary", "changeLedger", "qaEvidence"];
  if (stageCode === "COPYEDITING") return ["editedManuscript", "copyeditingSummary", "styleSheet", "qaEvidence"];
  if (stageCode === "PROOFREADING") return ["proofreadManuscript", "proofreadingCoverNote", "qaEvidence"];
  return [];
}

function allowedMimeForRole(role) {
  if (role === "editedManuscript" || role === "developmentalMemo" || role === "proofreadManuscript") {
    return ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf"];
  }
  if (role === "reviewInstructions") return ["text/plain", "application/pdf"];
  if (
    role === "changeLedger" ||
    role === "authorQueryList" ||
    role === "lineEditingSummary" ||
    role === "copyeditingSummary" ||
    role === "proofreadingCoverNote" ||
    role === "styleSheet"
  ) {
    return ["text/markdown", "text/plain", "application/json", "application/pdf"];
  }
  if (role === "assessment" || role === "recommendedEditorialPath" || role === "riskRegister" || role === "qaEvidence") {
    return ["text/markdown", "application/json", "application/pdf"];
  }
  return [];
}

function packageDeliveryPolicy(stageCode) {
  if (stageCode === "EDITORIAL_REVIEW") {
    return {
      audience: "AUTHOR",
      notificationPolicy: "AUTHOR_REVIEW_AFTER_STAGE_COMPLETION_AND_CADENCE",
      workspaceVisibility: "VISIBLE_AFTER_COMPLETE_NOTIFICATION",
      cadenceStatus: "CADENCE_HOLD",
      cadenceDetail: "CADENCE_HOLD: Editorial Review author release held until stage completion and cadence authorization.",
      nextGovernedAction: "Canonical author review before Developmental Editing may begin."
    };
  }
  return {
    audience: "AUTHOR",
    notificationPolicy: "AUTHOR_REVIEW_AFTER_STAGE_COMPLETION_AND_CADENCE",
    workspaceVisibility: "VISIBLE_AFTER_COMPLETE_NOTIFICATION",
    cadenceStatus: "CADENCE_HOLD",
    cadenceDetail: "CADENCE_HOLD: author release held until stage completion and cadence authorization.",
    nextGovernedAction: "Canonical author package release after stage QA and cadence authorization."
  };
}

function packageChecksum(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function createPackageManifestArtifact(client, stage, stageCode, sourceArtifact, outputs, correlationId, options = {}) {
  const requiredRoles = requiredPackageRoles(stageCode);
  if (!requiredRoles.length) return { skipped: true, reason: "PACKAGE_POLICY_NOT_CONFIGURED_FOR_STAGE" };
  const deliveryPolicy = packageDeliveryPolicy(stageCode);
  const artifacts = outputs
    .map((output) => ({ ...output, role: packageRoleForOutput(output.outputName) }))
    .filter((output) => output.role);
  const failures = [];
  for (const role of requiredRoles) {
    const artifact = artifacts.find((item) => item.role === role);
    if (!artifact) {
      failures.push(`PACKAGE_QA_FAILED — REQUIRED_ARTIFACT_MISSING:${role}`);
      continue;
    }
    const allowed = allowedMimeForRole(role);
    if (allowed.length && !allowed.includes(artifact.contentType)) {
      failures.push(`PACKAGE_QA_FAILED — INVALID_FILE_TYPE:${role}:${artifact.contentType}`);
    }
    if (!normalizeString(artifact.sha256)) {
      failures.push(`PACKAGE_QA_FAILED — CHECKSUM_MISMATCH:${role}:checksum-missing`);
    }
  }
  const packageVersion = normalizeString(options.packageVersion) || "v1";
  const packageId = `pkg-${stage.jm1pub_editorialstageid}-${stageCode.toLowerCase().replace(/_/g, "-")}-${packageVersion}`;
  const manifestId = `manifest-${packageId}`;
  const manifest = {
    packageId,
    titleId: stage._jm1pub_titleid_value,
    authorId: null,
    stageId: stage.jm1pub_editorialstageid,
    stageCode,
    gateId: null,
    packageVersion,
    manifestVersion: "1.0",
    packageAudience: deliveryPolicy.audience,
    notificationPolicy: deliveryPolicy.notificationPolicy,
    workspaceVisibility: deliveryPolicy.workspaceVisibility,
    nextGovernedAction: deliveryPolicy.nextGovernedAction,
    sourceArtifactIds: [sourceArtifact.jm1pub_editorialartifactid],
    artifacts: artifacts.map((artifact) => ({
      artifactRole: artifact.role,
      artifactId: artifact.artifactId,
      filename: artifact.filename,
      mimeType: artifact.contentType,
      fileSize: artifact.size,
      checksum: artifact.sha256,
      sourceVersion: packageVersion,
      createdAt: new Date().toISOString(),
      authorVisible: deliveryPolicy.audience === "AUTHOR" && requiredRoles.includes(artifact.role),
      emailAttachment: deliveryPolicy.audience === "AUTHOR" && requiredRoles.includes(artifact.role),
      workspaceDownload: deliveryPolicy.audience === "AUTHOR" && requiredRoles.includes(artifact.role)
    }))
  };
  manifest.packageChecksum = packageChecksum({
    packageId: manifest.packageId,
    titleId: manifest.titleId,
    stageId: manifest.stageId,
    stageCode: manifest.stageCode,
    packageVersion: manifest.packageVersion,
    artifacts: manifest.artifacts
  });
  const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const driveId = normalizeString(sourceArtifact.jm1pub_repositorydriveid);
  const itemId = normalizeString(sourceArtifact.jm1pub_repositoryitemid);
  const sourceItem = await graphRequest(`drives/${driveId}/items/${itemId}?$select=id,parentReference`).catch((error) => {
    throw Object.assign(error, {
      safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_METADATA_READ_FAILED"}`,
      graphDetail: graphFailureDetail(error, sourceArtifact)
    });
  });
  const parentId = normalizeString(sourceItem?.parentReference?.id);
  const filename = `${new Date().toISOString().slice(0, 10)}-${stage.jm1pub_name.replace(/[^a-zA-Z0-9]+/g, "-")}-Package-Manifest-${packageVersion}.json`;
  const uploaded = await graphRequest(`drives/${driveId}/items/${parentId}:/${encodeURIComponent(filename)}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: manifestBody
  }).catch((error) => {
    throw Object.assign(error, {
      safeCode: `${stageCode}_BLOCKED — ${error.safeCode || "GRAPH_CONTENT_STREAM_FAILED"}`,
      graphDetail: graphFailureDetail(error, sourceArtifact)
    });
  });
  const artifactPayload = {
    jm1pub_editorialartifactname:
      packageVersion === "v1" ? `Package Manifest - ${stage.jm1pub_name}` : `Package Manifest ${packageVersion} - ${stage.jm1pub_name}`,
    jm1pub_filename: uploaded.name || filename,
    jm1pub_fileextension: "json",
    jm1pub_filesizebytes: uploaded.size || manifestBody.length,
    jm1pub_repositorydriveid: driveId,
    jm1pub_repositoryitemid: uploaded.id,
    jm1pub_repositorypath: uploaded.webUrl,
    jm1pub_sha256: crypto.createHash("sha256").update(manifestBody).digest("hex"),
    jm1pub_artifactstatus: 196650002,
    jm1pub_visibility: 196650001,
    jm1pub_iscurrentapproved: false,
    jm1pub_notes:
      `Canonical Package Engine manifest handoff for ${packageId}. Package checksum ${manifest.packageChecksum}.` +
      (options.retryReason ? ` Retry reason: ${options.retryReason}.` : ""),
    "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${stage._jm1pub_titleid_value})`,
    "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`
  };
  if (normalizeString(stage._jm1pub_publishingassetid_value)) {
    artifactPayload["Jm1pub_Publishingassetid@odata.bind"] = `/jm1pub_publishingassets(${stage._jm1pub_publishingassetid_value})`;
  }
  const existing = await findArtifactByName(client, stage, artifactPayload.jm1pub_editorialartifactname);
  let manifestArtifactId = existing?.jm1pub_editorialartifactid;
  if (manifestArtifactId) {
    await client.patch("jm1pub_editorialartifacts", manifestArtifactId, artifactPayload);
  } else {
    manifestArtifactId = await client.create("jm1pub_editorialartifacts", artifactPayload);
  }
  const qaStatus = failures.length ? "QA_FAILED" : "READY_INTERNAL";
  const cadenceStatus = failures.length ? "CADENCE_HOLD" : deliveryPolicy.cadenceStatus;
  const events = [
    { actionType: "PACKAGE_MANIFEST_CREATED", detail: `Package ${packageId}; manifest artifact ${manifestArtifactId}; checksum ${manifest.packageChecksum}.` },
    failures.length
      ? { actionType: "PACKAGE_QA_FAILED", detail: failures.join("; ") }
      : { actionType: "PACKAGE_QA_COMPLETED", detail: `Required package artifacts validated: ${requiredRoles.join(", ")}.` },
    {
      actionType: "PACKAGE_CADENCE_SCHEDULED",
      detail: deliveryPolicy.cadenceDetail
    }
  ];
  for (const event of events) {
    const idempotencyKey = `package-engine:${event.actionType}:${stage.jm1pub_editorialstageid}:${manifest.packageChecksum}:${packageVersion}`;
    const existingLog = await findExecutionLog(client, event.actionType, idempotencyKey);
    if (existingLog) continue;
    await writeLog(client, {
      name: `${event.actionType} - ${stage.jm1pub_name}`,
      actionType: event.actionType,
      description: `${event.detail} Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stage.jm1pub_editorialstageid
    });
  }
  return {
    packageId,
    packageVersion,
    manifestArtifactId,
    packageChecksum: manifest.packageChecksum,
    qaStatus,
    cadenceStatus,
    notificationPolicy: deliveryPolicy.notificationPolicy,
    workspaceVisibility: deliveryPolicy.workspaceVisibility,
    nextGovernedAction: deliveryPolicy.nextGovernedAction
  };
}

async function recordSourceExecutionReadiness(client, stage, stageCode, sourceArtifact, correlationId) {
  const events = [
    {
      actionType: "EDITORIAL_SOURCE_VALIDATED",
      description: `${stageCode} source artifact ${sourceArtifact.jm1pub_editorialartifactid} is registered and checksum-bearing for ${stage.jm1pub_name}.`
    },
    {
      actionType: "EDITORIAL_EXECUTION_INPUT_READY",
      description: `${stageCode} execution input is ready for JM1 Automation: title ${stage._jm1pub_titleid_value}, stage ${stage.jm1pub_editorialstageid}, source ${sourceArtifact.jm1pub_editorialartifactid}.`
    },
    {
      actionType: "EDITORIAL_TASK_READY_FOR_EXECUTION",
      description: `${stageCode} task is eligible for editorial execution; this is not editorial output evidence.`
    },
    {
      actionType: "EDITORIAL_SOURCE_QA_COMPLETED",
      description: `${stageCode} source QA completed at the input boundary. Output QA remains separate and requires actual editorial deliverables.`
    }
  ];
  const results = [];
  for (const event of events) {
    const idempotencyKey = `editorial-runtime:${event.actionType}:${stage.jm1pub_editorialstageid}:${sourceArtifact.jm1pub_editorialartifactid}:v1`;
    const existing = await findExecutionLog(client, event.actionType, idempotencyKey);
    if (existing) {
      results.push({ actionType: event.actionType, logId: existing.jm1_executionlogid, idempotent: true });
      continue;
    }
    const logId = await writeLog(client, {
      name: `${event.actionType} - ${stage.jm1pub_name}`,
      actionType: event.actionType,
      description: `${event.description} Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stage.jm1pub_editorialstageid
    });
    results.push({ actionType: event.actionType, logId, idempotent: false });
  }
  return results;
}

async function recordLegacyOutputScopeClarification(client, stage, stageCode, sourceArtifact, correlationId) {
  const legacyKey = `editorial-runtime:output-ready-v2:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const legacy = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", legacyKey);
  if (!legacy) return null;
  const idempotencyKey = `editorial-runtime:output-scope-clarified:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}:v1`;
  const existing = await findExecutionLog(client, "EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED", idempotencyKey);
  if (existing) return { logId: existing.jm1_executionlogid, idempotent: true };
  const logId = await writeLog(client, {
    name: `EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED",
    description:
      `Prior v2 ACTIVE_EDITORIAL_OUTPUT_CREATED evidence for ${stageCode} is preserved but clarified: source validation/readiness and preliminary markdown evidence are not package-grade edited manuscript output unless an actual deliverable artifact exists. V3 output evidence is required for package-grade execution. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { logId, idempotent: false };
}

async function recordRuntimeCommissioned(client, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:commissioned:${stageCode}:v1`;
  const actionType = `${stageCode}_EXECUTOR_COMMISSIONED`;
  const existing = await findExecutionLog(client, actionType, idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `${actionType}`,
    actionType,
    description:
      `${stageCode} reusable editorial executor commissioned under JM1 Automation. It accepts governed stage work items, validates source artifact identity, records exact blockers, and prepares output/package handoff only after real artifacts exist. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: stageCode
  });
  return { idempotent: false, logId };
}

async function processStage(client, stage, correlationId, options = {}) {
  const stageCode = normalizeStageCode(stage);
  const policy = EXECUTOR_POLICIES[stageCode];
  if (!policy || !stageStatusIsExecutable(stage)) {
    return { stageId: stage.jm1pub_editorialstageid, stageCode, status: "SKIPPED_NOT_EXECUTABLE" };
  }
  const preservedExactBlocker = extractExistingExactBlocker(stage);
  if (shouldPreserveExistingExactBlocker(preservedExactBlocker)) {
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker: preservedExactBlocker,
      blocked: { idempotent: true, logId: null, idempotencyKey: "preserved-existing-exact-blocker" }
    };
  }
  const upstream = await findUpstreamApprovalEvidence(client, stage, stageCode);
  if (!upstream.ok) {
    const blocked = await recordAuthorApprovalBlocked(client, stage, stageCode, upstream, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "BLOCKED_AUTHOR_APPROVAL_REQUIRED",
      reason: upstream.reason,
      blocked
    };
  }
  const claim = await claimStageTask(client, stage, stageCode, correlationId);
  const sourceArtifact = options.sourceArtifact || await findSourceArtifact(client, stage);
  const exactBlocker = buildExactBlocker(stageCode, sourceArtifact);
  if (exactBlocker) {
    const blocked = await recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker,
      claim,
      blocked
    };
  }
  await recordSourceExecutionReadiness(client, stage, stageCode, sourceArtifact, correlationId);
  await recordLegacyOutputScopeClarification(client, stage, stageCode, sourceArtifact, correlationId);
  const outputReadyVersion = stageCode === "EDITORIAL_REVIEW" ? "v5" : "v4";
  const idempotencyKey = `editorial-runtime:output-ready-${outputReadyVersion}:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", idempotencyKey);
  if (existing) {
    const existingOutputs = await findExistingOutputArtifacts(client, stage, stageCode);
    const reviewArtifact = selectPrimaryAuthorReviewArtifact(existingOutputs, null);
    const authorGate = reviewArtifact
      ? await createAuthorReviewGate(client, stage, stageCode, reviewArtifact, correlationId)
      : { ok: false, reason: "AUTHOR_REVIEW_ARTIFACT_BINDING_MISSING" };
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "OUTPUT_ALREADY_RECORDED",
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      idempotent: true,
      authorGate
    };
  }
  let outputs;
  try {
    outputs = await materializeEditorialOutputs(client, stage, stageCode, sourceArtifact, correlationId, upstream);
  } catch (error) {
    const exact = error.safeCode || `${stageCode}_BLOCKED — OUTPUT_MATERIALIZATION_FAILED`;
    const diagnostics = await recordRejectedLineOutputDiagnostics(client, stage, stageCode, sourceArtifact, error, correlationId);
    const blocked = await recordBlockedTask(client, stage, stageCode, exact, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker: exact,
      claim,
      diagnostics,
      blocked
    };
  }
  const finalized = await finalizeMaterializedEditorialOutputs(client, stage, stageCode, sourceArtifact, outputs, correlationId);
  return {
    stageId: stage.jm1pub_editorialstageid,
    titleId: stage._jm1pub_titleid_value,
    stageCode,
    status: "VALIDATING",
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    outputs,
    ...finalized
  };
}

async function runEditorialExecutionRuntime(options = {}, deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const correlationId = options.correlationId || `EDITORIAL-RUNTIME-${new Date().toISOString()}`;
  const maxTasks = Math.min(Math.max(Number(options.maxTasks || process.env.JM1_EDITORIAL_RUNTIME_MAX_TASKS || 10), 1), 25);
  const commissioned = [];
  for (const stageCode of Object.keys(EXECUTOR_POLICIES)) {
    commissioned.push({ stageCode, ...(await recordRuntimeCommissioned(client, stageCode, correlationId)) });
  }
  const stages = deps.stages || (await findActiveEditorialStages(client, maxTasks));
  const results = [];
  for (const stage of stages) {
    results.push(await processStage(client, stage, correlationId));
  }
  await writeLog(client, {
    name: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    actionType: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    description:
      `Editorial execution runtime cycle completed. Claimed/evaluated ${results.length} stage(s). ` +
      `Executors active: ${Object.keys(EXECUTOR_POLICIES).join(", ")}. Correlation ${correlationId}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: correlationId
  });
  return {
    ok: true,
    correlationId,
    executorCount: Object.keys(EXECUTOR_POLICIES).length,
    commissioned,
    processed: results.length,
    results
  };
}

module.exports = {
  DEFAULT_LINE_EDITING_CHUNK_CONCURRENCY,
  DEFAULT_LINE_EDITING_DEPLOYMENT_TPM,
  DEFAULT_LINE_EDITING_OUTPUT_BUCKET_RATIO,
  DEFAULT_LINE_EDITING_CAPACITY_HEADROOM_RATIO,
  DEFAULT_LINE_EDITING_CHUNK_WORD_LIMIT,
  EXECUTOR_POLICIES,
  STAGE_STATUS,
  STAGE_TYPES,
  allowedMimeForRole,
  buildExactBlocker,
  authorGateBlocksRuntime,
  classifyGraphFailure,
  createDataverseClient,
  createAuthorReviewGate,
  createPackageManifestArtifact,
  buildStageModelPrompt,
  extractSourceText,
  findArtifactByName,
  findActiveEditorialStages,
  findExecutionLog,
  findSourceArtifact,
  findExistingOutputArtifacts,
  findUpstreamApprovalEvidence,
  graphRequest,
  graphShareToken,
  invokeStageModelProvider,
  invokeSingleStageModelProvider,
  calculateLineEditingChunkConcurrency,
  firstMissingLineEditingChunkCursor,
  parseNonNegativeInteger,
  splitLineEditingSourceChunks,
  buildLineEditingChunkPrompt,
  isLivePortfolioStage,
  buildLineEditingQa,
  recordRejectedLineOutputDiagnostics,
  normalizeStageCode,
  packageChecksum,
  packageDeliveryPolicy,
  packageRoleForOutput,
  requiredPackageRoles,
  requireDataverseConfig,
  resolveSourceGraphItem,
  shouldPreserveExistingExactBlocker,
  writeLog,
  evaluateTargetedEditorialExecution,
  runChunkedTargetedEditorialExecution,
  runTargetedEditorialExecution,
  targetedExecutionIdempotencyKey,
  runEditorialExecutionRuntime
};
