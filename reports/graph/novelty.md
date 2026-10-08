# Novelty of the NotebookLM parts (S4) vs the trunk (S1)

Generated 2026-10-08T20:50:27Z by `dc graph report`. ADR-001 evidence.

A unit is *novel* when no S1 sentence is in it and no S1 sentence subsumes any of its members. Runs = maximal stretches of consecutive novel sentences in one part, listed when >= 20 s (start of first to end of last sentence).

Totals: 1979 of 2484 S4 idea units novel (79.7 %); 123 runs >= 20 s totalling 142.3 min of 221.4 min S4 span.

Novelty as a range: 79.7 % is an upper bound (restatements that no adjudication band reached stay novel). The stratified residual audit (`reports/graph/novelty_audit.json`, author self-audit (graph-engineer); independent re-verification pending; current) puts 171 of 2037 novel sentences as clear restatements of S1 (95 % range 75-393), so the estimated novel share is **73.0 %** (95 % range 64.3-76.7 %). Run minutes are upper bounds on the same footing.

Adjudication: round 1 = best-S1 pairs with cos 0.72-0.86; round 2 = still-novel sentences, rank-1 pairs 0.66-0.72, rank 2-3 pairs >= 0.68, pairs >= 0.62 sharing a number or >= 2 rare terms; round 3 = still-novel sentences sharing >= 1 concept with a rank-1 (cos >= 0.58) or rank-2 (cos >= 0.62) S1 match. A sentence is covered when an S1 sentence states the same claim (merge), states it and more (subsumed), or when several S1 sentences state it jointly (`jointly_covers` / `covers` edges). Nested number sets ({1007} vs {1007, 9}) no longer veto a judged merge; disjoint or partially overlapping sets still do.

Claim-level novelty is strict (same claim at the same level of detail). Topic-level check: of the 1667 S4 units with a term mention, 7.6 % mention only concepts that S1 never mentions; the rest restate S1 topics with new claims, examples or detail (column *Concept-new %*).

| Part | Sent. | Units | Novel units % | Novel speech % | Concept-new % | Shared w/ other S4 % | Span s | Runs >= 20 s | Run total s | Top trunk chapters |
|---|---|---|---|---|---|---|---|---|---|---|
| P00 | 98 | 98 | 94.9 | 94.3 | 6.3 | 5.1 | 526.7 | 3 | 479.2 | CH-12, CH-11, CH-10 |
| P00b (alt. take of P00) | 94 | 92 | 62.0 | 60.4 | 4.5 | 1.1 | 519.8 | 5 | 259.6 | CH-01, CH-00, CH-02 |
| P01 | 115 | 114 | 93.9 | 92.1 | 5.5 | 5.3 | 532.8 | 5 | 459.2 | CH-02, CH-01, CH-22 |
| P02 | 67 | 66 | 72.7 | 69.0 | 15.6 | 4.5 | 393.3 | 4 | 175.8 | CH-03, CH-04 |
| P03 | 105 | 105 | 94.3 | 94.1 | 7.5 | 2.9 | 558.3 | 5 | 517.0 | CH-05 |
| P04 | 87 | 86 | 94.2 | 92.4 | 6.6 | 2.3 | 476.7 | 5 | 438.4 | CH-05, CH-09 |
| P05 | 106 | 105 | 79.0 | 78.8 | 3.5 | 4.8 | 566.9 | 6 | 355.1 | CH-06, CH-07 |
| P06 | 103 | 103 | 78.6 | 77.5 | 2.7 | 1.9 | 517.0 | 7 | 355.8 | CH-09, CH-08, CH-18 |
| P07 | 95 | 95 | 96.8 | 97.0 | 13.9 | 4.2 | 470.4 | 3 | 455.5 | CH-12, CH-13 |
| P08 | 78 | 78 | 66.7 | 66.0 | 2.8 | 7.7 | 477.2 | 5 | 218.8 | CH-11, CH-10, CH-12 |
| P09 | 100 | 100 | 63.0 | 62.2 | 3.8 | 7.0 | 535.4 | 6 | 255.6 | CH-12, CH-13, CH-11 |
| P10 | 86 | 84 | 70.2 | 66.7 | 5.7 | 4.8 | 488.1 | 4 | 260.3 | CH-14 |
| P11 | 113 | 113 | 68.1 | 66.0 | 0.0 | 3.5 | 513.7 | 3 | 166.3 | CH-15, CH-16, CH-17 |
| P12 | 95 | 92 | 78.3 | 68.7 | 16.4 | 3.3 | 452.4 | 4 | 199.5 | CH-18, CH-19 |
| P13 | 71 | 71 | 83.1 | 80.0 | 13.0 | 0.0 | 431.5 | 4 | 294.0 | CH-20 |
| P14 | 85 | 85 | 100.0 | 100.0 | 18.0 | 2.4 | 464.1 | 1 | 464.1 |  |
| P15 | 103 | 101 | 72.3 | 63.7 | 2.9 | 5.9 | 584.7 | 6 | 261.8 | CH-21, CH-22, CH-10 |
| P16 | 91 | 91 | 84.6 | 80.8 | 6.3 | 4.4 | 454.6 | 4 | 304.6 | CH-23, CH-27 |
| P17 | 92 | 92 | 97.8 | 97.1 | 11.1 | 3.3 | 462.1 | 2 | 448.8 | CH-23 |
| P18 | 127 | 127 | 78.7 | 75.9 | 10.3 | 1.6 | 583.0 | 5 | 352.8 | CH-25, CH-24 |
| P19 | 95 | 95 | 74.7 | 70.4 | 5.4 | 3.2 | 519.0 | 4 | 290.6 | CH-26, CH-27, CH-00 |
| P20 | 104 | 104 | 84.6 | 83.1 | 10.9 | 1.9 | 452.1 | 6 | 323.7 | CH-28 |
| P21 | 91 | 91 | 63.7 | 58.6 | 6.9 | 3.3 | 455.1 | 3 | 139.2 | CH-30, CH-29, CH-36 |
| P22 | 102 | 102 | 70.6 | 69.3 | 11.4 | 2.9 | 477.9 | 4 | 264.3 | CH-32, CH-31 |
| P23 | 81 | 81 | 79.0 | 75.7 | 3.2 | 6.2 | 397.0 | 7 | 236.1 | CH-33, CH-36 |
| P24 | 80 | 80 | 70.0 | 68.6 | 3.4 | 3.8 | 472.8 | 6 | 223.3 | CH-34 |
| P25 | 100 | 100 | 77.0 | 79.4 | 14.0 | 3.0 | 501.5 | 6 | 338.8 | CH-35, CH-36 |

## Novel runs >= 20 s

### a:S4:P00
- 40-175540 ms (175.5 s, 35 sentences): `s:S4:P00:0000` .. `s:S4:P00:0034`
- 219360-305420 ms (86.1 s, 15 sentences): `s:S4:P00:0043` .. `s:S4:P00:0057`
- 309140-526740 ms (217.6 s, 39 sentences): `s:S4:P00:0059` .. `s:S4:P00:0097`

### a:S4:P00b
- 300-44300 ms (44.0 s, 8 sentences): `s:S4:P00b:0000` .. `s:S4:P00b:0007`
- 116920-158500 ms (41.6 s, 7 sentences): `s:S4:P00b:0020` .. `s:S4:P00b:0026`
- 164120-216200 ms (52.1 s, 8 sentences): `s:S4:P00b:0028` .. `s:S4:P00b:0035`
- 292260-329320 ms (37.1 s, 8 sentences): `s:S4:P00b:0051` .. `s:S4:P00b:0058`
- 418040-502820 ms (84.8 s, 17 sentences): `s:S4:P00b:0074` .. `s:S4:P00b:0090`

### a:S4:P01
- 60-109020 ms (109.0 s, 29 sentences): `s:S4:P01:0000` .. `s:S4:P01:0028`
- 140620-261360 ms (120.7 s, 19 sentences): `s:S4:P01:0037` .. `s:S4:P01:0055`
- 293680-327440 ms (33.8 s, 9 sentences): `s:S4:P01:0063` .. `s:S4:P01:0071`
- 332320-391860 ms (59.5 s, 13 sentences): `s:S4:P01:0073` .. `s:S4:P01:0085`
- 396680-532900 ms (136.2 s, 28 sentences): `s:S4:P01:0087` .. `s:S4:P01:0114`

### a:S4:P02
- 300-42020 ms (41.7 s, 7 sentences): `s:S4:P02:0000` .. `s:S4:P02:0006`
- 205200-227820 ms (22.6 s, 4 sentences): `s:S4:P02:0033` .. `s:S4:P02:0036`
- 271780-320940 ms (49.2 s, 10 sentences): `s:S4:P02:0044` .. `s:S4:P02:0053`
- 331360-393640 ms (62.3 s, 11 sentences): `s:S4:P02:0056` .. `s:S4:P02:0066`

### a:S4:P03
- 14920-44020 ms (29.1 s, 5 sentences): `s:S4:P03:0003` .. `s:S4:P03:0007`
- 52660-79280 ms (26.6 s, 5 sentences): `s:S4:P03:0009` .. `s:S4:P03:0013`
- 84960-272060 ms (187.1 s, 37 sentences): `s:S4:P03:0015` .. `s:S4:P03:0051`
- 279680-323700 ms (44.0 s, 7 sentences): `s:S4:P03:0053` .. `s:S4:P03:0059`
- 328420-558640 ms (230.2 s, 44 sentences): `s:S4:P03:0061` .. `s:S4:P03:0104`

### a:S4:P04
- 300-25260 ms (25.0 s, 5 sentences): `s:S4:P04:0000` .. `s:S4:P04:0004`
- 30180-101400 ms (71.2 s, 12 sentences): `s:S4:P04:0006` .. `s:S4:P04:0017`
- 110280-132240 ms (22.0 s, 4 sentences): `s:S4:P04:0019` .. `s:S4:P04:0022`
- 143120-169260 ms (26.1 s, 4 sentences): `s:S4:P04:0025` .. `s:S4:P04:0028`
- 182900-476980 ms (294.1 s, 56 sentences): `s:S4:P04:0031` .. `s:S4:P04:0086`

### a:S4:P05
- 240-52640 ms (52.4 s, 12 sentences): `s:S4:P05:0000` .. `s:S4:P05:0011`
- 58060-86240 ms (28.2 s, 6 sentences): `s:S4:P05:0014` .. `s:S4:P05:0019`
- 143940-169440 ms (25.5 s, 5 sentences): `s:S4:P05:0031` .. `s:S4:P05:0035`
- 204360-278980 ms (74.6 s, 13 sentences): `s:S4:P05:0044` .. `s:S4:P05:0056`
- 314340-430940 ms (116.6 s, 22 sentences): `s:S4:P05:0063` .. `s:S4:P05:0084`
- 509420-567180 ms (57.8 s, 8 sentences): `s:S4:P05:0098` .. `s:S4:P05:0105`

### a:S4:P06
- 320-34080 ms (33.8 s, 9 sentences): `s:S4:P06:0000` .. `s:S4:P06:0008`
- 41120-93740 ms (52.6 s, 12 sentences): `s:S4:P06:0010` .. `s:S4:P06:0021`
- 154740-205600 ms (50.9 s, 9 sentences): `s:S4:P06:0033` .. `s:S4:P06:0041`
- 231640-339400 ms (107.8 s, 18 sentences): `s:S4:P06:0048` .. `s:S4:P06:0065`
- 369940-403180 ms (33.2 s, 9 sentences): `s:S4:P06:0072` .. `s:S4:P06:0080`
- 413320-440700 ms (27.4 s, 7 sentences): `s:S4:P06:0083` .. `s:S4:P06:0089`
- 467180-517300 ms (50.1 s, 7 sentences): `s:S4:P06:0096` .. `s:S4:P06:0102`

### a:S4:P07
- 280-147740 ms (147.5 s, 29 sentences): `s:S4:P07:0000` .. `s:S4:P07:0028`
- 155840-398560 ms (242.7 s, 51 sentences): `s:S4:P07:0031` .. `s:S4:P07:0081`
- 405400-470720 ms (65.3 s, 12 sentences): `s:S4:P07:0083` .. `s:S4:P07:0094`

### a:S4:P08
- 160-55420 ms (55.3 s, 9 sentences): `s:S4:P08:0000` .. `s:S4:P08:0008`
- 152600-209200 ms (56.6 s, 8 sentences): `s:S4:P08:0028` .. `s:S4:P08:0035`
- 212500-232760 ms (20.3 s, 3 sentences): `s:S4:P08:0037` .. `s:S4:P08:0039`
- 309580-340820 ms (31.2 s, 5 sentences): `s:S4:P08:0051` .. `s:S4:P08:0055`
- 422000-477360 ms (55.4 s, 10 sentences): `s:S4:P08:0068` .. `s:S4:P08:0077`

### a:S4:P09
- 340-33340 ms (33.0 s, 7 sentences): `s:S4:P09:0000` .. `s:S4:P09:0006`
- 146200-207540 ms (61.3 s, 12 sentences): `s:S4:P09:0029` .. `s:S4:P09:0040`
- 248840-298640 ms (49.8 s, 9 sentences): `s:S4:P09:0049` .. `s:S4:P09:0057`
- 323200-343700 ms (20.5 s, 4 sentences): `s:S4:P09:0062` .. `s:S4:P09:0065`
- 419260-451700 ms (32.4 s, 5 sentences): `s:S4:P09:0080` .. `s:S4:P09:0084`
- 477140-535760 ms (58.6 s, 10 sentences): `s:S4:P09:0090` .. `s:S4:P09:0099`

### a:S4:P10
- 27040-53060 ms (26.0 s, 7 sentences): `s:S4:P10:0004` .. `s:S4:P10:0010`
- 148120-181480 ms (33.4 s, 6 sentences): `s:S4:P10:0029` .. `s:S4:P10:0034`
- 230200-281180 ms (51.0 s, 9 sentences): `s:S4:P10:0042` .. `s:S4:P10:0050`
- 318060-468000 ms (149.9 s, 24 sentences): `s:S4:P10:0057` .. `s:S4:P10:0080`

### a:S4:P11
- 240-56800 ms (56.6 s, 15 sentences): `s:S4:P11:0000` .. `s:S4:P11:0014`
- 134340-160980 ms (26.6 s, 6 sentences): `s:S4:P11:0033` .. `s:S4:P11:0038`
- 430900-513960 ms (83.1 s, 17 sentences): `s:S4:P11:0096` .. `s:S4:P11:0112`

### a:S4:P12
- 19840-40080 ms (20.2 s, 7 sentences): `s:S4:P12:0004` .. `s:S4:P12:0010`
- 97080-198180 ms (101.1 s, 21 sentences): `s:S4:P12:0020` .. `s:S4:P12:0040`
- 264280-322420 ms (58.1 s, 13 sentences): `s:S4:P12:0057` .. `s:S4:P12:0069`
- 432620-452700 ms (20.1 s, 4 sentences): `s:S4:P12:0091` .. `s:S4:P12:0094`

### a:S4:P13
- 440-69440 ms (69.0 s, 12 sentences): `s:S4:P13:0000` .. `s:S4:P13:0011`
- 121640-153620 ms (32.0 s, 4 sentences): `s:S4:P13:0021` .. `s:S4:P13:0024`
- 189140-256540 ms (67.4 s, 11 sentences): `s:S4:P13:0030` .. `s:S4:P13:0040`
- 306320-431960 ms (125.6 s, 21 sentences): `s:S4:P13:0050` .. `s:S4:P13:0070`

### a:S4:P14
- 160-464240 ms (464.1 s, 85 sentences): `s:S4:P14:0000` .. `s:S4:P14:0084`

### a:S4:P15
- 54960-81300 ms (26.3 s, 5 sentences): `s:S4:P15:0010` .. `s:S4:P15:0014`
- 112320-139980 ms (27.7 s, 7 sentences): `s:S4:P15:0019` .. `s:S4:P15:0025`
- 232700-303860 ms (71.2 s, 14 sentences): `s:S4:P15:0042` .. `s:S4:P15:0055`
- 313820-349720 ms (35.9 s, 6 sentences): `s:S4:P15:0057` .. `s:S4:P15:0062`
- 477560-525840 ms (48.3 s, 9 sentences): `s:S4:P15:0085` .. `s:S4:P15:0093`
- 532580-584980 ms (52.4 s, 8 sentences): `s:S4:P15:0095` .. `s:S4:P15:0102`

### a:S4:P16
- 180-72220 ms (72.0 s, 14 sentences): `s:S4:P16:0000` .. `s:S4:P16:0013`
- 130740-208280 ms (77.5 s, 16 sentences): `s:S4:P16:0027` .. `s:S4:P16:0042`
- 253120-297380 ms (44.3 s, 9 sentences): `s:S4:P16:0050` .. `s:S4:P16:0058`
- 305480-416320 ms (110.8 s, 24 sentences): `s:S4:P16:0060` .. `s:S4:P16:0083`

### a:S4:P17
- 340-375820 ms (375.5 s, 75 sentences): `s:S4:P17:0000` .. `s:S4:P17:0074`
- 389180-462480 ms (73.3 s, 15 sentences): `s:S4:P17:0077` .. `s:S4:P17:0091`

### a:S4:P18
- 220-83280 ms (83.1 s, 20 sentences): `s:S4:P18:0000` .. `s:S4:P18:0019`
- 134720-180300 ms (45.6 s, 10 sentences): `s:S4:P18:0033` .. `s:S4:P18:0042`
- 213180-303140 ms (90.0 s, 19 sentences): `s:S4:P18:0051` .. `s:S4:P18:0069`
- 362360-386680 ms (24.3 s, 5 sentences): `s:S4:P18:0082` .. `s:S4:P18:0086`
- 473400-583200 ms (109.8 s, 23 sentences): `s:S4:P18:0104` .. `s:S4:P18:0126`

### a:S4:P19
- 240-78740 ms (78.5 s, 16 sentences): `s:S4:P19:0000` .. `s:S4:P19:0015`
- 180120-210240 ms (30.1 s, 5 sentences): `s:S4:P19:0035` .. `s:S4:P19:0039`
- 279200-428960 ms (149.8 s, 29 sentences): `s:S4:P19:0050` .. `s:S4:P19:0078`
- 437980-470220 ms (32.2 s, 6 sentences): `s:S4:P19:0080` .. `s:S4:P19:0085`

### a:S4:P20
- 300-45340 ms (45.0 s, 12 sentences): `s:S4:P20:0000` .. `s:S4:P20:0011`
- 60600-90160 ms (29.6 s, 8 sentences): `s:S4:P20:0015` .. `s:S4:P20:0022`
- 150080-181540 ms (31.5 s, 8 sentences): `s:S4:P20:0037` .. `s:S4:P20:0044`
- 186600-258280 ms (71.7 s, 15 sentences): `s:S4:P20:0046` .. `s:S4:P20:0060`
- 279740-311300 ms (31.6 s, 8 sentences): `s:S4:P20:0065` .. `s:S4:P20:0072`
- 338120-452420 ms (114.3 s, 25 sentences): `s:S4:P20:0079` .. `s:S4:P20:0103`

### a:S4:P21
- 200-50020 ms (49.8 s, 11 sentences): `s:S4:P21:0000` .. `s:S4:P21:0010`
- 90420-126620 ms (36.2 s, 7 sentences): `s:S4:P21:0019` .. `s:S4:P21:0025`
- 402060-455300 ms (53.2 s, 11 sentences): `s:S4:P21:0080` .. `s:S4:P21:0090`

### a:S4:P22
- 320-57620 ms (57.3 s, 12 sentences): `s:S4:P22:0000` .. `s:S4:P22:0011`
- 97740-121000 ms (23.3 s, 5 sentences): `s:S4:P22:0021` .. `s:S4:P22:0025`
- 197480-227580 ms (30.1 s, 7 sentences): `s:S4:P22:0046` .. `s:S4:P22:0052`
- 324700-478260 ms (153.6 s, 31 sentences): `s:S4:P22:0071` .. `s:S4:P22:0101`

### a:S4:P23
- 260-46200 ms (45.9 s, 8 sentences): `s:S4:P23:0000` .. `s:S4:P23:0007`
- 84520-115000 ms (30.5 s, 6 sentences): `s:S4:P23:0017` .. `s:S4:P23:0022`
- 138060-165300 ms (27.2 s, 6 sentences): `s:S4:P23:0026` .. `s:S4:P23:0031`
- 186060-217700 ms (31.6 s, 7 sentences): `s:S4:P23:0035` .. `s:S4:P23:0041`
- 237740-259560 ms (21.8 s, 5 sentences): `s:S4:P23:0046` .. `s:S4:P23:0050`
- 299560-329420 ms (29.9 s, 6 sentences): `s:S4:P23:0059` .. `s:S4:P23:0064`
- 348000-397240 ms (49.2 s, 12 sentences): `s:S4:P23:0069` .. `s:S4:P23:0080`

### a:S4:P24
- 260-63040 ms (62.8 s, 11 sentences): `s:S4:P24:0000` .. `s:S4:P24:0010`
- 133320-175760 ms (42.4 s, 7 sentences): `s:S4:P24:0023` .. `s:S4:P24:0029`
- 204820-225260 ms (20.4 s, 4 sentences): `s:S4:P24:0034` .. `s:S4:P24:0037`
- 288180-308880 ms (20.7 s, 4 sentences): `s:S4:P24:0049` .. `s:S4:P24:0052`
- 375440-395920 ms (20.5 s, 4 sentences): `s:S4:P24:0063` .. `s:S4:P24:0066`
- 416580-473080 ms (56.5 s, 9 sentences): `s:S4:P24:0071` .. `s:S4:P24:0079`

### a:S4:P25
- 280-39900 ms (39.6 s, 7 sentences): `s:S4:P25:0000` .. `s:S4:P25:0006`
- 115040-159980 ms (44.9 s, 9 sentences): `s:S4:P25:0021` .. `s:S4:P25:0029`
- 184640-325880 ms (141.2 s, 28 sentences): `s:S4:P25:0034` .. `s:S4:P25:0061`
- 361840-404560 ms (42.7 s, 8 sentences): `s:S4:P25:0069` .. `s:S4:P25:0076`
- 427880-462200 ms (34.3 s, 8 sentences): `s:S4:P25:0084` .. `s:S4:P25:0091`
- 465620-501740 ms (36.1 s, 7 sentences): `s:S4:P25:0093` .. `s:S4:P25:0099`

Full sentence-id lists per run and the S4 part x S1 chapter matrix (% of the part's units that merge with or are subsumed by a sentence of that chapter) are in `reports/graph/novelty.json`.
