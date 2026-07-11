#!/usr/bin/env bash
set -euo pipefail

JM1_PRIME_MOUNT_DEFAULT="${JM1_PRIME_MOUNT:-/Volumes/UsersExternal}"
JM1_PRIME_HOME_DEFAULT="${JM1_PRIME_HOME:-$JM1_PRIME_MOUNT_DEFAULT/JM1-PRIME}"
BOOTSTRAP_TARGET="${JM1_PRIME_HOME_DEFAULT}/jm1-prime-bootstrap.sh"

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This wrapper must be sourced, not executed." >&2
  echo "Use: source ${BASH_SOURCE[0]}" >&2
  exit 1
fi

if [ ! -d "$JM1_PRIME_MOUNT_DEFAULT" ]; then
  echo "STOP: external mount is not available at $JM1_PRIME_MOUNT_DEFAULT" >&2
  return 1
fi

if [ ! -d "$JM1_PRIME_HOME_DEFAULT" ]; then
  echo "STOP: JM1-PRIME execution home is not available at $JM1_PRIME_HOME_DEFAULT" >&2
  return 1
fi

if [ ! -r "$BOOTSTRAP_TARGET" ]; then
  echo "STOP: canonical bootstrap is not readable at $BOOTSTRAP_TARGET" >&2
  return 1
fi

# shellcheck disable=SC1090
source "$BOOTSTRAP_TARGET"
