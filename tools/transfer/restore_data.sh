#!/usr/bin/env bash
# Restore the git-ignored data/ folder on a new machine from the verified, encrypted x0.at parts (temp.sh URLs also work).
# Usage (from the repo root):  DATA_PASS='<passphrase from the chat>' bash tools/transfer/restore_data.sh [docs/transfer/data_parts.tsv]
#   (without DATA_PASS the script asks for it). The passphrase is never committed: this repo is public, so the parts are
#   AES-256-CBC ciphertext (openssl enc, PBKDF2-SHA256, 600000 iterations, salted).
# Needs: curl, tar, OpenSSL 1.1.1+ (macOS: brew install openssl@3 and put it first on PATH), and sha256sum (Linux/WSL) or
# shasum (macOS). Free disk: about 2x the total size during restore (parts + extracted files). The parts are deleted after a
# verified extract unless KEEP_PARTS=1.
set -euo pipefail
MANIFEST="${1:-docs/transfer/data_parts.tsv}"
STREAM_SHA_FILE="docs/transfer/data_stream.sha256"   # SHA-256 of the concatenated ciphertext
PLAIN_SHA_FILE="docs/transfer/data_plain.sha256"     # SHA-256 of the decrypted tar stream
WORK="${WORK:-.transfer_parts}"; KEEP_PARTS="${KEEP_PARTS:-0}"
CIPHER=(-aes-256-cbc -pbkdf2 -iter 600000 -md sha256)
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
shastream() { if command -v sha256sum >/dev/null; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }
fetch() { case "$1" in https://temp.sh/*) curl -fSL --retry 3 -X POST "$1" -o "$2";; *) curl -fSL --retry 3 "$1" -o "$2";; esac; }
[ -f "$MANIFEST" ] || { echo "manifest $MANIFEST not found (run from the repo root)"; exit 2; }
openssl enc -help 2>&1 | grep -q pbkdf2 || { echo "this openssl has no -pbkdf2 (macOS: brew install openssl@3)"; exit 2; }
if [ -z "${DATA_PASS:-}" ]; then read -rsp "data passphrase: " DATA_PASS; echo; fi
export DATA_PASS
mkdir -p "$WORK"
# 1) download + verify every part (x0.at serves the file on GET; temp.sh on POST to the page URL)
while IFS=$'\t' read -r part bytes want url; do
  [ -n "$part" ] || continue
  f="$WORK/$part"
  if [ -f "$f" ] && [ "$(sha "$f")" = "$want" ]; then echo "have $part"; continue; fi
  echo "downloading $part ($bytes bytes)"
  for i in 1 2 3 4; do fetch "$url" "$f" && break; sleep $((i*10)); done
  got="$(sha "$f")"
  [ "$got" = "$want" ] || { echo "SHA-256 mismatch for $part: got $got want $want"; exit 1; }
  echo "ok $part"
done < "$MANIFEST"
# 2) concatenate in order and verify the ciphertext, then decrypt and verify the tar stream before extracting
parts=$(cut -f1 "$MANIFEST" | sed "s#^#$WORK/#" | tr '\n' ' ')
want_stream="$(cat "$STREAM_SHA_FILE")"; want_plain="$(cat "$PLAIN_SHA_FILE")"
got_stream="$(cat $parts | shastream)"
[ "$got_stream" = "$want_stream" ] || { echo "ciphertext SHA-256 mismatch: got $got_stream want $want_stream"; exit 1; }
echo "ciphertext verified; decrypting (pass 1: checksum)"
got_plain="$(cat $parts | openssl enc -d "${CIPHER[@]}" -pass env:DATA_PASS | shastream)" || { echo "decrypt failed (wrong passphrase?)"; exit 1; }
[ "$got_plain" = "$want_plain" ] || { echo "decrypted SHA-256 mismatch (wrong passphrase?): got $got_plain want $want_plain"; exit 1; }
echo "decrypted stream verified; extracting (pass 2)"
cat $parts | openssl enc -d "${CIPHER[@]}" -pass env:DATA_PASS | tar -xf -
echo "extracted data/ (ciphertext $got_stream, tar $got_plain verified)"
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
