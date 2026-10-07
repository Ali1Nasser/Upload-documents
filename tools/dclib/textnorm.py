"""Text folding shared by ASR scoring, alignment and search fields. Stdlib only.

Only the *norm* field is folded. Stored `text` keeps the authored Egyptian spelling.
"""
import re
import unicodedata

_TASHKEEL = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي", "ڤ": "ف", "گ": "ك", "پ": "ب", "چ": "ج"})
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_AR = "؀-ۿ"
_PUNCT = re.compile(r"[^\w\s]|_", re.UNICODE)


def fold(text):
    """Arabic folding + Latin case folding + punctuation removal; splits Arabic/Latin script joins ('الـmodel' -> 'ال model')."""
    t = unicodedata.normalize("NFKC", text)
    t = _TASHKEEL.sub("", t).translate(_FOLD).translate(_DIGITS)
    t = t.casefold()
    t = re.sub(rf"([{_AR}])([a-z0-9])", r"\1 \2", t)
    t = re.sub(rf"([a-z0-9])([{_AR}])", r"\1 \2", t)
    t = _PUNCT.sub(" ", t)
    return re.sub(r"\s+", " ", t).strip()


def tokens(text):
    f = fold(text)
    return f.split() if f else []


def has_latin(s):
    return bool(re.search(r"[A-Za-z]", s))
