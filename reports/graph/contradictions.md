# Contradictions (conflicting numbers across sources)

Generated 2026-10-08T20:20:01Z by `dc graph report`. Candidates for the fact-checker; nothing here was merged.

- sentence pairs judged the same claim but with disjoint numbers (`contradicts` edges): **0**
- pairs with partially different numbers (scope differs, kept apart): 3
- sentences closest to a data-contract fact (cos >= 0.599) that share none of its numbers: **38**
- canon (master.md) contradictions preserved by ADR-008: 15

## Sentence pairs

| a | b | numbers | evidence |
|---|---|---|---|

## Sentence vs data contract

| sentence | fact | cos | sentence numbers | fact value | gloss |
|---|---|---|---|---|---|
| `s:S4:P00b:0023` | `d:5.2:7` | 0.758 | 4, 6 | 66.67 % | So four out of six succeeded. What do you think the success rate is? Work it out yourselves. |
| `s:S1:ar-natural:0173` | `d:6.3:6` | 0.728 | 1007, 9 | 13 | Order ten-oh-seven points at customer 9, who does not exist, so the inner join removes the order entirely, and it does so silently. |
| `s:S4:P09:0011` | `d:6.3:6` | 0.685 | 1007, 9 | 13 | With an inner join, order 1007 points to customer 9, but that customer is not in the customers table for some reason. |
| `s:S4:P11:0023` | `d:6.3:6` | 0.677 | 1013 | 13 | And a customer name that is missing altogether in order 1013. |
| `s:S4:P08:0046` | `d:6.3:6` | 0.659 | 1007 | 13 | Why? Because the JOIN quietly removed the orphan row, order 1007, simply because it can't find its customer. |
| `s:S4:P24:0060` | `d:6.11:1` | 0.658 | 95 | 500 ms | And here a real crisis arrives, and a question we need to think about: P95 latency climbs frighteningly, yet the error rate is perfectly steady, like a straight line. |
| `s:S1:ar-natural:0207` | `d:6.5:1` | 0.649 | 12500 | 1 000 000 rows | Here is the baseline: finding one customer reads twelve thousand five hundred pages. |
| `s:S1:ar-natural:0010` | `d:5.2:6` | 0.646 | 4, 6 | ['T6', 'B', '100', 'FAILED'] | Here are six payments from NilePay, a mobile-money service we will follow all the way to the end; four succeeded. |
| `s:S4:P00b:0021` | `d:5.2:6` | 0.639 | 1, 6 | ['T6', 'B', '100', 'FAILED'] | Here we have six payments, from T1 to T6. |
| `s:S4:P05:0022` | `d:6.3:12` | 0.638 | 1000, 10000, 5000 | silver €850.20 | For example, classifying customers: VIPs paid 10,000 or more, Gold 5,000, and Silver 1,000. |
| `s:S4:P11:0018` | `d:6.4:2` | 0.637 | 1001, 1014, 15 | 4 | 15 rows of raw data, just as they came out of the system, from order 1001 to 1014. |
| `s:S4:P00b:0079` | `d:5.2:4` | 0.635 | 4 | ['T4', 'A', '50', 'OK'] | Step four: we see a small example with real numbers, like the ones in the NilePay table. |
| `s:S4:P12:0054` | `d:6.20:3` | 0.634 | 4 | 16 | Whereas the binary search halves the space and finds the result in just four comparisons. |
| `s:S4:P19:0086` | `d:5.2:7` | 0.634 | 4, 6 | 66.67 % | From these invoices we derive the final statistic: four successful operations out of six. |
| `s:S4:P20:0037` | `d:6.17:3` | 0.632 | 2, 5 | Fourteen | Section two, the five phases. |
| `s:S4:P05:0029` | `d:6.3:1` | 0.625 | 3, 5 | SELECT c.tier, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.tier HAVING SUM(o.total) > 300 ORDER BY revenue DESC LIMIT 1 | We have a loop running over five orders, and an accumulator named total that sums only the delivered orders, which are three. |
| `s:S4:P20:0059` | `d:6.5:1` | 0.624 | 9 | 1 000 000 rows | Imagine a table of 9 rows. |
| `s:S4:P20:0093` | `d:6.12:1` | 0.622 | 99, 99.99 | 95 % | The NFRs impose 99.99% reliability. |
| `s:S4:P13:0045` | `d:6.3:6` | 0.621 | 1005 | 13 | Instead of requesting his own order, he requested GET /orders/1005, which belongs to a completely different user. |
| `s:S4:P00:0062` | `d:6.17:3` | 0.616 | 4 | Fourteen | Having built this strong foundation, we move to section four, the future layer: integrating AI. |
| `s:S4:P06:0029` | `d:6.20:8` | 0.615 | 1000000, 8 | 10 000 | To picture this huge difference in numbers: a million items in a list take about 8 MB of memory. |
| `s:S1:ar-natural:0162` | `d:6.4:2` | 0.612 | 11, 13, 14, 2 | 4 | Watch the funnel: fourteen rows in, thirteen after the join drops the orphan, eleven after the filter, two groups out — gold and silver |
| `s:S4:P16:0046` | `d:6.17:2` | 0.612 | 12, 36 | every row sums to exactly 1.000 | But in the background, the actual rows backing each cell grow from 12 to 36 rows. |
| `s:S4:P20:0039` | `d:6.17:3` | 0.612 | 5 | Fourteen | The Acceptance Testing phases happen in five strict steps. |
| `s:S1:ar-natural:0163` | `d:6.1:11` | 0.611 | 3948.5 | 14 rows | And add them up: three thousand nine hundred and forty-eight fifty, the same total the cleaning chapter will reach from the other direction. |
| `s:S1:ar-natural:0524` | `d:6.5:8` | 0.611 | 3 | two | Then operations — three signals: |
| `s:S4:P22:0049` | `d:5.2:8` | 0.61 | 696 | 400 EGP | In total, 696 weights. |
| `s:S1:ar-natural:0012` | `d:6.17:3` | 0.608 | 7 | Fourteen | Seven movements: from nothing to a working machine — files, folders, the terminal, your first line of code. |
| `s:S4:P08:0027` | `d:6.3:6` | 0.608 | 1007, 9 | 13 | Look closely and we find this orphan row, order 1007, pointing at customer 9. |
| `s:S4:P17:0041` | `d:6.3:11` | 0.608 | 33.33 | gold €3 098.30 | When we divide them we get the average of a single transaction, which is 33.33 dollars. |
| `s:S4:P06:0034` | `d:6.3:1` | 0.605 | 500 | SELECT c.tier, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.tier HAVING SUM(o.total) > 300 ORDER BY revenue DESC LIMIT 1 | We fetch the data with fetch_orders, extract the data, filter orders worth over 500, add customer data, and finally save to analytics. |
| `s:S1:ar-natural:0384` | `d:6.11:4` | 0.604 | 200 | Ten | Two hundred tasks finish quickly, and one keeps going. |
| `s:S4:P20:0027` | `d:6.3:13` | 0.604 | 66 | HAVING > 300 | So the net figure, the plus 66, gets completely wiped out. |
| `s:S4:P18:0027` | `d:6.5:3` | 0.603 | 24, 3 | 12 500 pages | And each one has 3 copies, so that is 24 copies, fully protected. |
| `s:S4:P17:0081` | `d:6.9:1` | 0.601 | 4 | k = 1 | But on the right, after masking, the number is masked and only the last four digits are visible, and the name only the first letter. |
| `s:S4:P20:0030` | `d:6.11:4` | 0.601 | 7 | Ten | Here for example we have seven records matching completely. |
| `s:S1:ar-natural:0527` | `d:6.11:1` | 0.6 | 95 | 500 ms | Here is the incident: the p95 is climbing and the error rate is completely flat, which is the fingerprint of a saturating resource rather than a bug. |
| `s:S4:P14:0067` | `d:6.20:8` | 0.599 | 100, 101 | 10 000 | That is 101 queries just for 100 records. |

## Canon contradictions (master.md)

- K001 (contradiction): Artifact: 'none — this is the hook.' while §15 requires a named artifact for every chapter
- K002 (contradiction): Prediction: none (§15 needs >= 1 prediction per act; checked per act below)
- K003 (contradiction): Artifact: 'none.' while §15 requires a named artifact for every chapter
- K004 (contradiction): Artifact: 'none — this is context.' while §15 requires a named artifact for every chapter
- K005 (contradiction): Prediction: none (§15 needs >= 1 prediction per act; checked per act below)
- K006 (contradiction): no prediction in CH-36
- K007 (contradiction): table acts ['AI', 'Analytics', 'Big data', 'Close', 'Craft', 'Domain', 'Ground Zero', 'Orientation', 'Platform', 'Python', 'SQL', 'Ship', 'Systems'] (13); rhythm acts ['Orientation', 'Ground Zero', 'Python', 'SQL', 'Analytics', 'Craft & Systems', 'Platform', 'Big data', 'Domain', 'AI', 'Ship'] (11)
- K008 (contradiction): §9.1 permits a 3D scene in CH-01 but its §8 Patterns line does not declare P19 (P01 · P20 · P13)
- K009 (contradiction): §9.1 permits a 3D scene in CH-25 but its §8 Patterns line does not declare P19 (P02 · P03 · P04 · P18 · P22)
- K010 (contradiction): §9.1 permits a 3D scene in CH-36 but its §8 Patterns line does not declare P19 (P20 · P01)
- K011 (contradiction): the figures are OK-only totals; all-status totals are A = 250, B = 450. Label on screen must say 'successful'.
- K012 (contradiction): heading says 'seven gaps' but the table has 10 rows
- K013 (info): 31 of 37 chapters list fewer AR than EN labels (EN 162, AR 121). Most missing ones are technical or numeric labels kept Latin per §0.3, but some carry English explanatory words (e.g. CH-03 EN '1 byte = 8 bits = 256 values' and 'UTF-8' have no AR entry). The Arabic typographer decides per label.
- K014 (contradiction): P00 allows 3D in three places only (الـ3D مسموح في تلات أماكن بس: RAM مقابل disk (الجزء 02)، والـcluster (الجزء 18)، ومساحة الـembeddings (الجزء 23) — والباقي 2D.); master §9.1 permits six (CPU/memory/disk, HDFS, Spark executors, embeddings, architecture, atlas)
- K015 (info): timestamps are mm:ss without hours and wrap at 60:00; unwrapped (+3600 s) in cues_70m05.json#ar_lines_t5
