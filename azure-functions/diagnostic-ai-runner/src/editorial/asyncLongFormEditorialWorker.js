"use strict";

const crypto = require("node:crypto");
const {
  buildLineEditingChunkPrompt,
  splitLineEditingSourceChunks
} = require("./editorialExecutionRuntime");
const {
  classifyModelFailureForWorkflow,
  isTransientCapacityFailure
} = require("../model/modelCapacityRetryPolicy");

const DEFAULT_OUTPUT_TOKEN_LIMIT = 5000;
const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_CHUNK_WORD_LIMIT = 800;
const DEFAULT_ESTIMATED_OUTPUT_TOKENS_PER_CHUNK = 4500;
const DEFAULT_PROMPT_VERSION = "CC010-LINE_EDITING-CHUNK-V1";
const DEFAULT_CHUNK_PLAN_VERSION = "JMP-ASYNC-LONGFORM-CHUNKS-V1";
const DEFAULT_MANUAL_CANON_VERSION = "JMP-EDITORIAL-MANUAL-CANON-V1";

const JOB_STATUS = Object.freeze({
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  WAITING_FOR_PROVIDER_CAPACITY: "WAITING_FOR_PROVIDER_CAPACITY",
  RETRY_SCHEDULED: "RETRY_SCHEDULED",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  FAILED_RETRYABLE: "FAILED_RETRYABLE",
  FAILED_TERMINAL: "FAILED_TERMINAL",
  AGGREGATING: "AGGREGATING",
  QA_PENDING: "QA_PENDING",
  QA_FAILED: "QA_FAILED",
  CERTIFIED: "CERTIFIED",
  COMPLETED: "COMPLETED"
});

const CHUNK_STATUS = Object.freeze({
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  WAITING_FOR_PROVIDER_CAPACITY: "WAITING_FOR_PROVIDER_CAPACITY",
  RETRY_SCHEDULED: "RETRY_SCHEDULED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  FAILED_TERMINAL: "FAILED_TERMINAL",
  CANCELLED: "CANCELLED"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function stableJobId(input) {
  return [
    normalizeString(input.titleId),
    normalizeString(input.stageId),
    normalizeString(input.stageCode),
    normalizeString(input.sourceArtifactId),
    normalizeString(input.sourceChecksum),
    normalizeString(input.promptVersion || DEFAULT_PROMPT_VERSION),
    normalizeString(input.provider),
    normalizeString(input.deployment),
    normalizeString(input.model)
  ].map((part) => part || "unknown").join(":");
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildChunkPlan({ stage, sourceArtifact, sourceText, upstreamContext = null, options = {} }) {
  const chunkWordLimit = normalizePositiveInteger(options.chunkWordLimit, DEFAULT_CHUNK_WORD_LIMIT);
  const chunks = splitLineEditingSourceChunks(sourceText, chunkWordLimit);
  const totalWordCount = sourceText.split(/\s+/).filter(Boolean).length;
  return chunks.map((chunkText, index) => {
    const chunkIndex = index + 1;
    const promptBody = buildLineEditingChunkPrompt({
      stage,
      sourceArtifact,
      chunkText,
      chunkIndex,
      chunkCount: chunks.length,
      totalWordCount,
      upstreamContext
    });
    return {
      chunkIndex,
      inputHash: sha256(chunkText),
      promptHash: sha256(promptBody),
      inputRange: {
        chunkIndex,
        chunkCount: chunks.length
      },
      promptBody,
      chunkText,
      estimatedOutputTokens: normalizePositiveInteger(
        options.estimatedOutputTokensPerChunk,
        DEFAULT_ESTIMATED_OUTPUT_TOKENS_PER_CHUNK
      )
    };
  });
}

function sanitizeProviderResult(result = {}) {
  return {
    ok: Boolean(result.ok),
    provider: normalizeString(result.provider),
    routeAlias: normalizeString(result.routeAlias),
    promptVersion: normalizeString(result.promptVersion),
    httpStatus: Number.isFinite(Number(result.httpStatus)) ? Number(result.httpStatus) : null,
    tokenCounts: {
      input: Number(result.tokenCounts?.input || 0),
      output: Number(result.tokenCounts?.output || 0),
      total: Number(result.tokenCounts?.total || 0)
    },
    request: result.request
      ? {
          deployment: normalizeString(result.request.deployment),
          maxOutputTokens: Number(result.request.maxOutputTokens || 0),
          responseContract: normalizeString(result.request.responseContract)
        }
      : null,
    rateLimit: result.rateLimit
      ? {
          retryAfterMs: Number.isFinite(Number(result.rateLimit.retryAfterMs)) ? Number(result.rateLimit.retryAfterMs) : null,
          retryAfterSeconds: Number.isFinite(Number(result.rateLimit.retryAfterSeconds))
            ? Number(result.rateLimit.retryAfterSeconds)
            : null
        }
      : null,
    error: normalizeString(result.error)
  };
}

function createOutputTokenRateGovernor(options = {}) {
  const limit = normalizePositiveInteger(options.outputTokenLimit, DEFAULT_OUTPUT_TOKEN_LIMIT);
  const windowMs = normalizePositiveInteger(options.windowMs, DEFAULT_WINDOW_MS);
  const clock = options.clock || (() => new Date());
  const usage = [];

  function prune(referenceMs) {
    while (usage.length && usage[0].atMs <= referenceMs - windowMs) usage.shift();
  }

  function used(referenceMs = clock().getTime()) {
    prune(referenceMs);
    return usage.reduce((sum, item) => sum + item.tokens, 0);
  }

  function canDispatch(estimatedOutputTokens, referenceMs = clock().getTime()) {
    const requested = normalizePositiveInteger(estimatedOutputTokens, 1);
    const currentUsed = used(referenceMs);
    return {
      allowed: currentUsed + requested <= limit,
      limit,
      used: currentUsed,
      remaining: Math.max(0, limit - currentUsed),
      windowMs
    };
  }

  function reserve(estimatedOutputTokens, referenceMs = clock().getTime()) {
    const decision = canDispatch(estimatedOutputTokens, referenceMs);
    if (!decision.allowed) return decision;
    usage.push({ atMs: referenceMs, tokens: normalizePositiveInteger(estimatedOutputTokens, 1) });
    return { ...decision, used: decision.used + normalizePositiveInteger(estimatedOutputTokens, 1), reserved: true };
  }

  function recordActual(estimatedOutputTokens, actualOutputTokens, referenceMs = clock().getTime()) {
    prune(referenceMs);
    const estimated = normalizePositiveInteger(estimatedOutputTokens, 0);
    const actual = normalizePositiveInteger(actualOutputTokens, estimated);
    if (usage.length && estimated > 0) {
      const last = usage[usage.length - 1];
      last.tokens = actual;
    } else if (actual > 0) {
      usage.push({ atMs: referenceMs, tokens: actual });
    }
    return { limit, used: used(referenceMs), remaining: Math.max(0, limit - used(referenceMs)), windowMs };
  }

  function snapshot(referenceMs = clock().getTime()) {
    return { limit, used: used(referenceMs), remaining: Math.max(0, limit - used(referenceMs)), windowMs };
  }

  return { canDispatch, reserve, recordActual, snapshot };
}

function createMemoryEditorialJobStore(seed = {}) {
  const jobs = new Map(Object.entries(seed.jobs || {}));
  const chunks = new Map(Object.entries(seed.chunks || {}).map(([jobId, items]) => [jobId, items.map((item) => ({ ...item }))]));
  const events = Array.isArray(seed.events) ? [...seed.events] : [];

  return {
    async getJob(jobId) {
      return jobs.has(jobId) ? { ...jobs.get(jobId) } : null;
    },
    async upsertJob(job) {
      jobs.set(job.executionJobId, { ...job });
      return { ...job };
    },
    async listChunks(jobId) {
      return (chunks.get(jobId) || []).map((item) => ({ ...item }));
    },
    async upsertChunk(jobId, chunk) {
      const existing = chunks.get(jobId) || [];
      const index = existing.findIndex((item) => item.chunkIndex === chunk.chunkIndex);
      if (index >= 0) existing[index] = { ...existing[index], ...chunk };
      else existing.push({ ...chunk });
      existing.sort((a, b) => a.chunkIndex - b.chunkIndex);
      chunks.set(jobId, existing);
      return { ...chunk };
    },
    async appendEvent(event) {
      events.push({ ...event });
      return { ...event };
    },
    snapshot() {
      return {
        jobs: Object.fromEntries(jobs),
        chunks: Object.fromEntries([...chunks.entries()].map(([jobId, items]) => [jobId, items.map((item) => ({ ...item }))])),
        events: events.map((event) => ({ ...event }))
      };
    }
  };
}

async function createOrResumeLongFormEditorialJob(input, deps = {}) {
  const store = deps.store;
  if (!store) throw new Error("ASYNC_EDITORIAL_JOB_STORE_REQUIRED");
  const clock = deps.clock || (() => new Date());
  const executionJobId = input.executionJobId || stableJobId(input);
  const existing = await store.getJob(executionJobId);
  if (existing) return { job: existing, resumed: true };

  const sourceText = normalizeString(input.sourceText);
  const sourceChecksum = normalizeString(input.sourceChecksum) || sha256(sourceText);
  if (sourceChecksum !== sha256(sourceText)) {
    throw Object.assign(new Error("SOURCE_CHECKSUM_MISMATCH"), { safeCode: "SOURCE_CHECKSUM_MISMATCH" });
  }

  const chunkPlan = buildChunkPlan({
    stage: input.stage,
    sourceArtifact: input.sourceArtifact,
    sourceText,
    upstreamContext: input.upstreamContext,
    options: input.options
  });
  const createdAt = nowIso(clock);
  const job = {
    executionJobId,
    titleId: normalizeString(input.titleId || input.stage?._jm1pub_titleid_value),
    stageId: normalizeString(input.stageId || input.stage?.jm1pub_editorialstageid),
    stageCode: normalizeString(input.stageCode || "LINE_EDITING"),
    sourceArtifactId: normalizeString(input.sourceArtifactId || input.sourceArtifact?.jm1pub_editorialartifactid),
    sourceChecksum,
    manualCanonVersion: normalizeString(input.manualCanonVersion || DEFAULT_MANUAL_CANON_VERSION),
    promptVersion: normalizeString(input.promptVersion || DEFAULT_PROMPT_VERSION),
    provider: normalizeString(input.provider || "microsoft-foundry-claude"),
    deployment: normalizeString(input.deployment || input.route?.deploymentName || "jm1-editorial-devline-primary"),
    model: normalizeString(input.model || input.route?.model || "claude-sonnet-5"),
    chunkPlanVersion: normalizeString(input.chunkPlanVersion || DEFAULT_CHUNK_PLAN_VERSION),
    totalChunks: chunkPlan.length,
    completedChunks: 0,
    jobStatus: JOB_STATUS.QUEUED,
    createdAt,
    updatedAt: createdAt,
    nextRetryAt: null,
    retryCount: 0,
    lastError: null,
    aggregationStatus: "NOT_STARTED",
    qaStatus: "NOT_STARTED",
    artifactCertificationStatus: "NOT_STARTED",
    authorReviewGateStatus: "NOT_CREATED",
    nextStageAuthorized: false,
    sourceTextHash: sha256(sourceText)
  };
  await store.upsertJob(job);
  for (const chunk of chunkPlan) {
    await store.upsertChunk(executionJobId, {
      chunkIndex: chunk.chunkIndex,
      inputHash: chunk.inputHash,
      promptHash: chunk.promptHash,
      inputRange: chunk.inputRange,
      provider: job.provider,
      model: job.model,
      deployment: job.deployment,
      promptVersion: job.promptVersion,
      requestStartedAt: null,
      responseReceivedAt: null,
      outputHash: null,
      status: CHUNK_STATUS.PENDING,
      retryCount: 0,
      lastError: null,
      completedOn: null,
      estimatedOutputTokens: chunk.estimatedOutputTokens,
      promptBody: chunk.promptBody
    });
  }
  await store.appendEvent({
    eventType: "ASYNC_LONG_FORM_EDITORIAL_JOB_CREATED",
    executionJobId,
    createdAt,
    totalChunks: chunkPlan.length,
    sourceArtifactId: job.sourceArtifactId,
    sourceChecksum: job.sourceChecksum
  });
  return { job, resumed: false };
}

function validateLineChunkOutput(result = {}) {
  if (!result.ok || result.fellBack) return { ok: false, error: result.error || "LINE_CHUNK_PROVIDER_FAILED" };
  const output = result.output || {};
  if (!normalizeString(output.editedManuscript)) return { ok: false, error: "LINE_CHUNK_EDITED_MANUSCRIPT_MISSING" };
  return { ok: true, output };
}

async function processNextReadyChunk(job, chunks, deps) {
  const store = deps.store;
  const provider = deps.provider;
  const governor = deps.rateGovernor || createOutputTokenRateGovernor();
  const clock = deps.clock || (() => new Date());
  const now = clock();
  const next = chunks
    .filter((chunk) => ![CHUNK_STATUS.COMPLETED, CHUNK_STATUS.FAILED_TERMINAL, CHUNK_STATUS.CANCELLED].includes(chunk.status))
    .filter((chunk) => !chunk.nextRetryAt || Date.parse(chunk.nextRetryAt) <= now.getTime())
    .sort((a, b) => a.chunkIndex - b.chunkIndex)[0];

  if (!next) return { action: "NO_READY_CHUNK" };
  const rateDecision = governor.reserve(next.estimatedOutputTokens || DEFAULT_ESTIMATED_OUTPUT_TOKENS_PER_CHUNK, now.getTime());
  if (!rateDecision.allowed) {
    const updatedJob = {
      ...job,
      jobStatus: JOB_STATUS.WAITING_FOR_PROVIDER_CAPACITY,
      updatedAt: nowIso(clock),
      lastError: "OUTPUT_TOKEN_RATE_GOVERNOR_WAIT",
      rateWindow: governor.snapshot(now.getTime())
    };
    await store.upsertJob(updatedJob);
    return { action: "RATE_LIMIT_WAIT", job: updatedJob, rateDecision };
  }

  const requestStartedAt = nowIso(clock);
  await store.upsertChunk(job.executionJobId, {
    ...next,
    status: CHUNK_STATUS.RUNNING,
    requestStartedAt
  });

  const result = await provider({
    job,
    chunk: next,
    promptBody: next.promptBody,
    diagnosticId: `${job.titleId || job.stageId}:line-chunk-${next.chunkIndex}`
  });
  const responseReceivedAt = nowIso(clock);
  const safeResult = sanitizeProviderResult(result);
  governor.recordActual(next.estimatedOutputTokens, safeResult.tokenCounts.output, clock().getTime());

  const validation = validateLineChunkOutput(result);
  if (validation.ok) {
    const outputText = validation.output.editedManuscript;
    await store.upsertChunk(job.executionJobId, {
      ...next,
      status: CHUNK_STATUS.COMPLETED,
      requestStartedAt,
      responseReceivedAt,
      outputHash: sha256(outputText),
      output: {
        editedManuscript: outputText,
        lineEditingSummary: normalizeString(validation.output.lineEditingSummary) || "Line editing completed.",
        changeLedger: Array.isArray(validation.output.changeLedger) ? validation.output.changeLedger : [],
        retentionNotes: normalizeString(validation.output.retentionNotes) || "Source content retained.",
        authorQueries: Array.isArray(validation.output.authorQueries) ? validation.output.authorQueries : []
      },
      providerResult: safeResult,
      completedOn: responseReceivedAt,
      lastError: null
    });
    return { action: "CHUNK_COMPLETED", chunkIndex: next.chunkIndex };
  }

  if (isTransientCapacityFailure(result)) {
    const retry = classifyModelFailureForWorkflow(result, {
      attemptCount: next.retryCount || 0,
      now: clock(),
      env: deps.env || process.env
    });
    const status = retry.retryable ? CHUNK_STATUS.RETRY_SCHEDULED : CHUNK_STATUS.WAITING_FOR_PROVIDER_CAPACITY;
    await store.upsertChunk(job.executionJobId, {
      ...next,
      status,
      requestStartedAt,
      responseReceivedAt,
      retryCount: retry.retryCount || next.retryCount || 0,
      nextRetryAt: retry.nextAttemptAt || null,
      lastError: retry.code || validation.error,
      providerResult: safeResult
    });
    const updatedJob = {
      ...job,
      jobStatus: retry.retryable ? JOB_STATUS.RETRY_SCHEDULED : JOB_STATUS.FAILED_RETRYABLE,
      updatedAt: responseReceivedAt,
      retryCount: retry.retryCount || job.retryCount || 0,
      nextRetryAt: retry.nextAttemptAt || null,
      lastError: retry.code || validation.error,
      waitingOwner: "System",
      rateWindow: governor.snapshot(clock().getTime())
    };
    await store.upsertJob(updatedJob);
    return { action: "PROVIDER_CAPACITY_WAIT", retry, chunkIndex: next.chunkIndex, job: updatedJob };
  }

  await store.upsertChunk(job.executionJobId, {
    ...next,
    status: CHUNK_STATUS.FAILED_TERMINAL,
    requestStartedAt,
    responseReceivedAt,
    retryCount: next.retryCount || 0,
    lastError: validation.error,
    providerResult: safeResult
  });
  const updatedJob = {
    ...job,
    jobStatus: JOB_STATUS.FAILED_TERMINAL,
    updatedAt: responseReceivedAt,
    lastError: validation.error,
    waitingOwner: "Jackie"
  };
  await store.upsertJob(updatedJob);
  return { action: "TERMINAL_FAILURE", job: updatedJob, chunkIndex: next.chunkIndex };
}

async function aggregateAndCertify(job, chunks, deps) {
  const store = deps.store;
  const clock = deps.clock || (() => new Date());
  const completed = chunks.filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED);
  if (completed.length !== job.totalChunks) return { action: "AGGREGATION_BLOCKED_INCOMPLETE" };
  const ordered = completed.sort((a, b) => a.chunkIndex - b.chunkIndex);
  const editedManuscript = ordered.map((chunk) => chunk.output.editedManuscript).join("\n\n");
  const aggregate = {
    editedManuscript,
    lineEditingSummary: ordered.map((chunk) => `Chunk ${chunk.chunkIndex}: ${chunk.output.lineEditingSummary}`).join("\n"),
    retentionNotes: ordered.map((chunk) => `Chunk ${chunk.chunkIndex}: ${chunk.output.retentionNotes}`).join("\n"),
    changeLedger: ordered.flatMap((chunk) =>
      chunk.output.changeLedger.length
        ? chunk.output.changeLedger.map((entry) => `Chunk ${chunk.chunkIndex}: ${entry}`)
        : [`Chunk ${chunk.chunkIndex}: No recurring line-editing pattern separately reported.`]
    ),
    authorQueries: ordered.flatMap((chunk) => chunk.output.authorQueries.map((entry) => `Chunk ${chunk.chunkIndex}: ${entry}`))
  };
  const qaResult = typeof deps.qa === "function" ? await deps.qa({ job, aggregate, chunks: ordered }) : { ok: true };
  const updatedAt = nowIso(clock);
  if (!qaResult.ok) {
    const failedJob = {
      ...job,
      jobStatus: JOB_STATUS.QA_FAILED,
      completedChunks: completed.length,
      updatedAt,
      aggregationStatus: "COMPLETED",
      qaStatus: "FAILED",
      artifactCertificationStatus: "NOT_STARTED",
      authorReviewGateStatus: "NOT_CREATED",
      lastError: normalizeString(qaResult.error) || "LINE_AGGREGATE_QA_FAILED",
      nextStageAuthorized: false
    };
    await store.upsertJob(failedJob);
    return { action: "QA_FAILED", job: failedJob };
  }
  const artifact = typeof deps.persistArtifact === "function"
    ? await deps.persistArtifact({ job, aggregate, chunks: ordered })
    : { artifactId: null, checksum: sha256(editedManuscript) };
  const certifiedJob = {
    ...job,
    jobStatus: JOB_STATUS.COMPLETED,
    completedChunks: completed.length,
    updatedAt,
    aggregationStatus: "COMPLETED",
    qaStatus: "PASSED",
    artifactCertificationStatus: "CERTIFIED",
    certifiedArtifactId: artifact.artifactId || null,
    certifiedArtifactChecksum: artifact.checksum || sha256(editedManuscript),
    authorReviewGateStatus: "READY_TO_CREATE",
    nextStageAuthorized: false,
    lastError: null
  };
  await store.upsertJob(certifiedJob);
  await store.appendEvent({
    eventType: "ASYNC_LONG_FORM_EDITORIAL_JOB_CERTIFIED",
    executionJobId: job.executionJobId,
    createdAt: updatedAt,
    certifiedArtifactId: certifiedJob.certifiedArtifactId,
    certifiedArtifactChecksum: certifiedJob.certifiedArtifactChecksum
  });
  return { action: "CERTIFIED", job: certifiedJob, aggregate };
}

async function runLongFormEditorialJob(executionJobId, deps = {}) {
  const store = deps.store;
  if (!store) throw new Error("ASYNC_EDITORIAL_JOB_STORE_REQUIRED");
  if (typeof deps.provider !== "function") throw new Error("ASYNC_EDITORIAL_PROVIDER_REQUIRED");
  const clock = deps.clock || (() => new Date());
  const maxChunksPerRun = normalizePositiveInteger(deps.maxChunksPerRun, 1);
  let job = await store.getJob(executionJobId);
  if (!job) throw Object.assign(new Error("ASYNC_EDITORIAL_JOB_NOT_FOUND"), { safeCode: "ASYNC_EDITORIAL_JOB_NOT_FOUND" });
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED, JOB_STATUS.PAUSED].includes(job.jobStatus)) {
    return { ok: true, action: "NO_OP", job };
  }
  if (deps.sourceText && sha256(deps.sourceText) !== job.sourceChecksum) {
    job = {
      ...job,
      jobStatus: JOB_STATUS.FAILED_TERMINAL,
      updatedAt: nowIso(clock),
      lastError: "SOURCE_CHECKSUM_MISMATCH",
      waitingOwner: "Jackie"
    };
    await store.upsertJob(job);
    return { ok: false, action: "SOURCE_CHECKSUM_MISMATCH", job };
  }

  job = { ...job, jobStatus: JOB_STATUS.RUNNING, updatedAt: nowIso(clock) };
  await store.upsertJob(job);
  let processed = 0;
  while (processed < maxChunksPerRun) {
    const chunks = await store.listChunks(executionJobId);
    const completedChunks = chunks.filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED).length;
    job = { ...(await store.getJob(executionJobId)), completedChunks };
    await store.upsertJob(job);
    if (completedChunks === job.totalChunks) {
      const result = await aggregateAndCertify(job, chunks, deps);
      return { ok: result.action === "CERTIFIED", ...result };
    }
    const result = await processNextReadyChunk(job, chunks, deps);
    if (["RATE_LIMIT_WAIT", "PROVIDER_CAPACITY_WAIT", "TERMINAL_FAILURE", "NO_READY_CHUNK"].includes(result.action)) {
      return { ok: !["TERMINAL_FAILURE"].includes(result.action), ...result };
    }
    processed += 1;
  }
  const chunks = await store.listChunks(executionJobId);
  const updatedJob = {
    ...(await store.getJob(executionJobId)),
    completedChunks: chunks.filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED).length,
    updatedAt: nowIso(clock)
  };
  await store.upsertJob(updatedJob);
  return { ok: true, action: "RUN_LIMIT_REACHED", job: updatedJob };
}

async function cancelLongFormEditorialJob(executionJobId, deps = {}) {
  const store = deps.store;
  if (!store) throw new Error("ASYNC_EDITORIAL_JOB_STORE_REQUIRED");
  const clock = deps.clock || (() => new Date());
  const job = await store.getJob(executionJobId);
  if (!job) throw Object.assign(new Error("ASYNC_EDITORIAL_JOB_NOT_FOUND"), { safeCode: "ASYNC_EDITORIAL_JOB_NOT_FOUND" });
  const cancelled = { ...job, jobStatus: JOB_STATUS.CANCELLED, updatedAt: nowIso(clock), waitingOwner: "Jackie" };
  await store.upsertJob(cancelled);
  const chunks = await store.listChunks(executionJobId);
  for (const chunk of chunks.filter((item) => item.status !== CHUNK_STATUS.COMPLETED)) {
    await store.upsertChunk(executionJobId, { ...chunk, status: CHUNK_STATUS.CANCELLED });
  }
  return cancelled;
}

async function buildLongFormEditorialJobView(executionJobId, deps = {}) {
  const store = deps.store;
  if (!store) throw new Error("ASYNC_EDITORIAL_JOB_STORE_REQUIRED");
  const job = await store.getJob(executionJobId);
  if (!job) return null;
  const chunks = await store.listChunks(executionJobId);
  return {
    executionJobId: job.executionJobId,
    titleId: job.titleId,
    stageId: job.stageId,
    stageCode: job.stageCode,
    jobStatus: job.jobStatus,
    provider: job.provider,
    deployment: job.deployment,
    model: job.model,
    promptVersion: job.promptVersion,
    chunkPlanVersion: job.chunkPlanVersion,
    completedChunks: chunks.filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED).length,
    totalChunks: job.totalChunks,
    nextRetryAt: job.nextRetryAt || null,
    lastCheckpoint: chunks
      .filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED)
      .map((chunk) => chunk.completedOn)
      .filter(Boolean)
      .sort()
      .pop() || null,
    waitingOwner: job.waitingOwner || (job.jobStatus.includes("WAITING") || job.jobStatus.includes("RETRY") ? "System" : null),
    lastError: job.lastError || null,
    rateWindow: job.rateWindow || null,
    authorReviewGateStatus: job.authorReviewGateStatus,
    nextStageAuthorized: Boolean(job.nextStageAuthorized),
    chunks: chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      status: chunk.status,
      retryCount: chunk.retryCount || 0,
      nextRetryAt: chunk.nextRetryAt || null,
      completedOn: chunk.completedOn || null,
      lastError: chunk.lastError || null,
      inputHash: chunk.inputHash,
      outputHash: chunk.outputHash || null
    }))
  };
}

module.exports = {
  CHUNK_STATUS,
  DEFAULT_CHUNK_PLAN_VERSION,
  DEFAULT_ESTIMATED_OUTPUT_TOKENS_PER_CHUNK,
  DEFAULT_OUTPUT_TOKEN_LIMIT,
  DEFAULT_PROMPT_VERSION,
  DEFAULT_WINDOW_MS,
  JOB_STATUS,
  buildChunkPlan,
  buildLongFormEditorialJobView,
  cancelLongFormEditorialJob,
  createMemoryEditorialJobStore,
  createOrResumeLongFormEditorialJob,
  createOutputTokenRateGovernor,
  runLongFormEditorialJob,
  sha256,
  stableJobId
};
