#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_DIR="$ROOT/.cursor/hooks/state"
EDITED_LIST="$STATE_DIR/session-edited"
mkdir -p "$STATE_DIR"

json_input="$(cat)"
file_path=""

if command -v jq >/dev/null 2>&1; then
  file_path="$(printf '%s' "$json_input" | jq -r '.file_path // empty' 2>/dev/null || true)"
fi

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.md|*.css|*.yml|*.yaml)
    ;;
  *)
    exit 0
    ;;
esac

printf '%s\n' "$file_path" >>"$EDITED_LIST"
sort -u "$EDITED_LIST" -o "$EDITED_LIST"

cd "$ROOT"
pnpm exec prettier --write "$file_path" >/dev/null 2>&1 || true

exit 0
