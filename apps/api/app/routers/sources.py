from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..config import Settings, get_settings
from ..connectors.base import JobPosting
from ..connectors.france_travail import FranceTravailConnector
from ..deps import CurrentUser, get_current_user

router = APIRouter(prefix="/sources", tags=["sources"])
_ft: FranceTravailConnector | None = None


def france_travail(settings: Settings = Depends(get_settings)) -> FranceTravailConnector:
    global _ft
    if not (settings.france_travail_client_id and settings.france_travail_client_secret):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Connecteur France Travail non configuré.")
    if _ft is None:
        _ft = FranceTravailConnector(settings.france_travail_client_id, settings.france_travail_client_secret)
    return _ft


@router.get("/france-travail/search", response_model=list[JobPosting])
async def search_france_travail(
    q: str = Query(..., min_length=2, description="Mots-clés"),
    departement: str | None = Query(None, pattern=r"^\d{2,3}$"),
    limit: int = Query(20, le=100),
    _: CurrentUser = Depends(get_current_user),
    connector: FranceTravailConnector = Depends(france_travail),
) -> list[JobPosting]:
    return await connector.search(q, departement, limit)
