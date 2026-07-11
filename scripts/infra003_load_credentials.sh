#!/usr/bin/env bash
set -euo pipefail

JM1_PRIME_MOUNT_DEFAULT="${JM1_PRIME_MOUNT:-/Volumes/UsersExternal}"
JM1_PRIME_HOME_DEFAULT="${JM1_PRIME_HOME:-$JM1_PRIME_MOUNT_DEFAULT/JM1-PRIME}"
SESSION_TARGET="${JM1_PRIME_HOME_DEFAULT}/jm1-prime-session.sh"
LOAD_TARGET="${JM1_PRIME_HOME_DEFAULT}/jm1-prime-load-credentials.sh"

if [ ! -d "$JM1_PRIME_MOUNT_DEFAULT" ]; then
  echo "STOP: external mount is not available at $JM1_PRIME_MOUNT_DEFAULT" >&2
  exit 1
fi

if [ ! -d "$JM1_PRIME_HOME_DEFAULT" ]; then
  echo "STOP: JM1-PRIME execution home is not available at $JM1_PRIME_HOME_DEFAULT" >&2
  exit 1
fi

if [ ! -r "$SESSION_TARGET" ]; then
  echo "STOP: canonical session script is not readable at $SESSION_TARGET" >&2
  exit 1
fi

if [ ! -r "$LOAD_TARGET" ]; then
  echo "STOP: canonical credential loader is not readable at $LOAD_TARGET" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$SESSION_TARGET" >/dev/null
# shellcheck disable=SC1090
source "$LOAD_TARGET" "$@"
