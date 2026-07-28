#!/usr/bin/env python3
"""Secret-safe Precoa calendar feed scanner.

The scanner intentionally never writes source lines, matched values, or context
to stdout/stderr. It reports only bounded metadata and the approved redacted
pattern. It exits non-zero if an internal output path would contain an
unredacted Precoa calendar-feed URL.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable


PATTERN = re.compile(r"https://api[.]precoa[.]com/calendarfeed/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+")
REDACTED = "https://api.precoa.com/calendarfeed/[REDACTED]"
SKIP_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    ".turbo",
    ".vercel",
}
TEXT_SUFFIXES = {
    ".csv",
    ".env",
    ".html",
    ".js",
    ".json",
    ".jsonl",
    ".md",
    ".mjs",
    ".ps1",
    ".py",
    ".sh",
    ".txt",
    ".ts",
    ".tsx",
    ".xml",
    ".yaml",
    ".yml",
}


@dataclass
class Finding:
    repository: str
    source: str
    branch_or_commit: str
    path: str
    location: str
    occurrence_count: int
    plaintext_or_protected: str
    active_or_historical: str
    redacted_pattern: str = REDACTED


def safe_print(payload: Any) -> None:
    rendered = json.dumps(payload, indent=2, sort_keys=True)
    rendered_for_check = rendered.replace(REDACTED, "")
    if PATTERN.search(rendered_for_check):
        raise SystemExit("FAIL_CLOSED: attempted unredacted Precoa endpoint output")
    print(rendered)


def decode_bytes(data: bytes) -> str | None:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


def classify_path(path: str) -> str:
    lowered = path.lower()
    if "keyvault" in lowered or "secret" in lowered or "protected" in lowered:
        return "protected_reference_or_secret_context"
    return "plaintext"


def line_findings(repository: str, source: str, branch: str, path: str, text: str, active: str) -> list[Finding]:
    findings: list[Finding] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        count = len(PATTERN.findall(line.replace(REDACTED, "")))
        if count:
            findings.append(
                Finding(
                    repository=repository,
                    source=source,
                    branch_or_commit=branch,
                    path=path,
                    location=f"line:{line_number}",
                    occurrence_count=count,
                    plaintext_or_protected=classify_path(path),
                    active_or_historical=active,
                )
            )
    return findings


def json_findings(
    repository: str,
    source: str,
    branch: str,
    path: str,
    text: str,
    active: str,
) -> list[Finding]:
    try:
        parsed = json.loads(text)
    except Exception:
        return line_findings(repository, source, branch, path, text, active)

    findings: list[Finding] = []

    def visit(value: Any, pointer: str) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                visit(child, f"{pointer}/{str(key).replace('~', '~0').replace('/', '~1')}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, f"{pointer}/{index}")
        elif isinstance(value, str):
            count = len(PATTERN.findall(value.replace(REDACTED, "")))
            if count:
                findings.append(
                    Finding(
                        repository=repository,
                        source=source,
                        branch_or_commit=branch,
                        path=path,
                        location=f"json:{pointer or '/'}",
                        occurrence_count=count,
                        plaintext_or_protected=classify_path(path),
                        active_or_historical=active,
                    )
                )

    visit(parsed, "")
    return findings


def inspect_text(repository: str, source: str, branch: str, path: str, data: bytes, active: str) -> list[Finding]:
    text = decode_bytes(data)
    if text is None:
        return []
    if path.lower().endswith(".json"):
        return json_findings(repository, source, branch, path, text, active)
    return line_findings(repository, source, branch, path, text, active)


def iter_files(root: Path) -> Iterable[Path]:
    for current_root, dirs, files in os.walk(root):
        dirs[:] = [directory for directory in dirs if directory not in SKIP_DIRS]
        for name in files:
            path = Path(current_root) / name
            if not path.is_file():
                continue
            if path.suffix.lower() in TEXT_SUFFIXES or zipfile.is_zipfile(path):
                yield path


def scan_path(path: Path, repository: str, branch: str, active: str) -> list[Finding]:
    findings: list[Finding] = []
    if path.is_dir():
        for file_path in iter_files(path):
            findings.extend(scan_path(file_path, repository, branch, active))
        return findings

    display_path = str(path)
    try:
        if path.is_file() and zipfile.is_zipfile(path):
            with zipfile.ZipFile(path) as archive:
                for entry in archive.infolist():
                    if entry.is_dir():
                        continue
                    entry_name = entry.filename
                    if Path(entry_name).suffix.lower() not in TEXT_SUFFIXES:
                        continue
                    with archive.open(entry) as handle:
                        findings.extend(
                            inspect_text(
                                repository,
                                "zip_entry",
                                branch,
                                f"{display_path}!/{entry_name}",
                                handle.read(),
                                active,
                            )
                        )
        else:
            findings.extend(inspect_text(repository, "file", branch, display_path, path.read_bytes(), active))
    except Exception:
        findings.append(
            Finding(
                repository=repository,
                source="inspection_error",
                branch_or_commit=branch,
                path=display_path,
                location="error:suppressed",
                occurrence_count=0,
                plaintext_or_protected="unknown",
                active_or_historical=active,
            )
        )
    return findings


def run_git(args: list[str], cwd: Path) -> bytes:
    return subprocess.check_output(["git", *args], cwd=cwd, stderr=subprocess.DEVNULL)


def scan_git_history(root: Path, repository: str) -> list[Finding]:
    findings: list[Finding] = []
    commits = run_git(["rev-list", "--all"], root).decode("ascii", errors="ignore").splitlines()
    seen_blobs: set[str] = set()
    for commit in commits:
        tree = run_git(["ls-tree", "-r", "--full-tree", commit], root).decode("utf-8", errors="ignore")
        for row in tree.splitlines():
            parts = row.split(None, 3)
            if len(parts) != 4:
                continue
            blob_id = parts[2]
            file_path = parts[3]
            if blob_id in seen_blobs:
                continue
            if Path(file_path).suffix.lower() not in TEXT_SUFFIXES:
                continue
            seen_blobs.add(blob_id)
            try:
                data = run_git(["show", f"{blob_id}"], root)
            except subprocess.CalledProcessError:
                continue
            blob_findings = inspect_text(repository, "git_blob", commit[:12], file_path, data, "historical")
            findings.extend(blob_findings)
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Secret-safe Precoa calendar feed scanner")
    parser.add_argument("paths", nargs="*", help="Files/directories to scan")
    parser.add_argument("--repository", default="jmerrill-pub")
    parser.add_argument("--branch", default="working-tree")
    parser.add_argument("--history", action="store_true", help="Scan git object history from cwd")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        sample_url = "https://api.precoa.com/calendarfeed/" + "SECRET-GUID"
        sample = json.dumps({"endpoint": sample_url}).encode("utf-8")
        output = [asdict(item) for item in inspect_text("self-test", "string", "test", "sample.json", sample, "active")]
        safe_print({"match_found": bool(output), "findings": output})
        return 0

    all_findings: list[Finding] = []
    for raw_path in args.paths:
        all_findings.extend(scan_path(Path(raw_path), args.repository, args.branch, "active"))
    if args.history:
        all_findings.extend(scan_git_history(Path.cwd(), args.repository))

    safe_print(
        {
            "match_found": bool(all_findings),
            "occurrence_count": sum(item.occurrence_count for item in all_findings),
            "finding_count": len(all_findings),
            "findings": [asdict(item) for item in all_findings],
        }
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        raise SystemExit(1)
