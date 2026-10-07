#!/usr/bin/env python3
"""Idempotent merge of docs/plan/harness/settings.hooks.json into .claude/settings.json (creates it).

Dicts merge recursively; permission lists are unioned in order; each hook block is added only if not already present.
Existing keys in .claude/settings.json win for scalars. Usage: python3 harness/hooks/merge_settings.py [--check]
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "docs", "plan", "harness", "settings.hooks.json")
DST = os.path.join(ROOT, ".claude", "settings.json")


def merge(dst, src):
    for k, v in src.items():
        if k not in dst:
            dst[k] = json.loads(json.dumps(v))
        elif isinstance(v, dict) and isinstance(dst[k], dict):
            merge(dst[k], v)
        elif isinstance(v, list) and isinstance(dst[k], list):
            for item in v:
                if item not in dst[k]:
                    dst[k].append(item)
    return dst


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    cur = json.load(open(DST, encoding="utf-8")) if os.path.exists(DST) else {}
    merged = merge(json.loads(json.dumps(cur)), src)
    if "--check" in sys.argv:
        print("up to date" if merged == cur else "needs merge")
        return 0 if merged == cur else 1
    if merged != cur:
        os.makedirs(os.path.dirname(DST), exist_ok=True)
        with open(DST, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"merged -> {os.path.relpath(DST, ROOT)}")
    else:
        print("already merged")
    return 0


if __name__ == "__main__":
    sys.exit(main())
