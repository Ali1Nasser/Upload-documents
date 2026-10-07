"""manifest.json writer + skip check (content-addressed idempotency).

manifest.json sits next to a command's outputs. Top level mirrors the most recent step
({cmd, inputs:[{path,sha256}], outputs, tool_versions, created}); `steps` keeps one such record per
step name, because several commands share one output directory (e.g. corpus/catalog/).
"""
import os

from . import common as C


def _path(out_dir):
    return os.path.join(out_dir, "manifest.json")


def inputs_digest(inputs):
    return C.sha256_text("\n".join(f"{i['path']}\t{i['sha256']}" for i in sorted(inputs, key=lambda i: i["path"])))


def load(out_dir):
    return C.read_json(_path(out_dir), {}) or {}


def should_skip(out_dir, step, inputs, outputs, force=False):
    """True when the last manifest for `step` saw identical input hashes and every output still exists."""
    if force:
        return False
    rec = (load(out_dir).get("steps") or {}).get(step)
    if not rec or rec.get("inputs_digest") != inputs_digest(inputs):
        return False
    return all(os.path.exists(C.p(o)) if not os.path.isabs(o) else os.path.exists(o) for o in outputs)


def write(out_dir, step, cmd, inputs, outputs, tools=None, extra=None):
    cur = load(out_dir)
    rec = {
        "step": step,
        "cmd": cmd,
        "inputs": inputs,
        "inputs_digest": inputs_digest(inputs),
        "outputs": outputs,
        "tool_versions": tools or C.tool_versions(),
        "created": C.now_iso(),
    }
    if extra:
        rec["extra"] = extra
    steps = cur.get("steps") or {}
    steps[step] = rec
    doc = dict(rec)
    doc["steps"] = steps
    C.write_json(_path(out_dir), doc)
    return rec
