"""Load htdemucs from the HF safetensors mirror (dl.fbaipublicfiles.com is blocked).
Mirror: AEmotionStudio/htdemucs-models (converted from official 955717e8-8726e21a.th; weights unverified vs upstream hash).
Usage: from demucs_local import load_htdemucs; model = load_htdemucs()  # then demucs.apply.apply_model(model, wav[None], device='cpu')"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "data" / "models" / "demucs-htdemucs"

def load_htdemucs():
    import torch
    from safetensors.torch import load_file
    from demucs.htdemucs import HTDemucs
    kw = json.loads((D / "htdemucs_config.json").read_text())["kwargs"]
    m = HTDemucs(**kw)
    sd = {(k[6:] if k.startswith("state.") else k): v.float() for k, v in load_file(str(D / "htdemucs.safetensors")).items()}
    res = m.load_state_dict(sd, strict=True)
    return m.eval()
