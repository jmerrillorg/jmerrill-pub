"use strict";

const ISBN13 = /^97[89]\d{10}$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const LIVE_STATES = new Set(["LIVE"]);
const PENDING_STATES = new Set(["SUBMITTED", "RECEIVED", "PROCESSING", "ACCEPTED", "PENDING", "PROPAGATING"]);
const ORDERABLE_STATES = new Set(["https://schema.org/InStock", "https://schema.org/OnlineOnly", "InStock", "OnlineOnly"]);

function normalizeIsbn(value) {
  return String(value || "").replace(/[-\s]/g, "");
}

function validIsbn13(value) {
  const isbn = normalizeIsbn(value);
  if (!ISBN13.test(isbn)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) sum += Number(isbn[index]) * (index % 2 ? 3 : 1);
  return (10 - sum % 10) % 10 === Number(isbn[12]);
}

function exactIdentity(expected, actual) {
  return expected.titleId === actual?.titleId &&
    expected.editionId === actual?.editionId &&
    normalizeIsbn(expected.isbn13) === normalizeIsbn(actual?.isbn13) &&
    expected.artifactId === actual?.artifactId &&
    expected.provider === actual?.provider &&
    expected.artifactChecksum.toLowerCase() === String(actual?.artifactChecksum || "").toLowerCase();
}

function validateSubmission(submission) {
  if (!submission || typeof submission !== "object") return "SUBMISSION_REQUIRED";
  for (const field of ["titleId", "editionId", "artifactId", "provider", "receiptId", "providerProductId", "artifactChecksum"]) {
    if (typeof submission[field] !== "string" || !submission[field].trim()) return `SUBMISSION_${field.toUpperCase()}_REQUIRED`;
  }
  if (!validIsbn13(submission.isbn13)) return "SUBMISSION_ISBN13_INVALID";
  if (!SHA256.test(submission.artifactChecksum)) return "SUBMISSION_CHECKSUM_INVALID";
  return null;
}

function blocked(reason, evidence = {}) {
  return { status: "BLOCKED", reason, evidence, publicAvailabilityVerified: false };
}

function pending(reason, evidence = {}) {
  return { status: "PENDING", reason, evidence, publicAvailabilityVerified: false };
}

function retryable(error) {
  const status = Number(error?.status || error?.statusCode);
  return status === 429 || (status >= 500 && status <= 599) || error?.code === "ETIMEDOUT";
}

async function readWithRetry(read, { maxAttempts = 3, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new Error("INVALID_MAX_ATTEMPTS");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return { value: await read(), attempts: attempt };
    } catch (error) {
      if (!retryable(error) || attempt === maxAttempts) {
        return { error: retryable(error) ? "TRANSIENT_READ_EXHAUSTED" : "READ_FAILED", attempts: attempt, retryable: retryable(error) };
      }
      await delay(Math.min(1000 * 2 ** (attempt - 1), 4000));
    }
  }
}

function bookNodes(value) {
  if (Array.isArray(value)) return value.flatMap(bookNodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...bookNodes(value["@graph"] || [])];
}

function hasBookType(node) {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  return types.some((type) => type === "Book" || type === "https://schema.org/Book");
}

function publicBookEvidence(html, isbn13) {
  const scripts = [...String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const books = [];
  for (const script of scripts) {
    try {
      books.push(...bookNodes(JSON.parse(script[1])).filter(hasBookType));
    } catch {
      // A malformed block cannot establish public availability.
    }
  }
  const matches = books.filter((book) => normalizeIsbn(book.isbn) === isbn13);
  if (matches.length !== 1) return { ok: false, reason: matches.length ? "AMBIGUOUS_PUBLIC_ISBN" : "PUBLIC_ISBN_NOT_PROVEN" };
  const offers = Array.isArray(matches[0].offers) ? matches[0].offers : [matches[0].offers];
  if (!offers.some((offer) => ORDERABLE_STATES.has(offer?.availability))) {
    return { ok: false, reason: "PUBLIC_OFFER_NOT_AVAILABLE" };
  }
  return { ok: true, reason: "PUBLIC_BOOK_AVAILABLE" };
}

function validatePublicUrl(url, allowedHosts) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password || !Array.isArray(allowedHosts) ||
      !allowedHosts.includes(parsed.hostname.toLowerCase())) {
    return null;
  }
  return parsed;
}

async function fetchPublicBook(url, { allowedHosts, fetchFn = fetch, timeoutMs = 5000 } = {}) {
  const parsed = validatePublicUrl(url, allowedHosts);
  if (!parsed) throw Object.assign(new Error("PUBLIC_HOST_NOT_ALLOWED"), { code: "PUBLIC_HOST_NOT_ALLOWED" });
  const response = await fetchFn(parsed.toString(), {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (response.status === 429 || response.status >= 500) throw Object.assign(new Error("PUBLIC_READ_TRANSIENT"), { status: response.status });
  if (response.status !== 200) return { status: response.status, html: "" };
  if (!String(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
    return { status: 200, html: "", contentTypeMismatch: true };
  }
  if (Number(response.headers.get("content-length") || 0) > 1000000) return { status: 200, html: "", oversized: true };
  const html = await response.text();
  return { status: 200, html: html.length <= 1000000 ? html : "", oversized: html.length > 1000000 };
}

async function verifyStage15Publication(submission, { provider, allowedPublicHosts, fetchFn, maxAttempts = 3, delay } = {}) {
  const invalid = validateSubmission(submission);
  if (invalid) return blocked(invalid);
  if (typeof provider?.readSubmission !== "function" || typeof provider?.readPublication !== "function") {
    return blocked("READ_ONLY_PROVIDER_ADAPTER_REQUIRED");
  }
  const receipt = await readWithRetry(() => provider.readSubmission(submission.receiptId), { maxAttempts, delay });
  if (receipt.error) return receipt.retryable
    ? pending(`PROVIDER_RECEIPT_${receipt.error}`, { attempts: receipt.attempts })
    : blocked(`PROVIDER_RECEIPT_${receipt.error}`, { attempts: receipt.attempts });
  if (!receipt.value || !exactIdentity(submission, receipt.value) || receipt.value.receiptId !== submission.receiptId ||
      receipt.value.providerProductId !== submission.providerProductId) {
    return blocked("PROVIDER_RECEIPT_IDENTITY_MISMATCH", { attempts: receipt.attempts });
  }
  if (![...PENDING_STATES, ...LIVE_STATES].includes(String(receipt.value.status || "").toUpperCase())) {
    return blocked("PROVIDER_RECEIPT_NOT_VALID");
  }
  const product = await readWithRetry(() => provider.readPublication(submission.providerProductId), { maxAttempts, delay });
  if (product.error) return product.retryable
    ? pending(`PROVIDER_PUBLICATION_${product.error}`, { attempts: product.attempts })
    : blocked(`PROVIDER_PUBLICATION_${product.error}`, { attempts: product.attempts });
  if (!product.value || !exactIdentity(submission, product.value) || product.value.providerProductId !== submission.providerProductId ||
      product.value.receiptId !== submission.receiptId) {
    return blocked("PROVIDER_PUBLICATION_IDENTITY_MISMATCH", { attempts: product.attempts });
  }
  const state = String(product.value.status || "").toUpperCase();
  if (PENDING_STATES.has(state)) return pending("PROVIDER_PUBLICATION_PENDING", { providerState: state });
  if (!LIVE_STATES.has(state)) return blocked("PROVIDER_PUBLICATION_NOT_LIVE", { providerState: state });
  if (!product.value.publicUrl || product.value.publicUrl !== receipt.value.publicUrl) {
    return blocked("PUBLIC_URL_RECEIPT_MISMATCH");
  }
  if (!validatePublicUrl(product.value.publicUrl, allowedPublicHosts)) return blocked("PUBLIC_HOST_NOT_ALLOWED");
  const publicPage = await readWithRetry(
    () => fetchPublicBook(product.value.publicUrl, { allowedHosts: allowedPublicHosts, fetchFn }),
    { maxAttempts, delay }
  );
  if (publicPage.error) return publicPage.retryable
    ? pending(`PUBLIC_PAGE_${publicPage.error}`, { attempts: publicPage.attempts })
    : blocked(`PUBLIC_PAGE_${publicPage.error}`, { attempts: publicPage.attempts });
  if (publicPage.value.status === 404) return pending("PUBLIC_PAGE_NOT_PROPAGATED", { attempts: publicPage.attempts });
  if (publicPage.value.status !== 200 || publicPage.value.contentTypeMismatch || publicPage.value.oversized) {
    return blocked("PUBLIC_PAGE_UNVERIFIABLE", { httpStatus: publicPage.value.status });
  }
  const book = publicBookEvidence(publicPage.value.html, normalizeIsbn(submission.isbn13));
  if (!book.ok) return blocked(book.reason, { httpStatus: 200 });
  return {
    status: "LIVE_VERIFIED",
    reason: "PROVIDER_AND_PUBLIC_AVAILABILITY_MATCH",
    publicAvailabilityVerified: true,
    evidence: {
      titleId: submission.titleId,
      editionId: submission.editionId,
      isbn13: normalizeIsbn(submission.isbn13),
      artifactId: submission.artifactId,
      artifactChecksum: submission.artifactChecksum.toLowerCase(),
      provider: submission.provider,
      receiptId: submission.receiptId,
      providerProductId: submission.providerProductId,
      publicUrl: product.value.publicUrl,
      publicVerificationMethod: "PUBLIC_BOOK_JSON_LD_ORDERABLE_OFFER",
      purchaseTransactionVerified: false,
      receiptReadAttempts: receipt.attempts,
      productReadAttempts: product.attempts,
      publicReadAttempts: publicPage.attempts
    }
  };
}

module.exports = { verifyStage15Publication, fetchPublicBook, publicBookEvidence, readWithRetry };
