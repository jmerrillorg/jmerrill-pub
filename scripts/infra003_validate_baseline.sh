#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP_WRAPPER="$ROOT_DIR/scripts/infra003_bootstrap.sh"
PREFLIGHT_WRAPPER="$ROOT_DIR/scripts/infra003_preflight.sh"
LOAD_WRAPPER="$ROOT_DIR/scripts/infra003_load_credentials.sh"

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

pass() {
  printf 'PASS %s\n' "$1"
}

contains_once() {
  local needle="$1"
  local haystack=":$2:"
  local trimmed="${needle#:}"
  trimmed="${trimmed%:}"
  local count
  count="$(printf '%s\n' "$haystack" | awk -F":$trimmed:" '{print NF-1}')"
  [ "$count" -eq 1 ]
}

[ -f "$BOOTSTRAP_WRAPPER" ] || fail "repo-bootstrap-wrapper-missing"
[ -f "$PREFLIGHT_WRAPPER" ] || fail "repo-preflight-wrapper-missing"
[ -f "$LOAD_WRAPPER" ] || fail "repo-credential-wrapper-missing"
pass "repo-wrappers-present"

missing_volume_output="$(JM1_PRIME_MOUNT=/Volumes/DefinitelyMissingJM1 "$PREFLIGHT_WRAPPER" 2>&1 || true)"
printf '%s\n' "$missing_volume_output" | grep -q "STOP: external mount is not available" || fail "missing-volume-not-clear"
pass "missing-volume-fails-clearly"

static_preflight_checks=(
  "azure:tenant-mismatch"
  "azure:subscription-mismatch"
  "github:auth"
  "pac:auth"
  "sharepoint:reachable"
  "runtime:reachable"
)

for check in "${static_preflight_checks[@]}"; do
  grep -q "$check" "/Volumes/UsersExternal/JM1-PRIME/jm1-prime-preflight.sh" || fail "missing-preflight-check:$check"
done
pass "preflight-contract-checks-present"

PATH_BEFORE="${PATH:-}"
# shellcheck disable=SC1090
source "$BOOTSTRAP_WRAPPER"
PATH_AFTER_ONE="${PATH:-}"
# shellcheck disable=SC1090
source "$BOOTSTRAP_WRAPPER"
PATH_AFTER_TWO="${PATH:-}"

[ "$PATH_AFTER_ONE" = "$PATH_AFTER_TWO" ] || fail "bootstrap-not-idempotent"
contains_once "$JM1_PRIME_HOME/tooling/bin" "$PATH_AFTER_TWO" || fail "tooling-bin-duplicated"
[ -n "$PATH_BEFORE" ] || fail "system-path-empty-before-bootstrap"
printf '%s\n' "$PATH_AFTER_TWO" | grep -q "/usr/bin" || fail "system-path-not-preserved"
pass "bootstrap-idempotent-and-preserves-system-path"

required_tools=(az gh pac git node npm pnpm pwsh jq curl)
for tool in "${required_tools[@]}"; do
  command -v "$tool" >/dev/null 2>&1 || fail "tool-missing:$tool"
  pass "tool-resolves:$tool"
done

preflight_output="$("$PREFLIGHT_WRAPPER" 2>&1)" || {
  printf '%s\n' "$preflight_output"
  fail "external-preflight-failed"
}

printf '%s\n' "$preflight_output" | grep -q "PASS azure tenant=352d075e-8e17-4169-9f8e-22e6946ce66d" || fail "azure-target-not-confirmed"
printf '%s\n' "$preflight_output" | grep -q "PASS dataverse environment=JM1-Core" || fail "dataverse-core-not-confirmed"
printf '%s\n' "$preflight_output" | grep -q "PASS runtime url=https://jmerrill.pub" || fail "runtime-not-confirmed"
printf '%s\n' "$preflight_output" | grep -q "PASS env:DATAVERSE_CLIENT_SECRET" || fail "env-presence-not-confirmed"
printf '%s\n' "$preflight_output" | grep -q "JM1-PRIME preflight complete." || fail "preflight-did-not-complete"
pass "external-preflight-pass"

if printf '%s\n' "$preflight_output" | grep -Eq '(gho_|ghp_|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|CLIENT_SECRET=.*[^[:space:]])'; then
  fail "secret-material-found-in-output"
fi
pass "no-secrets-in-output"
