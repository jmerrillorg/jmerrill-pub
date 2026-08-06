# Post-Remediation Search Results

Date: 2026-08-06

Command:
rg -n -i "complimentary|author copies|included copies" docs/governance app lib azure-functions docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md --glob "!**/*.docx" --glob "!**/*.pdf"

docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md:438:Complimentary author-copy benefits are governed by `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`. Do not restate different copy quantities in an addendum, welcome guide, website page, or author-facing package material.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:13:This standard establishes the governed complimentary author-copy policy for J Merrill Publishing package benefits.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:15:Approved package benefits must be discoverable from repository documentation. This document is the single governed source of truth for complimentary author-copy quantities and delivery timing.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:19:This policy applies to complimentary author copies included with J Merrill Publishing package-based publishing offers, including Starter, Professional, Premier Publishing Package, and JM Signature traditional publishing track references.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:23:## Canonical Complimentary Copy Policy
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:42:Hardcover complimentary copies apply only when the package includes a hardcover benefit or when the hardcover edition has otherwise been approved and published.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:44:Starter includes no complimentary hardcover copies.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:46:Professional includes two complimentary hardcover copies.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:48:Premier Publishing Package includes five complimentary hardcover copies.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:50:JM Signature traditional publishing track includes five complimentary hardcover copies when the traditional publishing agreement grants the author-copy benefit.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:54:Each package includes one complimentary eBook copy delivered when the digital edition is published.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:60:Replacement copies are not automatically included in the complimentary-copy benefit.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:68:| 1.0 | 2026-08-06 | Established canonical complimentary author-copy policy after governance remediation. |
lib/tokens.ts:138:  complimentaryCopies: pkg.complimentaryCopies,
lib/commercial/catalog.ts:93:    complimentaryCopies: { paperback: 5, hardcover: 0, ebook: 1 },
lib/commercial/catalog.ts:103:    complimentaryCopies: { paperback: 10, hardcover: 2, ebook: 1 },
lib/commercial/catalog.ts:113:    complimentaryCopies: { paperback: 15, hardcover: 5, ebook: 1 },
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:7: * complimentary copies, selected payment option, and applicable terms
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:55: *     complimentaryCopies: { paperback: number, hardcover: number, ebook: number },
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:91:        new Paragraph({ children: [new TextRun({ text: "Complimentary Copies", bold: true })] }),
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:96:            copiesRow("Paperback", content.complimentaryCopies.paperback, copyCols[0]),
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:97:            copiesRow("Hardcover", content.complimentaryCopies.hardcover, copyCols[1]),
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:98:            copiesRow("eBook (digital delivery)", content.complimentaryCopies.ebook, copyCols[0])
azure-functions/diagnostic-ai-runner/src/agreement/governedAgreementPipelineRunner.js:68:    "[Complimentary-Copy Configuration (if different from the governed package policy)]": input.complimentaryCopyConfiguration,
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:248: * and the three Complimentary Copies quantity blanks (scoped to start
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:249: * searching only after the "COMPLIMENTARY COPIES" section heading, so
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:292:  // Complimentary copies — scoped to start only after the section heading.
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:293:  const complimentaryAnchor = current.indexOf("COMPLIMENTARY COPIES");
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:294:  if (complimentaryAnchor === -1) {
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:295:    unmatchedFields.push("complimentaryPaperback", "complimentaryHardcover", "complimentaryEbook");
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:298:      { label: "Paperback", value: String(fields.complimentaryCopies.paperback), name: "complimentaryPaperback" },
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:299:      { label: "Hardcover", value: String(fields.complimentaryCopies.hardcover), name: "complimentaryHardcover" },
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:300:      { label: "eBook", value: String(fields.complimentaryCopies.ebook), name: "complimentaryEbook" }
azure-functions/diagnostic-ai-runner/src/agreement/agreementPreparationRunner.js:302:    let copyCursor = complimentaryAnchor;
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:19:const { getComplimentaryCopies } = require("./authorCopyPolicy");
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:34:    complimentaryCopies: getComplimentaryCopies("JMP-PKG-STARTER"),
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:53:    complimentaryCopies: getComplimentaryCopies("JMP-PKG-PRO"),
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:72:    complimentaryCopies: getComplimentaryCopies("JMP-PKG-PREMIER"),
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:89: *   complimentaryCopies: object|null, audiobookIncluded: boolean|null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:103:      complimentaryCopies: null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:115:    complimentaryCopies: content.complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:3:const { getComplimentaryCopies } = require("./authorCopyPolicy");
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:12: *       (fee, complimentary copies, audiobook inclusion), or
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:74: *   complimentaryCopies: { paperback: number, hardcover: number, ebook: number },
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:101:  const complimentaryCopies = packageInfo ? getComplimentaryCopies(selectedPackageCode) : null;
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:107:  if (packageInfo && !complimentaryCopies) {
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:108:    errors.push("COMPLIMENTARY_COPIES_NOT_DEFINED_FOR_PACKAGE");
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:119:      packageLabel: null, packageFeeUsd: null, packageFeeFormatted: null, complimentaryCopies: null,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:148:    complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedAgreementPacketRunner.js:158:      complimentaryCopies: fields.complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:11:function getComplimentaryCopies(packageCode) {
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:18:  getComplimentaryCopies
azure-functions/diagnostic-ai-runner/test/simplifiedAgreementPacketRunner.test.js:62:    assert.deepEqual(result.fields.complimentaryCopies, { paperback: 15, hardcover: 5, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/simplifiedAgreementPacketRunner.test.js:98:    assert.deepEqual(result.fields.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/simplifiedAgreementPacketRunner.test.js:117:    assert.deepEqual(result.fields.complimentaryCopies, { paperback: 5, hardcover: 0, ebook: 1 });
lib/server/publishing-commercial-catalog-slice2-service.ts:677:    'Book Formats and Author Copies',
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:5:const { AUTHOR_COPY_POLICY, getComplimentaryCopies } = require("../src/agreement/authorCopyPolicy");
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:8:  test("returns the governed Starter complimentary-copy policy", () => {
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:9:    assert.deepEqual(getComplimentaryCopies("JMP-PKG-STARTER"), { paperback: 5, hardcover: 0, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:12:  test("returns the governed Professional complimentary-copy policy", () => {
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:13:    assert.deepEqual(getComplimentaryCopies("JMP-PKG-PRO"), { paperback: 10, hardcover: 2, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:16:  test("returns the governed Premier complimentary-copy policy", () => {
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:17:    assert.deepEqual(getComplimentaryCopies("JMP-PKG-PREMIER"), { paperback: 15, hardcover: 5, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:20:  test("returns the governed JM Signature traditional-track complimentary-copy policy", () => {
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:21:    assert.deepEqual(getComplimentaryCopies("JMP-PKG-SIGNATURE"), { paperback: 15, hardcover: 5, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js:34:    assert.deepEqual(r.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js:78:    assert.deepEqual(r.complimentaryCopies, { paperback: 15, hardcover: 5, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js:82:  test("Starter Package uses the governed complimentary-copy policy and no audiobook inclusion", () => {
azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js:85:    assert.deepEqual(r.complimentaryCopies, { paperback: 5, hardcover: 0, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js:102:  test("rejects an unrecognized package code rather than guessing fee/complimentary copies", () => {
lib/publishing/onboarding-production-options.ts:80:  { key: 'included_complimentary_only', label: 'Included complimentary copies only' },
app/packages/page.tsx:20:    pkg.complimentaryCopies,
app/packages/page.tsx:66:  { feature: 'AUTHOR COPIES', starter: '', pro: '', premier: '', head: true },
app/packages/page.tsx:68:    feature: 'Complimentary paperbacks',
app/packages/page.tsx:74:    feature: 'Complimentary hardcovers',
app/packages/page.tsx:80:    feature: 'Complimentary eBooks',
azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js:8:  test("returns the Professional package label, services, complimentary copies, and audiobook inclusion", () => {
azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js:13:    assert.deepEqual(result.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js:37:  test("returns Starter content with the governed complimentary-copy policy", () => {
azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js:41:    assert.deepEqual(result.complimentaryCopies, { paperback: 5, hardcover: 0, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js:50:    assert.deepEqual(result.complimentaryCopies, { paperback: 15, hardcover: 5, ebook: 1 });
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:145:  test("fills bracket placeholders, labeled blanks, and complimentary copies scoped after the section heading", () => {
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:153:      "<w:t>COMPLIMENTARY COPIES</w:t>",
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:169:    assert.equal(fieldsByName.complimentaryPaperback, "10");
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:170:    assert.equal(fieldsByName.complimentaryHardcover, "2");
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:171:    assert.equal(fieldsByName.complimentaryEbook, "1");
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:176:    const r = fillPackageAddendum("<w:t>COMPLIMENTARY COPIES</w:t>", fields);
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:180:  test("never touches an unrelated earlier occurrence of 'Paperback'/'Hardcover' outside the complimentary-copies section", () => {
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:184:      "<w:t>COMPLIMENTARY COPIES</w:t>",
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:240:      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>[Date]</w:t><w:t>COMPLIMENTARY COPIES</w:t>",
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:259:      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:275:      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",
azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js:300:      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",

Conflict check:
rg -n "hardcover: 4|hardcover\\": 4|15, hardcover: 4|default of 10" app lib azure-functions docs/governance docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md --glob "!**/*.docx" --glob "!**/*.pdf"
