#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository yet; skipping staged-file secret check."
  exit 0
fi
if git diff --cached --name-only | grep -E '(^|/)\.env$|\.pem$|keystore|mnemonic\.txt|private-keys\.json' ; then
  echo "Refusing to commit secret-bearing files." >&2
  exit 1
fi
echo "Secret path check passed."
