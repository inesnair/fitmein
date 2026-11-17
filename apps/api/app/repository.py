"""Accès aux données via Supabase (le client porte le JWT de l'utilisateur : RLS appliquée)."""
from supabase import Client

from .schemas import Profile, Skill
from .services.dedupe import NEAR_DUPLICATE, similarity


def load_profile(db: Client, user_id: str) -> Profile:
    p = db.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    skills = db.table("user_skills").select("*").eq("user_id", user_id).execute()
    data = (p.data if p else None) or {}
    return Profile(
        full_name=data.get("full_name"),
        target_title=data.get("target_title"),
        location=data.get("location"),
        contract=data.get("contract"),
        cv_text=data.get("cv_text"),
        skills=[Skill(**{k: s[k] for k in ("id", "domain", "name", "level", "years", "last_used")}) for s in skills.data],
    )


def find_duplicate(db: Client, user_id: str, url_key: str | None, text_hash: str, text: str) -> dict | None:
    """Doublon exact (même URL ou même texte), sinon quasi-doublon (annonce republiée légèrement modifiée)."""
    rows = (
        db.table("offers")
        .select("id,title,company,score,status,created_at,raw_text,url_key,text_hash")
        .eq("user_id", user_id).order("created_at", desc=True).limit(300)
        .execute().data
    )
    for r in rows:
        if r["text_hash"] == text_hash or (url_key and r["url_key"] == url_key):
            return r
    for r in rows:
        if r.get("raw_text") and similarity(text, r["raw_text"]) >= NEAR_DUPLICATE:
            return r
    return None
