#!/usr/bin/env bash
# Restore the git-ignored data/ folder on a new machine from the verified temp.sh parts.
# Usage (from the repo root):  bash tools/transfer/restore_data.sh [docs/transfer/data_parts.tsv]
# Needs: curl, tar, and sha256sum (Linux/WSL) or shasum (macOS). Free disk: about 2x the total size during restore
# (parts + extracted files); use KEEP_PARTS=0 (default) to delete each part after it is extracted.
set -euo pipefail
MANIFEST="${1:-docs/transfer/data_parts.tsv}"
STREAM_SHA_FILE="docs/transfer/data_stream.sha256"
WORK="${WORK:-.transfer_parts}"; KEEP_PARTS="${KEEP_PARTS:-0}"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
shastream() { if command -v sha256sum >/dev/null; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }
[ -f "$MANIFEST" ] || { echo "manifest $MANIFEST not found (run from the repo root)"; exit 2; }
mkdir -p "$WORK"
# 1) download + verify every part (temp.sh serves the file on POST to the page URL)
while IFS=$'\t' read -r part bytes want url; do
  [ -n "$part" ] || continue
  f="$WORK/$part"
  if [ -f "$f" ] && [ "$(sha "$f")" = "$want" ]; then echo "have $part"; continue; fi
  echo "downloading $part ($bytes bytes)"
  for i in 1 2 3 4; do curl -fSL --retry 3 -X POST "$url" -o "$f" && break; sleep $((i*10)); done
  got="$(sha "$f")"
  [ "$got" = "$want" ] || { echo "SHA-256 mismatch for $part: got $got want $want"; exit 1; }
  echo "ok $part"
done < "$MANIFEST"
# 2) concatenate in order, verify the whole stream, extract into the repo root
parts=$(cut -f1 "$MANIFEST" | sed "s#^#$WORK/#" | tr '\n' ' ')
want_stream="$(cat "$STREAM_SHA_FILE")"
got_stream="$(cat $parts | shastream)"
[ "$got_stream" = "$want_stream" ] || { echo "stream SHA-256 mismatch: got $got_stream want $want_stream"; exit 1; }
cat $parts | tar -xf -
echo "extracted data/ (stream SHA-256 $got_stream verified)"
[ "$KEEP_PARTS" = "1" ] || rm -rf "$WORK"
# 3) spot-check the locked narration master against corpus/edl/lock.json
python3 - <<'PY' || true
import hashlib, json
lock = json.load(open("corpus/edl/lock.json"))
h = hashlib.sha256()
with open(lock["vo"], "rb") as f:
    for b in iter(lambda: f.read(1 << 20), b""):
        h.update(b)
print(lock["vo"], "sha256", h.hexdigest(), "OK" if h.hexdigest() == lock["vo_sha256"] else "MISMATCH vs lock " + lock["vo_sha256"])
PY
