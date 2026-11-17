"""Détection de doublons : URL normalisée + empreinte du texte + similarité."""
import hashlib
import re
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit

_TRACKING = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "trk", "trackingid", "refid", "from"}


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text)).strip()


def url_key(url: str | None) -> str | None:
    """Même offre = même clé, quels que soient le protocole, le www et les paramètres de tracking."""
    if not url:
        return None
    parts = urlsplit(url.strip())
    if not parts.netloc:
        return None
    host = parts.netloc.lower().removeprefix("www.")
    query = sorted((k, v) for k, v in parse_qsl(parts.query) if k.lower() not in _TRACKING)
    path = parts.path.rstrip("/").lower()
    return f"{host}{path}" + (f"?{urlencode(query)}" if query else "")


def text_hash(text: str) -> str:
    return hashlib.sha1(normalize_text(text)[:4000].encode()).hexdigest()


def shingles(text: str, k: int = 3) -> set[str]:
    words = normalize_text(text).split()
    return {" ".join(words[i : i + k]) for i in range(max(1, len(words) - k + 1))}


def similarity(a: str, b: str) -> float:
    """Jaccard sur des 3-grammes de mots : robuste aux petites retouches d'une annonce republiée."""
    sa, sb = shingles(a), shingles(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


NEAR_DUPLICATE = 0.75
