# E-001 follow-up: B100-noC (B100 minus DD-P01, the English voice C)

Story-editor, 2026-10-09. Trigger: `reports/story/E-001_dialect.md` found that voice C (S4 part P01, "The Explainer") is English speech, so 5 of the 15 probe windows (33 %) are non-Egyptian. This reopens criterion 8 under the dialect rule in `harness/state/decisions.json` (ADR-001 experiment.rules.dialect). The rule outcome for Q1/Q2 was B100, V1. This report is deterministic evidence only. No new LLM planning and no new review records were used.

How it was built: `python3 tools/dc.py story e001-noc` (`tools/dclib/story.py`: `drop_block`, `cmd_e001_noc`; the generic `dc story drop-block --src B100 --block DD-P01` gives the same result). Outputs:
- `corpus/edl/candidates/B100-noC.json`. This is B100 minus block DD-P01. The other 73 blocks are byte-equal to B100's (checked: `blocks == B100.blocks - DD-P01`).
- `reports/story/E-001_noC.json`
- `data/derived/story/outline_B100-noC.md` (same `outline()` generator as the earlier outlines; 8,295 words)

The metrics come from `metrics()` / `violations()`, unchanged, with the c5d96cd context review (ctx B). B100 is re-measured and reproduces E-001 exactly.

## 1. Metrics

| metric | B100 | B100-noC |
|---|---|---|
| Runtime | 4:10:07 | 4:01:51 (-8:16) |
| Sentences | 2630 | 2524 |
| Deep-Dives | 37 | 36 |
| Unique idea-unit coverage % | 100.0 | **96.4** (103 units lost) |
| Content-unit coverage % | 100.0 | 96.7 |
| Novel S4 units % | 100.0 | 94.8 |
| Redundancy % (speech time) | 3.9 | 4.0 |
| Prereq violations, global review only | 21 | 21 |
| Prereq violations, after the c5d96cd context review | 0 | **0** |
| Never-mentioned prerequisites | 5 | 5 (the same 5) |
| Voice switches | 66 | 64 |
| Voice switches / hour | 15.8 | 15.9 |
| Max switches per trunk chapter | 2 | 2 (CH-02 drops from 2 to 1) |
| Voice time, min | A 62.5, B 104.2, C 8.1, S1 70.1 | A 62.5, B 104.2, S1 70.1 |
| Audio-quality proxy / voice match to S1 | 0.896 / 0.592 | 0.902 / 0.602 |
| P8-P9 subagent tokens (5-8 k/sentence) | 13.2-21.0 M | 12.6-20.2 M |
| Render h (5.6-8.2 h per film hour) | 23.3-34.2 | 22.6-33.1 |
| Render h at 5 % R3F | 23.2 | 22.4 |

The never-mentioned prerequisites are: `ai-agent->tool-calling`, `conflict->three-way-merge`, `processing-time->event-time`, `statistical-power->p-value` and `watermark->event-time`.

All 103 lost units are novel_vs_trunk: `iu:00735`-`iu:00843`, except 00762, 00768-00769, 00796 and 00802-00803, which are covered elsewhere. 102 of them come only from P01. One, `iu:00783` (B-tree default for ranges and sorting), also has a P10 member, but B100 did not keep that member. P01 lies in the orientation set (`ORIENT_PARTS`), so it never counted as a "use", and dropping it creates no prerequisite violation.

## 2. Topic coverage of the 103 lost units

The rule was fixed before measuring:
- **topic-covered** = the nearest kept unit has cos >= 0.81 (bge-m3 P4 sentence vectors `data/derived/vectors/g_sent.npy`, max over member pairs, nothing recomputed), or every concept id of the lost unit is taught by a kept non-signpost sentence.
- **partly** = cos in [0.70, 0.81), or some of its concepts are taught.
- **truly lost** = everything else.

| class | as specified | strict (English alias-tagger homonyms removed) |
|---|---|---|
| topic-covered | 43 | 33 |
| partly | 26 | 26 |
| truly lost | 34 | 44 |

**The cosine route cannot fire across languages.** P01 is English and every kept unit is Arabic text. The nearest-kept cosine has a max of 0.803, a median of 0.669 and a min of 0.582. 0 units reach 0.81 and 28 reach 0.70. Even an exact paraphrase scores below tau: "Hi everyone, welcome to The Explainer" against "Welcome to this explainer" gives 0.798. So the classification rests on concept ids.

The alias tagger is homonym-prone on English text. Examples: "or" maps to boolean-logic, "if" to control-flow, "service" to systemd, "absolute zero" to absolute-path, "full-stack" to stack, "sparks your curiosity" to spark. The strict column removes the 12 listed ids and that one pair (`NOC_EN_HOMONYMS` in story.py). **I take the strict column as the figure to use.**

The 44 strict truly-lost units by kind: claim 27, transition 9, question 4, example 2, recap 2. Their glosses:

> 00737 We distill a 24-week curriculum, the DA Camp Blueprint, into one master roadmap. · 00738 If you wonder what it takes to become a well-paid full-stack data analyst or data engineer, · 00739 in today's AI-driven world, you are in the right place. · 00740 We will unpack the whole thing step by step. · 00741 The learner may start from absolute zero. · 00742 How ambitious is that? · 00743 That is the founding premise of the whole curriculum. · 00746 It is a steep climb, but the structure makes it doable. · 00751 Part 2: The failure-first philosophy, learning by breaking. · 00752 How do you actually learn all this? · 00753 You break it. · 00755 The curriculum makes deliberately breaking pipelines, systems and code your main learning tool. · 00756 This illustrates the whole idea. · 00757 There is the naive approach. · 00758 You write a few lines of code, it seems to work, and you celebrate. · 00760 That naive approach is a trap. · 00761 Instead, you must expose where it breaks. · 00764 you have to experience the crash. · 00765 To handle crashes you use a 4-step diagnostic loop. · 00766 Step 1: predict the system's outcome. · 00767 Step 2: inject a targeted failure. · 00771 This loop turns abstract programming theory into fast, practical engineering reflexes. · 00773 The hard truth of data engineering is that you cannot do the advanced work, · 00775 Look at the pacing of the first few months and how layered it is. · 00785 That is only for exact-match lookups. · 00786 This practical knowledge separates the novice from the hired expert. · 00788 With the data core in place, it is time to scale up. · 00791 It never loops back on itself. · 00793 That leads to a classic diagnostic quiz from the curriculum. · 00795 And why is it so expensive? · 00798 Here is the diagnostic fix you would apply in the real world. · 00800 That means one machine in your cluster does 90% of the work. · 00804 This is the systems-level thinking you will develop. · 00806 We are no longer just moving data around. · 00816 A chatbot only outputs text. · 00822 They run on a loop called ReAct: reasoning and acting. · 00827 Technical skills mean nothing if you cannot survive the interview loop and prove your worth to a hiring manager. · 00828 You do that through artifacts. · 00833 These 3 artifacts prove you went from zero to full-stack capability. · 00834 In the interview room, expect rapid-fire questions. · 00838 The curriculum ensures you can not only do these things but explain the why behind every technical decision. · 00840 Will you start your journey from zero to working machine today? · 00842 It is a demanding path, but the blueprint is right here. · 00843 Thanks for joining; I hope it sparks your curiosity to start building.

**A reading of the nearest-kept pairs.** This is not a grade; the critic or fact-checker should confirm it.
- **Most of the list is rhetoric or signposting** around topics the film teaches elsewhere. Several nearest kept units are the same idea in Arabic, below tau:
  - 00737 matches "split over 24 weeks".
  - 00751 matches "relies on something called failure first".
  - 00791 matches "no closed loops, no cycles".
  - 00816 matches "the chatbot at most replies to the text".
  - 00822 matches "the ReAct agent loop".
- **Specifics with no clear kept equivalent:**
  - the 4-step predict / inject / diagnose / fix loop (00765-00767);
  - hash index = exact-match only (00785);
  - the 90 %-skew example (00800);
  - the week-by-week pacing (00775-00778, partly);
  - the three named portfolio projects (00829-00832, partly);
  - the interview questions (00834-00837, partly).
- **Size of the loss:** the substantive core is about 10-15 units, roughly 1-1.5 min of speech, and every one comes from the orientation part.

## 3. Other English-dominant speech in B100's kept S4 sentences

The rule: a Latin-script token share above 50 % among script-bearing tokens, with at least 3 Latin tokens. Single code-switched terms are ignored. 0 sentences sit at exactly 2 Latin tokens.

| part | sentences | min | what they are |
|---|---|---|---|
| P01 | 106 | 6.72 | the whole part (English speech) |
| P07 | 6 | 0.29 | English section titles read inside Arabic ("القسم الأول DataFrame Basics and Filtering") |
| P00 | 2 | 0.10 | an English term line, and one English quote: "Don't memorize syntax, understand the data flow" |
| P20 | 2 | 0.11 | a section title, and a term list |
| P12, P14, P16, P17, P23 | 1 each | 0.35 total | titles and term phrases (`@RestController`, "Year Over Year Growth") |

Excluding P01, there are 15 sentences (0.85 min). All of them are code-switched titles or terms inside Egyptian speech. None is an English-speaking voice. **B100-noC therefore has no English-speech voice left.**

## 4. Counterparts of P01

- **S5 (English): no.** `a:S5:en-natural` is the English narration of the same 70:05 film as S1 (`docs/plan/01_SOURCE_RECON.md` §2). Its transcript `corpus/transcripts/a_S5_en-natural.words.jsonl` has 0 hits for explainer, 24-week, blueprint, failure-first or portfolio. It shares P01's voice cluster, not P01's content.
- **Arabic audio: no.** `corpus/audio/assets.json` (S1, S2, S3 CH-*, S4 P00-P25, S5) contains no Arabic recording of P01. The P01 NotebookLM video (catalog media `f:fc5b9dcba339`) carries the same English audio.
- **Arabic text: related, but not a counterpart.**
  - `Chatgpt.zip.d/Chatgpt_part1.zip.d/DA_Camp_28min_Narration_Egyptian_Arabic_V2.md` §01 "The Journey + Visual Language" (chunk `f:4ea22bbf74b0#00001`, 977 chars, Egyptian). It has the same title and theme, but none of P01's specifics.
  - Its video `…/DA_Camp_28min_Illustrative_Egyptian_Arabic_V2.mp4` (`f:ca1d3f72ca14`, 28:00, AAC mono). It is not in `assets.json` and was never ASR'd, so it is unverified.
  - `…/DA_Camp_NotebookLM_Visual_Video_Master_Egyptian_Arabic.md` §2.1 (`f:70c414bdf474#00003`). This is a 7-stage journey list.
- **English text sources of P01:** `DA_Camp_NotebookLM_Visual_Video_Master.md` (§44 failure-first, three portfolio projects) and `LMArena/Folder 1/DA_Camp_KNOWLEDGE.md` (24-week, portfolio).

## 5. Can P01 be re-voiced in Egyptian Arabic offline?

- **Installed:** no TTS package or model. `.venv` has torch 2.14 (CPU) and transformers 5.19, so `VitsModel` loads. onnxruntime 1.29 is present. There is no espeak or piper. The machine has 4 CPU, 15 GB RAM, no GPU and about 7 GB of free disk.
- **Downloadable (HF API checked; nothing installed):**

| model | size | runs with | assessment |
|---|---|---|---|
| `facebook/mms-tts-ara` | 0.29 GB, CC-BY-NC | the installed transformers | MSA, single flat voice; clearly synthetic next to S1. **Not acceptable.** |
| `NAMAA-Space/NAMAA-Egyptian-TTS` | 5.4 GB, MIT | the chatterbox package | not tested |
| `AliAbdallah/egyptian-arabic-tts-chatterbox` | 2.1 GB, Apache-2.0 | the chatterbox package | 0 downloads, quality unknown |
| `MAdel121/f5-tts-egyptian-arabic` | 5.4 GB, NC | the f5-tts package | CPU only, so slow |

- **Blockers:**
  - No Egyptian script of P01 exists. A re-voice therefore needs a new translation, which is new writing. That conflicts with the P5 rule "never synthesize new speech" and the invented-content risk, so it needs an ADR.
  - Cloning S1's voice raises consent and provenance questions. Using a new voice adds a 4th voice.
  - The Egyptian models need 2-5 GB of the 7 GB free.
- **Verdict:** possible offline only at MMS quality, which is unusable. An Egyptian re-voice would need a model install, a new script and an ADR. **I do not recommend it for P5.**

## For the Chair (mechanical, not a decision)

B100-noC changes only criterion 8: no non-Egyptian voice is left (the A+B probe gave 0 % non-Egyptian windows). The cost is coverage of 96.4 % instead of 100 %, i.e. 103 orientation units, about 44 truly lost by the strict rule and about 10-15 substantive. A coverage waiver by ADR is required under the "coverage 100 % or waived" rule.

Every other metric stays the same or improves: 0 violations, 5 missing, max 2 switches per chapter, -8:16 runtime and -0.8 render h. If the Council wants the specifics back, they could go into on-screen cards over the CH-02 trunk, with no new speech. That is a P8 storyboard choice, not part of this EDL.
