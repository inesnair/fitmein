"""Extraction de texte depuis Word, PDF ou une URL."""
import io

import httpx
from bs4 import BeautifulSoup
from docx import Document
from pypdf import PdfReader


class UnreadableSource(Exception):
    """La source ne peut pas être lue automatiquement : le front propose alors de coller le texte."""


def from_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            parts.append(" | ".join(c.text for c in row.cells))
    return "\n".join(p for p in parts if p.strip())


def from_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if len(text.strip()) < 50:
        raise UnreadableSource("PDF scanné ou vide : colle le texte de l'offre.")
    return text


def from_file(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".docx"):
        return from_docx(data)
    if name.endswith(".pdf"):
        return from_pdf(data)
    if name.endswith(".txt"):
        return data.decode("utf-8", errors="ignore")
    raise UnreadableSource("Format non pris en charge : .docx, .pdf ou .txt.")


BLOCKED_HOSTS = ("linkedin.com", "indeed.", "glassdoor.")


async def from_url(url: str) -> str:
    """Lecture best effort d'une page publique. On ne contourne aucune protection :
    les sites qui bloquent la lecture passent par l'extension navigateur ou le copier-coller."""
    if any(h in url for h in BLOCKED_HOSTS):
        raise UnreadableSource("Ce site ne permet pas la lecture automatique : utilise l'extension ou colle le texte.")
    async with httpx.AsyncClient(timeout=10, follow_redirects=True,
                                 headers={"User-Agent": "FitMeIn/1.0 (+lecture d'une offre à la demande de l'utilisateur)"}) as client:
        resp = await client.get(url)
    if resp.status_code != 200:
        raise UnreadableSource(f"Page inaccessible (HTTP {resp.status_code}) : colle le texte de l'offre.")
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "form", "noscript"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup.body
    text = main.get_text("\n", strip=True) if main else ""
    if len(text) < 200:
        raise UnreadableSource("Contenu trop court ou chargé en JavaScript : colle le texte de l'offre.")
    return text
