"""Static parsers for the HUB knowledge harvest (P2.5). Nothing here executes archive code.

Shared by dclib.hub (commands). Pure functions: JS-literal reading, HTML -> text, concept guessing, code detection.
"""
import html as _html
import json
import re

# --------------------------------------------------------------------------- text helpers
_WS = re.compile(r"\s+")


def squash(s):
    return _WS.sub(" ", s or "").strip()


def html_text(fragment):
    """Visible text of an HTML fragment (scripts/styles dropped). Falls back to a tag-strip regex."""
    if not fragment:
        return ""
    try:
        import lxml.html
        root = lxml.html.fromstring("<div>" + fragment + "</div>")
        for bad in root.xpath("//script|//style"):
            bad.drop_tree()
        return squash(root.text_content())
    except Exception:  # noqa: BLE001
        return squash(_html.unescape(re.sub(r"<[^>]+>", " ", fragment)))


def clip(s, n):
    s = s or ""
    return (s[:n], len(s) > n)


# --------------------------------------------------------------------------- JS literal reading
def unescape_js(body):
    out, i, n = [], 0, len(body)
    simple = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}
    while i < n:
        c = body[i]
        if c != "\\" or i + 1 >= n:
            out.append(c)
            i += 1
            continue
        d = body[i + 1]
        if d in simple:
            out.append(simple[d])
            i += 2
        elif d == "u" and re.match(r"[0-9a-fA-F]{4}", body[i + 2:i + 6]):
            cp = int(body[i + 2:i + 6], 16)
            i += 6
            if 0xD800 <= cp < 0xDC00 and body[i:i + 2] == "\\u" and re.match(r"[dD][c-fC-F][0-9a-fA-F]{2}", body[i + 2:i + 6]):
                lo = int(body[i + 2:i + 6], 16)
                cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00)
                i += 6
            out.append(chr(cp))
        elif d == "x" and re.match(r"[0-9a-fA-F]{2}", body[i + 2:i + 4]):
            out.append(chr(int(body[i + 2:i + 4], 16)))
            i += 4
        elif d == "\n":
            i += 2
        else:
            out.append(d)
            i += 2
    return "".join(out)


def skip_ws(s, i):
    n = len(s)
    while i < n:
        if s[i] in " \t\r\n,":
            i += 1
        elif s.startswith("//", i):
            j = s.find("\n", i)
            i = n if j < 0 else j + 1
        elif s.startswith("/*", i):
            j = s.find("*/", i + 2)
            i = n if j < 0 else j + 2
        else:
            break
    return i


def read_string(s, i):
    """s[i] is a quote. Returns (python_str, index_after). Template literals without ${} are accepted."""
    q = s[i]
    j, n = i + 1, len(s)
    while j < n:
        c = s[j]
        if c == "\\":
            j += 2
            continue
        if c == q:
            return unescape_js(s[i + 1:j]), j + 1
        j += 1
    return unescape_js(s[i + 1:]), n


def match_close(s, i):
    """s[i] in '{[('. Index just past the matching closer, string- and comment-aware (regex literals approximated)."""
    pairs = {"{": "}", "[": "]", "(": ")"}
    stack = [pairs[s[i]]]
    j, n = i + 1, len(s)
    while j < n and stack:
        c = s[j]
        if c in "\"'`":
            _, j = read_string(s, j)
            continue
        if c == "/" and j + 1 < n:
            if s[j + 1] == "/":
                k = s.find("\n", j)
                j = n if k < 0 else k
                continue
            if s[j + 1] == "*":
                k = s.find("*/", j + 2)
                j = n if k < 0 else k + 2
                continue
        if c in pairs:
            stack.append(pairs[c])
        elif c == stack[-1]:
            stack.pop()
        j += 1
    return j


def read_value(s, i):
    """Read one JS value at i. Returns (kind, raw_or_value, index_after). kind: str|raw."""
    i = skip_ws(s, i)
    c = s[i] if i < len(s) else ""
    if c in "\"'`":
        v, j = read_string(s, i)
        k = skip_ws(s, j)
        while k < len(s) and s[k] == "+" and k + 1 < len(s):  # "a"+"b"
            k2 = skip_ws(s, k + 1)
            if k2 < len(s) and s[k2] in "\"'`":
                v2, j = read_string(s, k2)
                v += v2
                k = skip_ws(s, j)
            else:
                break
        return "str", v, j
    if c in "{[(":
        j = match_close(s, i)
        return "raw", s[i:j], j
    if s.startswith("function", i):
        j = s.find("{", i)
        k = match_close(s, j) if j >= 0 else i + 8
        return "raw", s[i:k], k
    m = re.compile(r"[^,}\]\n]*").match(s, i)
    return "raw", m.group(0).strip(), m.end()


def parse_props(s, i):
    """s[i] == '{'. Top-level key -> (kind, value) for a JS object literal. Does not descend."""
    props = {}
    end = match_close(s, i)
    j = i + 1
    while j < end - 1:
        j = skip_ws(s, j)
        if j >= end - 1:
            break
        m = re.compile(r"([A-Za-z_$][\w$]*)\s*:|\"([^\"]+)\"\s*:|'([^']+)'\s*:").match(s, j)
        if not m:
            m2 = re.compile(r"([A-Za-z_$][\w$]*)\s*\(").match(s, j)  # method shorthand: build(host){...}
            if m2:
                k0 = s.find("(", j)
                k1 = match_close(s, k0)
                k2 = skip_ws(s, k1)
                if k2 < len(s) and s[k2] == "{":
                    k3 = match_close(s, k2)
                    props[m2.group(1)] = ("raw", s[j:k3])
                    j = k3
                    continue
            j += 1
            continue
        key = m.group(1) or m.group(2) or m.group(3)
        kind, val, j = read_value(s, m.end())
        props[key] = (kind, val)
    return props


def js_array_strings(raw):
    """["a","b"] raw literal -> list of python strings (non-strings ignored)."""
    out, i = [], 1
    while i < len(raw):
        i = skip_ws(raw, i)
        if i >= len(raw) or raw[i] == "]":
            break
        if raw[i] in "\"'`":
            v, i = read_string(raw, i)
            out.append(v)
        else:
            k, v, i = read_value(raw, i)
    return out


# --------------------------------------------------------------------------- label / data harvesting from canvas code
_STR = re.compile(r"\"((?:[^\"\\\n]|\\.)*)\"|'((?:[^'\\\n]|\\.)*)'")
_NOT_LABEL = re.compile(
    r"^(#[0-9a-fA-F]{3,8}|rgba?\(.*|hsla?\(.*|[\d.\-+ %pxems]+|left|right|center|middle|top|bottom|round|butt|square|"
    r"source-over|lighter|alphabetic|monospace|sans-serif|serif|bold|normal|italic|click|mousemove|mousedown|mouseup|"
    r"input|change|range|button|div|span|canvas|2d|none|auto|px|[a-zA-Z]+:.*;|\d+px.*|[a-z]+\.[a-z]+|\w{1,2})$")


def code_labels(code, cap=80):
    """Distinct human-readable string literals in canvas code (labels the animation draws)."""
    seen, out = set(), []
    for m in _STR.finditer(code):
        v = unescape_js(m.group(1) if m.group(1) is not None else m.group(2)).strip()
        if len(v) < 2 or not re.search(r"[A-Za-z؀-ۿ]", v):
            continue
        if _NOT_LABEL.match(v) or v.startswith(("vcc-", "var(", "http", "<", "ui-sans", "700 ", "600 ", "500 ")):
            continue
        if re.fullmatch(r"[A-Za-z_][\w-]*", v) and v.islower() and len(v) < 4 and v not in ("sql", "cpu", "gpu", "api", "ram", "tcp", "dag"):
            continue
        if v not in seen:
            seen.add(v)
            out.append(v)
            if len(out) >= cap:
                break
    return out


_NUMARR = re.compile(r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(\[)")
_SCALAR = re.compile(r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*[;,\n]")


def jsonify(raw):
    """Best-effort JS literal -> JSON text: quote bare keys, single-quoted strings, null out dotted refs / identifiers."""
    out, i, n = [], 0, len(raw)
    seg = []

    def flush():
        if not seg:
            return
        t = "".join(seg)
        seg.clear()
        t = re.sub(r"\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+", "null", t)           # C.a, P.rng
        t = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", lambda m: f'{m.group(1)}"{m.group(2)}":', t)
        t = re.sub(r"(?<![\w\".])\.(\d)", r"0.\1", t)
        t = re.sub(r"(?<![\w.])0+(\d)", r"\1", t)
        t = re.sub(r":\s*(?!true|false|null)[A-Za-z_$][\w$]*(?=\s*[,}\]])", ": null", t)  # bare identifiers as values
        out.append(t)

    while i < n:
        c = raw[i]
        if c in "\"'":
            flush()
            v, i = read_string(raw, i)
            out.append(json.dumps(v, ensure_ascii=False))
        else:
            seg.append(c)
            i += 1
    flush()
    return "".join(out)


def code_data(code, cap=24, maxlen=900):
    """Literal data the canvas program draws: var X=[numbers / nested / objects with numbers] -> {name: parsed}; numeric scalars;
    slider params; rng seeds."""
    data = {}
    for m in _NUMARR.finditer(code):
        j = m.start(2)
        end = match_close(code, j)
        raw = code[j:end]
        if len(raw) > maxlen or not re.search(r"\d", raw):
            continue
        try:
            val = json.loads(jsonify(raw))
        except Exception:  # noqa: BLE001
            continue
        if not re.search(r"\d", json.dumps(val)):
            continue
        data[m.group(1)] = val
        if len(data) >= cap:
            break
    scalars = {}
    for m in _SCALAR.finditer(code):
        if m.group(1) not in ("i", "j", "k", "t", "x", "y") and len(scalars) < 16:
            v = m.group(2)
            scalars[m.group(1)] = float(v) if "." in v else int(v)
    params = []
    for m in re.finditer(r"VCC\.slider\(\s*host\s*,\s*\{([^}]{0,300})\}", code):
        d = {}
        for k in ("name", "min", "max", "val", "step"):
            mm = re.search(r"\b%s\s*:\s*(\"[^\"]*\"|'[^']*'|-?[\d.]+)" % k, m.group(1))
            if mm:
                d[k] = mm.group(1).strip("\"'") if mm.group(1)[0] in "\"'" else float(mm.group(1)) if "." in mm.group(1) else int(mm.group(1))
        if d:
            params.append(d)
    out = {"arrays": data}
    if scalars:
        out["scalars"] = scalars
    if params:
        out["sliders"] = params
    seeds = re.findall(r"P\.rng\((\d+)\)", code)
    if seeds:
        out["rng_seeds"] = [int(x) for x in seeds]
    return out


def code_motion(code):
    """What kind of motion the build function produces (static read of the canvas program)."""
    m = []
    if "VCC.anim(" in code:
        m.append("continuous animation loop (frame(ctx,W,H,t,dt))")
    if re.search(r"\(t\*[\d.]+\s*\+|t\s*%\s*1|%1\b", code) and "arc(" in code:
        m.append("particles/dots travel along paths")
    if "P.flow(" in code:
        m.append("flow along graph edges")
    if "P.node(" in code or "P.edge(" in code:
        m.append("node-and-edge diagram")
    if re.search(r"VCC\.slider\(", code):
        m.append("slider control re-drives the scene")
    if re.search(r"VCC\.btn|VCC\.button|\.onclick|addEventListener\(\s*[\"']click", code):
        m.append("click/button interaction")
    if re.search(r"S\.i\b.*?\+\+|S\.i\s*=", code) and "VCC.anim(" not in code:
        m.append("stepped (click/press to advance frame)")
    if "lerp(" in code or re.search(r"ease|Math\.sin\(t", code):
        m.append("eased / sinusoidal interpolation")
    if "globalAlpha" in code:
        m.append("fade / opacity changes")
    if "fillRect(" in code and "ctx.arc(" not in code:
        m.append("bars / blocks grow or shift")
    return m


# --------------------------------------------------------------------------- concept guessing
# slug -> surface forms (lowercase regex fragments). IDs follow docs/plan/05: c:<kebab-slug>. Guesses only; graph-engineer owns real concepts.
LEXICON = {
    "sql": r"\bsql\b", "select-where": r"\bwhere\b.*\bselect\b|\bselect\b.*\bwhere\b|\bfilter(?:ing)? rows", "join": r"\bjoins?\b",
    "inner-join": r"\binner join", "left-join": r"\bleft join", "group-by": r"\bgroup by\b", "aggregate": r"\baggregat",
    "window-function": r"\bwindow fun|\brow_number|\bover \(", "cte": r"\bcte\b|common table expression", "subquery": r"\bsubquer",
    "index": r"\bindex(?:es)?\b", "b-tree": r"\bb-?tree", "transaction": r"\btransactions?\b", "acid": r"\bacid\b",
    "normalization": r"\bnormali[sz]ation", "primary-key": r"\bprimary key", "foreign-key": r"\bforeign key",
    "grain": r"\bgrain\b", "fan-out": r"\bfan-?out", "star-schema": r"\bstar schema", "fact-table": r"\bfact table",
    "dimension-table": r"\bdimension table", "scd": r"\bscd\b|slowly changing", "data-warehouse": r"\bwarehouse", "data-lake": r"\bdata lake",
    "lakehouse": r"\blakehouse", "etl": r"\betl\b", "elt": r"\belt\b", "pipeline": r"\bpipelines?\b", "airflow": r"\bairflow",
    "dag": r"\bdag\b", "kafka": r"\bkafka", "consumer-lag": r"\bconsumer lag|\blag\b.*\bconsumer", "partition": r"\bpartition",
    "offset": r"\boffsets?\b", "cdc": r"\bcdc\b|change data capture", "idempotency": r"\bidempoten", "backfill": r"\bbackfill",
    "schema-evolution": r"\bschema evolution", "spark": r"\bspark\b", "shuffle": r"\bshuffle", "hdfs": r"\bhdfs\b", "hadoop": r"\bhadoop",
    "mapreduce": r"\bmapreduce|map-reduce", "data-quality": r"\bdata quality", "null": r"\bnulls?\b", "duplicate": r"\bduplicat",
    "python": r"\bpython\b", "pandas": r"\bpandas\b", "numpy": r"\bnumpy\b", "dataframe": r"\bdataframe", "mutable-default": r"\bmutable default",
    "list-comprehension": r"\blist comprehension", "generator": r"\bgenerators?\b", "decorator": r"\bdecorators?\b", "exception": r"\bexception",
    "java": r"\bjava\b", "jdbc": r"\bjdbc\b", "linux": r"\blinux\b", "permissions": r"\bpermission", "cron": r"\bcron\b",
    "systemd": r"\bsystemd", "ssh": r"\bssh\b", "git": r"\bgit\b", "docker": r"\bdocker", "api": r"\bapi\b|\brest\b",
    "statistics": r"\bstatistic", "mean": r"\barithmetic mean|\bmean (?:and|vs|versus) median|\baverage\b", "median": r"\bmedian\b", "variance": r"\bvariance|\bstd dev|standard deviation",
    "probability": r"\bprobabilit", "bayes": r"\bbayes", "hypothesis-test": r"\bhypothesis|\bp-value", "confidence-interval": r"\bconfidence interval",
    "regression": r"\bregression", "classification": r"\bclassif", "k-means": r"\bk-?means", "pca": r"\bpca\b|principal component",
    "decision-tree": r"\bdecision tree", "gradient-descent": r"\bgradient descent", "overfitting": r"\boverfit", "neural-network": r"\bneural net",
    "backpropagation": r"\bbackprop", "embedding": r"\bembedding", "transformer": r"\btransformer", "attention": r"\bself-attention|\battention\b",
    "llm": r"\bllm\b|large language model", "rag": r"\brag\b|retrieval.augmented", "agent": r"\bagents?\b", "tokenizer": r"\btoken(?:iz|s\b)",
    "prompt": r"\bprompt", "mlops": r"\bmlops", "feature-engineering": r"\bfeature engineering|\bfeatures?\b", "cross-validation": r"\bcross-?validation",
    "big-o": r"\bbig-?o\b|\bcomplexity\b", "array": r"\barrays?\b", "linked-list": r"\blinked list", "stack": r"\bstacks?\b", "queue": r"\bqueues?\b",
    "hash-table": r"\bhash (?:table|map)|\bhashing", "tree": r"\btrees?\b", "graph": r"\bgraphs?\b", "sorting": r"\bsort(?:ing)?\b",
    "binary-search": r"\bbinary search", "recursion": r"\brecursi", "dynamic-programming": r"\bdynamic programming", "bfs-dfs": r"\bbfs\b|\bdfs\b",
    "visualization": r"\bvisuali[sz]", "dashboard": r"\bdashboard", "chart": r"\bcharts?\b", "story": r"\bstorytelling|\bdata story",
    "kpi": r"\bkpis?\b", "slo": r"\bslo\b|\bsla\b", "latency": r"\blatency", "throughput": r"\bthroughput", "cache": r"\bcach(?:e|ing)\b",
    "replication": r"\breplicat", "sharding": r"\bshard", "cap-theorem": r"\bcap theorem", "mobile-money": r"\bmobile.money|\bnilepay",
    "reconciliation": r"\breconcil", "fraud": r"\bfraud", "settlement": r"\bsettlement", "ledger": r"\bledger", "data-contract": r"\bdata contract",
    "data-governance": r"\bgovernance", "lineage": r"\blineage", "orchestration": r"\borchestrat", "observability": r"\bobservab|\bmonitoring",
    "vector-database": r"\bvector (?:db|database|store)", "mermaid": r"\bmermaid", "capstone": r"\bcapstone", "interview": r"\binterview",
    "portfolio": r"\bportfolio", "scd2": r"\bscd2|\btype 2\b", "data-model": r"\bdata model", "er-diagram": r"\ber diagram|\bentity.relationship",
    "execution-order": r"\bexecution order|\blogical order|order of execution", "query-plan": r"\bquery plan|\bexplain (?:analyze|plan|select)|\bquery cost",
    "sampling": r"\bsampling", "bias-variance": r"\bbias.variance", "confusion-matrix": r"\bconfusion matrix", "precision-recall": r"\bprecision\b|\brecall\b",
    "normal-distribution": r"\bnormal distribution|\bgaussian", "correlation": r"\bcorrelat", "eda": r"\beda\b|exploratory",
}
_LEX = [(k, re.compile(v, re.I)) for k, v in LEXICON.items()]


def concepts_guess(*texts, cap=8):
    blob = " ".join(t for t in texts if t)[:6000].lower()
    hits = []
    for slug, rx in _LEX:
        if rx.search(blob):
            hits.append("c:" + slug)
            if len(hits) >= cap:
                break
    return hits


# --------------------------------------------------------------------------- code / mermaid extraction from strings
_PRE = re.compile(r"<pre([^>]*)>\s*(?:<code([^>]*)>)?(.*?)(?:</code>)?\s*</pre>", re.S)
_FENCE = re.compile(r"(?:^|\n)```([\w+#.-]*)[ \t]*\n(.*?)\n```", re.S)
MERMAID_HEAD = re.compile(r"^\s*(?:%%\{.*?\}%%\s*)?(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram(?:-v2)?|gantt|mindmap|gitGraph|journey|pie|timeline)\b")


def code_blocks(text):
    """Yield (kind, lang, code) for <pre><code> blocks and markdown fences inside a string."""
    out = []
    if "<pre" in text:
        for m in _PRE.finditer(text):
            attrs, cattrs, body = m.group(1) or "", m.group(2) or "", m.group(3)
            code = _html.unescape(re.sub(r"<[^>]+>", "", body)).strip("\n")
            lang = ""
            mm = re.search(r"language-([\w+#-]+)|lang-([\w+#-]+)", cattrs + " " + attrs)
            if mm:
                lang = mm.group(1) or mm.group(2)
            is_m = "mermaid" in attrs or "mermaid" in cattrs or lang == "mermaid" or bool(MERMAID_HEAD.match(code))
            if code.strip():
                out.append(("mermaid" if is_m else "code", "mermaid" if is_m else lang, code))
    if "```" in text:
        for m in _FENCE.finditer(text):
            lang, code = m.group(1), m.group(2)
            is_m = lang == "mermaid" or bool(MERMAID_HEAD.match(code))
            if code.strip():
                out.append(("mermaid" if is_m else "code", "mermaid" if is_m else lang, code))
    return out


def guess_lang(code):
    c = code.lstrip()
    if re.match(r"(?is)(select|with|insert|update|delete|create|alter|drop|explain)\b", c):
        return "sql"
    if re.search(r"(?m)^(def |import |from \w+ import |class |print\()", c):
        return "python"
    if re.search(r"(?m)^(\$ |sudo |ls |cd |grep |cat |chmod |apt )", c):
        return "bash"
    if re.search(r"\b(public|private) (static )?(class|void)|System\.out", c):
        return "java"
    if re.search(r"(?m)^\s*(const|let|var|function) ", c):
        return "js"
    return ""
