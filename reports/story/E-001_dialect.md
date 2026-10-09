# E-001 step 4: dialect probe (text only)

Seed: `20261009` (python `random.Random`; asset chosen weighted by duration, start uniform in [0, dur-120 s]). Source: `corpus/transcripts/a_S4_*.words.jsonl` (ASR + polish text). No ASR, no CPU queue. Script is reproducible from seed (`probe.py` kept out of repo; logic below).

Voice spans: `corpus/audio/voices.json` has only per-asset ECAPA clusters, no intra-asset spans, so voice = cluster of the S4 part. A = P00,P00b,P02,P05,P08,P13,P15,P16,P20,P24 (cluster shared with S1/S2). B = P03,P04,P06,P07,P09,P10-P12,P14,P17-P19,P21-P23,P25. C = P01 only (shares cluster with S5 en-natural).

Markers (diacritics stripped, whole-token match). Egyptian: ده دي دا دول مش عايز/عاوز(ين) إزاي/ازاي بتاع(ة/ت) كده اللي فين دلوقتي أوي ليه إيه امتى لسه بقى عشان/علشان برضه/برضو مفيش إحنا/احنا انتو مين كمان حاجة. MSA: هذا هذه هذان هؤلاء ليس/ليست يريد تريد نريد أريد كيف الذي التي الذين سوف لماذا ماذا متى أين لدينا لديك لديه لدي يجب أيضا عندما بدلا لأن كذلك ذلك تلك.

Classification: English if Latin-script tokens > 50%; undetermined if markers < 3; Egyptian if MSA/(EG+MSA) <= 10%; MSA if >= 70%; else mixed.

| Voice | Window (asset, start s) | Tokens | EG | MSA | Class | Excerpt |
|---|---|---|---|---|---|---|
| A | P15 @ 409.8 | 280 | 26 | 1 | Egyptian | بتكون Gate Activated النشر أو الـpublishing بيتعمله Blocked فوراً ليه بنعمل كده؟ لأن مجرد |
| A | P00b @ 241.8 | 262 | 32 | 1 | Egyptian | بتاعنا هو وحدة الـidempotency اللي بتضمن إننا لو أفلنا وشغلنا أي pipeline تاني الداتا |
| A | P00b @ 44.0 | 279 | 29 | 0 | Egyptian | وبعدها مسافة على إنهم 3 مدن مختلفة تماما الوقت اللي بنقضيه عشان ننظف الداتا |
| A | P13 @ 121.1 | 244 | 9 | 0 | Egyptian | بالنسبة لأكواد الحالة أو الـstatus codes ممكن نبسطها بفكرة عبقرية من غير حفظ أرقام |
| A | P00 @ 355.7 | 274 | 17 | 0 | Egyptian | طيب النقطة الحاسمة بقى هنا القسم الخامس من التعلم لسوق العمل إزاي ممكن نحول |
| B | P25 @ 349.6 | 277 | 37 | 0 | Egyptian | ع الفاضي الـmodel اللي دقته 99 % وما مسكش اي حاجة فعالية والبيانات اللي |
| B | P09 @ 179.2 | 291 | 19 | 0 | Egyptian | الاثنين واخدين 4.8 الدوال الثلاثة بيتعاملوا معهم بطرق مختلفة تماما الـROW_NUMBER بيخترع الترتيب من |
| B | P11 @ 247.8 | 290 | 29 | 1 | Egyptian | الإحصاء أصلاً وهو نفس السبب اللي بيأكد إن متوسط عينة واحدة مستحيل يعبر عن |
| B | P22 @ 17.5 | 269 | 32 | 0 | Egyptian | دالة خطية وراها دالة خطية، النتيجة برضو خطية كيفك بتبدأ تتني ويتعمل منحنيات وده |
| B | P22 @ 244.7 | 264 | 25 | 0 | Egyptian | 0 ل 0 .3 التوزيع بيبقى حاد ومحدد وده بيرفكت لتحليل البيانات بس لو |
| C | P01 @ 236.3 | 307 | 0 | 0 | English (not Arabic) | is it so incredibly expensive? Think about it for a second. In massive big |
| C | P01 @ 300.9 | 346 | 0 | 0 | English (not Arabic) | makes enterprise AI even possible. To pull this off, you have to understand RAG, |
| C | P01 @ 142.3 | 253 | 0 | 0 | English (not Arabic) | building up the muscle to query data, process it, and actually serve it up |
| C | P01 @ 392.4 | 371 | 0 | 0 | English (not Arabic) | curriculum demands 3 mandatory portfolio projects That guarantee you'll stand out Number 1 An |
| C | P01 @ 49.2 | 349 | 0 | 0 | English (not Arabic) | trap. Instead, you have to expose where it breaks. You'll need every single concept |

## Share of non-Egyptian windows

| Voice | Windows | Egyptian | Non-Egyptian | Share |
|---|---|---|---|---|
| A | 5 | 5 | 0 | 0% |
| B | 5 | 5 | 0 | 0% |
| C | 5 | 0 | 5 | 100% |
| Overall | 15 | 10 | 5 | 33% |
| Overall, Arabic voices A+B only | 10 | 10 | 0 | 0% |

## Findings

- Every A and B window is Egyptian colloquial with no MSA-dominated or mixed window; the only MSA marker hits are isolated `لأن` (also common in Egyptian speech), so the dialect is not at risk in the stored S4 text for A and B.
- Voice C (P01) is English speech (the NotebookLM English deep-dive, same cluster as S5), so Egyptian/MSA markers are 0 and every C window is classified English, not non-Egyptian-Arabic dialect drift. Counting C as non-Egyptian gives the overall 33% figure; excluding it gives the A+B row. C is not a dialect risk, it is a language/role decision (use only as English source or drop).
- Limits: text is ASR/polished output (ASR may normalise dialect toward MSA, so measured MSA may be overstated relative to speech; Egyptian classification is therefore conservative); 5 windows per voice is a small sample; C windows overlap (532 s part cannot hold 5 disjoint 120 s windows, starts >= 60 s apart).
