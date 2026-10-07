"""Tiny locked read-modify-write for harness/state/budget.json (several agents write different keys)."""
import fcntl, json, os
from pathlib import Path
P = Path(__file__).resolve().parents[1] / "state" / "budget.json"

def update(**kv):
    P.parent.mkdir(parents=True, exist_ok=True)
    with open(str(P) + ".lock", "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        d = json.loads(P.read_text()) if P.exists() and P.read_text().strip() else {}
        for k, v in kv.items():
            if isinstance(v, dict) and isinstance(d.get(k), dict): d[k].update(v)
            else: d[k] = v
        tmp = P.with_suffix(".tmp"); tmp.write_text(json.dumps(d, indent=2, ensure_ascii=False, sort_keys=True) + "\n"); os.replace(tmp, P)
    return d
