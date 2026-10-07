#!/usr/bin/env python3
"""PostToolUse(Write|Edit) hook. Reads the hook JSON from stdin.

Validates files under corpus/ that match a rule in harness/schemas/paths.json against their JSON Schema.
Exit 2 + message on stderr when the file violates its schema (the agent must fix it); exit 0 otherwise.
Fails OPEN (exit 0) on any parse or internal error, and for anything outside corpus/.
"""
import json
import os
import sys

ROOT = os.environ.get("DC_REPO_ROOT") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    try:
        data = json.load(sys.stdin)
        ti = data.get("tool_input") or {}
        fp = ti.get("file_path") or ti.get("path")
        if not isinstance(fp, str) or not fp:
            return 0
        cwd = data.get("cwd") or os.getcwd()
        absf = os.path.realpath(fp if os.path.isabs(fp) else os.path.join(cwd, fp))
        rel = os.path.relpath(absf, os.path.realpath(ROOT))
        if rel.startswith("..") or not rel.startswith("corpus" + os.sep):
            return 0
        rel = rel.replace(os.sep, "/")
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tools"))
        from dclib import schema  # noqa: WPS433

        rule = schema.rule_for(rel)
        if not rule or not os.path.isfile(absf):
            return 0
        errs = schema.validate_file(absf, rule)
        if errs:
            msg = [f"SCHEMA VALIDATION FAILED: {rel} must match harness/schemas/{rule['schema']}.schema.json "
                   f"({'every JSONL line' if rule['format'] == 'jsonl' else 'whole file'}; contract in docs/plan/05_DATA_CONTRACTS.md)."]
            msg += ["  - " + e for e in errs[:10]]
            msg.append("Fix the file so it validates (do not weaken the schema). Re-write it, then continue.")
            print("\n".join(msg), file=sys.stderr)
            return 2
        return 0
    except Exception:  # noqa: BLE001  fail open
        return 0


if __name__ == "__main__":
    sys.exit(main())
