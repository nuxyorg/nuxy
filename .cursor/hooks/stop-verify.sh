#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_DIR="$ROOT/.cursor/hooks/state"
EDITED_LIST="$STATE_DIR/session-edited"

sanitize_path() {
  if command -v python3 >/dev/null 2>&1; then
    PATH="$(
      python3 -c '
import os
skip = (".cursor-server", ".vscode-server")
p = os.environ.get("PATH", "")
print(":".join(x for x in p.split(":")
               if x and not any(s in x for s in skip)))
'
    )"
    export PATH
  fi
}

emit() {
  printf '%s\n' "$1"
  exit 0
}

json_input="$(cat)"
status="completed"

if command -v jq >/dev/null 2>&1; then
  set +e
  status="$(printf '%s' "$json_input" | jq -r '.status // "completed"' 2>/dev/null)"
  set -e
fi

if [[ "$status" == "aborted" ]]; then
  emit '{}'
fi

if [[ ! -s "$EDITED_LIST" ]]; then
  emit '{}'
fi

sanitize_path
cd "$ROOT"

mapfile -t edited_files < <(sort -u "$EDITED_LIST")
: >"$EDITED_LIST"

lintable=()
for file in "${edited_files[@]}"; do
  [[ -f "$file" ]] || continue
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      lintable+=("$file")
      ;;
  esac
done

failures=()

if ((${#lintable[@]} > 0)); then
  lint_output=""
  lint_status=0
  lint_output="$(pnpm exec eslint "${lintable[@]}" 2>&1)" || lint_status=$?
  if [[ $lint_status -ne 0 ]]; then
    failures+=("## ESLint (edited files)
\`\`\`
${lint_output:0:6000}
\`\`\`")
  fi
fi

typecheck_output=""
typecheck_status=0
typecheck_output="$(pnpm typecheck 2>&1)" || typecheck_status=$?

if [[ $typecheck_status -ne 0 ]]; then
  filtered=""
  for file in "${edited_files[@]}"; do
    rel="${file#"$ROOT"/}"
    while IFS= read -r line; do
      if [[ "$line" == *"$rel"* ]]; then
        filtered+="$line"$'\n'
      fi
    done < <(printf '%s\n' "$typecheck_output")
  done

  if [[ -n "$filtered" ]]; then
    failures+=("## Typecheck (edited files)
\`\`\`
${filtered:0:6000}
\`\`\`")
  fi
fi

if ((${#failures[@]} == 0)); then
  emit '{}'
fi

message="Quality checks failed on files you edited. Fix the issues below, then run \`pnpm check:fix\` to verify.

$(printf '%s\n\n' "${failures[@]}")"

if command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "$message" '{followup_message: $msg}'
else
  printf '{"followup_message":%s}\n' "$(printf '%s' "$message" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
fi

exit 0
