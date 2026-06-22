"use strict";

/**
 * Generates the Schedule A / Payment Schedule Attachment — a NEW
 * supplementary document, not a fill of a canonical template. Used
 * whenever the Publishing Package Addendum's 3-row payment table cannot
 * accurately represent the selected payment plan (more than 3
 * installments). Contains only factual, computed values already
 * produced by agreementFieldComputer.js — no invented terms, no
 * rewriting of the canonical Agreement or Addendum language.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType
} = require("docx");

const PAGE_WIDTH_LETTER = 12240;
const PAGE_HEIGHT_LETTER = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH_LETTER - MARGIN * 2;

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "002C54", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF" })] })]
  });
}

function bodyCell(text, width, { align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text })] })]
  });
}

/**
 * @param {{
 *   title: string, authorLegalName: string, imprintLabel: string,
 *   contractDate: string, packageLabel: string,
 *   paymentSchedule: { installments: number, perInstallmentFormatted: string,
 *     totalFormatted: string, rows: { paymentNumber: number, amountFormatted: string, dueDateNote: string }[] }
 * }} fields — the output of computeAgreementFields()
 * @returns {Promise<Buffer>}
 */
async function generateScheduleADocument(fields) {
  const colWidths = [1200, 2200, CONTENT_WIDTH - 1200 - 2200];

  const tableRows = [
    new TableRow({
      children: [
        headerCell("Payment", colWidths[0]),
        headerCell("Amount", colWidths[1]),
        headerCell("Timing", colWidths[2])
      ]
    }),
    ...fields.paymentSchedule.rows.map((row) => new TableRow({
      children: [
        bodyCell(`Payment ${row.paymentNumber}`, colWidths[0]),
        bodyCell(row.amountFormatted, colWidths[1], { align: AlignmentType.RIGHT }),
        bodyCell(row.dueDateNote, colWidths[2])
      ]
    })),
    new TableRow({
      children: [
        bodyCell("TOTAL", colWidths[0]),
        bodyCell(fields.paymentSchedule.totalFormatted, colWidths[1], { align: AlignmentType.RIGHT }),
        bodyCell(`Must equal the selected package fee plus any applicable multi-payment processing fee.`, colWidths[2])
      ]
    })
  ];

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
      properties: {
        page: { size: { width: PAGE_WIDTH_LETTER, height: PAGE_HEIGHT_LETTER }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
      },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("J MERRILL PUBLISHING, INC.")] }),
        new Paragraph({ children: [new TextRun({ text: "SCHEDULE A — PAYMENT SCHEDULE ATTACHMENT", bold: true })] }),
        new Paragraph({ children: [new TextRun("Attachment to Publishing Package Addendum")] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [
          new TextRun({ text: "This Schedule A supplements the Publishing Package Addendum's payment section for this Work because the selected payment plan exceeds the three rows provided in that table. This Schedule A governs the payment schedule for this Work; all other terms of the Agreement and Addendum remain in full force and effect." })
        ] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `Work: `, bold: true }), new TextRun(fields.title)] }),
        new Paragraph({ children: [new TextRun({ text: `Author: `, bold: true }), new TextRun(fields.authorLegalName)] }),
        new Paragraph({ children: [new TextRun({ text: `Imprint: `, bold: true }), new TextRun(fields.imprintLabel)] }),
        new Paragraph({ children: [new TextRun({ text: `Package: `, bold: true }), new TextRun(fields.packageLabel)] }),
        new Paragraph({ children: [new TextRun({ text: `Date: `, bold: true }), new TextRun(fields.contractDate)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `Payment plan: ${fields.paymentSchedule.installments} payments of ${fields.paymentSchedule.perInstallmentFormatted} each. Total: ${fields.paymentSchedule.totalFormatted}.`, bold: true })] }),
        new Paragraph({ text: "" }),
        new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: colWidths, rows: tableRows }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Payment Policy: ", bold: true }),
          new TextRun("The Author determines the start date of this payment plan by making the first payment. Each subsequent payment processes on the same calendar day each following period, beginning from the first payment date. Production begins upon receipt of the first payment. Release date is not confirmed until the full package payment is received in cleared funds. No tax is invoked by this Schedule A.") ] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "IN WITNESS WHEREOF, the parties acknowledge this Schedule A as part of the Publishing Package Addendum referenced above.", italics: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun("PUBLISHER")] }),
        new Paragraph({ children: [new TextRun("J Merrill Publishing, Inc.")] }),
        new Paragraph({ children: [new TextRun("By: _______________________________")] }),
        new Paragraph({ children: [new TextRun("Jackie Smith, Jr., CEO")] }),
        new Paragraph({ children: [new TextRun("Date: _____________________________")] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun("AUTHOR")] }),
        new Paragraph({ children: [new TextRun(fields.authorLegalName)] }),
        new Paragraph({ children: [new TextRun("Signature: ________________________")] }),
        new Paragraph({ children: [new TextRun("Date: _____________________________")] })
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateScheduleADocument };
