# P7 data gaps D1 (ABSplit) and D2 (SampleScoop): fact-checker rulings

Date: 2026-10-10. Author: fact-checker (did not write the components or the gap notes).
Inputs: `docs/p7/catalog_status/dom-b.md`, `corpus/canon/data_contract.json` (frozen, 127 facts), `corpus/sentences/*`, `corpus/canon/{crash_course_steps,hub_items,nblm_scenes,chapters}.*`, `corpus/graph/{nodes,concepts}.jsonl`, `corpus/text/chunks.jsonl`, master §6 and §8 CH-16.
Rule applied: master §6 and CLAUDE.md rule 10. Every displayed number needs a data-contract id or a source sentence id. Nothing is invented. Anything not in the contract is **proposed**, not used, until ratified.

## 0. Findings that apply to both gaps

1. The data contract holds **no** CH-16 figure other than `95 %` (d:6.12:1) and the four table checks (d:6.12:2..5). It lacks the CH-16 shot numbers that master §8 and the nblm scenes show on screen: **5 000** (population), **100** (intervals), **80 %** (power), **90 / 600** (basket). They are sourced by sentences, so they are addable (section 4).
2. The contract has **no sample size n and no A/B rates**. The master label is `n per arm for 80 % power` with `p = …` (master §8 CH-16 labels, line 960 area). The source leaves the value blank. Master CH-16-S05 lists `on_screen_numbers: []`. The nblm scene P11-sc11 describes three fields to fill *before* the test (effect size, power **80%**, n per arm) and gives no value for effect size or n.
3. Both the D1 and D2 gap notes are correct. No hidden contract value exists. Only lab-level figures exist (section 2.2 and 3.2), and they are not sentence-sourced.
4. The graph (`reports/graph/contradictions.md`, `corpus/canon/contradictions.json`) holds no conflict on these figures. **No contradiction raised**, so `reports/facts/contradictions.md` is not created. Note: `5000` also appears as the Gold customer threshold in `s:S4:P05:0022` (a different quantity). A `data_refs` for the population must cite the P11 sentence, not that one.

## 1. Ruling table

| Item | Film | Component demo | Source |
|---|---|---|---|
| Population N = 5 000 orders | **Allowed** | Allowed | `s:S4:P11:0070` (spoken); master §8 CH-16-S03 `5 000`; nblm P11-sc09. Proposed id `add:6.12:1` |
| Sample size n of the scoop | **Forbidden** (no source) | No digits; dots only | none |
| n = 30 (inferred from `tCrit(29)`) | **Forbidden as a displayed fact** | Forbidden | `d:6.12:2` states df = 29 only, not n |
| df values 29 / 9 / 20 | Allowed, verbatim inside the d:6.12:2..4 strings only | same | `d:6.12:2`, `d:6.12:3`, `d:6.12:4` |
| 100 intervals | Allowed after `add:6.12:3` | ok | `s:S1:ar-natural:0246`, `s:S4:P11:0077` |
| Power 80 % | Allowed after `add:6.12:2` | ok | `s:S4:P11:0082`; labels `n per arm for 80 % power` |
| n per arm (required) | **Forbidden. Show an empty or locked field, or `…`** | same | no value anywhere |
| p-value / Welch result | **Forbidden. Show `p = …` as in the master label** | same | no value anywhere |
| A/B rates 4.2 % vs 3.1 %, 10 000 users per group | **Not yet.** Allowed only after `add:6.12:10..12` is ratified | Not yet; no digits until ratified | lab step 20 (K00940, `hub:vcc:lab:0020`) |
| 50 % / 50 % split | Allowed after `add:6.12:13` | ok | lesson `ab-testing` (K01119) code line |
| NilePay operator A 3/3, B 1/3 as an "A/B result" | **Forbidden** (wrong mechanism) | Forbidden | arithmetic over `d:5.2:1..6` is correct, but see 2.3 |
| Any other rate, user count, lift, CI, p, n | **Forbidden** | Forbidden | none |

## 2. D1: ABSplit

### 2.1 Search result
- Sentences (all `corpus/sentences`): A/B is spoken in `s:S1:ar-natural:0249..0251` and `s:S4:P11:0011, 0074, 0080..0083`. The only A/B number is `80` in `s:S4:P11:0082` ("power of the test at 80%"). No rate, user count or lift.
- Contract: no A/B fact. Graph: `c:ab-testing` and `c:statistical-power` have definitions only. `c:statistical-power` says "commonly set at 80%".
- Lab/knowledge sources (not sentences):
  - **Crash-course step 20 `stat-abtest`** (K00940, `hub:vcc:lab:0020`, also `hub:fusion:lab:0104`, `hub:unified:lab:0163`): "a shop testing two checkout buttons. 10,000 shoppers each, random split. Green: 4.2% complete purchase. Blue: 3.1%."
  - Lesson `ab-testing` (K01119): `control 50% | treatment 50%`; "first gate: actual allocation matches expected ratio" (SRM). No counts.

### 2.2 Verification of the lab figures (derived by this check, not asserted by the source)
- Counts at 10 000 per group: 420 and 310 conversions. Exact by construction.
- Difference 1.1 points. Two-proportion z is about 4.15 (two-sided p about 3.4e-5), so "the gap is real" is consistent with the lab's own statement.
- Required n per arm at 80 % power, alpha 0.05, 4.2 % vs 3.1 %: **about 4 559** (unpooled formula) or **about 4 563** (pooled). The two standard formulas disagree in the last digits. So an `n per arm` value is method-dependent and **must not be put on screen** unless the Council fixes the formula and rounding in the contract. The source supplies no such number.

### 2.3 Rulings
1. **Film and demo, today: no numbers.** Lanes labelled A / B (or the two button colours), a split, a rate bar per lane. In no-number mode the bar lengths must be ordinal only (no axis, no ticks, no digits, no length that implies a value). Mark the demo as illustrative.
2. **After ratification of `add:6.12:10..13`**, ABSplit may show exactly: split 50 % / 50 %; 10 000 per group; green 4.2 %; blue 3.1 %; winner = green (sourced statement: the gap is the button's doing). Rolling counters must end at exactly `4.2 %` and `3.1 %` (one decimal, thin space before %, as `95 %` in d:6.12:1). Conversions 420 and 310 are exact arithmetic and may be shown with `data_refs` to the two rate facts.
3. **Do not map "control" or "new design" to a colour.** The lab text names Green and Blue, and its labels list "control" and "new design", but never says which colour is which (minor ambiguity; label lanes by colour or A / B only, never "control = green").
4. **Two lanes only in the film.** The sources define A vs B. Components may support 3 to 4 lanes structurally, but a 3 to 4 lane scene carries no rates.
5. **Do not use the NilePay operator split as an A/B test.** Per-operator success is A 3 of 3 and B 1 of 3, which follows from `d:5.2:1..6` (T1, T2, T4 are A / OK; T3, T6 are B / FAILED; T5 is B / OK). But it is observational (operators are not randomly assigned) and n = 3 per operator. The lesson's own golden rule is "random assignment kills confounders". Showing it as an A/B result teaches the wrong mechanism. If NilePay continuity is wanted, use the lesson mission ("receipt retry UX experiment, specify SRM and guardrail checks") with **no numbers**.
6. **Do not show SRM allocation counts** (no source).
7. **Anchoring.** The film's S1 narration does not speak 4.2, 3.1 or 10 000 (`s:S1:ar-natural:0249..0251` are about pre-registering effect size, power and n). The counters therefore cannot start "at the number word". They anchor to the term word "A/B" (`s:S1:ar-natural:0249`). Pedagogical note for the story-editor: the S1 beat says "decide the three things before you start"; a finished 4.2 vs 3.1 result is an outcome, so show it as the worked example, not as the locked fields. The locked `n per arm` field stays empty.

## 3. D2: SampleScoop

### 3.1 Search result
- `s:S4:P11:0068..0073`: population and repeated samples. The only number is **5000** (`0070`, "a population of 5000 orders"). Also master §8 CH-16-S03 ("5 000 orders; repeated samples stack into a sampling distribution") and nblm P11-sc09 ("**5,000**"). Consistent in all three; formats differ (5 000 / 5,000), which is a style choice, not a contradiction.
- `s:S1:ar-natural:0243..0245` (the CH-16 trunk voice) speaks no number for this beat. So in the trunk chapter `5 000` is a visual-only number (no sync obligation), but it still needs a contract id.
- No sample size n for the orders scene anywhere. `s:S4:P10:0076` names SQL sampling `SYSTEM` or `BERNOULLI` without numbers. No narrated sentence covers stratified, systematic or cluster sampling.
- Lab-only figures (K00937 `stat-sampling`, K00939 `stat-inference`): coin flips with slider n from 10 to 5 000 (default 100); "n=10, 8 heads (80 %)"; poll "1,000 voters, ±3 points"; "each run = one trial of **30 patients**". These belong to other scenes (coin, poll, drug trial). They are not the 5 000-order scoop and must not be transplanted.

### 3.2 On n = 30
`tCrit(29, .05) = 2.0452`, `tCrit(9, .05) = 2.2622` and `tP(2.086, 20) = 0.0500` are df = n - 1 (or n1 + n2 - 2) *checks against published tables*. The step 19 lab (30 patients per trial) corroborates that the master's CI lab used samples of 30, but the contract does not say so, and df = 20 would be 21 observations (one sample) or 11 + 11 (two samples). **n is not derivable without a source; do not display it.** `add:6.12:20` records the lab figure for a Council decision, scope-limited to a hypothesis-test or CI scene.

### 3.3 Rulings
1. **Film and demo: population label `5 000` is allowed** (`data_refs`: `s:S4:P11:0070` now, `add:6.12:1` once ratified). Unit: orders (طلب). Do not reuse the `5000` of `s:S4:P05:0022`.
2. **The scoop shows no n.** Dots are decorative: do not label a dot count, do not state "1 dot = k orders", do not annotate the cup count, and the Arabic narration must not describe dot counts. Repeated-means histogram: no axis digits.
3. **Mechanism check (for the demo's `method` variants).** Random sample: every unit has a chance. Stratified: draw within each stratum. Systematic: every k-th. Cluster: whole clusters. Only random sampling is narrated (`s:S4:P11:0069..0073`). The other three variants have no film sentence and are demo-only until a sentence or source is added. If `SYSTEM` / `BERNOULLI` is illustrated (`s:S4:P10:0076`): `BERNOULLI` = independent per-row draw; `SYSTEM` = whole storage blocks (cluster-like, cheaper, correlated). Draw them that way and add no percentage.
4. **Do not draw the sample as representative of "truth".** Source: the mean of one sample is not the absolute truth (`s:S4:P11:0073`, `s:S1:ar-natural:0245`). The sampling distribution must be shown assembling over repeated draws.
5. If a sample size is genuinely wanted, the Council must add a constructed-illustration fact in the style of master §6.20 (labelled "exact by construction"). This check will not invent it.

## 4. Additions proposed (`corpus/canon/data_contract_additions.jsonl`)
The frozen contract is not edited. Each line has `status: proposed`.
- Sentence-sourced (satisfy the "source sentence" rule; ratification is a formality): `add:6.12:1` 5 000 orders, `add:6.12:2` 80 %, `add:6.12:3` 100 intervals, `add:6.12:4` basket 90 -> 600.
- Lab-sourced (no sentence id; need chair or Council ratification before any use): `add:6.12:10` 10 000 users per group, `add:6.12:11` green 4.2 %, `add:6.12:12` blue 3.1 %, `add:6.12:13` 50 / 50 split, `add:6.12:20` 30 patients per trial (scope-limited).
- Deliberately **not** proposed: n per arm, any p-value, n = 30 for the orders scene, NilePay per-operator rates, SRM counts.

## 5. Impact on the dom-b build plan
- ABSplit demo: render in no-number mode now (ordinal bars, A / B lanes). Switch to 4.2 % / 3.1 % / 10 000 / 50 % only after `add:6.12:10..13` are ratified.
- SampleScoop demo: `5 000` label with `data_refs: ["s:S4:P11:0070"]`; no n.
- Neither gap blocks AT-13R (the gate is on the engine, not on these figures).
