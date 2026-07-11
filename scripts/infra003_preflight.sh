#!/usr/bin/env bash
set -euo pipefail

JM1_PRIME_MOUNT_DEFAULT="${JM1_PRIME_MOUNT:-/Volumes/UsersExternal}"
JM1_PRIME_HOME_DEFAULT="${JM1_PRIME_HOME:-$JM1_PRIME_MOUNT_DEFAULT/JM1-PRIME}"
PREFLIGHT_TARGET="${JM1_PRIME_HOME_DEFAULT}/jm1-prime-preflight.sh"

if [ ! -d "$JM1_PRIME_MOUNT_DEFAULT" ]; then
  echo "STOP: external mount is not available at $JM1_PRIME_MOUNT_DEFAULT" >&2
  exit 1
fi

if [ ! -d "$JM1_PRIME_HOME_DEFAULT" ]; then
  echo "STOP: JM1-PRIME execution home is not available at $JM1_PRIME_HOME_DEFAULT" >&2
  exit 1
fi

if [ ! -x "$PREFLIGHT_TARGET" ]; then
  echo "STOP: canonical preflight is not executable at $PREFLIGHT_TARGET" >&2
  exit 1
fi

exec "$PREFLIGHT_TARGET"
