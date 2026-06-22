"use strict";

/**
 * Generates the simplified audiobook section document — a NEW document
 * reframing the canonical Audiobook Addendum's narration election so
 * the package-included path (AI narration) is the primary election,
 * with human narration / royalty share / distribution-only presented
 * only as alternate add-on paths. Preserves the legal authorization
 * substance from the canonical Addendum.
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const PAGE_WIDTH_LETTER = 12240;
const PAGE_HEIGHT_LETTER = 15840;
const MARGIN = 1440;

function altPathParagraph(p) {
  return new Paragraph({
    children: [new TextRun(`• ${p.label} — ${p.whenApplicable}`)],
    indent: { left: 360 }
  });
}

/**
 * @param {{
 *   title: string, authorLegalName: string, contractDate: string,
 *   audiobookSection: {
 *     primaryElection: string|null, primaryElectionLabel: string|null,
 *     feeNote: string, alternatePaths: { label: string, whenApplicable: string }[],
 *     legalAuthorizationNote: string
 *   }
 * }} fields
 * @returns {Promise<Buffer>}
 */
async function generateSimplifiedAudiobookSectionDocument(fields) {
  const section = fields.audiobookSection;

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
        new Paragraph({ children: [new TextRun({ text: "AUDIOBOOK SECTION", bold: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Work: ", bold: true }), new TextRun(fields.title)] }),
        new Paragraph({ children: [new TextRun({ text: "Author: ", bold: true }), new TextRun(fields.authorLegalName)] }),
        new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(fields.contractDate)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Narration Type (primary election)", bold: true })] }),
        new Paragraph({ children: [new TextRun(section.primaryElectionLabel || "Not included in this package")] }),
        new Paragraph({ children: [new TextRun(section.feeNote)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Alternate paths (apply only if separately selected)", bold: true })] }),
        ...section.alternatePaths.map((p) => altPathParagraph(p)),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: section.legalAuthorizationNote, italics: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun("Author acknowledgement: _____ (initial)")] })
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateSimplifiedAudiobookSectionDocument };
