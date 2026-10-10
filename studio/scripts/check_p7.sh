#!/usr/bin/env bash
# Unit checks for the P7 type engine and scene compiler (no render; light CPU). Real EDL / word map / _demo spec read-only.
set -euo pipefail
S="$(cd "$(dirname "$0")/.." && pwd)"
T="${TMPDIR:-/tmp}"
for f in src/type/arabic.check.ts src/type/p7.check.ts src/spec/resolve.check.ts; do
  o="$T/dc_p7_$(basename "$f" .ts).cjs"
  "$S/node_modules/.bin/esbuild" "$S/$f" --bundle --platform=node --format=cjs --log-level=warning --outfile="$o"
  (cd "$S" && NODE_PATH="$S/node_modules" DC_ROOT="$(cd "$S/.." && pwd)" node "$o" | grep -v '^ok  ' || true)
  (cd "$S" && NODE_PATH="$S/node_modules" DC_ROOT="$(cd "$S/.." && pwd)" node "$o" > /dev/null)
  rm -f "$o"
done
echo "check_p7: all suites passed"
