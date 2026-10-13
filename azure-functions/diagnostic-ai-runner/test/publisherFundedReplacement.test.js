"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const Zip = require("jszip");
const generator = require("../src/agreement/publisherFundedReplacement");
const { text } = require("../src/agreement/agreementCompleteness");
const { AGREEMENT_TEMPLATE } = require("../src/agreement/governedAgreementTemplateRegistry");
const { CONTACT, TITLES } = require("../src/lifecycle/jackieInternalTitlePolicy");
const { BASE } = require("../src/lifecycle/publisherFundedOffer");
const baseBytes = fs.readFileSync(path.resolve(__dirname, "../../..", AGREEMENT_TEMPLATE.HYBRID.governedPath));
const contact = { contactid: CONTACT, "@odata.etag": "W/fixture", fullname: "Jackie Smith Jr",
  address1_line1: "1 Fixture Street", address1_city: "Columbus", address1_stateorprovince: "OH", address1_postalcode: "00000" };
const date = { value: "2026-10-13", reference: "JMP-AGREEMENT-EFFECTIVE-DATE-20261013-v1", inferred: false };
function input(titleId) {
  const offer = { titleId, authorContactId: CONTACT, version: "1.0.0", offerSha256: "a".repeat(64), baseAgreement: BASE,
    components: TITLES[titleId].map(sourceSha256 => ({ sourceSha256, assessmentSha256: "b".repeat(64), assessment: { webUrl: "https://example.invalid/fixture" } })),
    fundedTerms: { clause: "Author publishing fees are $0. Publisher absorbs ordinary documented production costs following voluntary withdrawal." } };
  return [{ title: "Fixture Work", offer, baseBytes }, contact, date,
    { titleId, agreementVersion: "1.0.0", agreementSha256: "c".repeat(64), offerSha256: offer.offerSha256 },
    { decision: "ACCEPT", offerSha256: offer.offerSha256, sourceReference: "fixture:actual-election" }];
}
test("all five replacements preserve base terms and exact source components", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-13T12:00:00Z") });
  for (const titleId of Object.keys(TITLES)) {
    const args = input(titleId), result = await generator.prepare(...args);
    const zip = await Zip.loadAsync(result.bytes), original = await Zip.loadAsync(baseBytes);
    for (const name of Object.keys(original.files).filter(n => !original.files[n].dir && n !== "word/document.xml")) {
      assert.deepEqual(await zip.file(name).async("nodebuffer"), await original.file(name).async("nodebuffer"));
    }
    const body = text(await zip.file("word/document.xml").async("string"));
    assert.match(body, /complete replacement agreement supersedes/);
    assert.match(body, /2026-10-13/);
    assert.doesNotMatch(body, /\[Address\]|\[Effective Date\]|\[City, State ZIP\]/);
    for (const source of TITLES[titleId]) assert.ok(body.includes(source));
    assert.equal(result.manifest.stage05Complete, false);
    assert.equal(result.manifest.paymentCreated, false);
    assert.equal(result.manifest.administrationRecipient, "publishing@jmerrill.one");
    t.mock.timers.tick(60000);
    assert.equal((await generator.prepare(...args)).bytes.equals(result.bytes), true, "restart must preserve exact bytes across clock changes");
  }
});
test("missing address, wrong election, source or previous agreement blocks generation", async () => {
  const titleId = Object.keys(TITLES)[0];
  for (const change of [a => { a[1] = { ...contact, address1_line1: "" }; },
    a => { a[4].decision = "HOLD"; }, a => { a[0].offer.components[0].sourceSha256 = "d".repeat(64); },
    a => { a[3].titleId = "other"; }, a => { a[0].baseBytes = Buffer.from("not the approved base"); }]) {
    const args = input(titleId); change(args);
    await assert.rejects(generator.prepare(...args));
  }
});
test("replacement endpoint rejects extra fields and unauthorized titles before dependencies", async () => {
  const { handler } = require("../src/lifecycle/publisherFundedStage05");
  for (const body of [{ titleId: "other", mode: "SUBMISSION_05_PREPARE_REPLACEMENT" },
    { titleId: Object.keys(TITLES)[0], mode: "SUBMISSION_05_PREPARE_REPLACEMENT", authorAddress: "untrusted" }]) {
    assert.equal((await handler(body)).status, 400);
  }
});
test("Stage 05 is independently disabled and requires all broad workers off", async () => {
  const { handler, enabled } = require("../src/lifecycle/publisherFundedStage05");
  const titleId = Object.keys(TITLES)[0];
  const env = { JM1_NEW_SUBMISSION_STAGE05_ENABLED: "true", JM1_NEW_SUBMISSION_STAGE05_TITLE_IDS: titleId,
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" };
  assert.equal(enabled(env, titleId), true);
  assert.equal(enabled(env, "constructor"), false);
  for (const key of Object.keys(env)) {
    const changed = { ...env }; delete changed[key];
    assert.equal(enabled(changed, titleId), false);
  }
  assert.equal((await handler({ titleId, mode: "SUBMISSION_05_SEND_ADMIN" }, { env: {} })).status, 403);
});
