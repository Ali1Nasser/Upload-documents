"""Schema loading + validation. Uses `jsonschema` when importable, else a minimal structural checker."""
import fnmatch
import json
import os
import re

from . import common as C

SCHEMA_DIR = C.p("harness", "schemas")
_cache = {}
_JS = None


def _jsonschema():
    global _JS
    if _JS is None:
        if os.environ.get("DC_NO_JSONSCHEMA") == "1":  # force the fallback validator (tests)
            _JS = False
            return _JS
        try:
            import jsonschema  # noqa: F401
            _JS = jsonschema
        except Exception:  # noqa: BLE001
            _JS = False
    return _JS


def load_schema(name):
    if name not in _cache:
        with open(os.path.join(SCHEMA_DIR, f"{name}.schema.json"), encoding="utf-8") as f:
            _cache[name] = json.load(f)
    return _cache[name]


def load_rules():
    return (C.read_json(os.path.join(SCHEMA_DIR, "paths.json"), {}) or {}).get("rules", [])


def glob_match(pattern, relpath):
    """fnmatch with ** support (** = any depth incl. none)."""
    rx = re.escape(pattern).replace(r"\*\*/", "(?:.*/)?").replace(r"\*\*", ".*").replace(r"\*", "[^/]*").replace(r"\?", "[^/]")
    return re.fullmatch(rx, relpath) is not None


def rule_for(relpath):
    base = relpath.rsplit("/", 1)[-1]
    for r in load_rules():
        if glob_match(r["glob"], relpath) and not any(fnmatch.fnmatch(base, x) for x in r.get("exclude", [])):
            return r
    return None


# ---- minimal fallback validator (subset of 2020-12 that our schemas use) ----
_TYPES = {"object": dict, "array": list, "string": str, "boolean": bool, "null": type(None)}


def _is_type(v, t):
    if t == "integer":
        return isinstance(v, int) and not isinstance(v, bool)
    if t == "number":
        return isinstance(v, (int, float)) and not isinstance(v, bool)
    return isinstance(v, _TYPES[t])


def _mini(v, s, path, errs):
    t = s.get("type")
    if t and not any(_is_type(v, x) for x in (t if isinstance(t, list) else [t])):
        errs.append(f"{path or '$'}: expected {t}, got {type(v).__name__}")
        return
    if "anyOf" in s and not any(not _sub(v, x) for x in s["anyOf"]):
        errs.append(f"{path or '$'}: matches none of anyOf")
    if "const" in s and v != s["const"]:
        errs.append(f"{path or '$'}: must equal {s['const']!r}")
    if "enum" in s and v not in s["enum"]:
        errs.append(f"{path or '$'}: {v!r} not in {s['enum']}")
    if isinstance(v, str):
        if "pattern" in s and not re.search(s["pattern"], v):
            errs.append(f"{path or '$'}: {v!r} does not match {s['pattern']}")
        if "minLength" in s and len(v) < s["minLength"]:
            errs.append(f"{path or '$'}: shorter than {s['minLength']}")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if "minimum" in s and v < s["minimum"]:
            errs.append(f"{path or '$'}: {v} < minimum {s['minimum']}")
        if "maximum" in s and v > s["maximum"]:
            errs.append(f"{path or '$'}: {v} > maximum {s['maximum']}")
    if isinstance(v, dict):
        for k in s.get("required", []):
            if k not in v:
                errs.append(f"{path or '$'}: missing required property '{k}'")
        props = s.get("properties", {})
        for k, sub in props.items():
            if k in v:
                _mini(v[k], sub, f"{path}.{k}", errs)
        if s.get("additionalProperties") is False:
            for k in v:
                if k not in props:
                    errs.append(f"{path or '$'}: unexpected property '{k}'")
        elif isinstance(s.get("additionalProperties"), dict):
            for k in v:
                if k not in props:
                    _mini(v[k], s["additionalProperties"], f"{path}.{k}", errs)
        if "propertyNames" in s:
            pn = s["propertyNames"]
            for k in v:
                if "pattern" in pn and not re.search(pn["pattern"], k):
                    errs.append(f"{path or '$'}: property name {k!r} does not match {pn['pattern']}")
                if "not" in pn and "enum" in pn["not"] and k in pn["not"]["enum"]:
                    errs.append(f"{path or '$'}: forbidden property '{k}'")
    if isinstance(v, list):
        if "minItems" in s and len(v) < s["minItems"]:
            errs.append(f"{path or '$'}: fewer than {s['minItems']} items")
        if "maxItems" in s and len(v) > s["maxItems"]:
            errs.append(f"{path or '$'}: more than {s['maxItems']} items")
        if "items" in s:
            for i, x in enumerate(v):
                _mini(x, s["items"], f"{path}[{i}]", errs)
    if "if" in s and "then" in s and not _sub(v, s["if"]):
        _mini(v, s["then"], path, errs)


def _sub(v, s):
    e = []
    _mini(v, s, "", e)
    return e


def validate(instance, name, limit=10):
    """Return a list of error strings (empty = valid)."""
    schema = load_schema(name)
    js = _jsonschema()
    if js:
        v = js.Draft202012Validator(schema)
        errs = []
        for e in sorted(v.iter_errors(instance), key=lambda e: list(e.absolute_path)):
            loc = "$" + "".join(f"[{x}]" if isinstance(x, int) else f".{x}" for x in e.absolute_path)
            errs.append(f"{loc}: {e.message[:300]}")
            if len(errs) >= limit:
                break
        return errs
    errs = []
    _mini(instance, schema, "", errs)
    return errs[:limit]


def validate_file(abspath, rule, limit=10, max_bytes=200 * 1024 * 1024):
    """Validate a file according to a paths.json rule. Returns list of 'file[:line]: error' strings."""
    name = os.path.relpath(abspath, C.ROOT)
    if not os.path.isfile(abspath):
        return []
    if os.path.getsize(abspath) > max_bytes:
        return []
    errs = []
    if rule["format"] == "jsonl":
        with open(abspath, encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError as e:
                    errs.append(f"{name}:{n}: invalid JSON ({e})")
                else:
                    errs += [f"{name}:{n}: {m}" for m in validate(rec, rule["schema"], limit)]
                if len(errs) >= limit:
                    errs.append(f"... stopped after {limit} errors")
                    break
    else:
        try:
            with open(abspath, encoding="utf-8") as f:
                doc = json.load(f)
        except json.JSONDecodeError as e:
            return [f"{name}: invalid JSON ({e})"]
        errs = [f"{name}: {m}" for m in validate(doc, rule["schema"], limit)]
    return errs
