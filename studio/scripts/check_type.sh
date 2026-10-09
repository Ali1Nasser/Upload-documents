#!/usr/bin/env bash
# Unit checks for studio/src/type (tashkeel clearance, U+2212 minus, faces, runs). Light CPU; no render.
set -euo pipefail
S="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/dc_type_check.cjs"
"$S/node_modules/.bin/esbuild" "$S/src/type/arabic.check.ts" --bundle --platform=node --format=cjs --log-level=warning --outfile="$OUT"
NODE_PATH="$S/node_modules" node "$OUT"
rm -f "$OUT"
