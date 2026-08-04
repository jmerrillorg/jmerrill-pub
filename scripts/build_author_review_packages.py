#!/usr/bin/env python3
"""Build PROGRAM-008 editorial review guide PDFs."""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


@dataclass(frozen=True)
class TitlePackage:
    slug: str
    title: str
    author: str
    recipient: str
    recipient_email: str
    stage: str
    notes: tuple[str, ...]


TITLES = [
    TitlePackage(
        "the-intentional-leader",
        "The Intentional Leader",
        "Jackie Smith Jr.",
        "Jackie Smith Jr.",
        "chosen2k7@gmail.com",
        "Proofreading author review",
        (
            "This author review manuscript preserves the approved proofreading text for author review.",
            "Please review dated entries, headings, spelling, names, references, and any wording that should be corrected before the next production movement.",
            "The corrected interior proof remains separately governed; this package is limited to author review materials.",
        ),
    ),
    TitlePackage(
        "the-generals-will-and-last-testament",
        "The General's Will and Last Testament",
        "Iyorwuese Hagher",
        "Iyorwuese Hagher",
        "hagher.hagher@ymail.com",
        "Developmental editing author review",
        (
            "The developmental pass focuses on structure, pacing, clarity, continuity, and author-intent questions before later line-level work.",
            "Please review plot movement, character logic, factual or cultural references, names, chronology, and any places where the editorial direction changes meaning.",
            "Reply with approval, corrections, or clarification requests so the team can close this review stage cleanly.",
        ),
    ),
    TitlePackage(
        "the-long-watch",
        "The Long Watch",
        "Jackie Smith Jr.",
        "Jackie Smith Jr.",
        "chosen2k7@gmail.com",
        "Developmental editing author review",
        (
            "The developmental pass focuses on sequence, devotional pacing, repetition, clarity, and author-intent questions before later line-level work.",
            "Please review dated sections, monthly flow, recurring language, and any passages where the devotional rhythm should be preserved or adjusted.",
            "Reply with approval, corrections, or clarification requests so the team can close this review stage cleanly.",
        ),
    ),
    TitlePackage(
        "establishing-glory-the-library",
        "Establishing Glory: The Library",
        "Jackie Smith Jr.",
        "Jackie Smith Jr.",
        "chosen2k7@gmail.com",
        "Developmental editing author review",
        (
            "The developmental pass focuses on clarity, sequence, reader navigation, and author-intent questions before later line-level work.",
            "Please review section order, ministry language, scripture or reference treatment, and any places where the editorial direction should be clarified.",
            "Reply with approval, corrections, or clarification requests so the team can close this review stage cleanly.",
        ),
    ),
    TitlePackage(
        "before-you-were-born",
        "Before You Were Born",
        "Sean Arron Crowley",
        "Sean Arron Crowley",
        "scrowley50@gmail.com",
        "Developmental editing author review",
        (
            "The developmental pass focuses on structure, theological clarity, pacing, chapter progression, and author-intent questions before later line-level work.",
            "Please review chapter flow, quoted or referenced material, names, factual details, and any places where the editorial direction changes meaning.",
            "Reply with approval, corrections, or clarification requests so the team can close this review stage cleanly.",
        ),
    ),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def styles():
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "Brand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=18,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#374151"),
            spaceAfter=18,
        ),
        "heading": ParagraphStyle(
            "Heading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#111827"),
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=6,
        ),
    }


def guide_pdf(path: Path, title: TitlePackage) -> None:
    style = styles()
    story = [
        Paragraph("J Merrill Publishing, Inc. | Author Review", style["brand"]),
        Paragraph("Editorial Review Guide", style["title"]),
        Paragraph(title.title, style["subtitle"]),
        Paragraph("Prepared for", style["heading"]),
        Paragraph(f"{title.recipient} ({title.recipient_email})", style["body"]),
        Paragraph("Review stage", style["heading"]),
        Paragraph(title.stage, style["body"]),
        Paragraph("Your Edited Manuscript", style["heading"]),
        Paragraph("The attached DOCX is the edited manuscript prepared for your review.", style["body"]),
        Paragraph("What Was Completed", style["heading"]),
    ]
    story.append(Paragraph(f"- {title.stage} materials were prepared for author review.", style["body"]))
    story.append(Paragraph("- The manuscript was cleaned to remove internal production-only material while preserving the edited manuscript content.", style["body"]))
    story.append(Paragraph("Items Requiring Your Attention", style["heading"]))
    for note in title.notes:
        story.append(Paragraph(f"- {note}", style["body"]))
    story.extend(
        [
            Paragraph("How to Review", style["heading"]),
            Paragraph("Please review editorial changes; comments or questions; names, dates, facts, and references; areas requiring clarification; and any substantive revisions.", style["body"]),
            Paragraph("How to Respond", style["heading"]),
            Paragraph("Reply directly to publishing@jmerrill.one with one of these responses: Approved; Approved with minor corrections; Questions or clarification requested; or Substantive revisions requested.", style["body"]),
            Paragraph("Portal", style["heading"]),
            Paragraph("Portal access remains optional. Direct email reply is the response path.", style["body"]),
            Paragraph("Support", style["heading"]),
            Paragraph("614.965.6057<br/>publishing@jmerrill.one<br/>jmerrill.pub", style["body"]),
        ]
    )
    story.extend(
        [
            Spacer(1, 0.12 * inch),
            Paragraph("The Publishing Team<br/>J Merrill Publishing, Inc.<br/>A Division of J Merrill One<br/>614.965.6057 | publishing@jmerrill.one | jmerrill.pub<br/>Helping Authors Help Themselves.", style["small"]),
        ]
    )
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        rightMargin=0.85 * inch,
        leftMargin=0.85 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=f"Editorial Review Guide - {title.title}",
        author="J Merrill Publishing, Inc.",
    )
    doc.build(story)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: build_author_review_packages.py OUTPUT_ROOT", file=sys.stderr)
        return 2
    root = Path(sys.argv[1])
    records = []
    for title in TITLES:
        package_dir = root / "packages" / title.slug
        package_dir.mkdir(parents=True, exist_ok=True)
        for old_pdf in package_dir.glob("*-Author-Review-Notes.pdf"):
            old_pdf.unlink()
        for old_pdf in package_dir.glob("*-Review-Instructions.pdf"):
            old_pdf.unlink()
        guide_path = package_dir / f"{title.slug}-Editorial-Review-Guide.pdf"
        guide_pdf(guide_path, title)
        records.append(
            {
                "slug": title.slug,
                "title": title.title,
                "recipient": title.recipient,
                "recipient_email": title.recipient_email,
                "guide_pdf": str(guide_path),
                "guide_sha256": sha256(guide_path),
            }
        )
    print(json.dumps(records, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
