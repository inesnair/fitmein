"""Interface commune des sources d'offres (pattern Adapter).

Ajouter une source = une classe qui implémente JobSourceConnector. Seules les API officielles
sont branchées ici ; LinkedIn, Indeed, HelloWork et WTTJ passent par l'extension navigateur."""
from abc import ABC, abstractmethod

from pydantic import BaseModel


class JobPosting(BaseModel):
    source: str
    external_id: str
    title: str
    company: str = ""
    location: str = ""
    contract: str = ""
    url: str | None = None
    description: str


class JobSourceConnector(ABC):
    name: str

    @abstractmethod
    async def search(self, keywords: str, location: str | None = None, limit: int = 20) -> list[JobPosting]: ...

    @abstractmethod
    async def fetch(self, external_id: str) -> JobPosting: ...
