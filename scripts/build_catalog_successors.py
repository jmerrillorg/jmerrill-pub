"""Build source-backed successor catalog drafts from the live Dataverse catalog."""

import argparse
import csv
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

from catalog_authority_audit import REGISTER, live_rows


STATUS = {
    100000000: "Active",
    100000001: "Superseded",
    100000002: "Retired",
    100000003: "Provisional",
    100000004: "Internal only",
}


def dollars(value):
    return f"${float(value):,.2f}" if value is not None else "Price by approved quote or scope"


def base_document(title, subtitle):
    document = Document()
    section = document.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = section.bottom_margin = Inches(0.7)
    section.left_margin = section.right_margin = Inches(0.75)
    normal = document.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9.5)
    normal.paragraph_format.space_after = Pt(5)
    document.styles["Title"].font.name = "Aptos Display"
    document.styles["Title"].font.size = Pt(20)
    document.styles["Title"].font.color.rgb = None
    title_style = document.styles["Title"]
    style_properties = title_style.element.get_or_add_pPr()
    border = style_properties.find(qn("w:pBdr"))
    if border is not None:
        style_properties.remove(border)
    title_paragraph = document.add_paragraph(title, "Title")
    paragraph_properties = title_paragraph._p.get_or_add_pPr()
    border = paragraph_properties.find(qn("w:pBdr"))
    if border is not None:
        paragraph_properties.remove(border)
    document.add_paragraph(subtitle)
    return document


def add_table(document, headers, rows):
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Light Shading Accent 1"
    for cell, header in zip(table.rows[0].cells, headers):
        cell.text = header
    header_properties = table.rows[0]._tr.get_or_add_trPr()
    header_properties.append(OxmlElement("w:tblHeader"))
    for values in rows:
        cells = table.add_row().cells
        for cell, value in zip(cells, values):
            cell.text = str(value)
    for row in table.rows:
        row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(2)
                for run in paragraph.runs:
                    run.font.size = Pt(8)


def service_category(row, categories):
    sku = row["jm1pub_canonicalsku"]
    if sku.startswith("JMP-GHOST-"):
        return "Ghostwriting Services"
    if sku.startswith("JMP-PARTNER-"):
        return "Publishing Partner Program"
    if sku == "JMP-DIST-LSI-UPGRADE":
        return "Distribution and Post-Launch"
    category = categories.get(row["jm1pub_catalogrowid"], "Specialist production")
    if category == "Uncategorized":
        raise RuntimeError(f"Active sellable SKU lacks a commercial category: {sku}")
    return category


def build_full_catalog(rows, output, final=False):
    state = "Current successor" if final else "Successor review draft"
    document = base_document("Full Products and Services Catalog", f"J Merrill Publishing  |  {state}  |  1 October 2026")
    document.add_paragraph("J Merrill Publishing has published 130+ titles. This founder-confirmed portfolio statement is separate from the number of records in the current service catalog. This document presents current packages and services; individual agreements govern scope and payment terms.")
    document.add_heading("Core Publishing Packages", level=1)
    document.add_paragraph("The three standard packages are Starter, Professional, and Premier. The historical Signature package is no longer available for new quotes or agreements. Existing signed Signature agreements remain governed by their own terms.")
    packages = [row for row in rows if row["jm1pub_canonicalsku"] in {"JMP-PKG-STARTER", "JMP-PKG-PRO", "JMP-PKG-PREMIER"}]
    add_table(document, ["Package", "SKU", "Base price"], [(row["jm1pub_name"], row["jm1pub_canonicalsku"], dollars(row.get("jm1pub_unitprice"))) for row in sorted(packages, key=lambda row: row["jm1pub_unitprice"])])
    child = [row for row in rows if row["jm1pub_canonicalsku"] == "JMP-PKG-CHILD"]
    if len(child) != 1 or child[0]["jm1pub_commercialstatus"] != 100000000 or child[0]["jm1pub_unitprice"] != 2495:
        raise RuntimeError("Children's specialty package authority does not match the live catalog")
    document.add_heading("Specialty Publishing", level=1)
    add_table(document, ["Package", "SKU", "Base price"], [("Children's Book Publishing Package", "JMP-PKG-CHILD", "$2,495.00")])
    document.add_paragraph("For this package, the author supplies production-usable illustrations or artwork. Original illustration creation is not included in the $2,495 base package; illustration services are priced separately.")
    document.add_heading("Payment Terms", level=1)
    document.add_paragraph("Flexible payment options may be available. Publishing projects may qualify for structured payment arrangements based on package, project scope, and approved payment terms. Final payment terms are provided with the publishing agreement.")
    document.add_heading("Current services", level=1)
    document.add_paragraph("Only active, public, sellable service records appear below. A missing fixed price means a governed quote or scope determination is required; it does not imply a zero-cost service. Provisional, retired, superseded, and internal-only records are excluded.")
    groups = defaultdict(list)
    with REGISTER.open(newline="") as source:
        categories = {row["Row ID"]: row["Original Category"] for row in csv.DictReader(source)}
    for row in rows:
        if row["jm1pub_commercialstatus"] == 100000000 and row["jm1pub_sellablestatus"] == 100000000 and row["jm1pub_publicvisibility"] == 100000000 and not row["jm1pub_canonicalsku"].startswith("JMP-PKG-"):
            groups[service_category(row, categories)].append(row)
    for category, items in sorted(groups.items()):
        document.add_heading(category, level=2)
        add_table(document, ["Service", "SKU", "Price"], [(row["jm1pub_name"], row["jm1pub_canonicalsku"], dollars(row.get("jm1pub_unitprice"))) for row in sorted(items, key=lambda row: row["jm1pub_name"])])
    document.add_paragraph("This catalog is not a contract, payment schedule, or approval of provisional services. Specific scope, tax, and payment terms require the applicable executed agreement and governed financial authority.")
    document.save(output)


def build_reference_guide(rows, output, final=False):
    state = "Current internal successor" if final else "Internal successor review draft"
    document = base_document("Product Reference Guide", f"J Merrill Publishing  |  {state}  |  1 October 2026")
    document.add_paragraph("This guide reconciles the 120 live commercial-catalog records with the August approved service register and later package rulings. It preserves the founder-confirmed 130+ published-title portfolio statement while keeping live catalog-listing counts separate. It is for internal operator use, not an author-facing quote or contract.")
    document.add_heading("Current authority", level=1)
    document.add_paragraph("Starter $1,999, Professional $4,500, and Premier $7,500 are the three core package base prices. The Children's Book Publishing Package is an active, public, quotable, contractable specialty offer at $2,495 for projects where the author supplies production-usable art. Original illustration creation is separately priced. Premier replaces Signature for new business; historical Signature agreements are not rewritten.")
    document.add_heading("Payment rules", level=1)
    document.add_paragraph("Public payment presentation remains summary only. Do not use the previously documented simple-interest rule, a universal installment schedule, or a Full Pay discount for new terms. The current compounded model and its rate period, term, rounding, early-payoff, tax, late-payment, and final-delivery rules require an exact governed policy version and agreement binding before calculations are communicated. Existing executed agreements retain their own terms.")
    document.add_heading("Commercial status and source", level=1)
    document.add_paragraph("The August 5 SKU ruling register governs services where no later explicit authority changes them. The August 12 package addendum and October 1 founder rulings override its older Signature and Children's-package treatment. CAT-111 and CAT-112 were merged and not seeded; CAT-121 Premier and PF08-AUTH-001 are live. CAT-052 is a superseded legacy alias for PF08-AUTH-001.")
    document.add_heading("Specialty and Service Families", level=1)
    document.add_paragraph("Children's Book Publishing belongs to Specialty Publishing, not the core package ladder. Ghostwriting Services remain active: Short $7,500; Standard $15,000; Extended $25,000; Premium $35,000; Anthology priced by approved quote and scope. Publishing Partner Program and Distribution & Post-Launch are distinct service families; no active sellable service is grouped as Uncategorized.")
    document.add_paragraph("The six active AI-named services retain their existing public names as explicitly identified AI-assisted service offers, not as disclosure of internal production machinery. Their current SKU, price, scope, and public status remain subject to the live register; no generic Publishing workflow is presented as an AI product. This positioning is recorded in the accompanying commercial reconciliation evidence.")
    document.add_heading("Live SKU register", level=1)
    add_table(document, ["Row", "SKU", "Status", "Price", "Commercial gate"], [
        (row["jm1pub_catalogrowid"], row["jm1pub_canonicalsku"], STATUS[row["jm1pub_commercialstatus"]], dollars(row.get("jm1pub_unitprice")), "Quote and contract" if row["jm1pub_quotingstatus"] == 100000000 and row["jm1pub_contractstatus"] == 100000000 else "Restricted")
        for row in sorted(rows, key=lambda row: row["jm1pub_catalogrowid"])
    ])
    document.add_heading("Payment Authority Boundary", level=1)
    document.add_paragraph("The compound-payment formula and full contract rules remain under reconciliation. This guide is a product and status reference, not a payment calculator or authorization to update QBO. Tax, late-payment, and final-delivery conditions must come from governing policy or the executed agreement.")
    document.save(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--final", action="store_true")
    args = parser.parse_args()
    rows = live_rows()
    if len(rows) != 120:
        raise RuntimeError(f"Expected 120 live rows, found {len(rows)}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    suffix = "" if args.final else "_REVIEW_DRAFT"
    full = args.output_dir / f"JMP_Full_Products_and_Services_Catalog_v3{suffix}.docx"
    guide = args.output_dir / f"JMP_Product_Reference_Guide_v2{suffix}.docx"
    build_full_catalog(rows, full, args.final)
    build_reference_guide(rows, guide, args.final)
    print(json.dumps({"full_catalog": str(full), "reference_guide": str(guide), "live_rows": len(rows), "review_draft": not args.final}, indent=2))


if __name__ == "__main__":
    main()
