"use strict";

/**
 * Generates the simplified, package-specific Package Addendum document
 * — a NEW document, not a fill of the canonical multi-package template.
 * Shows only the selected package's fee, included services,
 * complimentary copies, selected payment option, and applicable terms
 * — never the other packages' tables, unselected checkboxes, or
 * unrelated add-on tables.
 *
 * The canonical multi-package Publishing Package Addendum template
 * remains the legal/internal source of the full service catalog — this
 * generator produces the author-facing, package-specific view only.
 */

const {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, BorderStyle, WidthType, Table, TableRow, TableCell, ShadingType
} = require("docx");

const PAGE_WIDTH_LETTER = 12240;
const PAGE_HEIGHT_LETTER = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH_LETTER - MARGIN * 2;

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function bulletParagraph(text) {
  return new Paragraph({
    children: [new TextRun(`• ${text}`)],
    indent: { left: 360 }
  });
}

function copiesRow(label, qty, width) {
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })]
      }),
      new TableCell({
        borders, width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun(String(qty))] })]
      })
    ]
  });
}

/**
 * @param {{
 *   title: string, authorLegalName: string, contractDate: string,
 *   packageAddendumContent: { packageLabel: string, includedServices: string[],
 *     complimentaryCopies: { paperback: number, hardcover: number, ebook: number },
 *     estimatedDelivery: string },
 *   packageFeeFormatted: string,
 *   paymentDisclosureSummaryLine: string
 * }} fields
 * @returns {Promise<Buffer>}
 */
async function generateSimplifiedPackageAddendumDocument(fields) {
  const content = fields.packageAddendumContent;
  const copyCols = [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2];

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
        new Paragraph({ children: [new TextRun({ text: "PACKAGE ADDENDUM", bold: true })] }),
        new Paragraph({ children: [new TextRun(content.packageLabel)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Work: ", bold: true }), new TextRun(fields.title)] }),
        new Paragraph({ children: [new TextRun({ text: "Author: ", bold: true }), new TextRun(fields.authorLegalName)] }),
        new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(fields.contractDate)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `Package Fee: ${fields.packageFeeFormatted}`, bold: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Included Services", bold: true })] }),
        ...content.includedServices.map((s) => bulletParagraph(s)),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Complimentary Copies", bold: true })] }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: copyCols,
          rows: [
            copiesRow("Paperback", content.complimentaryCopies.paperback, copyCols[0]),
            copiesRow("Hardcover", content.complimentaryCopies.hardcover, copyCols[1]),
            copiesRow("eBook (digital delivery)", content.complimentaryCopies.ebook, copyCols[0])
          ]
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Selected Payment Option: ", bold: true }), new TextRun(fields.paymentDisclosureSummaryLine)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `Estimated delivery: ${content.estimatedDelivery}` })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "This Addendum supplements the Publishing Agreement and is specific to the Work and package identified above. Applicable terms of the Agreement, including payment policy, royalty terms, and rights provisions, remain in full force and effect.", italics: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun("Author acknowledgement: _____ (initial)")] })
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateSimplifiedPackageAddendumDocument };
