"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CHUNK_STATUS,
  JOB_STATUS,
  buildLongFormEditorialJobView,
  cancelLongFormEditorialJob,
  createMemoryEditorialJobStore,
  createOrResumeLongFormEditorialJob,
  createOutputTokenRateGovernor,
  runLongFormEditorialJob,
  sha256
} = require("../src/editorial/asyncLongFormEditorialWorker");

function makeClock(start = "2026-08-20T12:00:00.000Z") {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advanceMs: (ms) => {
      current += ms;
    }
  };
}

function sourceParagraphs(count) {
  return Array.from({ length: count }, (_, index) =>
    `Paragraph ${index + 1} contains enough source text for a governed long form line editing chunk.`
  ).join("\n\n");
}

function baseInput(overrides = {}) {
  const sourceText = overrides.sourceText || sourceParagraphs(overrides.paragraphs || 10);
  return {
    titleId: "title-general-will",
    stageId: "stage-line",
    stageCode: "LINE_EDITING",
    sourceArtifactId: "artifact-developmental-approved",
    sourceChecksum: sha256(sourceText),
    sourceText,
    stage: {
      jm1pub_name: "Line Editing",
      jm1pub_editorialstageid: "stage-line",
      _jm1pub_titleid_value: "title-general-will"
    },
    sourceArtifact: {
      jm1pub_editorialartifactid: "artifact-developmental-approved",
      jm1pub_sha256: sha256(sourceText)
    },
    options: {
      chunkWordLimit: 15,
      estimatedOutputTokensPerChunk: overrides.estimatedOutputTokensPerChunk || 100
    },
    ...overrides
  };
}

async function createJob(overrides = {}, deps = {}) {
  const store = deps.store || createMemoryEditorialJobStore();
  const input = baseInput(overrides);
  const result = await createOrResumeLongFormEditorialJob(input, { store, clock: deps.clock });
  return { store, input, job: result.job, resumed: result.resumed };
}

function successProvider(calls = []) {
  return async ({ chunk }) => {
    calls.push(chunk.chunkIndex);
    return {
      ok: true,
      provider: "microsoft-foundry-claude",
      routeAlias: "jm1-editorial-devline-primary",
      promptVersion: "CC010-LINE_EDITING-CHUNK-V1",
      output: {
        editedManuscript: `edited chunk ${chunk.chunkIndex}`,
        lineEditingSummary: `summary ${chunk.chunkIndex}`,
        changeLedger: [`change ${chunk.chunkIndex}`],
        retentionNotes: `retained ${chunk.chunkIndex}`,
        authorQueries: []
      },
      tokenCounts: { input: 100, output: 75, total: 175 },
      httpStatus: 200,
      request: { deployment: "jm1-editorial-devline-primary", maxOutputTokens: 8192, responseContract: "anthropic-messages-tool" }
    };
  };
}

describe("asyncLongFormEditorialWorker", () => {
  test("10-chunk job completes and certifies only after final QA/artifact persistence", async () => {
    const clock = makeClock();
    const calls = [];
    const persisted = [];
    const { store, job, input } = await createJob({ paragraphs: 10 }, { clock: clock.now });
    let result;
    for (let index = 0; index < 11; index += 1) {
      result = await runLongFormEditorialJob(job.executionJobId, {
        store,
        provider: successProvider(calls),
        clock: clock.now,
        sourceText: input.sourceText,
        maxChunksPerRun: 1,
        persistArtifact: async ({ aggregate }) => {
          persisted.push(aggregate.editedManuscript);
          return { artifactId: "line-artifact-1", checksum: sha256(aggregate.editedManuscript) };
        }
      });
      clock.advanceMs(1000);
    }
    const finalJob = await store.getJob(job.executionJobId);
    assert.equal(result.action, "CERTIFIED");
    assert.equal(finalJob.jobStatus, JOB_STATUS.COMPLETED);
    assert.equal(finalJob.qaStatus, "PASSED");
    assert.equal(finalJob.artifactCertificationStatus, "CERTIFIED");
    assert.equal(finalJob.authorReviewGateStatus, "READY_TO_CREATE");
    assert.equal(finalJob.nextStageAuthorized, false);
    assert.equal(persisted.length, 1);
    assert.deepEqual(calls, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("chunk 4 429 waits and resumes without rerunning chunks 1 through 3", async () => {
    const clock = makeClock();
    const calls = [];
    const { store, job, input } = await createJob({ paragraphs: 6 }, { clock: clock.now });
    const provider = async ({ chunk }) => {
      calls.push(chunk.chunkIndex);
      if (chunk.chunkIndex === 4 && calls.filter((item) => item === 4).length === 1) {
        return {
          ok: false,
          provider: "microsoft-foundry-claude",
          httpStatus: 429,
          error: "MICROSOFT_FOUNDRY_HTTP_429_RATE_LIMIT_OF_5000_PER_60S_EXCEEDED_FOR_USERBYMODELBYMINUTEOUTPUTTOKENS",
          rateLimit: { retryAfterMs: 60000 }
        };
      }
      return successProvider()({ chunk });
    };
    for (let index = 0; index < 3; index += 1) {
      await runLongFormEditorialJob(job.executionJobId, { store, provider, clock: clock.now, sourceText: input.sourceText, maxChunksPerRun: 1 });
    }
    const waitResult = await runLongFormEditorialJob(job.executionJobId, {
      store,
      provider,
      clock: clock.now,
      sourceText: input.sourceText,
      maxChunksPerRun: 1,
      env: { JM1_STAGE0_MODEL_CAPACITY_MAX_RETRIES: "5" }
    });
    assert.equal(waitResult.action, "PROVIDER_CAPACITY_WAIT");
    assert.equal(waitResult.job.jobStatus, JOB_STATUS.RETRY_SCHEDULED);
    clock.advanceMs(60000);
    for (let index = 0; index < 4; index += 1) {
      await runLongFormEditorialJob(job.executionJobId, { store, provider, clock: clock.now, sourceText: input.sourceText, maxChunksPerRun: 1 });
    }
    assert.deepEqual(calls, [1, 2, 3, 4, 4, 5, 6]);
    const chunks = await store.listChunks(job.executionJobId);
    assert.equal(chunks.filter((chunk) => chunk.status === CHUNK_STATUS.COMPLETED).length, 6);
  });

  test("restart after six completed chunks resumes at chunk seven", async () => {
    const clock = makeClock();
    const calls = [];
    const first = await createJob({ paragraphs: 10 }, { clock: clock.now });
    for (let index = 0; index < 6; index += 1) {
      await runLongFormEditorialJob(first.job.executionJobId, {
        store: first.store,
        provider: successProvider(calls),
        clock: clock.now,
        sourceText: first.input.sourceText,
        maxChunksPerRun: 1
      });
    }
    const snapshot = first.store.snapshot();
    const restartedStore = createMemoryEditorialJobStore(snapshot);
    await runLongFormEditorialJob(first.job.executionJobId, {
      store: restartedStore,
      provider: successProvider(calls),
      clock: clock.now,
      sourceText: first.input.sourceText,
      maxChunksPerRun: 1
    });
    assert.equal(calls.at(-1), 7);
  });

  test("same job replay is idempotent and does not duplicate chunk plan", async () => {
    const store = createMemoryEditorialJobStore();
    const first = await createJob({ paragraphs: 3 }, { store });
    const second = await createOrResumeLongFormEditorialJob(first.input, { store });
    const chunks = await store.listChunks(first.job.executionJobId);
    assert.equal(second.resumed, true);
    assert.equal(chunks.length, 3);
  });

  test("completed job replay is a no-op and does not call provider", async () => {
    const { store, job, input } = await createJob({ paragraphs: 1 });
    await runLongFormEditorialJob(job.executionJobId, {
      store,
      provider: successProvider(),
      sourceText: input.sourceText,
      maxChunksPerRun: 2
    });
    let called = false;
    const result = await runLongFormEditorialJob(job.executionJobId, {
      store,
      provider: async () => {
        called = true;
      },
      sourceText: input.sourceText
    });
    assert.equal(result.action, "NO_OP");
    assert.equal(called, false);
  });

  test("out-of-order completed chunks aggregate in chunk index order", async () => {
    const { store, job } = await createJob({ paragraphs: 3 });
    const chunks = await store.listChunks(job.executionJobId);
    for (const chunk of [chunks[2], chunks[0], chunks[1]]) {
      await store.upsertChunk(job.executionJobId, {
        ...chunk,
        status: CHUNK_STATUS.COMPLETED,
        outputHash: sha256(`edited chunk ${chunk.chunkIndex}`),
        output: {
          editedManuscript: `edited chunk ${chunk.chunkIndex}`,
          lineEditingSummary: "summary",
          changeLedger: [],
          retentionNotes: "retained",
          authorQueries: []
        },
        completedOn: "2026-08-20T12:00:00.000Z"
      });
    }
    let aggregateText = "";
    await runLongFormEditorialJob(job.executionJobId, {
      store,
      provider: successProvider(),
      maxChunksPerRun: 1,
      persistArtifact: async ({ aggregate }) => {
        aggregateText = aggregate.editedManuscript;
        return { artifactId: "artifact", checksum: sha256(aggregate.editedManuscript) };
      }
    });
    assert.equal(aggregateText, "edited chunk 1\n\nedited chunk 2\n\nedited chunk 3");
  });

  test("terminal invalid output fails closed without author artifact or gate", async () => {
    const { store, job, input } = await createJob({ paragraphs: 1 });
    const result = await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: input.sourceText,
      provider: async () => ({ ok: true, output: { lineEditingSummary: "missing manuscript" } })
    });
    assert.equal(result.action, "TERMINAL_FAILURE");
    const finalJob = await store.getJob(job.executionJobId);
    assert.equal(finalJob.jobStatus, JOB_STATUS.FAILED_TERMINAL);
    assert.equal(finalJob.authorReviewGateStatus, "NOT_CREATED");
    assert.equal(finalJob.nextStageAuthorized, false);
  });

  test("QA failure blocks certification and author review gate", async () => {
    const { store, job, input } = await createJob({ paragraphs: 1 });
    const result = await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: input.sourceText,
      provider: successProvider(),
      maxChunksPerRun: 2,
      qa: async () => ({ ok: false, error: "LINE_RETENTION_QA_FAILED" })
    });
    assert.equal(result.action, "QA_FAILED");
    assert.equal(result.job.artifactCertificationStatus, "NOT_STARTED");
    assert.equal(result.job.authorReviewGateStatus, "NOT_CREATED");
  });

  test("cancellation stops unresolved chunks while preserving completed chunks", async () => {
    const { store, job, input } = await createJob({ paragraphs: 3 });
    await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: input.sourceText,
      provider: successProvider(),
      maxChunksPerRun: 1
    });
    const cancelled = await cancelLongFormEditorialJob(job.executionJobId, { store });
    const chunks = await store.listChunks(job.executionJobId);
    assert.equal(cancelled.jobStatus, JOB_STATUS.CANCELLED);
    assert.equal(chunks[0].status, CHUNK_STATUS.COMPLETED);
    assert.equal(chunks[1].status, CHUNK_STATUS.CANCELLED);
    assert.equal(chunks[2].status, CHUNK_STATUS.CANCELLED);
  });

  test("prompt/model/source provenance is pinned on every chunk", async () => {
    const { store, job } = await createJob({ paragraphs: 2, model: "claude-sonnet-5", deployment: "jm1-editorial-devline-primary" });
    const chunks = await store.listChunks(job.executionJobId);
    assert.equal(job.provider, "microsoft-foundry-claude");
    assert.equal(job.deployment, "jm1-editorial-devline-primary");
    assert.equal(job.model, "claude-sonnet-5");
    assert.equal(chunks.every((chunk) => chunk.promptVersion === "CC010-LINE_EDITING-CHUNK-V1"), true);
    assert.equal(chunks.every((chunk) => Boolean(chunk.inputHash && chunk.promptHash)), true);
  });

  test("source checksum mismatch invalidates execution", async () => {
    const { store, job } = await createJob({ paragraphs: 1 });
    const result = await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: "changed source",
      provider: successProvider()
    });
    assert.equal(result.action, "SOURCE_CHECKSUM_MISMATCH");
    assert.equal(result.job.jobStatus, JOB_STATUS.FAILED_TERMINAL);
  });

  test("provider fallback is rejected even when output exists", async () => {
    const { store, job, input } = await createJob({ paragraphs: 1 });
    const result = await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: input.sourceText,
      provider: async () => ({
        ok: true,
        fellBack: true,
        output: {
          editedManuscript: "fallback edited",
          lineEditingSummary: "summary",
          changeLedger: [],
          retentionNotes: "retained",
          authorQueries: []
        }
      })
    });
    assert.equal(result.action, "TERMINAL_FAILURE");
  });

  test("rate governor enforces 5000 output tokens per 60 seconds by default and rolls over", () => {
    const clock = makeClock();
    const governor = createOutputTokenRateGovernor({ clock: clock.now });
    assert.equal(governor.reserve(4500).allowed, true);
    assert.equal(governor.reserve(600).allowed, false);
    clock.advanceMs(60001);
    assert.equal(governor.reserve(600).allowed, true);
  });

  test("rate governor supports configurable future limits and near-window decisions", () => {
    const governor = createOutputTokenRateGovernor({ outputTokenLimit: 10000, windowMs: 60000 });
    assert.equal(governor.reserve(5000).allowed, true);
    assert.equal(governor.reserve(4999).allowed, true);
    assert.equal(governor.reserve(2).allowed, false);
  });

  test("observability view survives restart without manuscript text leakage", async () => {
    const clock = makeClock();
    const { store, job, input } = await createJob({ paragraphs: 2 }, { clock: clock.now });
    await runLongFormEditorialJob(job.executionJobId, {
      store,
      sourceText: input.sourceText,
      provider: successProvider(),
      clock: clock.now,
      maxChunksPerRun: 1
    });
    const view = await buildLongFormEditorialJobView(job.executionJobId, { store: createMemoryEditorialJobStore(store.snapshot()) });
    assert.equal(view.completedChunks, 1);
    assert.equal(view.chunks[0].status, CHUNK_STATUS.COMPLETED);
    assert.equal(JSON.stringify(view).includes("edited chunk"), false);
    assert.equal(Boolean(view.lastCheckpoint), true);
  });
});
