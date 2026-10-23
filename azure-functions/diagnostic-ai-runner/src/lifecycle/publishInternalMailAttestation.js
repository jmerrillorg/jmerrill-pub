"use strict";

const { createHash } = require("node:crypto");
const { PATH, validate } = require("./internalMailAttestation");

const HISTORY_CONTAINER = "jm1-publishing-internal-mail-history";
const HISTORY_PREFIX = "attestations";

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function retryable(error) {
  return error?.statusCode === 408 || error?.statusCode === 429 || error?.statusCode >= 500;
}

async function retry(operation, attempts, sleep) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !retryable(error)) throw error;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 5000));
    }
  }
}

async function readBlob(blob) {
  const properties = await blob.getProperties();
  const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } });
  return { properties, bytes, value: JSON.parse(bytes.toString("utf8")) };
}

async function publishActive(blob, bytes, expectedDigest, candidateAt, baseline, {
  now, attempts, sleep
}) {
  let current = baseline;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const conditions = current ? { ifMatch: current.properties.etag } : { ifNoneMatch: "*" };
      await retry(() => blob.uploadData(bytes, { conditions }), attempts, sleep);
      const active = await retry(() => readBlob(blob), attempts, sleep);
      if (digest(active.bytes) !== expectedDigest || validate(active.value, now).version !== validate(JSON.parse(bytes.toString("utf8")), now).version)
        throw Error("ATTESTATION_ACTIVE_READBACK_CONFLICT");
      return { reused: false, active };
    } catch (error) {
      if (error.statusCode !== 412) throw error;
      current = await retry(() => readBlob(blob), attempts, sleep);
      validate(current.value, Date.parse(current.value.checkedAt));
      const currentAt = Date.parse(current.value.checkedAt);
      if (digest(current.bytes) === expectedDigest) return { reused: true, active: current };
      if (!Number.isFinite(currentAt) || currentAt >= candidateAt) throw Error("ATTESTATION_ACTIVE_NEWER_OR_EQUAL");
    }
  }
  throw Error("ATTESTATION_ACTIVE_CONFLICT");
}

async function publishInternalMailAttestation(record, {
  historyContainer,
  activeContainer,
  now = Date.now(),
  attempts = 3,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
}) {
  if (!historyContainer || !activeContainer) throw Error("ATTESTATION_STORAGE_REQUIRED");
  const policy = validate(record, now);
  const bytes = Buffer.from(JSON.stringify(record));
  const expectedDigest = digest(bytes);
  const checkedDate = new Date(record.checkedAt).toISOString().slice(0, 10);
  const historyName = `${HISTORY_PREFIX}/${checkedDate}/${expectedDigest}.json`;
  const historyBlob = historyContainer.getBlockBlobClient(historyName);
  const activeBlob = activeContainer.getBlockBlobClient(PATH);

  let baseline = null;
  let activeReplay = false;
  try {
    baseline = await retry(() => readBlob(activeBlob), attempts, sleep);
    validate(baseline.value, Date.parse(baseline.value.checkedAt));
    if (Date.parse(baseline.value.checkedAt) >= Date.parse(record.checkedAt)) {
      if (digest(baseline.bytes) === expectedDigest) activeReplay = true;
      else throw Error("ATTESTATION_ACTIVE_NEWER_OR_EQUAL");
    }
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  await retry(async () => {
    try {
      await historyBlob.uploadData(bytes, { conditions: { ifNoneMatch: "*" } });
    } catch (error) {
      if (error.statusCode !== 412) throw error;
    }
    const archived = await readBlob(historyBlob);
    if (digest(archived.bytes) !== expectedDigest || digest(Buffer.from(JSON.stringify(archived.value))) !== expectedDigest)
      throw Error("ATTESTATION_HISTORY_READBACK_CONFLICT");
    return archived;
  }, attempts, sleep);

  if (activeReplay) return { policy, historyName, activeHash: expectedDigest, reused: true };

  const published = await publishActive(activeBlob, bytes, expectedDigest, Date.parse(record.checkedAt), baseline, { now, attempts, sleep });
  return { policy, historyName, activeHash: expectedDigest, reused: published.reused };
}

module.exports = { HISTORY_CONTAINER, HISTORY_PREFIX, publishInternalMailAttestation };
