# DA Camp × NilePay — 28-Minute Integrated Illustrative...: sections 316-350 of 547

Doc `f:8aac5a1cae9e` | up: `maps/docs/8aac5a1cae9e.md` | `data/extracted/Chatgpt.zip.d/Chatgpt_part1.zip.d/DA_Camp_28min_Merged_Video_Master_Source.md`

- **✅ GOOD: Use built-in aggregations (C-optimized)** `f:8aac5a1cae9e#01174`
- **❌ SLOW: Avoid apply with simple functions** `f:8aac5a1cae9e#01175`
- **✅ GOOD: Use transform for same-shape output** `f:8aac5a1cae9e#01176`
- **❌ SLOW: Merge after groupby** `f:8aac5a1cae9e#01177..01253`
- **✅ GOOD: Multiple aggregations in one call** `f:8aac5a1cae9e#01178..01250`
- **❌ SLOW: Multiple separate groupby calls** `f:8aac5a1cae9e#01179..01251`
- **✅ GOOD: Categorical dtype for groupby column** `f:8aac5a1cae9e#01180`
- **Inner Join (default) - only matching rows** `f:8aac5a1cae9e#01182`
- **Left Join - all from left, matching from right** `f:8aac5a1cae9e#01183`
- **Right Join - matching from left, all from right** `f:8aac5a1cae9e#01184`
- **Outer Join - all from both** `f:8aac5a1cae9e#01185`
- **Different column names** `f:8aac5a1cae9e#01186`
- **Multiple key columns** `f:8aac5a1cae9e#01187`
- **Indicator column (useful for debugging)** `f:8aac5a1cae9e#01188`
- **Suffix for overlapping columns** `f:8aac5a1cae9e#01189`
- **Validate merge (catch data issues)** `f:8aac5a1cae9e#01190`
- **Vertical concat (stack rows)** `f:8aac5a1cae9e#01191`
- **With keys (multi-index)** `f:8aac5a1cae9e#01192`
- **Horizontal concat (add columns)** `f:8aac5a1cae9e#01193`
- **Handle different columns** `f:8aac5a1cae9e#01194`
- **Join customers -> orders -> order_items** `f:8aac5a1cae9e#01195`
- **Alternative: Reduce approach for many DataFrames** `f:8aac5a1cae9e#01196`
- **This is simplified - real implementation needs key mapping** `f:8aac5a1cae9e#01197`
- **Set index for faster repeated joins** `f:8aac5a1cae9e#01198`
- **For large DataFrames, categorical keys are faster** `f:8aac5a1cae9e#01199`
- **Sort keys for merge performance** `f:8aac5a1cae9e#01200..01203`
- **Sample messy data** `f:8aac5a1cae9e#01204`
- **Check for missing values** `f:8aac5a1cae9e#01205`
- **Percentage missing** `f:8aac5a1cae9e#01206`
- **Detect various "missing" representations** `f:8aac5a1cae9e#01207`
- **Replace various missing representations with NaN** `f:8aac5a1cae9e#01208`
- **Strategy 1: Drop rows with any NaN** `f:8aac5a1cae9e#01209`
- **Drop rows where specific columns are NaN** `f:8aac5a1cae9e#01210`
- **Drop columns with too many NaN** `f:8aac5a1cae9e#01211`
- **Strategy 2: Fill with specific value** `f:8aac5a1cae9e#01212`
