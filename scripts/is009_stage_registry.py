#!/usr/bin/env python3

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


SOURCE_DIR = Path(
    os.environ.get(
        "IS009_SOURCE_DIR",
        "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/General",
    )
)
DATA_OUT = Path("data/is009-publishing-asset-staging.json")
REPORT_OUT = Path("docs/implementation/evidence/IS-009/is009-migration-staging-summary.md")

MONTHLY = "MONTHLY REPORTING 2026(1).xlsx"
ASSET_LISTING = "Total_Asset_Listing_20260706_0831.xlsx"
SUPPORT_FILES = [
    "IS report.csv",
    "LSI report.csv",
    "prefix-9781950719.csv",
    "prefix-9781954414.csv",
    "prefix-9781961475.csv",
    "prefix-9781969418.csv",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "nat", "none"}:
        return ""
    return re.sub(r"\s+", " ", text)


def norm_title(value: Any) -> str:
    text = clean(value).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def norm_author(value: Any) -> str:
    return re.sub(r"\s+", " ", clean(value)).strip()


def norm_isbn(value: Any) -> str:
    digits = re.sub(r"\D", "", clean(value))
    if len(digits) == 10:
        return digits
    if len(digits) >= 13:
        return digits[-13:]
    return digits


def infer_format(value: Any, source: str = "") -> str:
    text = clean(value).lower()
    source_l = source.lower()
    if "audio" in text or source_l == "acx":
        return "Audiobook"
    if "ebook" in text or "e-book" in text or "kindle" in text or source_l in {"ebook", "amazon"}:
        return "eBook"
    if "hard" in text:
        return "Hardcover"
    if "large" in text:
        return "Large Print"
    if "workbook" in text:
        return "Workbook"
    if text:
        return "Paperback"
    return "Other"


def safe_float(value: Any) -> float | None:
    text = clean(value)
    if not text:
        return None
    try:
        return float(text.replace("$", "").replace(",", ""))
    except ValueError:
        return None


def read_sheet(workbook: Path, sheet_name: str) -> pd.DataFrame:
    return pd.read_excel(workbook, sheet_name=sheet_name, dtype=object)


def read_csv_profile(path: Path) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "file": path.name,
        "sizeBytes": path.stat().st_size,
        "sha256": file_hash(path),
        "status": "PROFILED",
    }
    raw = path.read_bytes()
    sample = raw[:8192].decode("latin1", errors="replace")
    profile["lineCount"] = raw.count(b"\n") + (1 if raw and not raw.endswith(b"\n") else 0)
    try:
        dialect = csv.Sniffer().sniff(sample)
        profile["dialect"] = {
            "delimiter": dialect.delimiter,
            "quotechar": dialect.quotechar,
        }
    except Exception:
        profile["dialect"] = {"delimiter": "unknown", "quotechar": "unknown"}
    profile["firstNonEmptyLines"] = [
        line.strip()[:240] for line in sample.splitlines() if line.strip()
    ][:5]
    return profile


def add_title(titles: dict[str, dict[str, Any]], title: Any, author: Any, source: str, row: int, isbn: str = "") -> str:
    title_text = clean(title)
    key = norm_title(title_text)
    if not key:
        return ""
    record = titles.setdefault(
        key,
        {
            "title": title_text,
            "normalizedTitle": key,
            "authors": [],
            "isbns": [],
            "sources": [],
            "rowRefs": [],
            "recommendedStatus": "STAGED",
        },
    )
    if title_text and len(title_text) > len(record["title"]):
        record["title"] = title_text
    author_text = norm_author(author)
    if author_text and author_text not in record["authors"]:
        record["authors"].append(author_text)
    if isbn and isbn not in record["isbns"]:
        record["isbns"].append(isbn)
    if source not in record["sources"]:
        record["sources"].append(source)
    if len(record["rowRefs"]) < 12:
        record["rowRefs"].append({"source": source, "row": row})
    return key


def add_asset(
    assets: dict[str, dict[str, Any]],
    title_key: str,
    title: Any,
    author: Any,
    source: str,
    row: int,
    fmt: str,
    isbn: str = "",
    asin: str = "",
    acx: str = "",
    lsi: str = "",
    core: str = "",
    price: Any = None,
    status: Any = None,
    imprint: Any = None,
) -> str:
    title_text = clean(title)
    isbn_norm = norm_isbn(isbn)
    id_piece = isbn_norm or clean(asin) or clean(acx) or clean(lsi) or clean(core) or f"{source}:{row}"
    key = isbn_norm or f"{norm_title(title_text)}|{fmt}|{id_piece}".lower()
    record = assets.setdefault(
        key,
        {
            "assetKey": key,
            "titleKey": title_key,
            "title": title_text,
            "authors": [],
            "assetFormat": fmt,
            "isbn13": isbn_norm if len(isbn_norm) == 13 else "",
            "normalizedIsbn": isbn_norm,
            "asin": "",
            "acxProductId": "",
            "lsiId": "",
            "coreSourceId": "",
            "retailPrice": None,
            "distributionStatus": "",
            "assetStatus": "Staged",
            "metadataStatus": "Incomplete",
            "evidenceSources": [],
            "rowRefs": [],
            "imprints": [],
            "exceptionFlags": [],
        },
    )
    author_text = norm_author(author)
    if author_text and author_text not in record["authors"]:
        record["authors"].append(author_text)
    if clean(asin) and not record["asin"]:
        record["asin"] = clean(asin)
    if clean(acx) and not record["acxProductId"]:
        record["acxProductId"] = clean(acx)
    if clean(lsi) and not record["lsiId"]:
        record["lsiId"] = clean(lsi)
    if clean(core) and not record["coreSourceId"]:
        record["coreSourceId"] = clean(core)
    price_value = safe_float(price)
    if price_value is not None and record["retailPrice"] is None:
        record["retailPrice"] = price_value
    if clean(status):
        record["distributionStatus"] = clean(status)
    if clean(imprint) and clean(imprint) not in record["imprints"]:
        record["imprints"].append(clean(imprint))
    if source not in record["evidenceSources"]:
        record["evidenceSources"].append(source)
    if len(record["rowRefs"]) < 12:
        record["rowRefs"].append({"source": source, "row": row})
    if not record["titleKey"]:
        record["exceptionFlags"].append("MISSING_TITLE_LINK")
    if not record["normalizedIsbn"] and not (record["asin"] or record["acxProductId"] or record["lsiId"] or record["coreSourceId"]):
        record["exceptionFlags"].append("MISSING_MARKETPLACE_IDENTIFIER")
    return key


def add_marketplace(
    marketplaces: dict[str, dict[str, Any]],
    asset_key: str,
    source: str,
    row: int,
    marketplace: str,
    identifier: Any,
    status: Any = "",
    listing_url: Any = "",
    price: Any = None,
) -> None:
    identifier_text = clean(identifier)
    marketplace_text = clean(marketplace) or "Other"
    key = f"{asset_key}|{marketplace_text.lower()}|{identifier_text.lower()}"
    record = marketplaces.setdefault(
        key,
        {
            "marketplaceKey": key,
            "assetKey": asset_key,
            "marketplace": marketplace_text,
            "marketplaceIdentifier": identifier_text,
            "marketplaceStatus": clean(status) or "Unknown",
            "listingUrl": clean(listing_url),
            "listedPrice": safe_float(price),
            "evidenceSources": [],
            "rowRefs": [],
            "exceptionFlags": [],
        },
    )
    if source not in record["evidenceSources"]:
        record["evidenceSources"].append(source)
    if len(record["rowRefs"]) < 12:
        record["rowRefs"].append({"source": source, "row": row})
    if not identifier_text:
        record["exceptionFlags"].append("MISSING_MARKETPLACE_IDENTIFIER")


def main() -> None:
    monthly_path = SOURCE_DIR / MONTHLY
    listing_path = SOURCE_DIR / ASSET_LISTING
    titles: dict[str, dict[str, Any]] = {}
    assets: dict[str, dict[str, Any]] = {}
    marketplaces: dict[str, dict[str, Any]] = {}
    source_profiles: dict[str, Any] = {}

    workbook = pd.ExcelFile(monthly_path)
    source_profiles[MONTHLY] = {
        "sizeBytes": monthly_path.stat().st_size,
        "sha256": file_hash(monthly_path),
        "sheets": {},
    }

    for sheet in workbook.sheet_names:
        df = read_sheet(monthly_path, sheet)
        source_profiles[MONTHLY]["sheets"][sheet] = {
            "rows": int(len(df)),
            "columns": [str(c) for c in df.columns],
        }

    isbn_df = read_sheet(monthly_path, "ISBN")
    for idx, row in isbn_df.iterrows():
        isbn = norm_isbn(row.get("ISBN13"))
        title_key = add_title(titles, row.get("Title"), "", "MONTHLY:ISBN", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                "",
                "MONTHLY:ISBN",
                int(idx) + 2,
                infer_format(row.get("Format")),
                isbn=isbn,
                price=row.get("List Price"),
                status=row.get("Status"),
                imprint=row.get("House"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:ISBN", int(idx) + 2, "Publisher Registry", isbn, row.get("Status"), price=row.get("List Price"))

    pod_df = read_sheet(monthly_path, "POD")
    for idx, row in pod_df.iterrows():
        isbn = norm_isbn(row.get("Full ISBN") or row.get("isbn_13") or row.get("isbn"))
        title_key = add_title(titles, row.get("Title"), row.get("author") or row.get("Author Name"), "MONTHLY:POD", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                row.get("author") or row.get("Author Name"),
                "MONTHLY:POD",
                int(idx) + 2,
                infer_format(row.get("binding_type"), "pod"),
                isbn=isbn,
                lsi=row.get("sku"),
                price=row.get("List Price (USD)"),
                status=row.get("title_status_flag_value"),
                imprint=row.get("publisher_imprint"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:POD", int(idx) + 2, row.get("Marketplace") or "Ingram Content", row.get("sku") or isbn, row.get("title_status_flag_value"), price=row.get("List Price (USD)"))

    link_df = read_sheet(monthly_path, "LINK")
    for idx, row in link_df.iterrows():
        isbn = norm_isbn(row.get("parent_isbn") or row.get("isbn"))
        title_key = add_title(titles, row.get("title"), row.get("author"), "MONTHLY:LINK", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("title"),
                row.get("author"),
                "MONTHLY:LINK",
                int(idx) + 2,
                infer_format(row.get("binding_type"), "pod"),
                isbn=isbn,
                lsi=row.get("sku"),
                price=row.get("purchase_price"),
                imprint=row.get("publisher_imprint"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:LINK", int(idx) + 2, row.get("link_name") or "Ingram Link", row.get("sku") or isbn, price=row.get("purchase_price"))

    ebook_df = read_sheet(monthly_path, "EBOOK")
    for idx, row in ebook_df.iterrows():
        isbn = norm_isbn(row.get("Full ISBN"))
        title_key = add_title(titles, row.get("Title"), row.get("ProductAuthor(s)") or row.get("Author Name"), "MONTHLY:EBOOK", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                row.get("ProductAuthor(s)") or row.get("Author Name"),
                "MONTHLY:EBOOK",
                int(idx) + 2,
                infer_format(row.get("ProductFormat"), "ebook"),
                isbn=isbn,
                core=row.get("LineItemReferenceID#"),
                price=row.get("List Price (USD)"),
                imprint=row.get("ImprintName"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:EBOOK", int(idx) + 2, row.get("Marketplace") or "eBook Marketplace", row.get("LineItemReferenceID#") or isbn, price=row.get("List Price (USD)"))

    amazon_df = read_sheet(monthly_path, "AMAZON")
    for idx, row in amazon_df.iterrows():
        raw_id = clean(row.get("ASIN/ISBN"))
        isbn = norm_isbn(raw_id) if len(norm_isbn(raw_id)) in {10, 13} and raw_id[:3].isdigit() else ""
        asin = "" if isbn else raw_id
        title_key = add_title(titles, row.get("Title"), row.get("Author") or row.get("Author Name"), "MONTHLY:AMAZON", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                row.get("Author") or row.get("Author Name"),
                "MONTHLY:AMAZON",
                int(idx) + 2,
                infer_format("", "amazon"),
                isbn=isbn,
                asin=asin,
                price=row.get("List Price (USD)"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:AMAZON", int(idx) + 2, "Amazon KDP", raw_id, price=row.get("List Price (USD)"))

    acx_df = read_sheet(monthly_path, "ACX")
    for idx, row in acx_df.iterrows():
        isbn = norm_isbn(row.get("Digital ISBN"))
        title_key = add_title(titles, row.get("Title"), row.get("Author"), "MONTHLY:ACX", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                row.get("Author"),
                "MONTHLY:ACX",
                int(idx) + 2,
                "Audiobook",
                isbn=isbn,
                acx=row.get("Product ID"),
            )
            add_marketplace(marketplaces, asset_key, "MONTHLY:ACX", int(idx) + 2, "ACX", row.get("Product ID") or isbn)

    listing = pd.read_excel(listing_path, sheet_name="Report", dtype=object)
    source_profiles[ASSET_LISTING] = {
        "sizeBytes": listing_path.stat().st_size,
        "sha256": file_hash(listing_path),
        "sheets": {"Report": {"rows": int(len(listing)), "columns": [str(c) for c in listing.columns]}},
    }
    for idx, row in listing.iterrows():
        isbn = norm_isbn(row.get("Isbn"))
        title_key = add_title(titles, row.get("Title"), row.get("Contributor"), "ASSET_LISTING:Report", int(idx) + 2, isbn)
        if title_key:
            asset_key = add_asset(
                assets,
                title_key,
                row.get("Title"),
                row.get("Contributor"),
                "ASSET_LISTING:Report",
                int(idx) + 2,
                infer_format(row.get("Asset Type")),
                isbn=isbn,
                core=row.get("Title Group ID"),
                status="Active" if clean(row.get("Is Distributable")).lower() in {"true", "yes", "1"} else "Unknown",
                imprint=row.get("Imprint"),
            )
            add_marketplace(marketplaces, asset_key, "ASSET_LISTING:Report", int(idx) + 2, "CoreSource", row.get("Title Group ID") or isbn, status="Live" if clean(row.get("Is Distributable")).lower() in {"true", "yes", "1"} else "Unknown")

    for support in SUPPORT_FILES:
        path = SOURCE_DIR / support
        if path.exists():
            source_profiles[support] = read_csv_profile(path)
        else:
            source_profiles[support] = {"status": "MISSING", "file": support}

    isbn_to_titles: dict[str, set[str]] = defaultdict(set)
    for asset in assets.values():
        if asset["normalizedIsbn"]:
            isbn_to_titles[asset["normalizedIsbn"]].add(asset["normalizedTitle"] if "normalizedTitle" in asset else norm_title(asset["title"]))

    duplicate_isbns = {
        isbn: sorted(titles_for_isbn)
        for isbn, titles_for_isbn in isbn_to_titles.items()
        if len(titles_for_isbn) > 1
    }

    missing_title_assets = [a["assetKey"] for a in assets.values() if "MISSING_TITLE_LINK" in a["exceptionFlags"]]
    missing_identifier_marketplaces = [
        m["marketplaceKey"]
        for m in marketplaces.values()
        if "MISSING_MARKETPLACE_IDENTIFIER" in m["exceptionFlags"]
    ]
    assets_missing_isbn = [
        a["assetKey"]
        for a in assets.values()
        if not a["normalizedIsbn"]
    ]
    titles_missing_author = [
        t["normalizedTitle"]
        for t in titles.values()
        if not t["authors"]
    ]

    for asset in assets.values():
        asset["authors"].sort()
        asset["evidenceSources"].sort()
        asset["imprints"].sort()
        if asset["normalizedIsbn"]:
            asset["metadataStatus"] = "Complete"
        elif asset["asin"] or asset["acxProductId"] or asset["coreSourceId"] or asset["lsiId"]:
            asset["metadataStatus"] = "Incomplete"
        else:
            asset["metadataStatus"] = "Exception"

    for title in titles.values():
        title["authors"].sort()
        title["isbns"].sort()
        title["sources"].sort()

    output = {
        "generatedAt": now_iso(),
        "sourceDirectory": str(SOURCE_DIR),
        "authority": {
            "workbook": "Migration blueprint",
            "dataverse": "Future system of record",
            "sharePoint": "Governed file evidence layer",
            "booksJson": "Legacy website evidence only; not used by this staging engine",
        },
        "sourceProfiles": source_profiles,
        "summary": {
            "titleCandidates": len(titles),
            "publishingAssetCandidates": len(assets),
            "assetMarketplaceCandidates": len(marketplaces),
            "assetsWithIsbn": sum(1 for a in assets.values() if a["normalizedIsbn"]),
            "assetsWithoutIsbn": len(assets_missing_isbn),
            "marketplaceCandidatesMissingIdentifier": len(missing_identifier_marketplaces),
            "duplicateIsbnWithConflictingTitles": len(duplicate_isbns),
            "titlesMissingAuthor": len(titles_missing_author),
        },
        "quality": {
            "duplicateIsbnsWithConflictingTitles": duplicate_isbns,
            "missingTitleAssetKeys": missing_title_assets[:200],
            "assetsMissingIsbn": assets_missing_isbn[:200],
            "marketplacesMissingIdentifier": missing_identifier_marketplaces[:200],
            "titlesMissingAuthor": titles_missing_author[:200],
        },
        "titleCandidates": sorted(titles.values(), key=lambda item: item["normalizedTitle"]),
        "publishingAssetCandidates": sorted(assets.values(), key=lambda item: item["assetKey"]),
        "assetMarketplaceCandidates": sorted(marketplaces.values(), key=lambda item: item["marketplaceKey"]),
    }

    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8")

    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUT.write_text(
        "\n".join(
            [
                "# IS-009 Migration Staging Summary",
                "",
                f"**Generated:** {output['generatedAt']}",
                f"**Source directory:** `{SOURCE_DIR}`",
                "**Boundary:** Staging/profile only; no Dataverse import, no file movement, no royalty/payment activity.",
                "",
                "## Candidate Counts",
                "",
                "| Candidate | Count |",
                "| --- | ---: |",
                f"| Title candidates | {output['summary']['titleCandidates']} |",
                f"| Publishing asset candidates | {output['summary']['publishingAssetCandidates']} |",
                f"| Asset marketplace candidates | {output['summary']['assetMarketplaceCandidates']} |",
                f"| Assets with ISBN | {output['summary']['assetsWithIsbn']} |",
                f"| Assets without ISBN | {output['summary']['assetsWithoutIsbn']} |",
                f"| Marketplace candidates missing identifier | {output['summary']['marketplaceCandidatesMissingIdentifier']} |",
                f"| Duplicate ISBNs with conflicting titles | {output['summary']['duplicateIsbnWithConflictingTitles']} |",
                f"| Titles missing author | {output['summary']['titlesMissingAuthor']} |",
                "",
                "## Source Rule",
                "",
                "- Monthly Reporting workbook is the migration blueprint.",
                "- Bowker/Ingram/LSI/CoreSource reports are supporting proof.",
                "- Dataverse is the future system of record after controlled import.",
                "- SharePoint remains the governed file evidence layer.",
                "- `books.json` was not used by this staging engine.",
                "",
                "## Outputs",
                "",
                f"- `{DATA_OUT}`",
                "",
                "## Next Validation",
                "",
                "1. Review duplicate/conflicting ISBN exceptions.",
                "2. Review assets without ISBN and marketplace rows without identifiers.",
                "3. Confirm duplicate title/format/edition rules before import.",
                "4. Confirm asset health thresholds before automated health scoring.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps({"generatedAt": output["generatedAt"], **output["summary"]}, indent=2))


if __name__ == "__main__":
    main()
