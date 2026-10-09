#!/usr/bin/env bash
# Export the frozen zod catalog to harness/schemas/components/*.json and run the contract checks. Light CPU; no render.
set -euo pipefail
S="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/dc_catalog_export.cjs"
"$S/node_modules/.bin/esbuild" "$S/scripts/export_catalog.ts" --bundle --platform=node --format=cjs --log-level=warning --outfile="$OUT"
NODE_PATH="$S/node_modules" node "$OUT" "$(cd "$S/.." && pwd)"
rm -f "$OUT"
