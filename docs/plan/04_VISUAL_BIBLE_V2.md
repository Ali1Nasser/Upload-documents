# 04 · Visual Bible v2: the cinematic "AI Unpacked" layer on top of `master.md`

`master.md` §1–§4 and §9–§11 remain law: tokens, the 22 patterns, the motion vocabulary, the scene contract, recurring assets,
terminology and captions. This file adds the **cinematic layer**, so the film reads like a premium long-form explainer rather than a dashboard.

The reference look, as described in your notes, is premium motion design driven by audio:
- 3D-lite worlds made of particles, nodes, glass and light;
- kinetic typography that becomes part of the scene;
- a camera that never fully stops;
- an "impact" on important words;
- one concept per moment, each with a concrete visual metaphor.

P6 turns this file into frozen tokens and presets (ADR-003).

---

## 1 · Look

### 1.1 Palette (dark only for the film)

| Token | Value | Use |
|---|---|---|
| `--void` | `#05070B` | Deepest background; radial gradient to `--ground` |
| `--ground` | `#0D1117` | Base ground (master) |
| `--panel` | `#161B22` @ 70–85 % + 12 px backdrop blur | Glass plates behind text/diagrams |
| `--grid` | `#1B2430` @ 30–40 % | Holographic floor/back grids, 1 px lines |
| `--haze` | `--signal` @ 4–8 % | Volumetric haze and light shafts |
| `--ink` / `--ink-2` / `--ink-3` | `#E6EDF3` / `#9FB0BD` / `#7D8C99` | Text hierarchy |
| `--signal` | `#37D8FF` | **The thing being explained right now** (glow colour) |
| `--ok` | `#3FD98A` | Passed / committed / healthy / *fix* beats |
| `--warn` | `#FFB84D` | Degraded / lagging / stale |
| `--crit` | `#FF6B63` | Failed / dropped / breached / *failure* beats |
| `--violet` | `#A88CFF` | Partition / group / scope boundary; **Deep-Dive mode accent** |
| `--ember` | `#FF7A59` | The window/frame a function can see |

Semantic colours are **never decorative**. Decoration uses neutral whites, greys and haze at low saturation.
Contrast floors from the master still apply: 4.5:1 for text, 3:1 for meaningful marks.

### 1.2 Light, material and depth

- **Light:** a key rim light from the upper right, volumetric haze, and soft bloom on emissive elements. The subject is the brightest thing on screen.
- **Materials:** glowing acrylic edges, glass plates with backdrop blur, matte dark solids, thin emissive wires, point sprites for data.
- **Depth:** 3–5 parallax planes. Foreground bokeh particles (blurred, slow); midground subject (sharp); background grid and haze (blurred, dim).

### 1.3 FX tiers (frozen numbers in P6)

| Tier | Where | Bloom | Grain | Vignette | Chromatic aberration | DOF | Motion blur | Particles |
|---|---|---|---|---|---|---|---|---|
| lite | Previews | CSS glow only | 0 | 10 % | 0 | none | none | ≤ 300 |
| standard | ~85 % of film | 12–24 px glow; threshold ~0.75 | 1–1.5 % luma | 12 % | ≤ 0.5 px, edges only | fake (blurred layers) | none | ≤ 1,500 |
| hero | ≤ 15 % of film (WebGL) | postprocessing bloom, intensity 0.8–1.2 | 1.5 % | 15 % | ≤ 0.6 px | true bokeh (scale ≤ 2) | `CameraMotionBlur` on whips only | ≤ 5k on swangle (GPU: ≤ 20k) |

---

## 2 · Camera language

- **Never dead-static.** Ambient drift is always on: a 1.5–3 % push-in every 5 s, or a 0.2–0.4°/s orbit on 3D sets. A *hold* (prediction pause) keeps only particle drift.
- **Moves and meanings:**
  - push-in = focus;
  - pull-out = context, and the P20 zoom-out callback;
  - orbit = revealing 3D structure;
  - truck/pan along a flow = following data;
  - rack focus = changing subject;
  - whip-pan with a light streak = scene transition;
  - dolly-zoom = a realization moment (at most 1 per chapter).
- **Cuts** land on sentence starts, placed inside the preceding pause when it is ≥ 200 ms. Prefer **match cuts** (same shape continues: a dot becomes a node, a row becomes a vector).
- **Easing:** `inOutCubic` for camera, `outBack` for impacts, `outExpo` for arrivals. No linear motion except marching flows.

---

## 3 · Kinetic typography (Arabic-first)

### 3.1 Fonts (all OFL; final pick in ADR-003)

| Role | Candidates | Weight | Notes |
|---|---|---|---|
| Arabic display / impact | Alexandria · Readex Pro · IBM Plex Sans Arabic | 600–800 | Geometric, modern, reads well with glow |
| Latin display | Inter Tight · Space Grotesk | 600–800 | For English technical terms used as impact words |
| Mono (terms, code, numbers) | JetBrains Mono · IBM Plex Mono | 500–700 | Tabular figures are **mandatory** for counters |
| Arabic body labels | IBM Plex Sans Arabic | 500–600 | The archives already include merged PlexAR fonts with Latin and symbols |

### 3.2 Sizes at 1080p

| Element | Size | Max |
|---|---|---|
| Impact word | 96–160 px | 1–2 words |
| Kinetic phrase | 56–80 px | ≤ 6 words, ≤ 2 lines, ≤ 32 Arabic chars/line |
| Object label | 28–40 px | Placed next to the object it names (master §4) |
| Term chip (Latin mono) | 28–36 px | One term + optional Arabic gloss |
| Code / SQL / terminal | 26–32 px mono | ≤ 12 lines visible |
| Counter / number | 72–200 px mono tabular | Unit beside it (EGP, %, ms, rows) |

### 3.3 Which words go on screen

Do not print every word. **Every sentence still moves something** (§5), and these go on screen as type:

1. every **number** spoken (always);
2. every **technical term** at its first mention in a chapter, as a term chip next to its object (always);
3. **contrast pairs** (scan ↔ seek, precision ↔ recall);
4. **verbs of change** that carry the mechanism (بيتقسم، بيتكرر، بيقع، بيتجمع);
5. the sentence's **hook word** with the highest prominence score, when it carries meaning.

The budget is 8–20 kinetic words per minute. The rest of the meaning is carried by objects and motion.

### 3.4 Arabic shaping and BiDi rules (hard rules; automated tests in P7)

- Shaping comes from the browser (HarfBuzz). **Never split an Arabic word into per-letter spans**: it breaks joining.
  Animate whole words or phrases. Reveal Arabic with **mask/clip-path wipes running right-to-left** plus scale 0.92→1.0, blur 6→0 px and opacity.
- Latin runs inside Arabic go in an isolate: `<bdi dir="ltr">Kafka</bdi>` or `unicode-bidi: isolate`.
- The definite article joins with a tatweel: `الـKafka`, `الـembeddings`, `الـpartition`.
- Numbers use Western digits (master §0.3). Numeric expressions such as `4 / 6 = 66.67 %` sit in one LTR isolate.
- Code, SQL, commands and identifiers are always LTR mono blocks and never translated (master §10).
- Per-character animation (typewriter, scramble) is allowed **only for Latin/mono** text such as code, terminal and IDs.
- Every on-screen string sits on a glass plate or has a 2–4 px dark halo when the background is busy.

### 3.5 Motion presets (tie into master §3)

| Preset | Timing | Description |
|---|---|---|
| `arrive` | 240 ms `outExpo` | Masked wipe (RTL for Arabic) + blur-to-sharp |
| `impact` | 120–180 ms `outBack` + 80 ms glow flash | Scale 1.08 → 1.0; optional 1-frame camera nudge (≤ 4 px) |
| `label` | 160 ms fade + 6 px rise | For object labels |
| `count` | duration of the spoken number | Counter rolls from the previous value to the target, landing on the word's end |
| `morph` | 300–500 ms | Text dissolves into particles that become the object (text → object), or the reverse |
| `exit` | 200–400 ms | Dissolve to particles or slide back into depth; never a hard pop-off unless it is a *failure* shake |

---

## 4 · Timing rules (word-anchored)

| Event | Anchor | Lead |
|---|---|---|
| Kinetic word or phrase | Onset of its first word | −3 frames (−100 ms at 30 fps) |
| Graphic state change (highlight, path draw, row moves) | Onset of the word that names it | −2 frames |
| Counter | Starts at the number word's onset | Lands at that word's end |
| Shot cut | Sentence onset | −4 to −6 frames, inside the preceding pause if it is ≥ 200 ms |
| Result hold | After the result word ends | ≥ 1.2 s before it is replaced |
| Prediction pause | Planned `hold` | Countdown ring or "think" pulse, ≤ 6 s |

The **per-sentence micro-arc** is setup (drift) → impact (key word) → settle (hold) → move (camera into the next idea).
The **chapter rhythm** follows the scene contract (master §4): problem → mental model → progressive visual → worked example → prediction → **failure (crit glitch)** → **fix (ok settle)** → callback → artifact.

---

## 5 · Density and coverage rules (enforced by `dc spec lint`)

- At least **20 meaningful visual events per minute**. An event is something new appearing, a transformation, a highlight, a number changing, a kinetic word, a camera move with intent, or a cut.
- **No more than 4.0 s without an event**, unless it is a `hold` with a reason (at most 6 s).
- Median shot length 6–12 s; maximum 25 s (long shots need an event at least every 3 s).
- **100 %** of sentences have at least one anchored event. **100 %** of spoken numbers and first-mention terms appear on screen.
- At least **80 %** of sentences have a *mechanism* event (an object changing state), not only type.
- Real-time WebGL (hero tier) is at most 15 % of a chapter's frames unless an ADR waives it.

---

## 6 · Metaphor library (concept → picture)

These are the defaults for scene-directors. Each row gives the metaphor, its key beats, the components, and the failure → fix beat. Scene-directors may propose better metaphors through best-of-N plus a critic or Council pick.

**Orientation**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Data work = 3 moves | Shoebox of receipts; receipts fly into a glowing table grid; three portals light up: *get rows · make trustworthy · answer* | Receipts rise, path-draw, pop into a grid, portals ignite in sequence | `ParticleSwarm`, `TableGrid`, `TripleGate`, `KineticWord` | `Cairo`/`cairo`/`Cairo␠` become 3 city pins → a `TRIM` chip merges them |
| The film map | **A-01 Holo-City**: a 3D metro/graph of 7 movements; districts light as we learn | Fly-over, district ignites, route draws | `WorldMapA01`, `CameraRig` | — |
| Visual language | Six coloured lights, each owning one meaning | Each light pulses as the narrator names it | `LegendOrbs` | — |

**Ground Zero**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| What a computer does | CPU = pulsing core; RAM = workbench; disk = warehouse; bus = conveyor; latency ladder as 10× zoom steps | Data hops between stations; zoom-out per latency step | `Conveyor`, `LatencyLadder`, `InferenceCore` (as CPU) | Cache miss: the walk to the warehouse takes forever |
| Files, paths, processes, terminal | Folder tree as glowing branches; a path is a lit route; a process is an engine with a PID tag; pipes are literal pipes | Route lights segment by segment; `cat \| grep \| wc` flows | `TreeView`, `Terminal`, `PipeFlow` | Wrong path: the route dead-ends (crit) |
| Linux ops | rwx as 3×3 locks (user/group/other); systemd services as heartbeats; logs as a scrolling ledger with a grep spotlight | Locks click; heartbeat flatlines and restarts | `PermissionLocks`, `Heartbeat`, `LogScroll` | Disk-full gauge floods red → log rotation |

**Python**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Execution | Execution cursor of light walks the code; variables are labelled boxes; a call slides in a new stack frame | Line highlight on each spoken step | `CodeTrace`, `StackHeap` | Off-by-one: the cursor overshoots (shake) |
| Collections & envs | List = train of cars; dict = key→locker wall; set = bubbles merging duplicates; venv = sealed glass dome | Morphs between structures | `CollectionMorph`, `VenvDome` | Global install pollutes every dome → isolated venv |
| State, memory, generators, errors | Two names → one heap object (aliasing); generator = conveyor yielding on demand; an exception is a red shockwave unwinding frames | Mutation propagates; lazy items appear only when pulled | `StackHeap`, `Conveyor`, `FailureGlitch` | Aliasing bug → `copy()` |
| Tests, Git, review | Test gate stamps pass/fail; Git is a branching light-graph; review is two keys turning | Branch, commit, merge animation | `GitGraph`, `TestGate` | Red test blocks the merge → fix → green |

**SQL**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Relational model | Spreadsheet chaos → tables linked by glowing PK/FK beams; normalization splits duplicates out | Beam connects on the key word | `TableGrid`, `KeyBeams` | Update anomaly: one copy changes, the other doesn't |
| Query pipeline & grain | Rows travel through stages FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER→LIMIT; **row-count funnel** with §6.3 numbers; grain stamp "1 row = 1 ___" | Counter at each stage | `SqlStages`, `RowFunnel`, `NumberCounter` | Wrong grain double-counts → grain stamp fixes it |
| Joins, windows, CTEs, NULL | Tables slide together and matching rows fuse; **fan-out** multiplies rows; window = ember frame sliding inside violet partitions; NULL = hollow ghost cells | SUM doubles on fan-out (crit) | `JoinFusion`, `WindowFrame`, `TableGrid` | Fan-out → pre-aggregate / distinct key |
| Transactions & deadlock | Transaction = sealed capsule that lands whole or vanishes; isolation levels = frosted walls; deadlock = two trains locked at a crossing | Capsule COMMIT/ROLLBACK | `TxnCapsule`, `DeadlockCrossing` | Deadlock → consistent lock order |
| Indexes & plans | Full scan = pages streaming past with a counter to 12,500; B-tree = 3 hops (§6.5); plan tree | Counter vs 3 hops | `PageScan`, `TreeView(btree)`, `PlanTree` | Every INSERT writes twice → index only what the workload filters |

**Analytics**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Applied steps & dirty data | Step list as a film strip; each step transforms the table with row counts (§6.1–6.2) | Glitchy cells clean up step by step | `AppliedSteps`, `TableGrid`, `FailureGlitch` | Type coercion silently drops rows → explicit cast + check |
| Statistics | A Galton board builds a distribution; sampling = scooping from a pool; CI = breathing error bars; A/B = two streams + p-value meter | Particles fall to the spoken numbers (§6.12) | `Distribution`, `SampleScoop`, `ABSplit` | Peeking early → fixed horizon |
| Semantic model & report | 3D star schema; a measure computes live; report accessibility check (§6.13) | Fact table at centre, dimensions orbit | `StarSchema3D`, `KpiPanel` | Non-additive measure summed → proper aggregation |

**Craft & Systems**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Design & refactoring | Tangled wires untangle into cohesive module clusters; SOLID as five pillars | Wires snap into modules while tests stay green | `WireTangle`, `ModuleClusters`, `TestGate` | — |
| DSA | Big-O racing curves; array scan vs hash hop; BFS waves | Comparison counters (§6.14) | `ComplexityRace`, `HashBuckets`, `GraphNetwork` | Quadratic loop explodes → hash lookup |
| Networks, HTTP, APIs, security | A request capsule travels DNS → TCP handshake → TLS lock → API → DB → response; status codes as coloured stamps; keycards for identity | Each hop lights on its word | `RequestJourney`, `StatusStamp`, `KeycardDoors` | IDOR: the keycard opens the neighbour's door → ownership check; injection breaks the query → parameters |
| Backend depth (**DD-P14**) | Layered floors (controller/service/repository); connection pool = taxi rank with N cars; race condition = two hands on one counter; saga = chain of compensations | Pool exhaustion queue grows | `LayerStack`, `ConnPoolTaxi`, `RaceCondition`, `SagaChain` | Lost update → lock/atomic; failed step → compensation |

**Platform**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| ETL/ELT & quality | Pipeline stations; six quality gauges; quarantine pen | Bad rows diverted to the pen | `PipelineStations`, `QualityGauges` | Silent bad load → validate before transform |
| DAG, retries, idempotency | DAG lights in topological order; retry duplicates rows (counter doubles, crit); idempotent upsert = the stamp lands once | Counter doubling vs stable | `DagRun`, `IdempotentStamp`, `NumberCounter` | Duplicate rows → idempotent key/upsert |
| Warehouse, OLAP, SCD | Terraces ODS→DW→ADS→marts; rotating cube with slice/dice/roll-up; SCD-2 rows on a timeline | Data descends and refines | `LayerStack(terraces)`, `OlapCube`, `TimelineTrack` | History overwritten → SCD-2 |
| Huawei DataCube reporting (**DD-P17**) | 24-KPI instrument panel; 5-stage model build as a construction sequence; report designer | Stages assemble | `KpiPanel`, `PipelineStations` | KPI defined two ways → governed definition |

**Big data**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| HDFS, YARN, MapReduce | File splits into blocks that replicate ×3 across racks; NameNode as the map; YARN hands out containers; map → **shuffle storm** → reduce | Blocks hop to nodes on "replication" | `BlockReplication`, `GraphNetwork`, `PartitionLanes` | Node dies → replicas keep serving |
| Spark | Lazy DAG drawn but dark until an action lights it; partitions = lanes; shuffle particles cross lanes; skew = one overloaded lane | §6.15 numbers on lanes | `DagRun`, `PartitionLanes` | Skew → salting spreads the load |
| Kafka & NRT | Topic = river with partition lanes; offsets = glowing markers; consumer groups = boats; lag = a gap that grows; at-least-once creates duplicates | Offset markers advance on the spoken word | `KafkaRiver` (`PartitionLanes`), `NumberCounter` | Duplicates → idempotent consumer |

**Domain**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Mobile Money, one transaction | Receipt T1 travels phone → core → Kafka → NRT → warehouse → report, with timestamps per station; the six receipts (§5.2) return | Callback to CH-00 numbers | `RequestJourney`, `TableGrid`, `NumberCounter` | — |
| Reconciliation, governance, DR | Two ledgers align; four mismatch classes highlighted; *net totals lie* (+50 and −50 cancel to 0 but both are errors); k-anonymity blur groups; RPO/RTO timeline | Mismatch classes colour-coded | `LedgerPair`, `TimelineTrack`, `KAnonBlur` | Net-zero illusion → line-level recon |

**AI**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| ML from a question | Question → target → baseline bar the model must beat; train/test split = cutting a deck | Baseline vs model bars (§6.16) | `BarStack`, `SplitDeck` | **Leakage**: future data drips backwards into training (crit) → time-based split |
| Model families & evaluation | Decision boundaries morph (linear/tree/ensemble) over points; confusion tiles; threshold slider; k-fold rotation; bias/variance dartboards | Precision/recall trade as the slider moves | `ScatterField`, `ConfusionTiles`, `ThresholdSlider` | Overfit curve snakes through points → regularize/CV |
| Neural networks | Neuron computed by hand; layers light forward; loss landscape; gradients flow back as waves | Weights glow by magnitude | `NeuralNet3D`, `EquationLine`, `LossLandscape` | Vanishing gradient fades → better activation/init |
| NLP, attention, Transformer | Text → token tiles → vectors rise; Q·K beams form attention weights; heatmap matrix; residual river; next-token probability bars (§6.17) | Beams on "attention"; bars on "next token" | `TokenStream`, `AttentionBeams`, `AttentionMatrix`, `BarStack` | — |
| Embeddings, RAG, agents | **Vector galaxy**: meaning as position; query probe; nearest neighbours ignite (cosine); a document **shatters into chunks**; top-k pulled from thousands; reranker conveyor; **context tunnel** with a limit, where middle chunks fade (lost in the middle); "retrieval is a query, not permission" access gate; agent loop inside **two guard rings** | §6.18 numbers on neighbours | `VectorGalaxy`, `ShatterToBlocks`, `ContextTunnel`, `GuardedAgentLoop` | Hallucination = red corrupted branch → grounding with citations; vocabulary mismatch → hybrid search |
| LLM prompting | Temperature/top-p as a dial sharpening or flattening the distribution | Bars reshape with the dial | `BarStack`, `SamplingDial` | — |

**Ship & Close**

| Concept | Visual metaphor | Key beats | Components | Failure → fix |
|---|---|---|---|---|
| Containers, CI/CD, cloud, observability | Docker layers = translucent slabs where cache hits glow; changing an early layer invalidates everything above (cascade, §6.7); CI/CD gated pipeline with a rollback lane; IAM decision tree (explicit deny wins, §6.8); logs/metrics/traces converge; incident timeline | Cache-hit counter | `LayerStack`, `PipelineStations`, `TreeView(decision)`, `TimelineTrack` | Bad deploy → rollback lane |
| Evidence, portfolio, branches | Each chapter's artifact is a card joining a chain; "done ≠ proven" stamp; six career branches as lit paths | Chain grows card by card | `ArtifactChain`, `BranchPaths` | — |
| Close | A-01 Holo-City fully lit; callback montage | Final pull-out | `WorldMapA01` | — |

---

## 7 · Recurring assets and continuity

- **A-01 Holo-City.** The ShopFlow + NilePay architecture as a 3D glowing city/graph. Each act lights its district. Every act ends on a P20 zoom-out to it.
- **NilePay receipts T1–T6** (master §5.2) are physical-looking glowing receipt cards with EGP amounts. They appear in CH-00 and return in CH-27.
- **ShopFlow blueprint.** A persistent blueprint that grows one component per chapter, from repo to guarded agent and CI/CD.
- **Deep-Dive mode identity**, so the voice change feels intentional and consistent:
  - a violet accent frame;
  - a `DEEP DIVE · P14` lower-third;
  - slightly warmer haze;
  - a short card + sting on entry and exit;
  - the same layout grammar as the trunk.
- **Chapter cards:** `CH-xx` (mono), the Arabic title (display font), an English subtitle (small) and the act colour bar, with a 1.5–2.5 s arrive/exit.

## 8 · Component catalog ("visual verbs")

Each component has a zod props schema, a demo, snapshot tests and a perf budget. P8 may use **only** frozen components. Requests for new components go to `corpus/specs/_component_requests.jsonl` and the motion-engineer triages them.

| Family | Components |
|---|---|
| Type & UI | `KineticWord`, `KineticPhrase`, `TermChip`, `NumberCounter`, `EquationLine`, `LowerThird`, `ChapterCard`, `DeepDiveCard`, `PredictionTimer`, `CalloutArrow`, `Spotlight` |
| Data | `TableGrid`, `RowFunnel`, `JoinFusion`, `WindowFrame`, `LedgerPair`, `Heatmap`, `BarStack`, `LineTrace`, `ScatterField`, `Distribution`, `ConfusionTiles`, `KpiPanel`, `ThresholdSlider` |
| Structure & flow | `GraphNetwork`, `DagRun`, `TreeView` (btree/plan/decision/fs), `PipelineStations`, `LayerStack`, `StarSchema3D`, `OlapCube`, `TimelineTrack`, `GitGraph`, `StackHeap`, `PartitionLanes`, `BlockReplication`, `RequestJourney`, `Conveyor`, `WorldMapA01` |
| Code | `Terminal`, `CodeTrace`, `SqlStages` |
| Space & 3D | `VectorGalaxy`, `NeuralNet3D`, `AttentionBeams`, `AttentionMatrix`, `TokenStream`, `ContextTunnel`, `InferenceCore`, `ParticleField`, `HoloGrid`, `DataRibbons`, `LossLandscape` |
| State & FX | `FailureGlitch`, `FixSettle`, `ShatterToBlocks`, `MorphTextToObject`, `PathDraw`, `Pulse`, `Shake`, `Spin`, `LightStreakTransition`, `WhipPan`, `MatchCut`, `CameraRig`, `DepthLayers`, `FXTier`, `AudioReactive` |
| Media | `LoopPlate` (pre-rendered loops), `AIPlate` (2.5D parallax via depth map; ADR-006), `ManimInsert` (alpha video) |
| Domain specials | `TripleGate`, `LegendOrbs`, `LatencyLadder`, `PermissionLocks`, `Heartbeat`, `LogScroll`, `CollectionMorph`, `VenvDome`, `TestGate`, `KeyBeams`, `TxnCapsule`, `DeadlockCrossing`, `PageScan`, `AppliedSteps`, `SampleScoop`, `ABSplit`, `WireTangle`, `ModuleClusters`, `ComplexityRace`, `HashBuckets`, `StatusStamp`, `KeycardDoors`, `ConnPoolTaxi`, `RaceCondition`, `SagaChain`, `QualityGauges`, `IdempotentStamp`, `KAnonBlur`, `SplitDeck`, `SamplingDial`, `GuardedAgentLoop`, `ArtifactChain`, `BranchPaths` |

Build order is by frequency of use in the P8 specs. The 15 most-used components get the most polish.

## 9 · Sound ↔ picture coupling (default SFX map)

| Visual event | SFX | Level |
|---|---|---|
| Shot transition (whip/streak) | soft whoosh (3 variants) | −24 LUFS short-term |
| `impact` kinetic word | soft impact + 80 ms sub tap | −26 |
| Counter rolling / landing | ticks / landing click | −30 / −27 |
| Failure beat | short glitch + low thud | −25 |
| Fix beat | settle chime (no melody) | −28 |
| Data flow (continuous) | low hiss bed | −36 |
| Chapter card / Deep-Dive entry | riser + reverse swell + sting | −22 |

Density ≤ 30 cues/min; ≥ 350 ms between cues; −6 dB while VO is active.

## 10 · Style kernel for generated plates (only if ADR-006 enables it)

> "dark cinematic technical visualization, deep charcoal void, volumetric cyan haze, glowing acrylic and glass elements,
> thin holographic grid floor, shallow depth of field, rim light, premium motion-design keyframe, 16:9,
> **no text, no letters, no numbers, no logos, no faces**"

Every plate gets a logged seed and license. Plates are backgrounds only; all meaning is drawn by components on top.

## 11 · Do / Don't

**Do**
- Show a mechanism changing state in every sentence.
- Name objects in place with labels.
- Keep one subject per moment.
- Use match cuts.
- Use failure (crit) → fix (ok).
- Call back to earlier scenes.
- Zoom out to A-01 at act ends.

**Don't**
- Bullet lists.
- Paragraphs on screen.
- Full burned-in captions (ADR-004 default).
- Static frames longer than 4 s.
- Decorative use of semantic colours.
- Per-letter Arabic animation.
- Text without a plate or halo over busy backgrounds.
- Legacy frames as footage.
- Unanchored (second-based) timing.
- Numbers that are not in the data contract or a source sentence.
