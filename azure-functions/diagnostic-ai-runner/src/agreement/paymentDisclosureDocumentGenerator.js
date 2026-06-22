"use strict";

/**
 * Generates the Stripe-aligned Payment Disclosure document — a concise
 * disclosure, not a manual payment instrument like the prior Schedule A
 * attachment. Contains only the already-computed payment facts from
 * paymentDisclosureBuilder.js — no invented terms, no manual blanks for
 * a Publisher to fill in by hand.
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const { buildPaymentDisclosureContent } = require("./paymentDisclosureBuilder");

const PAGE_WIDTH_LETTER = 12240;
const PAGE_HEIGHT_LETTER = 15840;
const MARGIN = 1440;

/**
 * @param {{
 *   title: string, authorLegalName: string, contractDate: string,
 *   paymentSchedule: { installments: number, perInstallmentUsd: number, totalUsd: number }
 * }} fields
 * @returns {Promise<Buffer>}
 */
async function generatePaymentDisclosureDocument(fields) {
  const disclosure = buildPaymentDisclosureContent(fields.paymentSchedule);

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } }
      ]
    },
    sections: [{
      properties: { page: { size: { width: PAGE_WIDTH_LETTER, height: PAGE_HEIGHT_LETTER }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("J MERRILL PUBLISHING, INC.")] }),
        new Paragraph({ children: [new TextRun({ text: disclosure.title.toUpperCase(), bold: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Work: ", bold: true }), new TextRun(fields.title)] }),
        new Paragraph({ children: [new TextRun({ text: "Author: ", bold: true }), new TextRun(fields.authorLegalName)] }),
        new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(fields.contractDate)] }),
        new Paragraph({ text: "" }),
        ...disclosure.lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: disclosure.acknowledgementText, italics: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun("Author acknowledgement: _____ (initial)")] })
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generatePaymentDisclosureDocument };
