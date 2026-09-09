#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
# U+2014 em dash must not appear in the repository.
if grep -R --binary-files=without-match -n $'\u2014' \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=lib \
  --exclude-dir=out \
  --exclude-dir=cache \
  --exclude-dir=dist \
  --exclude-dir=.next \
  --exclude-dir=coverage \
  --exclude-dir=playwright-report \
  --exclude="$root/Anubandh_New_Synopsis_No_ESP32.docx" \
  "$root"; then
  echo "Em dash character found. Replace with a comma, colon, hyphen, or a new sentence." >&2
  exit 1
fi
echo "No em dash characters found."
