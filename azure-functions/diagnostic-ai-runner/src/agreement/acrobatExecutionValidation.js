"use strict";
const { PDFDocument, PDFDict, PDFName, PDFArray, PDFHexString } = require("pdf-lib");
const { X509Certificate, createHash } = require("node:crypto");
const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const run = require("node:util").promisify(require("node:child_process").execFile);
const ROOT = "458e0e219698b18d2d4093d6336a12547953a54c05dd967c3a5a268b772d1b22";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const normalize = value => value.normalize("NFKC").replace(/\s|\u00ad/g, "");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function requiredParties(audit) {
  const events = Array.from(audit.matchAll(/Document e-signed by\s+(.+?)\s*\(([^)]+)\)\s*Signature Date:/g));
  const author = events.filter(e => e[2].trim().toLowerCase() === "jackie@jmerrill.one" && /^Jackie Smith,? Jr\.?$/.test(e[1].trim()));
  const publisher = events.filter(e => e[2].trim().toLowerCase() === "publishing@jmerrill.one" && /^Jackie Smith(?:,? Jr\.?)?$/.test(e[1].trim()));
  if (events.length !== 2 || author.length !== 1 || publisher.length !== 1) deny("STAGE05_REQUIRED_PARTIES_UNPROVEN");
  return { author: "jackie@jmerrill.one", publisher: "publishing@jmerrill.one" };
}
function withoutIssuedFurniture(pages, furniture) {
  return pages.map(page => {
    let value = normalize(page);
    for (const text of furniture) value = value.replace(normalize(text), "");
    return value;
  }).join("");
}

async function verifySeal(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 25 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== "%PDF-") deny("STAGE05_PDF_INVALID");
  // Acrobat seals may use permissions encryption with an empty read password.
  // Inspect the signature dictionary without rewriting or decrypting signed bytes;
  // PDF.js must independently read every page without a supplied password.
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  const candidates = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict) || object.get(PDFName.of("Type"))?.toString() !== "/Sig") continue;
    const range = object.lookup(PDFName.of("ByteRange"), PDFArray)?.asArray().map(n => n.asNumber());
    const contents = object.lookup(PDFName.of("Contents"), PDFHexString);
    if (!range || range.length !== 4 || range.some(n => !Number.isSafeInteger(n) || n < 0) || range[0] !== 0 ||
        range[1] >= range[2] || range[2] + range[3] !== bytes.length || !contents) continue;
    const gap = bytes.subarray(range[1], range[2]).toString("ascii");
    if (!/^<[0-9a-fA-F\s]+>$/.test(gap) || !Buffer.from(gap.slice(1, -1).replace(/\s/g, ""), "hex").equals(Buffer.from(contents.asBytes()))) continue;
    candidates.push({ signature: Buffer.from(contents.asBytes()), content: Buffer.concat([bytes.subarray(0, range[1]), bytes.subarray(range[2])]) });
  }
  if (candidates.length !== 1) deny("STAGE05_FULL_DOCUMENT_SEAL_REQUIRED");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "jmp-seal-"));
  try {
    await fs.writeFile(path.join(dir, "signature.der"), candidates[0].signature, { mode: 0o600 });
    await fs.writeFile(path.join(dir, "content.bin"), candidates[0].content, { mode: 0o600 });
    const options = { cwd: dir, timeout: 15000, maxBuffer: 1024 * 1024 };
    const certs = (await run("openssl", ["pkcs7", "-inform", "DER", "-in", "signature.der", "-print_certs"], options)).stdout
      .match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)?.map(pem => new X509Certificate(pem)) || [];
    const root = certs.find(c => c.fingerprint256.replaceAll(":", "").toLowerCase() === ROOT);
    if (!root) deny("STAGE05_ADOBE_ROOT_UNPROVEN");
    await fs.writeFile(path.join(dir, "root.pem"), root.toString(), { mode: 0o600 });
    await run("openssl", ["cms", "-verify", "-binary", "-inform", "DER", "-in", "signature.der", "-content", "content.bin",
      "-CAfile", "root.pem", "-purpose", "any", "-signer", "signer.pem", "-out", os.devNull], options);
    const signer = new X509Certificate(await fs.readFile(path.join(dir, "signer.pem")));
    if (!/(?:^|\n)CN=Adobe Acrobat Sign(?:\n|$)/.test(signer.subject) ||
        !signer.subject.includes("acrobat-sign-certified@adobe.com")) deny("STAGE05_ADOBE_SIGNER_UNPROVEN");
    return { sha256: sha(bytes), fullDocumentIntegrity: true, chainVerifiedAt: new Date().toISOString(),
      signerCertificateSha256: signer.fingerprint256.replaceAll(":", "").toLowerCase(), rootSha256: ROOT,
      rootAuthority: "https://helpx.adobe.com/ae_en/acrobat/kb/trust-services.html", revocation: "NOT_CHECKED" };
  } catch (error) {
    if (error.safeCode) throw error;
    deny("STAGE05_SEAL_VALIDATION_FAILED");
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

async function readPdf(bytes) {
  const library = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = library.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 });
  const timer = setTimeout(() => { void task.destroy(); }, 30000);
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > 64) deny("STAGE05_PAGE_COUNT_INVALID");
    const pages = [], annotations = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const text = await page.getTextContent();
      pages.push(text.items.filter(x => typeof x.str === "string").map(x => x.str).join(" "));
      annotations.push(await page.getAnnotations());
    }
    return { pages, annotations };
  } finally { clearTimeout(timer); await task.destroy(); }
}
async function readText(bytes) { return (await readPdf(bytes)).pages; }

async function validateExecution({ signedBytes, auditBytes, issuedBytes, prepared }) {
  if (sha(issuedBytes) !== prepared.agreementSha256 || prepared.agreementVersion !== "2.0.0") deny("STAGE05_ISSUED_VERSION_CONFLICT");
  const seal = await verifySeal(signedBytes), { pages, annotations } = await readPdf(signedBytes);
  const zip = await require("jszip").loadAsync(issuedBytes, { checkCRC32: true });
  const xml = await zip.file("word/document.xml").async("string");
  const doc = new (require("@xmldom/xmldom").DOMParser)().parseFromString(xml, "application/xml");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, "p")).map(p =>
    Array.from(p.getElementsByTagNameNS(ns, "t")).map(t => t.textContent).join(""));
  const furniture = [];
  for (const name of Object.keys(zip.files).filter(name => /^word\/(?:header|footer)[0-9]+\.xml$/.test(name))) {
    const part = new (require("@xmldom/xmldom").DOMParser)().parseFromString(await zip.file(name).async("string"), "application/xml");
    const text = Array.from(part.getElementsByTagNameNS(ns, "t")).map(t => t.textContent).join("");
    if (text.trim()) furniture.push(text);
  }
  const full = normalize(pages.join("\n"));
  // Signature blanks may be overlaid, but no commercial or source clause may disappear.
  const required = paragraphs.filter(p => p.trim() && !/^\s*(?:Author|Publisher) signature:/.test(p));
  if (required.some(p => !full.includes(normalize(p))) || !full.includes(prepared.offerSha256)) deny("STAGE05_EXECUTED_TERMS_MISMATCH");
  if (!auditBytes) deny("STAGE05_AUDIT_CUSTODY_REQUIRED");
  const auditSeal = signedBytes.equals(auditBytes) ? seal : await verifySeal(auditBytes);
  const auditText = signedBytes.equals(auditBytes) ? pages.join("\n") : (await readText(auditBytes)).join("\n");
  const embeddedAudit = pages.findLast(p => /Final Audit Report/.test(p));
  const audit = embeddedAudit || auditText;
  // Remove only exact issued header/footer text, once per page, before body
  // subtraction so repeated publisher/address text cannot be partially consumed.
  let residual = withoutIssuedFurniture(pages.filter(p => p !== embeddedAudit), furniture);
  for (const paragraph of [...paragraphs].sort((a, b) => b.length - a.length)) {
    residual = residual.replace(normalize(paragraph), "");
  }
  residual = residual.replace(/JackieSmith,?Jr\.?/g, "")
    .replace(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|GMT|UTC|EDT|EST|AM|PM)/g, "")
    .replace(/[0-9_.,:;()\[\]\/\-+]/g, "");
  if (residual) deny("STAGE05_UNISSUED_TEXT_REQUIRES_REVIEW");
  if (!audit || !/Status:\s*Signed/.test(audit) || !/Agreement completed\./.test(audit)) deny("STAGE05_COMPLETION_AUDIT_REQUIRED");
  const transaction = /Transaction ID:\s*([A-Za-z0-9_-]+)/.exec(audit)?.[1];
  if (!transaction) deny("STAGE05_REQUIRED_PARTIES_UNPROVEN");
  const parties = requiredParties(audit);
  const signaturePages = [0, embeddedAudit ? pages.findIndex(p => p === embeddedAudit) - 1 : pages.length - 1];
  if (signaturePages[1] < 1 || !pages[signaturePages[1]].includes("IN WITNESS WHEREOF")) deny("STAGE05_SIGNATURE_PLACEMENT_UNPROVEN");
  const signatureLocations = signaturePages.map(index => annotations[index].filter(a => {
    try {
      const url = new URL(a.url);
      return a.subtype === "Link" && url.protocol === "https:" && /^na[0-9]+\.documents\.adobe\.com$/.test(url.hostname) &&
        url.pathname === "/verifier" && url.searchParams.get("tx") === transaction &&
        Array.isArray(a.rect) && a.rect[2] > a.rect[0] && a.rect[3] > a.rect[1];
    } catch { return false; }
  }));
  if (signatureLocations.some(items => items.length !== 2)) deny("STAGE05_SIGNATURE_PLACEMENT_UNPROVEN");
  if (!normalize(auditText).includes(normalize(audit))) deny("STAGE05_AUDIT_TRANSACTION_CONFLICT");
  return { agreementSha256: prepared.agreementSha256, executedSha256: sha(signedBytes), auditSha256: sha(auditBytes),
    transactionId: transaction, issuedParagraphsVerified: required.length, requiredPartyEvents: 2, parties,
    seal, auditSeal, signatureFieldPlacement: "FOUR_ADOBE_TRANSACTION_LINKED_SIGNATURE_APPEARANCES",
    signaturePages: signaturePages.map(n => n + 1) };
}
module.exports = { verifySeal, readText, validateExecution, normalize, requiredParties, withoutIssuedFurniture };
