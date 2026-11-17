import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from ..config import get_settings
from ..deps import CurrentUser, get_current_user
from ..schemas import Skill
from ..services import llm, parsing

router = APIRouter(tags=["profil"])

REFERENTIAL = json.loads((Path(__file__).parent.parent / "data" / "domains.json").read_text(encoding="utf-8"))
DOMAIN_IDS = {d["id"] for d in REFERENTIAL["domains"]}


@router.get("/referential")
def referential() -> dict:
    """Domaines (niveau 1, alignés sur les jobboards) et compétences suggérées. Sera enrichi par ROME 4.0 / ESCO."""
    return REFERENTIAL


class ExtractedSkills(BaseModel):
    skills: list[Skill]


@router.post("/profile/cv")
async def upload_cv(file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)) -> dict:
    """Importe le CV, enregistre son texte et pré-remplit les compétences (si le profil n'en a pas encore)."""
    try:
        text = parsing.from_file(file.filename or "", await file.read())
    except parsing.UnreadableSource as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    user.db.table("profiles").upsert({"id": user.id, "cv_text": text, "cv_file_name": file.filename}).execute()

    existing = user.db.table("user_skills").select("id").eq("user_id", user.id).limit(1).execute().data
    added: list[dict] = []
    if not existing:
        domains = "\n".join(f"{d['id']} = {d['name']}" for d in REFERENTIAL["domains"])
        result = llm.structured_call(
            get_settings().model_extraction,
            "Tu identifies les compétences réellement présentes dans un CV. N'invente rien.",
            f"Liste au plus 30 compétences du CV, chacune avec un domaine (identifiant ci-dessous) et un niveau 1-4 "
            f"estimé d'après l'expérience décrite.\nDomaines :\n{domains}\n\nCV :\n{text[:15000]}",
            ExtractedSkills,
        )
        rows = [{"user_id": user.id, "domain": s.domain, "name": s.name, "level": s.level}
                for s in result.skills if s.domain in DOMAIN_IDS]
        if rows:
            added = user.db.table("user_skills").insert(rows).execute().data

    return {"cv_chars": len(text), "skills_added": len(added)}
