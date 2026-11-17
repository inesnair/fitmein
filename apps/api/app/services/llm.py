"""Appels à Claude avec sortie structurée : on force un outil dont le schéma est le modèle Pydantic,
puis on valide la réponse. Pas de parsing de JSON libre."""
from typing import TypeVar

from anthropic import Anthropic
from pydantic import BaseModel

from ..config import get_settings
from ..schemas import GeneratedCv, OfferAnalysis, Profile

T = TypeVar("T", bound=BaseModel)

LEVELS = {1: "Notions", 2: "Intermédiaire", 3: "Avancé", 4: "Expert"}


def _client() -> Anthropic:
    return Anthropic(api_key=get_settings().anthropic_api_key)


def structured_call(model: str, system: str, prompt: str, output: type[T], max_tokens: int = 4000) -> T:
    tool = {
        "name": "submit",
        "description": "Renvoie le résultat structuré.",
        "input_schema": output.model_json_schema(),
    }
    msg = _client().messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        tools=[tool],
        tool_choice={"type": "tool", "name": "submit"},
        messages=[{"role": "user", "content": prompt}],
    )
    block = next(b for b in msg.content if b.type == "tool_use")
    return output.model_validate(block.input)


def profile_as_text(profile: Profile) -> str:
    skills = "\n".join(f"- {s.name} [{s.domain}] : niveau {s.level}/4 ({LEVELS[s.level]})" for s in profile.skills)
    return (
        f"Nom : {profile.full_name or '-'}\nPoste visé : {profile.target_title or '-'}\n"
        f"Localisation : {profile.location or '-'}\nContrat recherché : {profile.contract or 'indifférent'}\n\n"
        f"COMPÉTENCES DÉCLARÉES\n{skills or '(aucune)'}\n\nCV\n{(profile.cv_text or '(aucun)')[:15000]}"
    )


ANALYSIS_SYSTEM = """Tu es un recruteur expert. Tu compares une offre d'emploi au profil d'un candidat.
- Liste les exigences de l'offre (compétences, expériences, diplômes, langues), en distinguant obligatoires (must) et souhaitées (nice).
- Pour chacune : covered si le profil la couvre au niveau attendu, partial si présente mais niveau/expérience inférieur, missing sinon.
- Tiens compte des synonymes (JS = JavaScript, PO = Product Owner) et des niveaux déclarés (1 à 4).
- context_fit : adéquation séniorité, type de contrat et localisation (0 à 1).
- N'invente rien sur le candidat. Réponds en français."""


def analyse_offer(offer_text: str, profile: Profile) -> OfferAnalysis:
    s = get_settings()
    prompt = f"=== PROFIL ===\n{profile_as_text(profile)}\n\n=== OFFRE ===\n{offer_text[:20000]}"
    return structured_call(s.model_extraction, ANALYSIS_SYSTEM, prompt, OfferAnalysis)


CV_SYSTEM = """Tu rédiges des CV optimisés pour les ATS, en français.
Règle absolue : utilise UNIQUEMENT les faits présents dans le profil. Aucune expérience, entreprise, date,
diplôme, certification ou compétence inventée. Tu peux reformuler, réordonner et mettre en avant.
- Reprends les mots-clés exacts de l'offre quand le profil les justifie (liste-les dans keywords_used).
- Liste dans gaps les exigences de l'offre que le profil ne permet pas de justifier.
- 3 à 5 puces par expérience, verbes d'action, résultats chiffrés seulement s'ils figurent dans le profil.
- Dates au format MM/AAAA."""


def write_cv(offer_text: str, profile: Profile) -> GeneratedCv:
    s = get_settings()
    prompt = f"=== PROFIL ===\n{profile_as_text(profile)}\n\n=== OFFRE ===\n{offer_text[:15000]}"
    return structured_call(s.model_writing, CV_SYSTEM, prompt, GeneratedCv, max_tokens=6000)
