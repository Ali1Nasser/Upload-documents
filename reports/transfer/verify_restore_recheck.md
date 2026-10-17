# Re-check of the restore fixes (independent verifier)

- **Date:** 2026-10-17, 07:33–07:40 UTC. Branch `claude/da-camp-video-plan-qpf3tv`, uncommitted working tree on top of `684da42`.
- **Scope:** the fixes now in `git diff` for `tools/transfer/restore_data.sh`, `docs/transfer/README.md`, `studio/remotion.config.ts` and `harness/setup.sh`. `.gitignore` is unchanged (`.transfer_parts/` is still ignored).
- **Method:** the real restore script, run by absolute path against a fresh synthetic fixture with a TEST passphrase and `file://` and `http://127.0.0.1` URLs. The real passphrase file was not opened or used.

## Verdict: fail. One regression, one fix incomplete

The three restore-script findings are **fixed**. All 21 required and extra restore scenarios behave correctly, apart from the same 4 pre-existing gaps.

The fix for finding 4 (README and setup) **introduced a regression**. The new `remotion.config.ts` line no longer matches the regex that three harness tools use to find the browser:

| Tool | Location | With HEAD config | With new config |
|---|---|---|---|
| setup.sh browser check | `harness/setup.sh:99` | `browser OK` | `MISSING browser (<unset in remotion.config.ts>)` |
| record_studio | `harness/lib/record_studio.py:24` | `browser_executable` = the path, `browser_present: true` | `browser_executable: null`, `browser_present: false` |
| G0 check `studio_browser_documented` | `harness/gates/g00.py:100` | match | `None`, so the check fails |

As a result, `setup.sh node` and `setup.sh all` now exit non-zero **even in this container**, where the browser exists. A re-run of G0 fails, and running `setup.sh node` on the real studio writes `browser_executable: null` into `harness/state/budget.json`.

Finding 4 is also only partly fixed: `REMOTION_BROWSER` reaches only the Remotion CLI config. Seventeen studio files hardcode the container path, including `studio/scripts/p7.ts`, the driver behind `dc render`. Remotion throws when that path is missing, so P7 renders still fail on a desktop.

## Per-finding status

| # | Original finding | Status | Evidence (this run) |
|---|---|---|---|
| F1 | Failed download: obscure error after 100 s | **Fixed** | Missing `file://` part: rc 1 after **60 s** (10+20+30 s back-off, no sleep after try 4). The script prints `download FAILED for data_part_002 from file:///nonexistent/recheck/data_part_002 after 4 tries (link expired or host down?).` and `Parts already verified stay in .transfer_parts; re-run the same command to resume.` There is no raw `sha256sum` error. HTTP 404: same result, rc 1, 60 s, no stray file left. Resume: `have` ×2, then 1 download, rc 0, byte-exact. Stall: see the stall test below. |
| F2 | WORK with a space, glob characters, `#` or `&` breaks `cat $parts` | **Fixed** | `WORK="<abs>/my parts [x]* #1 & co"`: rc 0, byte-exact. Relative `WORK="rel parts dir"`: rc 0, byte-exact. The real manifest parses into 72 `PARTS` entries (`my w/data_part_000` … `my w/data_part_071`). Byte sum 7,476,019,232; 0 CR; 4 fields per row; ends with a newline. |
| F3 | `rm -rf "$WORK"` deletes user files | **Fixed** | `keep_me.txt` in a user WORK was kept (the folder stays, with 0 part files). `notes.txt` in the default `.transfer_parts` was kept. An empty default WORK is removed after success. |
| F4 | README step 4 cannot finish on a fresh desktop | **Partly fixed; regression** | Fixed: `df -Pk` gives `4` GiB here (the old command gave `5`, because `-BG` rounds up; the threshold is 6). The `shasum -a 256` fallback gives the same hash as `sha256sum` and as the stamp `4e0566…843f`. With no `dpkg`, `sec_apt` prints the skip message and returns 0 with 0 missing. `remotion.config.ts`: `tsc` rc 0, and the transpiled config calls `setBrowserExecutable` correctly (env unset → container path; env set to an existing file → that file; env set to a missing path or empty → no call). Not fixed: the regression above, the hardcoded browser in 17 studio files, and the macOS gaps below. |

## Synthetic restore matrix (real script, bash 5.2.21, OpenSSL 3, GNU tar)

**Fixture:** 7 files, including a 300 KB `master_vo_v1.flac`, names with spaces, Arabic names with hamza, glob characters, an empty file and `raw.sha256`.
- Packed as a sorted file list → `tar --format=posix` → `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt`.
- Split into 3 parts of 200,000 + 200,000 + 173,472 B.
- The TEST passphrase contains spaces, `$`, `!`, `'` and `\`.
- Every restored tree was compared by name, size and SHA-256 (`compare.py` run with `python3 -I`).

| # | Scenario | rc | s | Result |
|---|---|---|---|---|
| 1 | Correct pass, default WORK | 0 | 1 | **PASS**: EXACT 7/7; `.transfer_parts` removed |
| 2 | Wrong pass | 1 | 1 | **PASS**: `bad decrypt` + `decrypt failed (wrong passphrase?)`; no `data/`; 3 parts kept for a retry |
| 3a | Part 001 corrupted on the host (1 byte) | 1 | 0 | **PASS**: `SHA-256 mismatch for data_part_001: got bec4… want 2d72…`; no `data/` |
| 3b | Stale, corrupt part 001 already in WORK | 0 | 1 | **PASS**: re-downloaded; EXACT |
| 3c | Manifest rows 000 and 001 swapped (each part valid) | 1 | 0 | **PASS**: `ciphertext SHA-256 mismatch`; no `data/` |
| 4a | Part 002 URL missing (`file://`), real back-off | 1 | **60** | **PASS**: clear message (see F1); 2 verified parts kept |
| 4a′ | Re-run after fixing the URL | 0 | 1 | **PASS**: `have` ×2, 1 download, EXACT |
| 4c | Part 001 gives HTTP 404 (local server), real back-off | 1 | **60** | **PASS**: same message; part 000 kept |
| 4d | All parts over HTTP | 0 | 1 | **PASS**: EXACT |
| 5 | `KEEP_PARTS=1`, then again with every URL broken, then the default | 0/0/0 | ≤1 | **PASS**: run 2 and run 3 printed `have` ×3 and 0 `downloading`; all EXACT; parts kept after runs 1 and 2, removed and WORK gone after run 3 |
| 6a | Absolute WORK with a space, `[x]*`, `#` and `&`, holding a user file | 0 | 1 | **PASS**: EXACT; user file kept |
| 6b | Relative WORK with spaces | 0 | 1 | **PASS**: EXACT; WORK removed |
| 6c | Default WORK holding a user file | 0 | 1 | **PASS**: EXACT; user file kept |
| 7a | No `DATA_PASS`; passphrase on stdin from a file with a newline | 0 | 0 | **PASS**: EXACT |
| 7b | Same, through a pipe | 0 | 0 | **PASS**: EXACT |
| 7c | Stdin without a trailing newline | 1 | 0 | Pre-existing gap: exits silently (`read` returns 1 under `set -e`); nothing created |
| 8a | vo lock spot-check | 0 | – | **PASS**: `data/derived/audio/master_vo_v1.flac sha256 4bdd… OK` (in every successful run) |
| 8b | Wrong hash in the lock | **0** | 1 | Pre-existing gap: prints `MISMATCH vs lock 000…`, but rc stays 0 |
| 8c | No `corpus/edl/lock.json` | 0 | 1 | Pre-existing gap: Python traceback (`FileNotFoundError`), rc 0 |
| 9a | Manifest without a final newline | 0 | 1 | **PASS**: 3 parts; EXACT |
| 9b | CRLF manifest | 0 | 1 | **PASS**: EXACT (the CR is stripped from the URL) |
| 9c | CRLF manifest **and** CRLF `.sha256` files | 1 | 0 | Gap: `ciphertext SHA-256 mismatch: got efd4…f7d7 want efd4…f7d7`. The two values look identical, and the failure now comes **after** every part has downloaded. |
| 9d | Blank lines between manifest rows | 0 | 1 | **PASS**: EXACT |
| 10 | Empty manifest | 2 | 0 | **PASS**: `no parts listed in docs/transfer/data_parts.tsv` (it leaves an empty `.transfer_parts`) |
| 11 | PATH without `sha256sum` (macOS-like, `shasum` only) | 0 | 1 | **PASS**: EXACT |
| – | Script's own `fetch()` against a server that stalls after 10 bytes | 28 | 247 | **PASS**: `curl: (28) Operation too slow. Less than 1024 bytes/sec transferred the last 60 seconds`, 4 attempts (curl `--retry 3`). Before the fix, curl had no stall limit and would hang. The worst case is now about 4 × 247 s + 60 s ≈ 17.5 min per part before the `download FAILED` message. |
| – | Passphrase leak | – | – | **PASS**: 0 occurrences of the TEST passphrase in all test logs. The script passes it only as `-pass env:DATA_PASS`. |
| – | `bash -n` on `restore_data.sh` and `setup.sh` | – | – | **PASS** |

## Findings

### R1 (major, regression): `remotion.config.ts` no longer matches the harness's browser regex

`const HEADLESS_SHELL = process.env.REMOTION_BROWSER ?? '/opt/…'` no longer has a quote right after `=`. Three tools search for `HEADLESS_SHELL\s*=\s*'([^']+)'` or the sed equivalent: `harness/setup.sh:99`, `harness/lib/record_studio.py:24` and `harness/gates/g00.py:100`. All three now get nothing (results in the verdict table above).

**Fix, tested on a scratch copy.** Keep a quoted constant that the regex matches, and use `||` so that an empty variable also falls back:

```ts
const CONTAINER_HEADLESS_SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; // parsed by setup.sh, record_studio.py, g00.py
const HEADLESS_SHELL = process.env.REMOTION_BROWSER || CONTAINER_HEADLESS_SHELL;
```

With this change:
- `record_studio.py` reports the path with `browser_present: true`;
- the setup.sh sed and the g00 regex both return the path;
- `tsc` rc 0;
- behaviour: env unset or empty → container path, an existing path → that path, a missing path → no call.

Optionally, make the three parsers prefer `$REMOTION_BROWSER`, so that setup.sh and G0 also accept a desktop browser.

### R2 (major, F4 incomplete): `REMOTION_BROWSER` does not reach `dc render`

Seventeen files hardcode `const BROWSER = '/opt/pw-browsers/…/headless_shell'` and pass it as `browserExecutable`:
- `studio/scripts/p7.ts:38`, which is the `dc render snap|perf|spec` driver (`tools/dclib/render.py:27`);
- 15 other `studio/scripts/*`;
- `studio/src/components/_fx-b/evidence.ts`.

`tools/dclib/hub_shots.py:52` also globs `/opt/pw-browsers`.

Remotion throws on a missing path (`node_modules/@remotion/renderer/dist/ensure-browser.js:54`: `"browserExecutable" was specified as '…' but the path doesn't exist`). So the README sentence "set `REMOTION_BROWSER` … or leave it unset" is not enough to continue P7 on a desktop.

**Fix:** in `p7.ts`, at least, use `const BROWSER = process.env.REMOTION_BROWSER || '/opt/…'`, and pass `existsSync(BROWSER) ? BROWSER : null` to `openBrowser` and to the common options. Then say in the README that `dc render` honours the variable.

### R3 (minor, F4 incomplete on macOS): the macOS commands do not finish as written

- `node@22` is keg-only. The Homebrew API gives `keg_only: true`, reason `:versioned_formula`, so `node` is not on PATH, and `setup.sh node` reports `MISSING: node 22 + npm`. Add `export PATH="$(brew --prefix node@22)/bin:$PATH"`. The same applies to `openssl@3` (`export PATH="$(brew --prefix openssl@3)/bin:$PATH"`).
- Homebrew's `task-spooler` installs `ts`, not `tsp`. The formula source says `conflicts_with "moreutils", because: "both install a 'ts' executable"`. `dc` accepts `ts` (`tools/dclib/queue.py:29`). But the README skips `sec_apt`, which is where the `ts`→`tsp` symlink is made, and G0 `tsp_available` checks `command -v tsp` only (`g00.py:116`). Add `ln -s "$(command -v ts)" "$(brew --prefix)/bin/tsp"`.
- Not verified: after `curl … uv/install.sh | sh`, uv is in `~/.local/bin` and may not be on PATH in the same shell (`source $HOME/.local/bin/env`). A fresh Ubuntu image may need `sudo apt-get update` before the install line.
- Not verified: the sentence "`harness/setup.sh` does not install system tools for you" is slightly off. `sec_apt` still runs `apt-get install` without `sudo` and reports a failure as a host problem (`setup.sh:27-28`). It only stays harmless if the prerequisites are installed first.

### R4 (minor): CRLF `.sha256` files fail late and confusingly (test 9c)

The URL CR is now stripped, so a CRLF checkout of `docs/transfer/` passes every download, all 7.48 GB of them. It then fails with `got X want X`, and the two values look the same on screen.

**Fix:** `want_stream="$(tr -d '\r\n' < "$STREAM_SHA_FILE")"` (and the same for `want_plain`). With Git for Windows `autocrlf`, the script itself also gets CRLF and stops at once at `set -o pipefail`, so this is an edge case.

### R5 (minor): a wrong `REMOTION_BROWSER` is ignored silently

If the variable is set to a missing path, it is skipped with no message, and Remotion falls back to its own Chrome. Add a `console.warn` when the variable is set but `existsSync` is false.

### Still open, not part of the forwarded findings (unchanged from `verify_restore.md`)

- The lock spot-check runs `python3 -` without `-I` (rule 11).
- A lock mismatch exits 0 (8b); a missing lock prints a traceback (8c).
- Stdin without a trailing newline exits silently (7c).
- A manifest given by absolute path from a subfolder only fails after the download (F7).
- The README's "`dc state brief` should show … P7 in progress" claim.

None of these are regressions.

### Rest of the diff

- `harness/state/queue.json` has 13 changed lines: queue bookkeeping from the verifier jobs, not part of these fixes.
- `docs/transfer/data_parts.tsv`, `data_stream.sha256`, `data_plain.sha256` and `docs/plan/` are identical to HEAD.

## Not run

- **bash 3.2.57 (the default `/bin/bash` on macOS):** not built here. The array code and the `[ "$i" -lt 4 ] && sleep` line in the loop are the same as the finder's patch, which `verify_restore.md` reports as tested on bash 3.2.57 (26 scenarios). This verifier did not reproduce that.
- **Not run on real systems:** macOS, Homebrew, a desktop Ubuntu or WSL run of `setup.sh`, a real `dc render` or `remotion` CLI run with the new config, and `dc gate check G0`. That command writes `reports/gates/G0.json`, so R1 was shown with the gate's own regex instead.
- **Not tested:** the real parts, the live x0.at URLs and the real passphrase (out of scope).

## Hygiene

- **Where the work happened:** `/tmp/claude-0/-home-user-Upload-documents/8d44d46c-8542-5a82-961e-ef96bddd883b/scratchpad/verify/recheck_fix_*`, which held `mkfixture.sh`, `run_tests.sh`, `compare.py`, `stall_server.py` and the logs. Peak extra disk use was under 15 MB, and the scratch tree was deleted at the end.
- **Untrusted input:** Python that read restored trees ran with `python3 -I`.
- **Repo side effects:** `record_studio.py` ran only on scratch copies of `studio/`, so `harness/state/budget.json` is unchanged. Nothing under `data/`, `docs/transfer/data_*` or `docs/plan/` was modified. Nothing was committed or pushed.
