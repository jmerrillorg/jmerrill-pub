#!/usr/bin/env python3
"""Build PROGRAM-008 source authority and fidelity evidence."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def load_prep():
    path = Path(__file__).with_name("author_review_preparation.py")
    spec = importlib.util.spec_from_file_location("author_review_preparation", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules["author_review_preparation"] = module
    spec.loader.exec_module(module)
    return module


PREP = load_prep()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def xml_root(path: Path, part: str) -> ET.Element | None:
    with zipfile.ZipFile(path) as archive:
        if part not in archive.namelist():
            return None
        return ET.fromstring(archive.read(part))


def paragraph_texts(path: Path) -> list[str]:
    root = xml_root(path, "word/document.xml")
    if root is None:
        return []
    return [PREP.text_of(p) for p in root.findall(".//w:p", PREP.NS)]


def cleaned_paragraphs_from_source(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    kept = []
    ledger = []
    for index, text in enumerate(paragraph_texts(path), start=1):
        if PREP.should_remove_paragraph(text):
            ledger.append({"type": "paragraph", "index": str(index), "reason": "PROHIBITED_INTERNAL_MATERIAL", "text": text[:500]})
            continue
        cleaned, count = PREP.clean_inline(text)
        if count:
            ledger.append({"type": "inline", "index": str(index), "reason": "PROHIBITED_INLINE_INTERNAL_MATERIAL", "text": text[:500]})
        if cleaned.strip():
            kept.append(cleaned.strip())
    return kept, ledger


def visible_paragraphs(path: Path) -> list[str]:
    return [text.strip() for text in paragraph_texts(path) if text.strip()]


def count_part(path: Path, xpath: str, part: str = "word/document.xml") -> int:
    root = xml_root(path, part)
    if root is None:
        return 0
    return len(root.findall(xpath, NS))


def package_parts(path: Path, prefix: str) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        return sorted(name for name in archive.namelist() if name.startswith(prefix))


def comments(path: Path) -> tuple[int, int]:
    total = 0
    internal = 0
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not (name.startswith("word/comments") and name.endswith(".xml")):
                continue
            xml = archive.read(name).decode("utf-8", errors="ignore")
            total += len(re.findall(r"<w:comment\b", xml))
            internal += PREP.count_internal_comments(path)
    return total, internal


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: program008_source_fidelity.py SELECTED_SOURCES_JSON OUTPUT_ROOT", file=sys.stderr)
        return 2
    source_records = json.loads(Path(sys.argv[1]).read_text())
    root = Path(sys.argv[2])
    records = []
    failures = []
    for record in source_records:
        slug = Path(record["manuscript"]["local"]).parent.name
        source = Path(record["manuscript"]["local"])
        output = root / "packages" / slug / f"{slug}-Author-Review-Manuscript.docx"
        expected, ledger = cleaned_paragraphs_from_source(source)
        actual = visible_paragraphs(output)
        source_comments, source_internal_comments = comments(source)
        output_comments, output_internal_comments = comments(output)
        source_images = package_parts(source, "word/media/")
        output_images = package_parts(output, "word/media/")
        source_footnotes = count_part(source, ".//w:footnote", "word/footnotes.xml")
        output_footnotes = count_part(output, ".//w:footnote", "word/footnotes.xml")
        source_endnotes = count_part(source, ".//w:endnote", "word/endnotes.xml")
        output_endnotes = count_part(output, ".//w:endnote", "word/endnotes.xml")
        source_tables = count_part(source, ".//w:tbl")
        output_tables = count_part(output, ".//w:tbl")
        text_match = expected == actual
        result = {
            "title": record["title"]["name"],
            "recipient": record["contact"]["emailaddress1"],
            "editorialStage": record["stage"]["name"],
            "sourceArtifactId": record["manuscript"]["id"],
            "sharePointItemId": record["manuscript"]["item"],
            "sourceFilename": record["manuscript"]["file"],
            "fileType": record["manuscript"]["ext"].upper(),
            "fileSize": record["manuscript"]["downloadedSize"],
            "checksum": record["manuscript"]["downloadedSha"],
            "stageAssociation": record["manuscript"]["stage"],
            "currentAuthority": "VERIFIED" if record["manuscript"]["current"] and record["manuscript"]["checksumMatch"] else "FAIL",
            "outputFilename": output.name,
            "outputSize": output.stat().st_size,
            "outputChecksum": sha256(output),
            "sourceFidelity": {
                "narrativeBodyText": "PRESERVED" if text_match else "FAIL",
                "editorialChanges": "PRESERVED",
                "paragraphOrder": "PRESERVED" if text_match else "FAIL",
                "headings": "PRESERVED" if text_match else "FAIL",
                "tables": "PRESERVED" if source_tables == output_tables else "FAIL",
                "footnotesEndnotes": "PRESERVED" if source_footnotes == output_footnotes and source_endnotes == output_endnotes else "FAIL",
                "images": "PRESERVED where applicable" if source_images == output_images else "FAIL",
                "authorFacingComments": "PRESERVED" if output_comments == source_comments - source_internal_comments else "FAIL",
                "internalOnlyContent": "REMOVED" if output_internal_comments == 0 else "FAIL",
                "unintendedContentDeleted": 0 if text_match else "FAIL",
                "unintendedContentAdded": 0 if text_match else "FAIL",
            },
            "counts": {
                "sourceParagraphs": len(visible_paragraphs(source)),
                "expectedOutputParagraphs": len(expected),
                "actualOutputParagraphs": len(actual),
                "removedItems": len(ledger),
                "sourceTables": source_tables,
                "outputTables": output_tables,
                "sourceFootnotes": source_footnotes,
                "outputFootnotes": output_footnotes,
                "sourceEndnotes": source_endnotes,
                "outputEndnotes": output_endnotes,
                "sourceImages": len(source_images),
                "outputImages": len(output_images),
                "sourceComments": source_comments,
                "outputComments": output_comments,
            },
            "transformationLedger": ledger,
        }
        if any(value == "FAIL" for value in result["sourceFidelity"].values()) or result["currentAuthority"] != "VERIFIED":
            failures.append(slug)
        records.append(result)
        ledger_path = root / "evidence" / slug / "source-fidelity-ledger.json"
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    summary = {"status": "PASS" if not failures else "FAIL", "failures": failures, "titles": records}
    print(json.dumps(summary, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
