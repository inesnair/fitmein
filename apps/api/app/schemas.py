from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class OfferStatus(str, Enum):
    analyse = "analyse"      # À analyser
    nomatch = "nomatch"      # Pas de match
    todo = "todo"            # À faire
    progress = "progress"    # En cours
    ok = "ok"                # Terminée OK
    ko = "ko"                # Terminée KO


class Skill(BaseModel):
    id: str | None = None
    domain: str
    name: str
    level: int = Field(ge=1, le=4)  # 1 Notions · 2 Intermédiaire · 3 Avancé · 4 Expert
    years: float | None = None
    last_used: date | None = None


class Profile(BaseModel):
    full_name: str | None = None
    target_title: str | None = None
    location: str | None = None
    contract: str | None = None
    cv_text: str | None = None
    skills: list[Skill] = []


# ---------- Extraction & matching (sorties du LLM, validées) ----------

class Requirement(BaseModel):
    label: str = Field(description="Exigence telle qu'écrite dans l'offre, courte")
    importance: Literal["must", "nice"]
    required_level: int | None = Field(None, ge=1, le=4)
    status: Literal["covered", "partial", "missing"]
    evidence: str | None = Field(None, description="Compétence ou expérience du profil qui couvre l'exigence")


class OfferAnalysis(BaseModel):
    title: str
    company: str = ""
    location: str = ""
    contract: str = ""
    seniority: str = ""
    requirements: list[Requirement]
    context_fit: float = Field(ge=0, le=1, description="Adéquation séniorité / contrat / localisation, 0 à 1")
    summary: str = Field(description="Deux phrases : verdict et principal écart")


class MatchResult(BaseModel):
    score: int
    verdict: Literal["match", "study", "nomatch"]
    covered: list[str]
    partial: list[str]
    missing: list[str]


class OfferImportText(BaseModel):
    text: str = Field(min_length=80)
    url: HttpUrl | None = None
    source: Literal["text", "url", "file", "extension", "share", "france_travail"] = "text"


class DuplicateInfo(BaseModel):
    offer_id: str
    title: str
    company: str
    score: int | None
    status: OfferStatus
    created_at: datetime


class OfferOut(BaseModel):
    id: str
    title: str
    company: str
    location: str
    score: int
    status: OfferStatus
    match: MatchResult
    summary: str
    duplicate_of: DuplicateInfo | None = None


# ---------- CV ----------

class CvExperience(BaseModel):
    title: str
    company: str
    start: str = Field(description="MM/AAAA")
    end: str = Field(description="MM/AAAA ou 'Aujourd'hui'")
    bullets: list[str]


class CvEducation(BaseModel):
    degree: str
    school: str
    year: str = ""


class GeneratedCv(BaseModel):
    full_name: str
    headline: str
    contact: str = ""
    summary: str
    skills: list[str]
    experiences: list[CvExperience]
    education: list[CvEducation] = []
    certifications: list[str] = []
    languages: list[str] = []
    keywords_used: list[str] = []
    gaps: list[str] = Field(default=[], description="Exigences de l'offre non justifiables par le profil")


class CvResponse(BaseModel):
    document_id: str
    file_name: str
    download_url: str
    removed_items: list[str]
    keywords_used: list[str]
    gaps: list[str]
