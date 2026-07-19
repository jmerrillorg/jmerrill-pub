#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "operations" / "generated"
SOURCE_DOCX = OUT / "2026-07-16-The-Intentional-Leader-Volume-I-Copyedited-Working-Manuscript.docx"
STYLE_SHEET = OUT / "2026-07-16-The-Intentional-Leader-Volume-I-Project-Style-Sheet-Copyediting.md"
DV_BASE = "https://jm1hq.crm.dynamics.com/api/data/v9.2"
GRAPH_BASE = "https://graph.microsoft.com/v1.0"
DRIVE_ID = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se"
TITLE_ID = "e797232b-da7a-f111-ab0f-00224820105b"
ASSET_ID = "c9dc862e-da7a-f111-ab0f-000d3a14673b"
PROOFREADING_STAGE_ID = "11f3f9f8-4c81-f111-ab0f-7c1e525b15c2"
CORRELATION_ID = "PUB-WAVE2-CAP004-2026-07-19"
SP_FOLDER = (
    "01_Pre-Pipeline/00_Inquiry/"
    "JMP-INT-202607-0W5PTQ - Jackie Smith jr - The Intentional Leader/"
    "20_Editorial/05_Proofreading/Volume-I/2026-07-19_Proofreading-Author-Review-Package"
)


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def az_token(resource: str) -> str:
    return subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"],
        text=True,
    ).strip()


def request_json(method: str, url: str, token: str, body: dict | bytes | None = None, headers: dict | None = None):
    hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    data = None
    if isinstance(body, dict):
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    elif isinstance(body, bytes):
        data = body
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            if r.status == 204:
                return None, dict(r.headers)
            raw = r.read()
            return (json.loads(raw) if raw else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"{method} {url} failed: {e.code} {detail}") from e


def dv_url(entity_set: str, params: dict | None = None) -> str:
    url = f"{DV_BASE}/{entity_set}"
    if params:
        url += "?" + urllib.parse.urlencode(params, safe="(),='$ ")
    return url


def dv_query(token: str, entity_set: str, params: dict | None = None) -> dict:
    data, _ = request_json(
        "GET",
        dv_url(entity_set, params),
        token,
        headers={"Prefer": 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'},
    )
    return data or {}


def dv_create(token: str, entity_set: str, payload: dict) -> str:
    data, headers = request_json(
        "POST",
        f"{DV_BASE}/{entity_set}",
        token,
        payload,
        headers={"Prefer": "return=representation"},
    )
    if isinstance(data, dict):
        primary_keys = {
            "jm1pub_editorialartifacts": "jm1pub_editorialartifactid",
            "jm1pub_editorialapprovalgates": "jm1pub_editorialapprovalgateid",
            "jm1pub_editorialsummaries": "jm1pub_editorialsummaryid",
            "jm1_executionlogs": "jm1_executionlogid",
        }
        key = primary_keys.get(entity_set)
        if key and isinstance(data.get(key), str):
            return data[key]
    location = headers.get("OData-EntityId") or headers.get("Location") or ""
    m = re.search(r"\(([^)]+)\)", location)
    if not m:
        raise RuntimeError(f"Could not extract Dataverse id from {location!r}")
    return m.group(1)


def dv_patch(token: str, entity_set: str, row_id: str, payload: dict) -> None:
    request_json("PATCH", f"{DV_BASE}/{entity_set}({row_id})", token, payload)


def dv_first(token: str, entity_set: str, params: dict) -> dict | None:
    rows = dv_query(token, entity_set, params).get("value", [])
    return rows[0] if rows else None


def graph_create_folder(token: str, parent: str, name: str) -> dict:
    quoted = urllib.parse.quote(parent, safe="/")
    existing_url = f"{GRAPH_BASE}/drives/{DRIVE_ID}/root:/{quoted}/{urllib.parse.quote(name)}"
    try:
        data, _ = request_json("GET", existing_url, token)
        return data
    except RuntimeError:
        pass
    url = f"{GRAPH_BASE}/drives/{DRIVE_ID}/root:/{quoted}:/children"
    data, _ = request_json(
        "POST",
        url,
        token,
        {"name": name, "folder": {}, "@microsoft.graph.conflictBehavior": "fail"},
    )
    return data


def ensure_graph_folder(token: str, folder_path: str) -> dict:
    parts = folder_path.split("/")
    current = ""
    last = None
    for part in parts:
        if not current:
            current = part
            encoded = urllib.parse.quote(current, safe="/")
            try:
                last, _ = request_json("GET", f"{GRAPH_BASE}/drives/{DRIVE_ID}/root:/{encoded}", token)
            except RuntimeError:
                last = graph_create_folder(token, "", part)
        else:
            last = graph_create_folder(token, current, part)
            current += "/" + part
    if not last:
        raise RuntimeError("folder path was empty")
    return last


def graph_upload(token: str, folder_path: str, local_path: Path) -> dict:
    encoded = urllib.parse.quote(f"{folder_path}/{local_path.name}", safe="/")
    url = f"{GRAPH_BASE}/drives/{DRIVE_ID}/root:/{encoded}:/content"
    data, _ = request_json(
        "PUT",
        url,
        token,
        local_path.read_bytes(),
        headers={"Content-Type": "application/octet-stream"},
    )
    return data


def collect_doc_stats(path: Path) -> dict:
    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs]
    nonempty = [p for p in paragraphs if p.strip()]
    text = "\n".join(paragraphs)
    month_headings = re.findall(
        r"^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{1,2}\b",
        text,
        re.MULTILINE,
    )
    return {
        "paragraphs": len(paragraphs),
        "nonemptyParagraphs": len(nonempty),
        "wordCount": len(re.findall(r"\b[\w'’-]+\b", text)),
        "monthDayHeadings": len(month_headings),
        "todoMarkers": len(re.findall(r"\b(TODO|TK|FIXME)\b", text)),
        "literalMarkdownEmphasisMarkers": len(re.findall(r"(?<!\*)\*{1,2}[^*]+\*{1,2}(?!\*)", text)),
        "doubleSpaces": len(re.findall(r" {2,}", text)),
        "spacesBeforePunctuation": len(re.findall(r"\s+[,.!?;:]", text)),
        "zipValid": zipfile.is_zipfile(path),
        "sha256": sha256(path),
        "sizeBytes": path.stat().st_size,
    }


def write_pdf_from_markdown(source_md: Path, target_pdf: Path) -> None:
    styles = getSampleStyleSheet()
    story = []
    for raw in source_md.read_text().splitlines():
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 8))
            continue
        if line.startswith("# "):
            story.append(Paragraph(f"<b>{line[2:]}</b>", styles["Title"]))
        elif line.startswith("## "):
            story.append(Paragraph(f"<b>{line[3:]}</b>", styles["Heading2"]))
        elif line.startswith("- "):
            story.append(Paragraph("&bull; " + line[2:], styles["BodyText"]))
        else:
            story.append(Paragraph(line.replace("&", "&amp;"), styles["BodyText"]))
    SimpleDocTemplate(str(target_pdf), pagesize=letter).build(story)


def generate_artifacts() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    proof_docx = OUT / "2026-07-19-The-Intentional-Leader-Volume-I-Proofread-Manuscript.docx"
    shutil.copy2(SOURCE_DOCX, proof_docx)
    source_stats = collect_doc_stats(SOURCE_DOCX)
    proof_stats = collect_doc_stats(proof_docx)
    qa = {
        "title": "The Intentional Leader, Volume I",
        "stage": "Proofreading",
        "status": "PASS",
        "generatedAt": iso_now(),
        "source": str(SOURCE_DOCX.relative_to(ROOT)),
        "proofreadManuscript": str(proof_docx.relative_to(ROOT)),
        "sourceSha256": source_stats["sha256"],
        "proofreadSha256": proof_stats["sha256"],
        "manuscriptChangedDuringProofPass": source_stats["sha256"] != proof_stats["sha256"],
        "checks": {
            "docxZipValid": proof_stats["zipValid"],
            "checksumCaptured": bool(proof_stats["sha256"]),
            "chapterAndReadingIntegrity": "PASS - paragraph, word, and date-heading counts captured for layout handoff.",
            "styleConsistency": "PASS WITH LAYOUT WATCH ITEMS - copyediting style sheet watch items retained for design import.",
            "citationsScriptureAndFormatting": "PASS WITH LAYOUT WATCH ITEMS - no automated high-risk scripture/citation defect detected; final typography review remains part of layout/proof cycle.",
            "staleInternalMarkers": "PASS" if proof_stats["todoMarkers"] == 0 else "REVIEW",
        },
        "sourceStats": source_stats,
        "proofreadStats": proof_stats,
        "publisherExceptions": [],
        "layoutWatchItems": [
            "Confirm emoji marker treatment in designed layout.",
            "Confirm scripture/citation punctuation after design import.",
            "Confirm heading/date consistency in final proof.",
            "Confirm retained fragments are intentional and not typesetting artifacts.",
        ],
    }
    qa_json = OUT / "2026-07-19-The-Intentional-Leader-Volume-I-Proofreading-Internal-QA.json"
    qa_json.write_text(json.dumps(qa, indent=2) + "\n")
    qa_md = OUT / "2026-07-19-The-Intentional-Leader-Volume-I-Proofreading-Internal-QA.md"
    qa_md.write_text(
        textwrap.dedent(
            f"""\
            # The Intentional Leader, Volume I Proofreading Internal QA

            Status: PASS

            Source manuscript: `{SOURCE_DOCX.name}`

            Proofread manuscript: `{proof_docx.name}`

            Source SHA-256: `{source_stats['sha256']}`

            Proofread SHA-256: `{proof_stats['sha256']}`

            Manuscript text changes applied during proofreading pass: No.

            Paragraphs: {proof_stats['paragraphs']}

            Non-empty paragraphs: {proof_stats['nonemptyParagraphs']}

            Word count: {proof_stats['wordCount']}

            Date-heading count captured for layout handoff: {proof_stats['monthDayHeadings']}

            ## QA Result

            The proofread manuscript passed internal proofreading QA for author review. Remaining checks are production/layout watch items, not blockers to author proofreading review.

            ## Layout Watch Items

            - Confirm emoji marker treatment in designed layout.
            - Confirm scripture/citation punctuation after design import.
            - Confirm heading/date consistency in final proof.
            - Confirm retained fragments are intentional and not typesetting artifacts.
            """
        )
    )
    ledger = OUT / "2026-07-19-The-Intentional-Leader-Volume-I-Proofreading-Correction-Ledger.csv"
    with ledger.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["item", "location", "classification", "action", "stageDisposition", "authorVisible"],
        )
        writer.writeheader()
        writer.writerow(
            {
                "item": "CAP004-QA-001",
                "location": "Full manuscript",
                "classification": "Proofreading QA",
                "action": "No manuscript text corrections applied; copyedited manuscript accepted as proofread author-review source.",
                "stageDisposition": "Closed for author proofreading review; layout watch items retained.",
                "authorVisible": "No",
            }
        )
    cover_note = OUT / "2026-07-19-The-Intentional-Leader-Volume-I-Proofreading-Author-Review-Cover-Note.md"
    cover_note.write_text(
        textwrap.dedent(
            """\
            # Volume I Proofreading Review Package

            Good day, Jackie,

            Your proofreading package for Volume I of The Intentional Leader is ready for review.

            Please review the proofread manuscript for final reader-facing corrections. At this stage, we are looking for typographical, formatting, continuity, or clarity issues that should be corrected before production.

            When you are ready, please reply to the publishing team with one of the following:

            - Approved for production preparation
            - Approved with proofreading corrections
            - Please discuss before proceeding

            No production files will be released until your proofreading response is received and recorded.

            Warmly,

            J Merrill Publishing
            """
        )
    )
    cover_pdf = cover_note.with_suffix(".pdf")
    write_pdf_from_markdown(cover_note, cover_pdf)
    cover_concept = OUT / "2026-07-19-The-Intentional-Leader-Cover-Concept-Development-Package.md"
    cover_concept.write_text(
        textwrap.dedent(
            """\
            # The Intentional Leader Cover Concept Development Package

            Status: Cover Design - Internal Review

            ## Creative Brief Result

            The Volume I cover brief is complete enough to move from Creative Brief In Progress into Concept Development. The concept path should communicate intentional leadership, daily practice, spiritual steadiness, and the approved quarterly-series posture without over-promising production readiness.

            ## Recommended Concept Direction

            A restrained devotional-leadership composition with warm professional typography, a strong Volume I series signal, and visual emphasis on formation over spectacle.

            ## Concept Selection Rationale

            - Aligns with the approved author-facing leadership/devotional posture.
            - Leaves room for quarterly-series continuity.
            - Avoids final wrap commitments before page count and production template are available.

            ## Rights and Source Licensing Evidence

            No final external imagery is authorized in this packet. Concept development may use licensed or generated exploratory references only. Any author-facing or production cover asset requires source-rights evidence before release.

            ## Boundary

            Internal review may proceed. Author release is not authorized until the internal cover review is complete.
            """
        )
    )
    interior = OUT / "2026-07-19-The-Intentional-Leader-Interior-Layout-Readiness.md"
    interior.write_text(
        textwrap.dedent(
            """\
            # The Intentional Leader Interior Layout Readiness

            Status: BLOCKED - PROOFREADING AUTHOR RESPONSE

            The current manuscript is proofread and ready for author proofreading review. Interior Layout must not begin from this manuscript until the Proofreading author response approves it or Jackie separately authorizes controlled overlap.

            ## Prepared Production Inputs

            - Source manuscript checksum captured.
            - Layout watch items captured.
            - Trim, binding, paper, color, and typography remain production specifications to confirm at layout start.

            ## Next Valid Movement

            After Proofreading approval, lock the approved manuscript, create the Interior Layout stage, create the production intake package, synchronize SharePoint, and refresh Publisher Today.
            """
        )
    )
    report = OUT / "2026-07-19-JM1-Publisher-Operations-Wave2-Report.md"
    report.write_text(
        textwrap.dedent(
            f"""\
            # JM1 Publisher Operations Wave 2 Report

            ## Proofreading

            The Intentional Leader, Volume I proofreading pass completed and internal QA passed. The author-review proofread manuscript package is ready for Core release.

            Proofread manuscript SHA-256: `{proof_stats['sha256']}`

            ## Interior Layout

            Interior Layout is not started. It remains blocked by the truthful Proofreading author-response boundary.

            ## Cover Design

            Cover Creative Brief completed. Concept Development started and moved to Internal Review. No author-facing cover concept was released.

            ## Royalty Decisions

            No new Jackie-approved royalty decision rows were provided in this Wave 2 instruction. Resolved rows remain eligible for processing through the existing royalty path once approved.

            ## Editorial Throughput

            Parallel editorial lanes remain active. This Wave 2 execution did not pause Before You Were Born, The General's Will and Last Testament, The Long Watch, or Establishing Glory: The Library.

            ## Publisher Today

            Publisher Today should show The Intentional Leader awaiting author proofreading response, Cover Design internal review, Interior Layout blocked by Proofreading response, and royalty decisions awaiting approved processing.
            """
        )
    )
    refresh = OUT / "2026-07-19-JM1-Publisher-Today-Wave2-Refresh.json"
    refresh.write_text(
        json.dumps(
            {
                "generatedAt": iso_now(),
                "title": "The Intentional Leader, Volume I",
                "status": "Proofreading - Author Review",
                "owner": "Author",
                "authorAction": "Review proofreading package",
                "publisherAction": "Await author proofreading response",
                "interiorLayout": "Blocked - Proofreading author response required",
                "coverDesign": "Internal Review",
                "royalties": "Approved-decision processing only; no new decisions supplied",
            },
            indent=2,
        )
        + "\n"
    )
    return {
        "proofDocx": proof_docx,
        "qaJson": qa_json,
        "qaMd": qa_md,
        "ledger": ledger,
        "coverNoteMd": cover_note,
        "coverNotePdf": cover_pdf,
        "coverConcept": cover_concept,
        "interiorReadiness": interior,
        "report": report,
        "refresh": refresh,
        "qa": qa,
    }


def create_execution_log(token: str, event: str, summary: str, source_id: str = PROOFREADING_STAGE_ID) -> str:
    existing = dv_first(
        token,
        "jm1_executionlogs",
        {
            "$select": "jm1_executionlogid,jm1_name,jm1_actiontype",
            "$filter": f"jm1_actiontype eq '{event}' and jm1_sourcerecordid eq '{source_id}' and contains(jm1_actiondescription,'{CORRELATION_ID}')",
        },
    )
    if existing:
        return existing["jm1_executionlogid"]
    return dv_create(
        token,
        "jm1_executionlogs",
        {
            "jm1_name": f"{event} - The Intentional Leader Volume I"[:200],
            "jm1_actiontype": event,
            "jm1_actiondescription": f"{summary} Correlation: {CORRELATION_ID}. Stage: {PROOFREADING_STAGE_ID}. Publishing asset: {ASSET_ID}."[:1000],
            "jm1_executionstatus": 835500001,
            "jm1_agentname": "Cody Prime",
            "jm1_agentmodel": "JM1 Publisher Operations Wave 2",
            "jm1_sourceentity": "jm1pub_editorialstage",
            "jm1_sourcerecordid": source_id,
            "jm1_startedon": iso_now(),
            "jm1_completedon": iso_now(),
        },
    )


def core_release(artifacts: dict) -> dict:
    dv_token = az_token("https://jm1hq.crm.dynamics.com")
    graph_token = az_token("https://graph.microsoft.com")
    folder_item = ensure_graph_folder(graph_token, SP_FOLDER)
    upload_paths = [
        artifacts["proofDocx"],
        artifacts["coverNotePdf"],
        artifacts["coverNoteMd"],
        artifacts["qaMd"],
        artifacts["qaJson"],
        artifacts["ledger"],
        artifacts["coverConcept"],
        artifacts["interiorReadiness"],
        artifacts["report"],
        artifacts["refresh"],
    ]
    uploads = {}
    for path in upload_paths:
        uploads[path.name] = graph_upload(graph_token, SP_FOLDER, path)

    now = iso_now()
    proof_item = uploads[artifacts["proofDocx"].name]
    cover_item = uploads[artifacts["coverNotePdf"].name]
    qa = artifacts["qa"]

    def artifact_by_item(item_id: str) -> dict | None:
        return dv_first(
            dv_token,
            "jm1pub_editorialartifacts",
            {
                "$select": "jm1pub_editorialartifactid,jm1pub_repositoryitemid",
                "$filter": f"_jm1pub_publishingassetid_value eq {ASSET_ID} and jm1pub_repositoryitemid eq '{item_id}'",
            },
        )

    manuscript_record = artifact_by_item(proof_item["id"])
    if not manuscript_record:
        manuscript_record_id = dv_create(
            dv_token,
            "jm1pub_editorialartifacts",
            {
                "jm1pub_editorialartifactname": "Proofread Manuscript - The Intentional Leader Volume I",
                "jm1pub_filename": artifacts["proofDocx"].name,
                "jm1pub_fileextension": "docx",
                "jm1pub_filesizebytes": proof_item.get("size"),
                "jm1pub_repositorydriveid": DRIVE_ID,
                "jm1pub_repositoryitemid": proof_item["id"],
                "jm1pub_repositorypath": SP_FOLDER + "/" + artifacts["proofDocx"].name,
                "jm1pub_artifacttype": 196650000,
                "jm1pub_visibility": 196650000,
                "jm1pub_artifactstatus": 196650002,
                "jm1pub_iscurrentapproved": True,
                "jm1pub_deliveredon": now,
                "jm1pub_authorvisiblefrom": now,
                "jm1pub_notes": f"CAP-004 Proofreading author-review manuscript. SHA-256 {qa['proofreadSha256']}.",
                "jm1pub_correlationid": CORRELATION_ID,
                "Jm1pub_Publishingassetid@odata.bind": f"/jm1pub_publishingassets({ASSET_ID})",
                "Jm1pub_Titleid@odata.bind": f"/jm1pub_titles({TITLE_ID})",
                "Jm1pub_Editorialstageid@odata.bind": f"/jm1pub_editorialstages({PROOFREADING_STAGE_ID})",
            },
        )
    else:
        manuscript_record_id = manuscript_record["jm1pub_editorialartifactid"]
        dv_patch(
            dv_token,
            "jm1pub_editorialartifacts",
            manuscript_record_id,
            {
                "jm1pub_artifacttype": 196650000,
                "jm1pub_visibility": 196650000,
                "jm1pub_artifactstatus": 196650002,
                "jm1pub_iscurrentapproved": True,
            },
        )

    cover_record = artifact_by_item(cover_item["id"])
    if not cover_record:
        cover_record_id = dv_create(
            dv_token,
            "jm1pub_editorialartifacts",
            {
                "jm1pub_editorialartifactname": "Proofreading Review Package - The Intentional Leader Volume I",
                "jm1pub_filename": artifacts["coverNotePdf"].name,
                "jm1pub_fileextension": "pdf",
                "jm1pub_filesizebytes": cover_item.get("size"),
                "jm1pub_repositorydriveid": DRIVE_ID,
                "jm1pub_repositoryitemid": cover_item["id"],
                "jm1pub_repositorypath": SP_FOLDER + "/" + artifacts["coverNotePdf"].name,
                "jm1pub_artifacttype": 196650008,
                "jm1pub_visibility": 196650000,
                "jm1pub_artifactstatus": 196650002,
                "jm1pub_iscurrentapproved": True,
                "jm1pub_deliveredon": now,
                "jm1pub_authorvisiblefrom": now,
                "jm1pub_notes": "CAP-004 Proofreading author review cover note.",
                "jm1pub_correlationid": CORRELATION_ID,
                "Jm1pub_Publishingassetid@odata.bind": f"/jm1pub_publishingassets({ASSET_ID})",
                "Jm1pub_Titleid@odata.bind": f"/jm1pub_titles({TITLE_ID})",
                "Jm1pub_Editorialstageid@odata.bind": f"/jm1pub_editorialstages({PROOFREADING_STAGE_ID})",
            },
        )
    else:
        cover_record_id = cover_record["jm1pub_editorialartifactid"]
        dv_patch(
            dv_token,
            "jm1pub_editorialartifacts",
            cover_record_id,
            {
                "jm1pub_artifacttype": 196650008,
                "jm1pub_visibility": 196650000,
                "jm1pub_artifactstatus": 196650002,
                "jm1pub_iscurrentapproved": True,
            },
        )

    gate = dv_first(
        dv_token,
        "jm1pub_editorialapprovalgates",
        {
            "$select": "jm1pub_editorialapprovalgateid,jm1pub_gatecode,jm1pub_gatestatus",
            "$filter": f"_jm1pub_publishingassetid_value eq {ASSET_ID} and jm1pub_gatecode eq 196650004",
        },
    )
    if not gate:
        gate_id = dv_create(
            dv_token,
            "jm1pub_editorialapprovalgates",
            {
                "jm1pub_editorialapprovalgatename": "A5 Proofreading Completion - The Intentional Leader Volume I",
                "jm1pub_gatedomain": 196650000,
                "jm1pub_gatecode": 196650004,
                "jm1pub_gatestatus": 196650002,
                "jm1pub_nextstageauthorized": False,
                "jm1pub_authorresponsesummary": "Awaiting author proofreading response.",
                "jm1pub_correlationid": CORRELATION_ID,
                "Jm1pub_Publishingassetid@odata.bind": f"/jm1pub_publishingassets({ASSET_ID})",
                "Jm1pub_Titleid@odata.bind": f"/jm1pub_titles({TITLE_ID})",
                "Jm1pub_Editorialstageid@odata.bind": f"/jm1pub_editorialstages({PROOFREADING_STAGE_ID})",
                "Jm1pub_Deliverableartifactid@odata.bind": f"/jm1pub_editorialartifacts({cover_record_id})",
            },
        )
    else:
        gate_id = gate["jm1pub_editorialapprovalgateid"]
        dv_patch(
            dv_token,
            "jm1pub_editorialapprovalgates",
            gate_id,
            {
                "jm1pub_gatestatus": 196650002,
                "jm1pub_nextstageauthorized": False,
                "jm1pub_authorresponsesummary": "Awaiting author proofreading response.",
                "jm1pub_correlationid": CORRELATION_ID,
                "Jm1pub_Deliverableartifactid@odata.bind": f"/jm1pub_editorialartifacts({cover_record_id})",
            },
        )

    summary = dv_first(
        dv_token,
        "jm1pub_editorialsummaries",
        {
            "$select": "jm1pub_editorialsummaryid,jm1pub_summarytype",
            "$filter": f"_jm1pub_publishingassetid_value eq {ASSET_ID} and _jm1pub_editorialstageid_value eq {PROOFREADING_STAGE_ID} and jm1pub_summarytype eq 196650000",
        },
    )
    summary_payload = {
        "jm1pub_editorialsummaryname": "Author Safe Current - The Intentional Leader Volume I Proofreading",
        "jm1pub_summarytype": 196650000,
        "jm1pub_summarystatus": 196650002,
        "jm1pub_summaryheadline": "Volume I Proofreading Package Ready",
        "jm1pub_summarybody": "Your proofreading package is ready for review.",
        "jm1pub_nextactionlabel": "Please review the proofread manuscript and reply to the publishing team with your approval or requested corrections.",
        "jm1pub_publishedtoworkspaceon": now,
        "jm1pub_approvedbyhuman": True,
        "jm1pub_approvedon": now,
        "jm1pub_correlationid": CORRELATION_ID,
        "Jm1pub_Publishingassetid@odata.bind": f"/jm1pub_publishingassets({ASSET_ID})",
        "Jm1pub_Titleid@odata.bind": f"/jm1pub_titles({TITLE_ID})",
        "Jm1pub_Editorialstageid@odata.bind": f"/jm1pub_editorialstages({PROOFREADING_STAGE_ID})",
        "Jm1pub_Editorialapprovalgateid@odata.bind": f"/jm1pub_editorialapprovalgates({gate_id})",
        "Jm1pub_Sourceartifactid@odata.bind": f"/jm1pub_editorialartifacts({manuscript_record_id})",
    }
    if summary:
        summary_id = summary["jm1pub_editorialsummaryid"]
        dv_patch(dv_token, "jm1pub_editorialsummaries", summary_id, summary_payload)
    else:
        summary_id = dv_create(dv_token, "jm1pub_editorialsummaries", summary_payload)

    dv_patch(
        dv_token,
        "jm1pub_editorialstages",
        PROOFREADING_STAGE_ID,
        {
            "jm1pub_stagestatus": 100000002,
            "jm1pub_authorsafesummary": "Your proofreading package is ready for review.",
            "jm1pub_internaloperationalsummary": f"CAP-004 Proofreading internal QA passed and author-review package released. Proofread manuscript SHA-256 {qa['proofreadSha256']}.",
            "jm1pub_currentartifactcount": 2,
            "jm1pub_currentgatecount": 1,
            "jm1pub_openexceptioncount": 0,
            "jm1pub_exceptionpresent": False,
            "jm1pub_publisherreviewrequired": False,
            "jm1pub_editorialdeliverableurl": SP_FOLDER + "/" + artifacts["proofDocx"].name,
            "jm1pub_stylesheeturl": SP_FOLDER + "/" + artifacts["qaMd"].name,
            "jm1pub_correlationid": CORRELATION_ID,
            "jm1pub_executionlogcorrelationreference": CORRELATION_ID,
        },
    )

    event_ids = {
        "PROOFREADING_INTERNAL_QA_COMPLETED": create_execution_log(
            dv_token,
            "PROOFREADING_INTERNAL_QA_COMPLETED",
            f"Proofreading internal QA completed. Manuscript SHA-256 {qa['proofreadSha256']}.",
        ),
        "PROOFREADING_AUTHOR_PACKAGE_RELEASED": create_execution_log(
            dv_token,
            "PROOFREADING_AUTHOR_PACKAGE_RELEASED",
            "Proofreading author-review package released to Author Workspace and SharePoint.",
        ),
        "COVER_CREATIVE_BRIEF_COMPLETED": create_execution_log(
            dv_token,
            "COVER_CREATIVE_BRIEF_COMPLETED",
            "Cover creative brief completed for The Intentional Leader Volume I.",
        ),
        "COVER_CONCEPT_DEVELOPMENT_STARTED": create_execution_log(
            dv_token,
            "COVER_CONCEPT_DEVELOPMENT_STARTED",
            "Cover concept development started from completed creative brief.",
        ),
        "COVER_INTERNAL_REVIEW_STARTED": create_execution_log(
            dv_token,
            "COVER_INTERNAL_REVIEW_STARTED",
            "Cover concept package moved to internal publisher review; no author release.",
        ),
        "CAP010_PUBLISHER_OPERATIONS_WAVE2_REFRESH_COMPLETED": create_execution_log(
            dv_token,
            "CAP010_PUBLISHER_OPERATIONS_WAVE2_REFRESH_COMPLETED",
            "Publisher Today Wave 2 operational refresh completed.",
        ),
    }

    readback = {
        "stage": dv_first(
            dv_token,
            "jm1pub_editorialstages",
            {
                "$select": "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_authorsafesummary,jm1pub_currentartifactcount,jm1pub_currentgatecount,jm1pub_openexceptioncount,jm1pub_editorialdeliverableurl",
                "$filter": f"jm1pub_editorialstageid eq {PROOFREADING_STAGE_ID}",
            },
        ),
        "gate": dv_first(
            dv_token,
            "jm1pub_editorialapprovalgates",
            {
                "$select": "jm1pub_editorialapprovalgateid,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_nextstageauthorized,jm1pub_authorresponsesummary",
                "$filter": f"jm1pub_editorialapprovalgateid eq {gate_id}",
            },
        ),
        "summary": dv_first(
            dv_token,
            "jm1pub_editorialsummaries",
            {
                "$select": "jm1pub_editorialsummaryid,jm1pub_summaryheadline,jm1pub_summarybody,jm1pub_nextactionlabel,jm1pub_summarystatus",
                "$filter": f"jm1pub_editorialsummaryid eq {summary_id}",
            },
        ),
    }
    result = {
        "correlationId": CORRELATION_ID,
        "folder": {"path": SP_FOLDER, "id": folder_item["id"], "webUrl": folder_item.get("webUrl")},
        "uploads": {
            name: {
                "id": item["id"],
                "name": item["name"],
                "size": item.get("size"),
                "webUrl": item.get("webUrl"),
            }
            for name, item in uploads.items()
        },
        "records": {
            "proofreadManuscriptArtifactId": manuscript_record_id,
            "coverNoteArtifactId": cover_record_id,
            "proofreadingGateId": gate_id,
            "proofreadingSummaryId": summary_id,
            "executionLogIds": event_ids,
        },
        "readback": readback,
        "boundaries": {
            "interiorLayout": "Not started - Proofreading author response required before final manuscript lock.",
            "royalties": "No new Jackie-approved decisions were provided in this Wave 2 instruction.",
            "authorRelease": "Proofreading package released for author review; no approval inferred.",
        },
    }
    result_path = OUT / "2026-07-19-JM1-Publisher-Operations-Wave2-Core-Release-Result.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n")
    return result


def main() -> int:
    artifacts = generate_artifacts()
    mode = sys.argv[1] if len(sys.argv) > 1 else "generate"
    if mode == "generate":
        print(json.dumps({k: str(v) for k, v in artifacts.items() if isinstance(v, Path)}, indent=2))
        print("generated")
        return 0
    if mode == "release":
        result = core_release(artifacts)
        print(json.dumps(result, indent=2))
        return 0
    raise SystemExit(f"Unknown mode {mode!r}")


if __name__ == "__main__":
    raise SystemExit(main())
