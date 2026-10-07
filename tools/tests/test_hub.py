#!/usr/bin/env python3
"""Plain-assert tests for tools/dclib/hub*.py (static parsers). Run: .venv/bin/python -I tools/tests/test_hub.py"""
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import hub, hub_text as T  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


# knowledge index: fences hide headings, shell-comment H1s are rejected, spans tile the file, CRLF is tolerated
doc = ("# Title\n\nintro\n\n## 1 · Part\n\n```bash\n# not a heading\n## also not\n```\n\n#### step 1\r\ntext\r\n\n"
       "# comment-ish\nls -l\n\n````md\n```\n# inner\n```\n````\n\n### after\n").encode()
with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as f:
    f.write(doc)
secs = hub.knowledge_sections(f.name)
check([s["title"] for s in secs] == ["Title", "1 · Part", "step 1", "after"], [s["title"] for s in secs])
check(secs[0]["byte_start"] == 0 and secs[-1]["byte_end"] == len(doc), "span covers file")
check(all(a["byte_end"] == b["byte_start"] for a, b in zip(secs, secs[1:])), "no gaps")
check(secs[2]["part"] == "1 · Part" and secs[2]["heading_path"][-2:] == ["1 · Part", "step 1"], secs[2])
os.unlink(f.name)

# JS literal reader
src = 'VCC.step({\nid:"a-b",phase:"p1",title:"T \\"q\\" x",lead:"l"+"m",pts:["x","y\\u00e9"],quiz:{q:"?",opts:["1","2"],a:1,why:"w"},build:function(host){var s="}"; return {a:[1,2]};}});'
props = T.parse_props(src, src.index("{"))
check(props["id"] == ("str", "a-b") and props["title"][1] == 'T "q" x' and props["lead"][1] == "lm", props)
check(T.js_array_strings(props["pts"][1]) == ["x", "yé"], "array strings")
check(props["build"][1].startswith("function(host)") and props["build"][1].endswith("}"), "build body is balanced past a '}' inside a string")

# code data / labels / motion
code = 'var pts=[[25,72],[70,25]];var nodes=[{x:70,y:90,label:"question",fill:C.c}];P.txt(ctx,2,3,"iteration","left",11);VCC.anim(host,{});VCC.slider(host,{name:"K",min:2,max:4,val:3,step:1});'
d = T.code_data(code)
check(d["arrays"]["pts"] == [[25, 72], [70, 25]] and d["arrays"]["nodes"][0]["label"] == "question", d)
check(d["sliders"][0]["name"] == "K" and "iteration" in T.code_labels(code) and "left" not in T.code_labels(code), "labels")
check(any("slider" in m for m in T.code_motion(code)), "motion")

# code / mermaid blocks in strings
txt = '<pre class="mermaid"><code>flowchart LR\n  A --&gt; B</code></pre> and <pre><code class="language-sql">SELECT 1;</code></pre>\n```python\nprint(1)\n```'
bl = T.code_blocks(txt)
check([b[0] for b in bl] == ["mermaid", "code", "code"] and bl[0][2] == "flowchart LR\n  A --> B" and bl[1][1] == "sql", bl)
check("c:consumer-lag" in T.concepts_guess("watch consumer lag grow") and "c:grain" in T.concepts_guess("declare the grain"), "concepts")
print(f"test_hub: {n} checks passed")
