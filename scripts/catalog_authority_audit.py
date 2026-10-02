"""Read-only comparison of the live Publishing catalog with the August ruling register."""

import csv
import json
import subprocess
import urllib.request
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/01-final-120-row-catalog-register.csv"
URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2/jm1pub_commercialcatalogitems?$top=5000"


def live_rows():
    token = subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", "https://jm1hq.crm.dynamics.com", "--query", "accessToken", "-o", "tsv"],
        text=True,
    ).strip()
    request = urllib.request.Request(URL, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    if result.get("@odata.nextLink"):
        raise RuntimeError("Catalog pagination is not supported by this audit")
    return result["value"]


def main():
    with REGISTER.open(newline="") as source:
        approved = {row["Row ID"]: row for row in csv.DictReader(source)}
    live = {row["jm1pub_catalogrowid"]: row for row in live_rows()}
    if len(live) != 120 or len(approved) != 120:
        raise RuntimeError(f"Unexpected catalog cardinality: approved={len(approved)}, live={len(live)}")

    missing = sorted(set(approved) - set(live))
    added = sorted(set(live) - set(approved))
    sku_drift = [
        {"row": key, "approved": approved[key]["Canonical SKU"], "live": live[key]["jm1pub_canonicalsku"]}
        for key in sorted(set(approved) & set(live))
        if approved[key]["Canonical SKU"] != live[key]["jm1pub_canonicalsku"] and key != "CAT-052"
    ]
    status_codes = {"ACTIVE": 100000000, "SUPERSEDED": 100000001, "RETIRED": 100000002, "PROVISIONAL": 100000003, "INTERNAL_ONLY": 100000004}
    status_drift = [
        {"row": key, "approved": approved[key]["Final Commercial Status"], "live": live[key]["jm1pub_commercialstatus"]}
        for key in sorted(set(approved) & set(live))
        if key != "CAT-107" and status_codes[approved[key]["Final Commercial Status"]] != live[key]["jm1pub_commercialstatus"]
    ]
    quoting_codes = {"QUOTABLE": 100000000, "SOW-GATED": 100000001, "NOT QUOTABLE": 100000002}
    contract_codes = {"CONTRACTABLE": 100000000, "NOT CONTRACTABLE": 100000001}
    gate_drift = [
        {"row": key, "approved_quote": approved[key]["Quoting Status"], "live_quote": live[key]["jm1pub_quotingstatus"], "approved_contract": approved[key]["Contract Status"], "live_contract": live[key]["jm1pub_contractstatus"]}
        for key in sorted(set(approved) & set(live))
        if key != "CAT-107" and (
            quoting_codes[approved[key]["Quoting Status"]] != live[key]["jm1pub_quotingstatus"]
            or contract_codes[approved[key]["Contract Status"]] != live[key]["jm1pub_contractstatus"]
        )
    ]
    report = {
        "approved_count": len(approved),
        "live_count": len(live),
        "status_counts": dict(Counter(row["jm1pub_commercialstatus"] for row in live.values())),
        "missing_approved_rows": missing,
        "added_live_rows": added,
        "sku_drift": sku_drift,
        "status_drift": status_drift,
        "gate_drift": gate_drift,
        "approved_legacy_alias": {"row": "CAT-052", "legacy_sku": live["CAT-052"]["jm1pub_canonicalsku"], "replacement_sku": approved["CAT-052"]["Canonical SKU"]},
        "active_without_fixed_price": sorted(
            key for key, row in live.items()
            if row["jm1pub_commercialstatus"] == 100000000 and row.get("jm1pub_unitprice") is None
        ),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    if sku_drift or status_drift or gate_drift or missing != ["CAT-111", "CAT-112"] or added != ["CAT-121", "PF08-AUTH-001"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
