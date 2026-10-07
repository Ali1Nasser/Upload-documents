# Recon inventory snapshot (2026-10-07)

This folder holds machine-readable output from the read-only reconnaissance of the six source archives.
P1 uses it to verify downloads and reconcile extraction. Nothing here contains file *contents*, only names, sizes, hashes and media facts.

| File | Rows | Columns |
|---|---|---|
| `archives.tsv` | 6 | archive, temp.sh URL, bytes, sha256, temp.sh `last-modified`, estimated expiry (+3 days) |
| `full_inventory.tsv` | 5,488 | archive chain (`A.zip > B.zip > …`), member path, size, compressed size, type. Recursive listing (zip-in-zip and tar.xz) produced *without* extracting |
| `unique_files.tsv` | 1,119 | sha1, number of copies, category, bytes, canonical path, up to 3 other copies |
| `media_probe.tsv` | 121 | copies, canonical path, duration (s), video (WxH@fps), audio (codec, rate, channels), for every unique audio/video file |

Path convention in `unique_files.tsv` and `media_probe.tsv`: archive `X.zip` is extracted to `X.zip.d/`, and a nested archive `Y.zip` (or `Y.tar.xz`)
is extracted next to itself as `Y.zip.d/` (`Y.tar.xz.d/`). The P1 extractor must use the same convention so paths line up.

Files deliberately **not** extracted during recon, and never to be extracted: `.ssh/id_ed25519`, `.ssh/id_ed25519.pub`, `.ssh/known_hosts`,
`.ssh-id_ed25519`, `.ssh-known_hosts`, `.sudo_as_admin_successful` (sandbox leftovers inside the LMArena workspace dumps).
They still appear by name in `full_inventory.tsv` because that listing was read from the archive directories.
