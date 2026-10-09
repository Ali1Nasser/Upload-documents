# PHASE-05 (story-editor): P5 narrative assembly and audio lock, gate G5

G5 passes (12/12): `python3 tools/dc.py gate check G5` -> `reports/gates/G5.json`. Checker: `harness/gates/g05.py`.
Code: `tools/dclib/story.py` (order, candidates, E-001), `tools/dclib/radio.py` (gapscan, cut, radio, radio-check, lock, sample),
`tools/dclib/deliver.py` (`dc deliver fyi`; other deliver subcommands are P14 stubs).

## Decision and EDL
- ADR-001 (`docs/decisions/ADR-001-narrative-spine.md`): EDL B100-noC, voices V1 (S1 trunk, S4 voices A/B in Deep-Dives, voice C/P01 dropped),
  S2 reference only. Waivers W-001-RT (runtime over 3.5 h) and W-001-D2 (exactly 103 P01 idea units).
- `corpus/edl/master_edl.v1.json`: 73 chapters (37 trunk, 36 Deep-Dives), 605 spoken segments, 68 visual cards (2.0 s + sting),
  2,524 sentences, 29,480 words, 64 voice switches (16.6/h, max 2 per trunk chapter). Runtime 3:51:00 (415,813 frames at 30 fps).
  306 pauses > 2 s tightened to 2.0 s (486.9 s of measured silence removed; S1 was paced to the old 70:05 picture).
- Coverage 2,743/2,846 units (96.4 %); the 103 not included are exactly the W-001-D2 ids. Redundancy 4.0 %. Prerequisite violations 0.

## Radio edit (`reports/story/radio_check.md`)
`data/derived/audio/master_vo_v1.flac` (48 kHz/24-bit mono FLAC, not committed). 0 clipped words (static 605/605; MMS re-align 625 words in
20 seeded windows). Per-minute loudness -17.05..-15.07 LUFS (max dev 1.05 LU), integrated -16.02 LUFS, TP -1.5 dBTP. 0 unplanned gaps > 2.5 s.

## Lock (`corpus/edl/lock.json`, written by `dc story lock --v 1`, queued)
| Item | SHA-256 |
|---|---|
| VO `data/derived/audio/master_vo_v1.flac` (929,515,179 B) | `57abfd2d8ff43a3d330a73af9951996b5bb1dd545e0b627cc8ab728527213850` |
| EDL `corpus/edl/master_edl.v1.json` | `6b0b112ed6d54641b1cccc47cf4f8953840068577e11f3519bd7a1589b51ba8f` |
| Word map `corpus/edl/word_map.v1.jsonl` | `a3b990b9409e4741265e34f9376b5026faa7b959367b227dcc872e2bba7f1ac9` |

- Word map: each kept word has its permanent `word_id`, `rec_start_s/rec_end_s` (3 dp), `rec_start_ms/rec_end_ms`, `rec_start_frame/rec_end_frame`
  (30 fps via `timeutil.ms2frame`), `sent_id`, `seg_id`, `chapter`. Starts are monotonic; every word lies in a sentence listed by its segment.
  261 within-segment overlaps (max 380 ms) are source-aligner word timings, kept as measured; 0 across cuts.
- Features: `corpus/edl/features/<chapter>.json` for all 73 chapters: `rms_dbfs`, `onset_strength` (0..1, p99-normalised log-band flux),
  `centroid_hz` (0 below -50 dBFS); one value per record frame, 3 dp. Hashes in lock.json.
- `lock.v1.json` was replaced by `lock.json` (one source of truth; it names its version).

## FYI sample (checkpoint posted; keep working unless the user objects)
`dc story sample --around DD-P11-3` -> `data/delivery/fyi/radio_edit_sample.m4a` (AAC 160 kbps, 48 kHz mono, 180.0 s, 3,243,137 B).
Window master 1:46:13.890-1:49:13.890: CH-17 (to 1:47:07.200) > DD-P11-3 (to 1:48:40.066) > CH-18.
`dc deliver fyi` uploaded it to temp.sh, re-downloaded it (POST) and matched SHA-256 + bytes; recorded in `harness/state/fyi.json`:
https://temp.sh/ziCYR/radio_edit_sample.m4a, sha256 `1b1457e9ff9e5f7714e67ab29b86e3953b8546aba6a6d69f3a72fdb512a3e855`, expires 2026-10-12T16:27Z.
The user notice must mention W-001-RT and W-001-D2 (ADR-001 "User notice").

## Open follow-ups
- transcription-aligner: 9 word-map holes are audible but untranscribed S4 speech (table in radio_check.md). Fixing them adds words to the
  word map only; the VO does not change, but by the lock rule it is still a version bump (v2 word map + lock), and the compiler re-times.
- Any later change to EDL, VO or word map: bump to vN+1 and re-run `cut -> radio -> radio-check -> lock -> sample`; never hand-nudge.
