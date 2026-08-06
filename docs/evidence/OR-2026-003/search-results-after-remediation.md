# OR-2026-003 Amendment 1 Search Results After Remediation

Date: 2026-08-06

## Discoverability Search

lib/tokens.ts:138:  complimentaryEntitlements: pkg.complimentaryEntitlements,
lib/commercial/catalog.ts:93:    complimentaryEntitlements: {
lib/commercial/catalog.ts:107:    complimentaryEntitlements: {
lib/commercial/catalog.ts:121:    complimentaryEntitlements: {
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:8:  computeComplimentaryEntitlements,
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:9:  getComplimentaryAllocation
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:18:    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-01", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:24:    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-01", "PF-05"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:30:    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-05", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:36:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-02", "PF-04"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:42:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:48:    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", ["PF-01", "PF-02", "PF-03", "PF-04"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:59:    const result = computeComplimentaryEntitlements("JMP-PKG-SIGNATURE", ["PF-01", "PF-05", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:65:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-07"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:72:    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", [{ productFormCode: "PF-08", scopeApproved: true }]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:78:    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", ["PF-08"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:85:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:91:    const held = computeComplimentaryEntitlements("JMP-PKG-STARTER", [{ productFormCode: "PF-05", addedLater: true }]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:95:    const approved = computeComplimentaryEntitlements("JMP-PKG-STARTER", [{ productFormCode: "PF-05", addedLater: true, addOnApproved: true }]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:101:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-01", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:107:    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", []);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:113:    const first = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:114:    const second = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js:122:    assert.deepEqual(getComplimentaryAllocation("JMP-PKG-PREMIER"), getComplimentaryAllocation("JMP-PKG-SIGNATURE"));
docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md:438:Complimentary author-copy and author-delivery benefits are governed by `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`. Do not restate different copy quantities in an addendum, welcome guide, website page, or author-facing package material.
docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md:440:The package determines the number of complimentary print copies. The author's approved and elected Product Forms determine which print editions receive those copies.
docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md:444:Each elected digital Product Form receives one complimentary digital entitlement. An elected audiobook receives one author delivery or redemption entitlement after publication. If an additional Product Form is approved later, its complimentary entitlement applies only after that add-on or election is approved and the Product Form is published or delivered.
app/packages/page.tsx:20:    pkg.complimentaryEntitlements,
app/packages/page.tsx:70:  { feature: 'AUTHOR COPIES', starter: '', pro: '', premier: '', head: true },
app/packages/page.tsx:72:    feature: 'Complimentary print copies',
app/packages/page.tsx:78:    feature: 'Complimentary digital delivery',
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:13:This standard establishes the governed complimentary author-copy and author-delivery entitlement policy for J Merrill Publishing package benefits.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:15:Approved package benefits must be discoverable from repository documentation. This document is the single governed source of truth for complimentary author-copy quantities, delivery timing, and the Product Form election rule.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:19:This policy applies to complimentary author copies and author-delivery entitlements included with J Merrill Publishing package-based publishing offers, including Starter, Professional, Premier Publishing Package, and JM Signature traditional publishing track references.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:21:This policy does not replace separately purchased author-copy orders, bulk author-copy order support, shipping charges, royalty terms, publication rights, Product Form eligibility, edition-slot counts, package prices, or separately approved package amendments.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:27:Complimentary author entitlements follow the title's approved and elected Product Forms.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:33:Only elected Product Forms receive entitlements. Unelected, retired, cancelled, inactive, or unapproved Product Forms receive no complimentary copies or delivery entitlement.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:50:Use the existing Product Form authority. Do not create sub-forms, narration sub-forms, PF-05C, or competing Product Form definitions for author-copy purposes.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:56:| PF-03 Standard Digital EPUB | DIGITAL | Receives one complimentary digital entitlement when elected and published. |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:57:| PF-04 Audiobook | AUDIO | Receives one complimentary author delivery or redemption entitlement after publication. |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:59:| PF-06 Complex-Content Accessibility Edition | DIGITAL | Receives one complimentary digital entitlement when delivered digitally. A separately approved physical edition must follow its approved delivery class. |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:60:| PF-07 Vertical Graphic Edition | INACTIVE / NO ENTITLEMENT | Must not generate complimentary-copy entitlements. |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:61:| PF-08 Interactive / Multimedia | DIGITAL | Receives one complimentary digital entitlement only when elected, contracted, completed, delivered, and scope-approved. |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:63:Future approved Product Forms must be classified as PRINT, DIGITAL, AUDIO, or INACTIVE before complimentary entitlements are generated.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:80:- 1 complimentary digital entitlement
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:88:- 1 complimentary author delivery or redemption entitlement after publication
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:94:| Package / Track | Elected Product Forms | Complimentary Entitlements |
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:101:No unelected format receives complimentary copies.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:105:Print copies are delivered after the elected print Product Form is published and available for author-copy fulfillment.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:113:Replacement copies are not automatically included in the complimentary-copy benefit.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:115:Damaged, lost, misdelivered, or replacement copies must be reviewed case by case and may require a separately approved author-copy order or support action.
docs/governance/publishing/PUB-STD-Author-Copy-Policy.md:121:| 1.0 | 2026-08-06 | Established canonical complimentary author-copy policy after governance remediation. |
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:3:// Governed source: docs/governance/publishing/PUB-STD-Author-Copy-Policy.md
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:43:function getComplimentaryAllocation(packageCode) {
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:107:function computeComplimentaryEntitlements(packageCode, electedProductForms, options = {}) {
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:109:  const allocation = getComplimentaryAllocation(code);
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:117:    return { ok: false, errors, packageCode: code, allocation: allocation || null, entitlements: [], complimentaryCopies: null };
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:140:    return { ok: false, errors, packageCode: code, allocation, entitlements, complimentaryCopies: null };
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:149:    complimentaryCopies: buildLegacySummary(entitlements)
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:156:  computeComplimentaryEntitlements,
azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js:157:  getComplimentaryAllocation
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedAgreementPacketRunner.js:162:      complimentaryCopies: fields.complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedAgreementPacketRunner.js:163:      complimentaryEntitlements: fields.complimentaryEntitlements,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:19:const { computeComplimentaryEntitlements } = require("./authorCopyPolicy");
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:87: *   complimentaryCopies: object|null, complimentaryEntitlements: object[]|null, audiobookIncluded: boolean|null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:101:      complimentaryCopies: null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:102:      complimentaryEntitlements: null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:109:  const entitlementResult = computeComplimentaryEntitlements(code, options.electedProductForms, {
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:115:      error: "COMPLIMENTARY_ENTITLEMENT_COMPUTATION_FAILED",
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:119:      complimentaryCopies: null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:120:      complimentaryEntitlements: null,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:132:    complimentaryCopies: entitlementResult.complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js:133:    complimentaryEntitlements: entitlementResult.entitlements,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:3:const { computeComplimentaryEntitlements } = require("./authorCopyPolicy");
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:76: *   complimentaryCopies: object,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:77: *   complimentaryEntitlements: { productFormCode: string, productFormName: string, deliveryClass: string, quantity: number, unit: string, label: string }[],
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:109:  const complimentaryEntitlementResult = packageInfo
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:110:    ? computeComplimentaryEntitlements(selectedPackageCode, electedProductForms, {
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:119:  if (packageInfo && !complimentaryEntitlementResult?.ok) {
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:120:    for (const error of complimentaryEntitlementResult?.errors || ["COMPLIMENTARY_ENTITLEMENTS_NOT_DEFINED_FOR_PACKAGE"]) {
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:133:      packageLabel: null, packageFeeUsd: null, packageFeeFormatted: null, complimentaryCopies: null,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:134:      complimentaryEntitlements: null,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:163:    complimentaryCopies: complimentaryEntitlementResult.complimentaryCopies,
azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js:164:    complimentaryEntitlements: complimentaryEntitlementResult.entitlements,
azure-functions/diagnostic-ai-runner/src/agreement/governedAgreementPipelineRunner.js:68:    "[Complimentary-Copy Configuration (if different from the governed package policy)]": input.complimentaryCopyConfiguration,
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:7: * complimentary author entitlements, selected payment option, and applicable terms
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:55: *     complimentaryEntitlements: { productFormName: string, quantity: number, unit: string }[],
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:65:  const entitlementRows = content.complimentaryEntitlements.map((entitlement) => entitlementRow(entitlement, copyCols[0]));
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:92:        new Paragraph({ children: [new TextRun({ text: "Complimentary Author Entitlements", bold: true })] }),
azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js:93:        new Paragraph({ children: [new TextRun("Complimentary author copies and delivery entitlements are determined by the Product Forms elected for the title. Each elected print Product Form receives the package's approved print-copy allocation. Each elected digital Product Form receives one complimentary digital entitlement. An elected audiobook receives one complimentary author delivery entitlement upon publication.")] }),
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

## Fixed-Format Active-Language Guard

## Post-PR-433 Human Operating Layer Search Addendum

Search rerun after PR #433 rebase confirmed the successor-facing hub finds the elected Product Form rule and PUB-STD v1.1 references:

- `docs/operations/publishing-successor-operations-hub/03-Standard-Operating-Procedures.md`: includes the plain-English rule that package determines print-copy quantity and elected Product Forms determine receiving editions.
- `docs/operations/publishing-successor-operations-hub/04-Forms-and-Templates.md`: lists Complimentary-Copy Policy as PUB-STD v1.1 and includes elected Product Form entitlements.
- `docs/operations/publishing-successor-operations-hub/Current-Authority-Index.md`: lists Author Copy Policy as PUB-STD v1.1 and marks the Human Operating Layer current.
- `docs/operations/publishing-successor-operations-hub/09-Reference-Library.md`: references complimentary author-copy quantities, elected Product Form entitlements, and timing.
- `docs/operations/publishing-successor-operations-hub/Role-Playbooks.md`: references author-copy obligation review by elected Product Form.
