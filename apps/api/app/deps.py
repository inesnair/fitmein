"""Authentification : le front envoie le jeton Supabase de l'utilisateur.

On demande à Supabase Auth qui est l'utilisateur (fonctionne avec les clés de signature
symétriques comme asymétriques), puis on crée un client Supabase qui agit *en tant que*
cet utilisateur : toutes les requêtes passent par les politiques RLS.
"""
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from storage3 import SyncStorageClient
from supabase import Client, create_client

from .config import Settings, get_settings


@dataclass
class CurrentUser:
    id: str
    token: str
    db: Client
    storage: SyncStorageClient


def get_current_user(
    authorization: str = Header(..., description="Bearer <jeton Supabase>"),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Jeton manquant")
    token = authorization.split(" ", 1)[1]

    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    try:
        user = client.auth.get_user(token).user
    except Exception as exc:  # jeton expiré, révoqué ou invalide
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expirée, reconnecte-toi.") from exc
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalide")

    client.postgrest.auth(token)
    storage = SyncStorageClient(
        f"{settings.supabase_url}/storage/v1",
        {"apiKey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
    )
    return CurrentUser(id=user.id, token=token, db=client, storage=storage)
