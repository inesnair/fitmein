"""Connecteur API Offres d'emploi v2 de France Travail (inscription gratuite sur francetravail.io)."""
import time

import httpx

from .base import JobPosting, JobSourceConnector

TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"
API = "https://api.francetravail.io/partenaire/offresdemploi/v2"
SCOPE = "api_offresdemploiv2 o2dsoffre"


class FranceTravailConnector(JobSourceConnector):
    name = "france_travail"

    def __init__(self, client_id: str, client_secret: str):
        self._id, self._secret = client_id, client_secret
        self._token: str | None = None
        self._expires = 0.0

    async def _auth(self, client: httpx.AsyncClient) -> str:
        if self._token and time.time() < self._expires - 30:
            return self._token
        resp = await client.post(TOKEN_URL, data={
            "grant_type": "client_credentials", "client_id": self._id,
            "client_secret": self._secret, "scope": SCOPE,
        })
        resp.raise_for_status()
        body = resp.json()
        self._token, self._expires = body["access_token"], time.time() + body.get("expires_in", 1500)
        return self._token

    @staticmethod
    def _to_posting(o: dict) -> JobPosting:
        return JobPosting(
            source="france_travail",
            external_id=o["id"],
            title=o.get("intitule", ""),
            company=(o.get("entreprise") or {}).get("nom", ""),
            location=(o.get("lieuTravail") or {}).get("libelle", ""),
            contract=o.get("typeContratLibelle", ""),
            url=(o.get("origineOffre") or {}).get("urlOrigine"),
            description=o.get("description", ""),
        )

    async def search(self, keywords: str, location: str | None = None, limit: int = 20) -> list[JobPosting]:
        params = {"motsCles": keywords, "range": f"0-{min(limit, 150) - 1}"}
        if location and location.isdigit():
            params["departement"] = location
        async with httpx.AsyncClient(timeout=15) as client:
            token = await self._auth(client)
            resp = await client.get(f"{API}/offres/search", params=params,
                                    headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 204:
            return []
        resp.raise_for_status()
        return [self._to_posting(o) for o in resp.json().get("resultats", [])]

    async def fetch(self, external_id: str) -> JobPosting:
        async with httpx.AsyncClient(timeout=15) as client:
            token = await self._auth(client)
            resp = await client.get(f"{API}/offres/{external_id}", headers={"Authorization": f"Bearer {token}"})
        resp.raise_for_status()
        return self._to_posting(resp.json())
