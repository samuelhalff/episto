#!/usr/bin/env bash
set -euo pipefail

PATTERNS=(
  'TODO'
  'FIXME'
  'HACK'
  'XXX'
  'NOT_IMPLEMENTED'
)

COMBINED=$(IFS='|'; echo "${PATTERNS[*]}")
MATCHES=$(grep -rniE "$COMBINED" frontend/src/ backend/src/ shared/src/ \
  --include='*.ts' --include='*.tsx' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "Placeholder or stub markers found in production source:"
  echo "$MATCHES"
  exit 1
fi
