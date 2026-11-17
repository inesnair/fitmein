"""Garde-fou anti-hallucination + rendu .docx compatible ATS."""
import io
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

from ..schemas import GeneratedCv, Profile
from .dedupe import normalize_text


def _present(term: str, haystack: str) -> bool:
    t = normalize_text(term)
    return bool(t) and t in haystack


def verify_cv(cv: GeneratedCv, profile: Profile) -> tuple[GeneratedCv, list[str]]:
    """Retire tout élément du CV qui ne se retrouve pas dans le profil. Renvoie le CV nettoyé et la liste des retraits."""
    source = normalize_text((profile.cv_text or "") + " " + " ".join(s.name for s in profile.skills))
    removed: list[str] = []

    experiences = []
    for exp in cv.experiences:
        if _present(exp.company, source):
            experiences.append(exp)
        else:
            removed.append(f"Expérience « {exp.title} – {exp.company} » (entreprise absente du profil)")

    skills = []
    for skill in cv.skills:
        if _present(skill, source):
            skills.append(skill)
        else:
            removed.append(f"Compétence « {skill} »")

    certifications = [c for c in cv.certifications if _present(re.sub(r"\(.*?\)", "", c), source)]
    removed += [f"Certification « {c} »" for c in cv.certifications if c not in certifications]

    education = [e for e in cv.education if _present(e.school, source) or _present(e.degree, source)]
    removed += [f"Formation « {e.degree} »" for e in cv.education if e not in education]

    clean = cv.model_copy(update={"experiences": experiences, "skills": skills,
                                  "certifications": certifications, "education": education})
    return clean, removed


def _heading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text.upper())
    run.bold = True
    run.font.size = Pt(12)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)


def render_docx(cv: GeneratedCv) -> bytes:
    """Une colonne, titres standards, pas de tableau, d'image ni d'en-tête : lisible par tous les ATS."""
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    name = doc.add_paragraph()
    r = name.add_run(cv.full_name)
    r.bold = True
    r.font.size = Pt(18)
    name.alignment = WD_ALIGN_PARAGRAPH.LEFT
    doc.add_paragraph(cv.headline)
    if cv.contact:
        doc.add_paragraph(cv.contact)

    _heading(doc, "Profil")
    doc.add_paragraph(cv.summary)

    if cv.skills:
        _heading(doc, "Compétences")
        doc.add_paragraph(" · ".join(cv.skills))

    if cv.experiences:
        _heading(doc, "Expériences professionnelles")
        for exp in cv.experiences:
            p = doc.add_paragraph()
            p.add_run(f"{exp.title} – {exp.company}").bold = True
            doc.add_paragraph(f"{exp.start} – {exp.end}")
            for b in exp.bullets:
                doc.add_paragraph(b, style="List Bullet")

    if cv.education:
        _heading(doc, "Formation")
        for e in cv.education:
            doc.add_paragraph(f"{e.degree} – {e.school}" + (f" ({e.year})" if e.year else ""))

    if cv.certifications:
        _heading(doc, "Certifications")
        for c in cv.certifications:
            doc.add_paragraph(c, style="List Bullet")

    if cv.languages:
        _heading(doc, "Langues")
        doc.add_paragraph(" · ".join(cv.languages))

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def file_name(full_name: str, company: str, title: str) -> str:
    slug = lambda s: re.sub(r"[^A-Za-z0-9]+", "_", normalize_text(s)).strip("_").title() or "X"
    return f"CV_{slug(full_name)}_{slug(company)}_{slug(title)}.docx"
