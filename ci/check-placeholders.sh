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
# Match standalone markers only. This avoids flagging normal words such as
# Italian "Metodo" (which contains "todo") and excludes generated font data.
MATCHES=$(grep -rniE "(^|[^[:alnum:]_])($COMBINED)([^[:alnum:]_]|$)" frontend/src/ backend/src/ shared/src/ \
  --include='*.ts' --include='*.tsx' \
  --exclude='fonts.css.ts' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "Placeholder or stub markers found in production source:"
  echo "$MATCHES"
  exit 1
fi
