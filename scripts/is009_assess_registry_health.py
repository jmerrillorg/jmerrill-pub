#!/usr/bin/env python3

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


STAGING_PATH = Path("data/is009-publishing-asset-staging.json")
HEALTH_OUT = Path("data/is009-publishing-asset-health.json")
DASHBOARD_OUT = Path("docs/implementation/PAM-001-Enterprise-Asset-Registry-Dashboard.md")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def pct(numerator: int, denominator: int) -> float:
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def main() -> None:
    staging = json.loads(STAGING_PATH.read_text(encoding="utf-8"))
    titles = staging["titleCandidates"]
    assets = staging["publishingAssetCandidates"]
    marketplaces = staging["assetMarketplaceCandidates"]

    assets_with_isbn = [asset for asset in assets if asset.get("normalizedIsbn")]
    assets_with_title = [asset for asset in assets if asset.get("titleKey")]
    assets_with_marketplace_id = [
        row for row in marketplaces if row.get("marketplaceIdentifier")
    ]
    assets_with_author = [asset for asset in assets if asset.get("authors")]
    assets_with_format = [asset for asset in assets if asset.get("assetFormat")]

    by_format = Counter(asset.get("assetFormat") or "Unknown" for asset in assets)
    by_marketplace = Counter(row.get("marketplace") or "Unknown" for row in marketplaces)
    by_metadata_status = Counter(asset.get("metadataStatus") or "Unknown" for asset in assets)

    asset_exceptions = defaultdict(list)
    for asset in assets:
        if not asset.get("normalizedIsbn"):
            asset_exceptions["MISSING_ISBN"].append(asset["assetKey"])
        if not asset.get("titleKey"):
            asset_exceptions["MISSING_TITLE_LINK"].append(asset["assetKey"])
        if not asset.get("authors"):
            asset_exceptions["MISSING_AUTHOR"].append(asset["assetKey"])
        if not asset.get("assetFormat"):
            asset_exceptions["MISSING_FORMAT"].append(asset["assetKey"])

    marketplace_exceptions = defaultdict(list)
    for row in marketplaces:
        if not row.get("marketplaceIdentifier"):
            marketplace_exceptions["MISSING_MARKETPLACE_IDENTIFIER"].append(row["marketplaceKey"])
        if not row.get("assetKey"):
            marketplace_exceptions["MISSING_ASSET_LINK"].append(row["marketplaceKey"])

    metrics = {
        "generatedAt": now_iso(),
        "sourceStagingGeneratedAt": staging["generatedAt"],
        "scope": "PAM-001 / IS-009 staging health; no Dataverse import performed",
        "counts": {
            "titleCandidates": len(titles),
            "publishingAssetCandidates": len(assets),
            "assetMarketplaceCandidates": len(marketplaces),
        },
        "readiness": {
            "assetsWithTitleLinkPct": pct(len(assets_with_title), len(assets)),
            "assetsWithIsbnPct": pct(len(assets_with_isbn), len(assets)),
            "assetsWithAuthorPct": pct(len(assets_with_author), len(assets)),
            "assetsWithFormatPct": pct(len(assets_with_format), len(assets)),
            "marketplaceRowsWithIdentifierPct": pct(len(assets_with_marketplace_id), len(marketplaces)),
            "duplicateIsbnConflictCount": staging["summary"]["duplicateIsbnWithConflictingTitles"],
        },
        "distributions": {
            "assetFormat": dict(sorted(by_format.items())),
            "marketplace": dict(sorted(by_marketplace.items())),
            "metadataStatus": dict(sorted(by_metadata_status.items())),
        },
        "exceptions": {
            "assetExceptionCounts": {key: len(value) for key, value in sorted(asset_exceptions.items())},
            "marketplaceExceptionCounts": {
                key: len(value) for key, value in sorted(marketplace_exceptions.items())
            },
            "assetExceptionSamples": {key: value[:25] for key, value in sorted(asset_exceptions.items())},
            "marketplaceExceptionSamples": {
                key: value[:25] for key, value in sorted(marketplace_exceptions.items())
            },
        },
        "status": {
            "schema": "DEPLOYED_TO_JM1_DEV",
            "migrationEngine": "OPERATIONAL_STAGING_ONLY",
            "healthEngine": "OPERATIONAL_STAGING_ONLY",
            "dataverseImport": "NOT_STARTED",
            "assetHealthThreshold": "PENDING_JACKIE_DECISION",
        },
    }

    HEALTH_OUT.parent.mkdir(parents=True, exist_ok=True)
    HEALTH_OUT.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

    DASHBOARD_OUT.write_text(
        "\n".join(
            [
                "# PAM-001 - Enterprise Asset Registry Dashboard",
                "",
                f"**Generated:** {metrics['generatedAt']}",
                "**Status:** Staging dashboard; no Dataverse import performed",
                "",
                "## Build State",
                "",
                "| Area | Status |",
                "| --- | --- |",
                "| JM1-Dev baseline | Complete |",
                "| IS-009 schema | Deployed and validated |",
                "| Migration staging engine | Operational |",
                "| Registry health engine | Operational for staging |",
                "| Dataverse import | Not started |",
                "| SharePoint file movement | Not started |",
                "| Royalty/payment activity | Not touched |",
                "",
                "## Registry Staging Metrics",
                "",
                "| Metric | Value |",
                "| --- | ---: |",
                f"| Title candidates | {len(titles)} |",
                f"| Publishing asset candidates | {len(assets)} |",
                f"| Marketplace candidates | {len(marketplaces)} |",
                f"| Assets with title link | {metrics['readiness']['assetsWithTitleLinkPct']}% |",
                f"| Assets with ISBN | {metrics['readiness']['assetsWithIsbnPct']}% |",
                f"| Assets with author evidence | {metrics['readiness']['assetsWithAuthorPct']}% |",
                f"| Assets with format | {metrics['readiness']['assetsWithFormatPct']}% |",
                f"| Marketplace rows with identifier | {metrics['readiness']['marketplaceRowsWithIdentifierPct']}% |",
                f"| Duplicate ISBN conflicts | {metrics['readiness']['duplicateIsbnConflictCount']} |",
                "",
                "## Exception Queue",
                "",
                "| Exception | Count |",
                "| --- | ---: |",
                *[
                    f"| {key} | {value} |"
                    for key, value in metrics["exceptions"]["assetExceptionCounts"].items()
                ],
                *[
                    f"| {key} | {value} |"
                    for key, value in metrics["exceptions"]["marketplaceExceptionCounts"].items()
                ],
                "",
                "## Marketplace Distribution",
                "",
                "| Marketplace | Candidate Rows |",
                "| --- | ---: |",
                *[
                    f"| {key} | {value} |"
                    for key, value in metrics["distributions"]["marketplace"].items()
                ],
                "",
                "## Next Actions",
                "",
                "1. Review exception queues before import.",
                "2. Approve asset health threshold and duplicate title/format/edition rules.",
                "3. Harden service-principal metadata access before unattended automation.",
                "4. Run controlled import only after validation approval.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps(metrics["readiness"], indent=2))


if __name__ == "__main__":
    main()
