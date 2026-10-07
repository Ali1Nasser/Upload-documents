# Lessons (append-only pitfalls; newest at the bottom of each section)

Format: one bullet per lesson, with the evidence or the file where it bites. Never delete; supersede with a new bullet.

## From earlier attempts (docs/plan/01_SOURCE_RECON.md section 5)

1. Arabic text must be shaped (HarfBuzz/raqm). Pillow without raqm draws disconnected letters. Noto Sans Arabic produced tofu for the em dash and Latin runs in one build; the merged IBM Plex Arabic fonts fixed it.
2. The ChatGPT "Arabic" masters are picture-only: no Egyptian narration was ever voiced on them (HeyGen ran out of TTS minutes).
3. S1 is the narration that matches the 70:05 picture. S2 (Esraa) is continuous talk not timed to the picture.
4. Sandbox resets destroyed builds kept in build/-style folders that the snapshot excluded. Keep irreplaceable state in versioned paths (corpus/, harness/state/, docs/); regenerable output goes under data/.
5. Two parallel 1080p encoders plus a frame cache tripped the OOM killer on 2 GB machines. Render in bounded batches through the queue (tsp, slots = nproc - 1).
6. A merge bug once produced a 2 h 13 m file. Always verify video duration == audio duration per chapter and for the final film.
7. master.md has internal contradictions (CH-00/03/24 "Artifact: none" while section 15 requires one per chapter; CH-36 has no prediction). Preserve and log them for the Council (ADR-008); never rewrite silently.
8. Speech share for the TTS build was 0.75 (52:19 of speech in 70:05). Chapter durations came from narration at 125 wpm (AR) and 135 wpm (EN) plus a 5 s prediction pause.

## Environment and network facts (measured 2026-10-07, this container: 4 vCPU, 15 GB RAM, no GPU, about 20 GB disk)

9. Reachable: pypi.org, files.pythonhosted.org, registry.npmjs.org, download.pytorch.org, archive.ubuntu.com, huggingface.co plus its xet CDN us.aws.cdn.hf.co, raw.githubusercontent.com.
10. Blocked: github.com API and codeload (no `pip install git+https://github...`), dl.fbaipublicfiles.com (Demucs weights and the torchaudio MMS_FA bundle are unavailable; use the HF mirrors), storage.googleapis.com (Remotion cannot download its own Chrome; use the preinstalled headless shell under /opt/pw-browsers/chromium_headless_shell-1194/), cdn-lfs.huggingface.co (huggingface_hub downloads still work through the xet bridge).
11. `git push` from this container is denied (403). Commit locally only; never retry a push.
12. System ffmpeg 6.1.1 has libx264 and libx265 but no libvmaf; scoring uses the static ffmpeg 7.0.2 from imageio-ffmpeg (tools/bin/ffmpeg-vmaf, see harness/state/budget.json).
13. Disk is the tight resource (about 20 GB at start, about 11 GB after raw zips + extraction + models). The queue refuses jobs when free disk < expected + 3 GB; delete preview renders of approved chapters first, never data/raw.
14. Sources are in data/raw/*.zip (SHA-256 verified) and data/extracted/<X>.zip.d/. The SSH key, known_hosts and .sudo_as_admin_successful members were never extracted (15 names in corpus/catalog/quarantine.json).

## Harness lessons (P0)

15. `ts` can be moreutils' timestamp tool, not task-spooler. tools/dclib/queue.py accepts `ts` only if its `-h` text says task-spooler; Ubuntu's package installs `tsp`.
16. Time conversion is round-half-up in integer math (`(2*ms*fps + 1000) // 2000`); Python's round() is banker's rounding and drifts at x.5. Use only `dc time ms2frame|frame2ms`.
17. Canonical path = shortest path, then lexicographic by code point. The recon inventory broke one length tie case-insensitively (DA-Camp-Lab_M12.html vs baseline_M12_RC.html); recorded in corpus/catalog/reconcile_explained.json. Do not "fix" it twice.
18. Decoding all 121 unique media files takes on the order of 15+ minutes on 4 shared vCPUs (a 70 min 720p10 file decodes in about 2 minutes under load; 26.4 h of media in total). Run `dc ingest probe` only when no benchmark is running, or it distorts the timing numbers in budget.json.
19. Hook scripts must strip heredoc bodies before looking for violations, otherwise writing a test file that contains `rm -rf /` through a heredoc is blocked. guard_bash.py tokenises with shlex and judges only real command segments; it fails open on any parse error.
20. Several agents share one git worktree. Commit by explicit path (`git add <files>`), never `git add -A`, and never overwrite state files another agent owns (budget.json is written through harness/lib/budget_io.py with a lock).
21. A gate with no checker yet stays `pending` (not `fail`) when checked; `dc gate check` is the only path to `pass`, and only an ADR can set `waived`.
22. The render benchmark is stored under `render_bench` (swangle; `render_bench_swiftshader` for the other GL). The G0 gate and `dc state brief` once read a never-written `render_s_per_frame` key and failed. Fix: `dclib.common.render_bench_summary()` validates the real 3 compositions x concurrency 1/2/3 numbers, and render_bench.py writes a derived `render_s_per_frame` summary. A hand-typed or partial value does not satisfy the gate.
23. Limitations are recorded in harness/state/budget.json `limitations` (blocked fbaipublicfiles, Remotion Chrome host, GitHub push, no libvmaf in system ffmpeg, CPU render projection of 64.7 h swangle / 24.7 h swiftshader against a 24 h budget). G0 check `limitations_documented` lists them in its report, so they never pass silently. The render projection is a real risk for G6a/G9b; it is not waived.

## Environment completeness (G0 fix, 2026-10-07)

22. The first P0 pass shipped without the ECAPA speaker model, speechbrain, torchmetrics[audio] and camel-tools because they were never in setup.sh's list or fetch_models.py, and the env report claimed "all installed". Audit the plan's list (03 P0.3) against the venv and data/models mechanically; G0 check `environment_complete` now does this, and `limitations_documented` requires every gap to be recorded in budget.json "limitations".
23. ECAPA is `speechbrain/spkrec-ecapa-voxceleb` on huggingface.co (works through the xet bridge). Load with `EncoderClassifier.from_hparams(source=data/models/ecapa-voxceleb, savedir=<scratch dir>)`; run it with `python3 -I`.
24. camel-tools data comes from GitHub release assets (github.com/.../releases/download) plus the catalogue at raw.githubusercontent.com. Both are reachable through the proxy even though the github.com API and codeload are blocked. Fetch with `CAMELTOOLS_DATA=data/models/camel_data camel_data -i morphology-db-egy-r13` (the directory must exist first); `harness/lib/fetch_models.py camel-data` wraps it.
25. Documented limitations (blocked hosts and their workarounds) live in harness/state/budget.json "limitations" and are rewritten by harness/lib/record_env.py, merged by id so other agents' entries survive.

## Node/fonts bootstrap (P0 fix after G0 verifier)

24. harness/setup.sh now has `node` and `fonts` sections (default `all` = apt, python, node, fonts, models, verify). `node` runs `npm ci` in studio/ keyed on the sha256 of package-lock.json (stamp studio/node_modules/.dc_lock_sha256), checks installed versions equal the exact pins, checks the browser executable named in remotion.config.ts, and runs `tsc --noEmit` (DEEP=1 also lists Remotion compositions). `fonts` copies PlexAR-*/Mono-* from the extracted archive when present, runs studio/fetch_fonts.sh, then harness/lib/check_fonts.py (22 faces parse; Arabic faces cover alef). Proven from scratch with DC_STUDIO=<copy of studio without node_modules or fonts>: npm ci plus all fonts fetched byte-identical to the committed ones, rerun skipped everything, FORCE=1 healed a deliberately broken package.
25. Remotion's own Chrome (storage.googleapis.com) cannot be downloaded here; studio/remotion.config.ts points at /opt/pw-browsers/chromium_headless_shell-1194/. This is the documented limitation `remotion_chrome_download` in budget.json; setup.sh prints it on every run and G0 `studio_browser_documented` passes only if the shell is executable AND the limitation is recorded. On a box without /opt/pw-browsers, setup.sh reports MISSING and names the host to allow.
26. Partial setup runs (`setup.sh node`) write reports/perf/setup_partial.txt; only a full run writes setup_last.txt, which G0 reads. budget_io.update replaces list values wholesale: merge `limitations` by id, never overwrite (two entries were lost once and restored).

## Visual assets (P2.7, 2026-10-07)

27. The plan's keyframe filter `select='gt(scene,0.25)'` finds nothing in the Claude film (dark UI, cross-fades): over all 70:05 the full-rate scene score never reaches 0.25 (max 0.232; 168 frames > 0.02, 21 > 0.1). `dc visual keyframes` keeps the scene filter (scores recorded from 0.02, hard cuts >= 0.25 still boost priority) and finds shots from a 2 fps 160x90 gray thumbnail stream instead: settled states of the main panel (rows 14-78 %, which masks the title/progress bar, caption bar and the running timecode), thinned to >= 8 s apart. Result: 281 states -> 207 keyframes, every chapter covered (4-8 each), all JPGs verified against their thumbnail (worst mean abs diff 2.3/255). Detect costs ~10 min in one queue slot; the 121 MB thumbnail file in data/derived/keyframes/claude_film/_detect/ lets select/extract re-run without decoding again.
28. tesseract 5.3.4 (ara+eng, psm 6) reads the Claude film well only from the full 1080p frame (640-px JPGs give garbage) and runs 2x faster on the inverted (dark-on-light) image with identical text, so `dc visual ocr` grabs the film frame with ffmpeg and inverts images with mean gray < 110. NotebookLM whiteboard slides OCR noisily (median word confidence ~64); treat slide OCR as a hint for captioning, not as text truth.
