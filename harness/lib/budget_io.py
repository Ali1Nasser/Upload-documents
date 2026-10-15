"""Locked, atomic read-modify-write for harness/state/budget.json (several agents write different keys).
IO goes through tools/dclib/stateio.py: one fcntl lock (harness/state/.lock), temp file + fsync + os.replace, bounded retry."""
import importlib.util
from pathlib import Path

_root = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("dc_stateio", str(_root / "tools" / "dclib" / "stateio.py"))
stateio = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(stateio)

P = _root / "harness" / "state" / "budget.json"


def update(**kv):
    def _merge(d):
        d = d if isinstance(d, dict) else {}
        for k, v in kv.items():
            if isinstance(v, dict) and isinstance(d.get(k), dict):
                d[k].update(v)
            else:
                d[k] = v
        return d
    return stateio.update_json(str(P), _merge, default=dict, sort_keys=True)


def read():
    return stateio.read_json(str(P), {})
