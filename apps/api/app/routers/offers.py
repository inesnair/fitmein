from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, HttpUrl

from ..config import Settings, get_settings
from ..deps import CurrentUser, get_current_user
from ..repository import find_duplicate, load_profile
from ..schemas import CvResponse, DuplicateInfo, OfferImportText, OfferOut, OfferStatus
from ..services import cv as cv_service
from ..services import llm, parsing
from ..services.dedupe import text_hash, url_key
from ..services.matching import compute_match

router = APIRouter(prefix="/offers", tags=["offres"])

MAX_UPLOAD = 10 * 1024 * 1024


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...), _: CurrentUser = Depends(get_current_user)) -> dict:
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Fichier trop lourd (10 Mo max).")
    try:
        return {"text": parsing.from_file(file.filename or "", data)}
    except parsing.UnreadableSource as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


class UrlIn(BaseModel):
    url: HttpUrl


@router.post("/parse-url")
async def parse_url(body: UrlIn, _: CurrentUser = Depends(get_current_user)) -> dict:
    try:
        return {"text": await parsing.from_url(str(body.url))}
    except parsing.UnreadableSource as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.post("/analyse", response_model=OfferOut)
def analyse(
    body: OfferImportText,
    force: bool = Query(False, description="Analyser même si un doublon est détecté"),
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> OfferOut:
    ukey, thash = url_key(str(body.url) if body.url else None), text_hash(body.text)

    dup = find_duplicate(user.db, user.id, ukey, thash, body.text)
    if dup and not force:
        info = DuplicateInfo(offer_id=dup["id"], title=dup["title"], company=dup["company"], score=dup["score"],
                             status=dup["status"], created_at=dup["created_at"])
        raise HTTPException(status.HTTP_409_CONFLICT, info.model_dump(mode="json"))

    profile = load_profile(user.db, user.id)
    if not profile.cv_text and not profile.skills:
        raise HTTPException(status.HTTP_412_PRECONDITION_FAILED, "Profil vide : importe ton CV ou ajoute des compétences.")

    analysis = llm.analyse_offer(body.text, profile)
    match = compute_match(analysis, settings.match_threshold, settings.study_threshold)
    offer_status = OfferStatus.todo if match.verdict != "nomatch" else OfferStatus.nomatch

    row = user.db.table("offers").insert({
        "user_id": user.id,
        "source": body.source,
        "url": str(body.url) if body.url else None,
        "url_key": ukey,
        "text_hash": thash,
        "raw_text": body.text,
        "title": analysis.title,
        "company": analysis.company,
        "location": analysis.location,
        "contract": analysis.contract,
        "seniority": analysis.seniority,
        "analysis": analysis.model_dump(mode="json"),
        "match": match.model_dump(mode="json"),
        "score": match.score,
        "summary": analysis.summary,
        "status": offer_status.value,
    }).execute().data[0]

    return OfferOut(id=row["id"], title=row["title"], company=row["company"], location=row["location"],
                    score=match.score, status=offer_status, match=match, summary=analysis.summary)


@router.post("/{offer_id}/cv", response_model=CvResponse)
def generate_cv(offer_id: str, user: CurrentUser = Depends(get_current_user)) -> CvResponse:
    offer = user.db.table("offers").select("*").eq("id", offer_id).maybe_single().execute()
    if not offer or not offer.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    o = offer.data
    profile = load_profile(user.db, user.id)
    if not profile.cv_text:
        raise HTTPException(status.HTTP_412_PRECONDITION_FAILED, "Importe d'abord ton CV.")

    draft = llm.write_cv(o["raw_text"], profile)
    clean, removed = cv_service.verify_cv(draft, profile)
    content = cv_service.render_docx(clean)
    name = cv_service.file_name(clean.full_name, o["company"], o["title"])

    path = f"{user.id}/{offer_id}/{datetime.now(timezone.utc):%Y%m%d%H%M%S}_{name}"
    bucket = user.storage.from_("documents")
    bucket.upload(path, content, {"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
    signed = bucket.create_signed_url(path, 3600)

    doc = user.db.table("generated_documents").insert({
        "user_id": user.id, "offer_id": offer_id, "kind": "cv", "file_name": name, "storage_path": path,
        "content": clean.model_dump(mode="json"), "removed_items": removed,
    }).execute().data[0]

    return CvResponse(document_id=doc["id"], file_name=name, download_url=signed["signedURL"],
                      removed_items=removed, keywords_used=clean.keywords_used, gaps=clean.gaps)
