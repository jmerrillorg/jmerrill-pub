"use strict";

/**
 * Generates the simplified, package-specific Package Addendum document
 * — a NEW document, not a fill of the canonical multi-package template.
 * Shows only the selected package's fee, included services,
 * complimentary author entitlements, selected payment option, and applicable terms
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

function entitlementRow(entitlement, width) {
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: entitlement.productFormName, bold: true })] })]
      }),
      new TableCell({
        borders, width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun(`${entitlement.quantity} ${entitlement.unit}`)] })]
      })
    ]
  });
}

/**
 * @param {{
 *   title: string, authorLegalName: string, contractDate: string,
 *   packageAddendumContent: { packageLabel: string, includedServices: string[],
 *     complimentaryEntitlements: { productFormName: string, quantity: number, unit: string }[],
 *     estimatedDelivery: string },
 *   packageFeeFormatted: string,
 *   paymentDisclosureSummaryLine: string
 * }} fields
 * @returns {Promise<Buffer>}
 */
async function generateSimplifiedPackageAddendumDocument(fields) {
  const content = fields.packageAddendumContent;
  const copyCols = [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2];
  const entitlementRows = content.complimentaryEntitlements.map((entitlement) => entitlementRow(entitlement, copyCols[0]));

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
        new Paragraph({ children: [new TextRun({ text: "Complimentary Author Entitlements", bold: true })] }),
        new Paragraph({ children: [new TextRun("Complimentary author copies and delivery entitlements are determined by the Product Forms elected for the title. Each elected print Product Form receives the package's approved print-copy allocation. Each elected digital Product Form receives one complimentary digital entitlement. An elected audiobook receives one complimentary author delivery entitlement upon publication.")] }),
        new Paragraph({ text: "" }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: copyCols,
          rows: entitlementRows
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
